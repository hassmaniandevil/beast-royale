// ============================================
// BEAST ROYALE - MATCH (GAME INSTANCE)
// ============================================

import { v4 as uuidv4 } from 'uuid';
import {
  MatchState,
  MatchStatus,
  MatchPhase,
  PlayerState,
  PlayerInput,
  HazardState,
  ChaosEventState,
  DeathEvent,
  ShrinkZone,
  Vector2,
  ServerMessage,
  ProjectileState,
  CoverState,
  VentState,
  DestructibleState,
  PowerUpState,
  ButtonState,
  DoorState,
  EffectZoneState,
  MovementAbilityState,
  ActivePowerUp,
  AbilityDefinition,
  ProjectileEffect,
} from '@beast-royale/shared';
import {
  PHYSICS_TIMESTEP,
  NETWORK_TIMESTEP,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  INITIAL_SAFE_RADIUS,
  FINAL_SAFE_RADIUS,
  OVERTIME_SAFE_RADIUS,
  PHASE_SCATTER_END,
  PHASE_ESCALATION_END,
  PHASE_CRISIS_END,
  PHASE_FINALE_END,
  MATCH_MAX_DURATION,
  SHRINK_START_TIME,
  SHRINK_SPEED_INITIAL,
  SHRINK_SPEED_CRISIS,
  SHRINK_SPEED_FINALE,
  SHRINK_SPEED_OVERTIME,
  CHAOS_EVENT_INTERVAL_MIN,
  CHAOS_EVENT_INTERVAL_MAX,
  BASE_MOVE_SPEED,
  FRICTION,
  INVULNERABILITY_DURATION,
  KILL_CREDIT_DURATION,
  STARTER_BEASTS,
  VENT_TRAVEL_DURATION,
  VENT_COOLDOWN,
  VENT_INTERACT_RANGE,
  DESTRUCTIBLE_HP,
  DESTRUCTIBLE_DROP_CHANCE,
  POWERUP_LIFETIME,
  POWERUP_EFFECTS,
  BUTTON_INTERACT_RANGE,
  SLOW_ZONE_DURATION,
  SLOW_ZONE_AMOUNT,
  VISION_BLOCK_DURATION,
  REWIND_RECORD_INTERVAL,
  REWIND_DURATION,
} from '@beast-royale/shared';
import {
  getBeast,
  getArena,
  SeededRandom,
  vec2,
  vec2Add,
  vec2Scale,
  vec2Normalize,
  vec2Length,
  vec2Distance,
  vec2Sub,
  applyFriction,
  capVelocity,
  calculateKnockback,
  isInDeathZone,
  isOutsideShrinkZone,
  getShrinkZoneDamage,
  getPlayerHitbox,
  bounceOffBoundaries,
  circleCircleCollision,
  pointInRect,
  WEIGHT_MODIFIERS,
} from '@beast-royale/shared';
import {
  selectChaosEvent,
  createChaosEventState,
  getCombinedEffects,
  getAnnouncerLine,
  shouldAnnouncerLie,
  CHAOS_EVENTS,
} from '@beast-royale/shared';
import { ConnectionManager, Connection } from './connections.js';

// Bot player data
interface BotPlayer {
  id: string;
  state: PlayerState;
  targetPosition: Vector2 | null;
  actionCooldown: number;
}

export class Match {
  private id: string;
  private arenaId: string;
  private seed: number;
  private rng: SeededRandom;
  private status: MatchStatus = 'starting';
  private phase: MatchPhase = 'scatter';
  private currentTime: number = 0;
  private players: Map<string, PlayerState> = new Map();
  private bots: Map<string, BotPlayer> = new Map();
  private ghosts: Set<string> = new Set();
  private hazards: Map<string, HazardState> = new Map();
  private activeChaosEvents: ChaosEventState[] = [];
  private shrinkZone: ShrinkZone;
  private deaths: DeathEvent[] = [];
  private connectionManager: ConnectionManager;
  private connections: Connection[];
  private connectionToPlayer: Map<string, string> = new Map();
  private playerToConnection: Map<string, string> = new Map();
  private onMatchEnd: (matchId: string) => void;
  private lastNetworkTick: number = 0;
  private nextChaosEvent: number;
  private inputBuffer: Map<string, PlayerInput[]> = new Map();
  private eliminationOrder: number = 0;

  // New combat system state
  private projectiles: Map<string, ProjectileState> = new Map();
  private coverAreas: Map<string, CoverState> = new Map();
  private vents: Map<string, VentState> = new Map();
  private destructibles: Map<string, DestructibleState> = new Map();
  private powerUps: Map<string, PowerUpState> = new Map();
  private buttons: Map<string, ButtonState> = new Map();
  private doors: Map<string, DoorState> = new Map();
  private effectZones: Map<string, EffectZoneState> = new Map();
  private lastPositionRecordTime: number = 0;

  constructor(
    id: string,
    arenaId: string,
    connections: Connection[],
    botCount: number,
    connectionManager: ConnectionManager,
    onMatchEnd: (matchId: string) => void
  ) {
    this.id = id;
    this.arenaId = arenaId;
    this.seed = Math.floor(Math.random() * 2147483647);
    this.rng = new SeededRandom(this.seed);
    this.connectionManager = connectionManager;
    this.connections = connections;
    this.onMatchEnd = onMatchEnd;

    // Initialize shrink zone
    this.shrinkZone = {
      currentRadius: INITIAL_SAFE_RADIUS,
      targetRadius: INITIAL_SAFE_RADIUS,
      centerX: ARENA_WIDTH / 2,
      centerY: ARENA_HEIGHT / 2,
      shrinkSpeed: 0,
      damagePerSecond: 10,
    };

    // Schedule first chaos event
    this.nextChaosEvent = this.rng.int(CHAOS_EVENT_INTERVAL_MIN, CHAOS_EVENT_INTERVAL_MAX);

    // Initialize players
    this.initializePlayers(connections, botCount);

    // Initialize hazards
    this.initializeHazards();

    // Initialize new arena elements
    this.initializeCoverAreas();
    this.initializeVents();
    this.initializeDestructibles();
    this.initializeInteractiveElements();

    console.log(`[Match ${id}] Created with ${connections.length} players and ${botCount} bots`);
  }

  // ============================================
  // NEW SYSTEM INITIALIZATION
  // ============================================

  private initializeCoverAreas(): void {
    const arena = getArena(this.arenaId);
    if (!arena || !arena.coverAreas) return;

    for (const cover of arena.coverAreas) {
      const state: CoverState = {
        id: cover.id,
        type: cover.type,
        position: { ...cover.position },
        size: { ...cover.size },
        playersInside: [],
      };
      this.coverAreas.set(cover.id, state);
    }
  }

  private initializeVents(): void {
    const arena = getArena(this.arenaId);
    if (!arena || !arena.vents) return;

    for (const vent of arena.vents) {
      const state: VentState = {
        id: vent.id,
        position: { ...vent.position },
        linkedVentId: vent.linkedVentId,
        cooldownUntil: 0,
      };
      this.vents.set(vent.id, state);
    }
  }

  private initializeDestructibles(): void {
    const arena = getArena(this.arenaId);
    if (!arena || !arena.destructibles) return;

    // Size based on destructible type
    const DESTRUCTIBLE_SIZES: Record<string, Vector2> = {
      crate: { x: 40, y: 40 },
      barrel: { x: 30, y: 30 },
      pot: { x: 25, y: 25 },
    };

    for (const dest of arena.destructibles) {
      const maxHp = DESTRUCTIBLE_HP[dest.type] || 20;
      const size = DESTRUCTIBLE_SIZES[dest.type] || { x: 30, y: 30 };
      const state: DestructibleState = {
        id: dest.id,
        type: dest.type,
        position: { ...dest.position },
        size: { ...size },
        health: maxHp,
        maxHealth: maxHp,
      };
      this.destructibles.set(dest.id, state);
    }
  }

  private initializeInteractiveElements(): void {
    const arena = getArena(this.arenaId);
    if (!arena) return;

    // Initialize buttons
    if (arena.buttons) {
      for (const btn of arena.buttons) {
        const state: ButtonState = {
          id: btn.id,
          position: { ...btn.position },
          linkedElementId: btn.linkedElementId,
          type: btn.type,
          isPressed: false,
        };
        this.buttons.set(btn.id, state);
      }
    }

    // Initialize doors
    if (arena.doors) {
      for (const door of arena.doors) {
        const state: DoorState = {
          id: door.id,
          position: { ...door.position },
          size: { ...door.size },
          isOpen: door.isOpen,
        };
        this.doors.set(door.id, state);
      }
    }
  }

  private initializePlayers(connections: Connection[], botCount: number): void {
    const arena = getArena(this.arenaId);
    if (!arena) {
      console.error(`[Match ${this.id}] Arena not found: ${this.arenaId}`);
      return;
    }

    // Shuffle spawn points
    const spawnPoints = [...arena.spawnPoints];
    this.rng.shuffle(spawnPoints);

    let spawnIndex = 0;

    // Create player states for real players
    for (const connection of connections) {
      const playerId = uuidv4();
      const spawn = spawnPoints[spawnIndex % spawnPoints.length];
      spawnIndex++;

      const beast = getBeast(connection.beastId);
      if (!beast) {
        console.error(`[Match ${this.id}] Beast not found: ${connection.beastId}`);
        continue;
      }

      const playerState: PlayerState = {
        id: playerId,
        sessionId: connection.sessionId,
        displayName: connection.displayName,
        beastId: connection.beastId,
        skinId: connection.skinId,
        position: { x: spawn.x, y: spawn.y },
        velocity: { x: 0, y: 0 },
        health: beast.health,
        maxHealth: beast.health,
        knockbackMultiplier: 1.0,
        status: 'alive',
        lastInputSequence: 0,
        attackCooldownRemaining: 0,
        abilityCooldownRemaining: 0,
        abilityCharges: 1,
        facingAngle: 0,
        isAttacking: false,
        isUsingAbility: false,
        invulnerableUntil: 0,
        lastDamagedBy: null,
        // New combat system fields
        aimDirection: { x: 1, y: 0 },
        isHidden: false,
        isInVent: false,
        activePowerUps: [],
        stunUntil: 0,
        slowMultiplier: 1.0,
        positionHistory: [],
      };

      this.players.set(playerId, playerState);
      this.connectionToPlayer.set(connection.id, playerId);
      this.playerToConnection.set(playerId, connection.id);
      this.inputBuffer.set(playerId, []);
    }

    // Create bot players
    for (let i = 0; i < botCount; i++) {
      const botId = `bot_${uuidv4()}`;
      const spawn = spawnPoints[spawnIndex % spawnPoints.length];
      spawnIndex++;

      // Pick random starter beast for bots
      const beastId = this.rng.pick(STARTER_BEASTS);
      const beast = getBeast(beastId)!;

      const botState: PlayerState = {
        id: botId,
        sessionId: botId,
        displayName: this.generateBotName(),
        beastId,
        skinId: null,
        position: { x: spawn.x, y: spawn.y },
        velocity: { x: 0, y: 0 },
        health: beast.health,
        maxHealth: beast.health,
        knockbackMultiplier: 1.0,
        status: 'alive',
        lastInputSequence: 0,
        attackCooldownRemaining: 0,
        abilityCooldownRemaining: 0,
        abilityCharges: 1,
        facingAngle: this.rng.float(0, Math.PI * 2),
        isAttacking: false,
        isUsingAbility: false,
        invulnerableUntil: 0,
        lastDamagedBy: null,
        // New combat system fields
        aimDirection: { x: 1, y: 0 },
        isHidden: false,
        isInVent: false,
        activePowerUps: [],
        stunUntil: 0,
        slowMultiplier: 1.0,
        positionHistory: [],
      };

      this.players.set(botId, botState);
      this.bots.set(botId, {
        id: botId,
        state: botState,
        targetPosition: null,
        actionCooldown: this.rng.float(500, 2000),
      });
    }
  }

  private initializeHazards(): void {
    const arena = getArena(this.arenaId);
    if (!arena) return;

    for (const spawn of arena.hazardSpawns) {
      // Only spawn hazards appropriate for scatter phase
      if (spawn.spawnPhase !== 'scatter') continue;

      const hazardType = this.rng.pick(spawn.possibleTypes);
      const hazardId = uuidv4();

      const hazard: HazardState = {
        id: hazardId,
        type: hazardType,
        position: { ...spawn.position },
        size: this.getHazardSize(hazardType),
        rotation: 0,
        active: true,
        triggerTime: 0,
        damage: this.getHazardDamage(hazardType),
        knockback: this.getHazardKnockback(hazardType),
        knockbackDirection: null,
      };

      this.hazards.set(hazardId, hazard);
    }
  }

  private getHazardSize(type: string): Vector2 {
    const sizes: Record<string, Vector2> = {
      crumbling_tile: { x: 100, y: 100 },
      ice_patch: { x: 120, y: 120 },
      bounce_pad: { x: 80, y: 80 },
      rotating_arm: { x: 200, y: 30 },
      slap_wall: { x: 40, y: 150 },
      rolling_boulder: { x: 60, y: 60 },
      spike_trap: { x: 80, y: 80 },
      fire_vent: { x: 60, y: 60 },
    };
    return sizes[type] || { x: 50, y: 50 };
  }

  private getHazardDamage(type: string): number {
    const damages: Record<string, number> = {
      crumbling_tile: 0,
      ice_patch: 0,
      bounce_pad: 0,
      rotating_arm: 15,
      slap_wall: 10,
      rolling_boulder: 25,
      spike_trap: 20,
      fire_vent: 15,
    };
    return damages[type] || 10;
  }

  private getHazardKnockback(type: string): number {
    const knockbacks: Record<string, number> = {
      crumbling_tile: 0,
      ice_patch: 0,
      bounce_pad: 500,
      rotating_arm: 400,
      slap_wall: 600,
      rolling_boulder: 450,
      spike_trap: 200,
      fire_vent: 300,
    };
    return knockbacks[type] || 200;
  }

  private generateBotName(): string {
    const prefixes = ['Bot', 'AI', 'NPC', 'CPU'];
    const adjectives = ['Happy', 'Silly', 'Brave', 'Sleepy', 'Hungry'];
    const nouns = ['Beast', 'Player', 'Fighter', 'Champion', 'Warrior'];

    const style = this.rng.int(0, 2);
    if (style === 0) {
      return `${this.rng.pick(adjectives)}${this.rng.pick(nouns)}${this.rng.int(1, 99)}`;
    } else if (style === 1) {
      return `${this.rng.pick(nouns)}${this.rng.int(100, 999)}`;
    } else {
      return `${this.rng.pick(prefixes)}_${this.rng.int(1, 999)}`;
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  start(): void {
    this.status = 'running';
    this.currentTime = 0;

    // Send initial state to all players
    this.broadcastSnapshot();

    // Announce match start
    this.announce(
      getAnnouncerLine('match_start', this.rng, { playerCount: String(this.players.size) }),
      'info'
    );

    console.log(`[Match ${this.id}] Started`);
  }

  tick(deltaTime: number): void {
    if (this.status !== 'running') return;

    this.currentTime += deltaTime;

    // Update phase
    this.updatePhase();

    // Process player inputs
    this.processInputs(deltaTime);

    // Update bots
    this.updateBots(deltaTime);

    // Update physics
    this.updatePhysics(deltaTime);

    // Update hazards
    this.updateHazards(deltaTime);

    // Update shrink zone
    this.updateShrinkZone(deltaTime);

    // Update chaos events
    this.updateChaosEvents(deltaTime);

    // New combat system updates
    this.updateProjectiles(deltaTime);
    this.updateMovementAbilities(deltaTime);
    this.updateCoverSystem();
    this.updateVentSystem(deltaTime);
    this.updatePowerUps(deltaTime);
    this.updateEffectZones(deltaTime);
    this.updateInteractiveElements();
    this.recordPositionHistory();

    // Check for deaths
    this.checkDeaths();

    // Check win condition
    this.checkWinCondition();

    // Send network updates
    this.lastNetworkTick += deltaTime;
    if (this.lastNetworkTick >= NETWORK_TIMESTEP) {
      this.broadcastSnapshot();
      this.lastNetworkTick = 0;
    }

    // Check match timeout
    if (this.currentTime >= MATCH_MAX_DURATION) {
      this.forceEndMatch();
    }
  }

  handlePlayerInput(playerId: string, input: PlayerInput): void {
    const buffer = this.inputBuffer.get(playerId);
    if (buffer) {
      buffer.push(input);
      // Keep only last 10 inputs
      if (buffer.length > 10) {
        buffer.shift();
      }
    }
  }

  handlePanic(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.status !== 'alive') return;

    // Handle panic button effect
    const outcome = this.selectPanicOutcome();
    this.applyPanicEffect(player, outcome);

    console.log(`[Match ${this.id}] Player ${player.displayName} panicked: ${outcome}`);
  }

  handleFinalWords(playerId: string, message: string): void {
    // Find the death event and update it
    const death = this.deaths.find((d) => d.victimId === playerId && !d.finalWords);
    if (death) {
      death.finalWords = message;
    }
  }

  handlePlayerDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    if (player.status === 'alive') {
      // Convert to ghost (treated as elimination)
      this.eliminatePlayer(player, 'self', 'disconnect', []);
    }

    console.log(`[Match ${this.id}] Player ${player.displayName} disconnected`);
  }

  getPlayerIdForConnection(connectionId: string): string | undefined {
    return this.connectionToPlayer.get(connectionId);
  }

  getConnections(): Connection[] {
    return this.connections;
  }

  forceEnd(): void {
    this.forceEndMatch();
  }

  // ============================================
  // GAME LOGIC
  // ============================================

  private updatePhase(): void {
    const oldPhase = this.phase;

    if (this.currentTime < PHASE_SCATTER_END) {
      this.phase = 'scatter';
    } else if (this.currentTime < PHASE_ESCALATION_END) {
      this.phase = 'escalation';
    } else if (this.currentTime < PHASE_CRISIS_END) {
      this.phase = 'crisis';
    } else if (this.currentTime < PHASE_FINALE_END) {
      this.phase = 'finale';
    } else {
      this.phase = 'overtime';
    }

    if (this.phase !== oldPhase) {
      console.log(`[Match ${this.id}] Phase changed to ${this.phase}`);
      this.onPhaseChange(oldPhase, this.phase);
    }
  }

  private onPhaseChange(oldPhase: MatchPhase, newPhase: MatchPhase): void {
    // Spawn new hazards for this phase
    const arena = getArena(this.arenaId);
    if (arena) {
      for (const spawn of arena.hazardSpawns) {
        if (spawn.spawnPhase === newPhase) {
          const hazardType = this.rng.pick(spawn.possibleTypes);
          const hazardId = uuidv4();

          const hazard: HazardState = {
            id: hazardId,
            type: hazardType,
            position: { ...spawn.position },
            size: this.getHazardSize(hazardType),
            rotation: 0,
            active: true,
            triggerTime: this.currentTime,
            damage: this.getHazardDamage(hazardType),
            knockback: this.getHazardKnockback(hazardType),
            knockbackDirection: null,
          };

          this.hazards.set(hazardId, hazard);
        }
      }
    }

    // Update shrink speed
    if (newPhase === 'escalation') {
      this.shrinkZone.shrinkSpeed = SHRINK_SPEED_INITIAL;
      this.shrinkZone.targetRadius = FINAL_SAFE_RADIUS * 2;
    } else if (newPhase === 'crisis') {
      this.shrinkZone.shrinkSpeed = SHRINK_SPEED_CRISIS;
      this.shrinkZone.targetRadius = FINAL_SAFE_RADIUS * 1.5;
    } else if (newPhase === 'finale') {
      this.shrinkZone.shrinkSpeed = SHRINK_SPEED_FINALE;
      this.shrinkZone.targetRadius = FINAL_SAFE_RADIUS;
    } else if (newPhase === 'overtime') {
      this.shrinkZone.shrinkSpeed = SHRINK_SPEED_OVERTIME;
      this.shrinkZone.targetRadius = OVERTIME_SAFE_RADIUS;
      this.announce('OVERTIME! The arena is collapsing!', 'warning');
    }
  }

  private processInputs(deltaTime: number): void {
    for (const [playerId, buffer] of this.inputBuffer) {
      const player = this.players.get(playerId);
      if (!player || player.status !== 'alive') continue;

      // Skip if stunned
      if (player.stunUntil > this.currentTime) continue;

      // Skip movement if in vent
      if (player.isInVent) continue;

      // Process latest input
      const input = buffer.pop();
      buffer.length = 0;  // Clear buffer

      if (!input) continue;

      const beast = getBeast(player.beastId);
      if (!beast) continue;

      // Update aim direction from input
      if (input.aimDirection && (input.aimDirection.x !== 0 || input.aimDirection.y !== 0)) {
        player.aimDirection = vec2Normalize(input.aimDirection);
      }

      // Get chaos effects
      const effects = getCombinedEffects(this.activeChaosEvents);

      // Handle movement (skip if in movement ability)
      if (!player.movementAbility || player.movementAbility.type === 'speed_boost') {
        let moveDir = { x: input.movement.x, y: input.movement.y };

        // Reverse controls if chaos event active
        if (effects.controlsReversed) {
          moveDir = { x: -moveDir.x, y: -moveDir.y };
        }

        // Normalize movement
        const moveLen = vec2Length(moveDir);
        if (moveLen > 0) {
          moveDir = vec2Normalize(moveDir);

          // Calculate speed
          const weightMod = WEIGHT_MODIFIERS[beast.weight];
          let speed = BASE_MOVE_SPEED * beast.speed * weightMod.speedMultiplier;
          speed *= effects.speedMultiplier || 1.0;

          // Apply slow multiplier from effect zones
          speed *= player.slowMultiplier;

          // Apply power-up speed boost
          speed *= this.getPlayerPowerUpMultiplier(player, 'speed');

          // Apply movement ability speed boost
          if (player.movementAbility?.speedMultiplier) {
            speed *= player.movementAbility.speedMultiplier;
          }

          // Apply to velocity
          const moveForce = vec2Scale(moveDir, speed * (deltaTime / 1000) * 10);
          player.velocity = vec2Add(player.velocity, moveForce);

          // Update facing angle
          player.facingAngle = Math.atan2(moveDir.y, moveDir.x);
        }
      }

      // Handle interact (E key for vents)
      if (input.interact) {
        this.tryEnterVent(player);
      }

      // Handle attack (reveals from cover)
      if (input.attack && player.attackCooldownRemaining <= 0) {
        player.isHidden = false;  // Reveal from cover
        this.performAttack(player);
        player.attackCooldownRemaining = beast.attackCooldown;
      }

      // Handle ability (reveals from cover)
      if (input.ability && player.abilityCooldownRemaining <= 0 && player.abilityCharges > 0) {
        player.isHidden = false;  // Reveal from cover
        this.performAbility(player);
        player.abilityCooldownRemaining = beast.abilityCooldown;
        player.abilityCharges--;
      }

      // Update cooldowns
      player.attackCooldownRemaining = Math.max(0, player.attackCooldownRemaining - deltaTime);
      player.abilityCooldownRemaining = Math.max(0, player.abilityCooldownRemaining - deltaTime);

      // Regenerate ability charge when cooldown is ready
      if (player.abilityCooldownRemaining <= 0 && player.abilityCharges < 1) {
        player.abilityCharges = 1;
      }

      player.lastInputSequence = input.sequenceNumber;
    }
  }

  private updateBots(deltaTime: number): void {
    for (const bot of this.bots.values()) {
      const player = this.players.get(bot.id);
      if (!player || player.status !== 'alive') continue;

      bot.actionCooldown -= deltaTime;

      if (bot.actionCooldown <= 0) {
        // Pick new action
        bot.actionCooldown = this.rng.float(500, 1500);

        // Find nearest player
        let nearestPlayer: PlayerState | null = null;
        let nearestDist = Infinity;

        for (const other of this.players.values()) {
          if (other.id === bot.id || other.status !== 'alive') continue;
          const dist = vec2Distance(player.position, other.position);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = other;
          }
        }

        if (nearestPlayer && nearestDist < 150) {
          // Attack if close
          if (player.attackCooldownRemaining <= 0) {
            this.performAttack(player);
            player.attackCooldownRemaining = getBeast(player.beastId)!.attackCooldown;
          }
        } else if (nearestPlayer) {
          // Move toward nearest player
          bot.targetPosition = nearestPlayer.position;
        } else {
          // Move toward center (staying safe)
          bot.targetPosition = {
            x: this.shrinkZone.centerX + this.rng.float(-100, 100),
            y: this.shrinkZone.centerY + this.rng.float(-100, 100),
          };
        }
      }

      // Move toward target
      if (bot.targetPosition) {
        const dir = vec2Normalize(vec2Sub(bot.targetPosition, player.position));
        const beast = getBeast(player.beastId)!;
        const speed = BASE_MOVE_SPEED * beast.speed * 0.8;  // Bots are slightly slower
        const moveForce = vec2Scale(dir, speed * (deltaTime / 1000) * 8);
        player.velocity = vec2Add(player.velocity, moveForce);
        player.facingAngle = Math.atan2(dir.y, dir.x);
      }

      // Update cooldowns
      player.attackCooldownRemaining = Math.max(0, player.attackCooldownRemaining - deltaTime);
      player.abilityCooldownRemaining = Math.max(0, player.abilityCooldownRemaining - deltaTime);

      // Regenerate ability charge when cooldown is ready
      if (player.abilityCooldownRemaining <= 0 && player.abilityCharges < 1) {
        player.abilityCharges = 1;
      }
    }
  }

  private updatePhysics(deltaTime: number): void {
    const effects = getCombinedEffects(this.activeChaosEvents);
    const friction = FRICTION * (effects.frictionMultiplier || 1.0);

    for (const player of this.players.values()) {
      if (player.status !== 'alive') continue;

      // Apply friction
      player.velocity = applyFriction(player.velocity, friction);

      // Cap velocity
      player.velocity = capVelocity(player.velocity);

      // Update position
      player.position = vec2Add(
        player.position,
        vec2Scale(player.velocity, deltaTime / 1000)
      );

      // Bounce off boundaries
      const hitbox = getPlayerHitbox(player);
      const bounced = bounceOffBoundaries(player.position, player.velocity, hitbox.radius);
      player.position = bounced.position;
      player.velocity = bounced.velocity;

      // Update invulnerability
      if (player.invulnerableUntil > 0 && this.currentTime >= player.invulnerableUntil) {
        player.invulnerableUntil = 0;
      }

      // Clear last damaged by after timeout
      if (player.lastDamagedBy && this.currentTime > (player as any).lastDamagedAt + KILL_CREDIT_DURATION) {
        player.lastDamagedBy = null;
      }
    }

    // Player-player collisions
    const playerList = Array.from(this.players.values()).filter(p => p.status === 'alive');
    for (let i = 0; i < playerList.length; i++) {
      for (let j = i + 1; j < playerList.length; j++) {
        const a = playerList[i];
        const b = playerList[j];

        const hitboxA = getPlayerHitbox(a);
        const hitboxB = getPlayerHitbox(b);

        if (circleCircleCollision(hitboxA, hitboxB)) {
          // Push apart
          const overlap = (hitboxA.radius + hitboxB.radius) - vec2Distance(a.position, b.position);
          if (overlap > 0) {
            const pushDir = vec2Normalize(vec2Sub(a.position, b.position));
            const push = vec2Scale(pushDir, overlap / 2);
            a.position = vec2Add(a.position, push);
            b.position = vec2Sub(b.position, push);
          }
        }
      }
    }

    // Player-destructible collisions (solid objects)
    for (const player of playerList) {
      const playerHitbox = getPlayerHitbox(player);

      for (const destructible of this.destructibles.values()) {
        // Treat destructible as a circle for collision
        const objRadius = Math.max(destructible.size.x, destructible.size.y) / 2;
        const dist = vec2Distance(player.position, destructible.position);
        const minDist = playerHitbox.radius + objRadius;

        if (dist < minDist && dist > 0) {
          // Push player out
          const pushDir = vec2Normalize(vec2Sub(player.position, destructible.position));
          const overlap = minDist - dist;
          player.position = vec2Add(player.position, vec2Scale(pushDir, overlap));
        }
      }
    }

    // Player-door collisions (when closed)
    for (const player of playerList) {
      const playerHitbox = getPlayerHitbox(player);

      for (const door of this.doors.values()) {
        if (door.isOpen) continue;  // Open doors don't block

        // Check if player is inside door bounds
        const halfW = door.size.x / 2;
        const halfH = door.size.y / 2;
        const doorLeft = door.position.x - halfW;
        const doorRight = door.position.x + halfW;
        const doorTop = door.position.y - halfH;
        const doorBottom = door.position.y + halfH;

        // Find closest point on door rectangle to player
        const closestX = Math.max(doorLeft, Math.min(player.position.x, doorRight));
        const closestY = Math.max(doorTop, Math.min(player.position.y, doorBottom));

        const dist = vec2Distance(player.position, { x: closestX, y: closestY });

        if (dist < playerHitbox.radius) {
          // Push player out
          const pushDir = vec2Normalize(vec2Sub(player.position, { x: closestX, y: closestY }));
          const overlap = playerHitbox.radius - dist;
          player.position = vec2Add(player.position, vec2Scale(pushDir, overlap + 1));
        }
      }
    }
  }

  private updateHazards(deltaTime: number): void {
    for (const hazard of this.hazards.values()) {
      if (!hazard.active) continue;

      // Update rotating hazards
      if (hazard.type === 'rotating_arm') {
        hazard.rotation += (Math.PI / 2) * (deltaTime / 1000);  // 90 degrees per second
      }

      // Check player collisions with hazards
      for (const player of this.players.values()) {
        if (player.status !== 'alive') continue;
        if (player.invulnerableUntil > this.currentTime) continue;

        const hitbox = getPlayerHitbox(player);
        const hazardCenter = hazard.position;

        // Simple distance check for now
        const dist = vec2Distance(player.position, hazardCenter);
        const hazardRadius = Math.max(hazard.size.x, hazard.size.y) / 2;

        if (dist < hitbox.radius + hazardRadius) {
          this.applyHazardEffect(player, hazard);
        }
      }
    }
  }

  private applyHazardEffect(player: PlayerState, hazard: HazardState): void {
    const effects = getCombinedEffects(this.activeChaosEvents);

    // Apply damage
    if (hazard.damage > 0) {
      player.health -= hazard.damage;
      player.invulnerableUntil = this.currentTime + INVULNERABILITY_DURATION;
    }

    // Apply knockback
    if (hazard.knockback > 0) {
      let knockbackDir: Vector2;
      if (hazard.knockbackDirection) {
        knockbackDir = hazard.knockbackDirection;
      } else {
        knockbackDir = vec2Normalize(vec2Sub(player.position, hazard.position));
      }

      let knockback = hazard.knockback * (effects.knockbackMultiplier || 1.0);

      // Bounce pads have extra bounce
      if (hazard.type === 'bounce_pad') {
        knockback *= (effects.bounceMultiplier || 1.0);
      }

      player.velocity = vec2Add(player.velocity, vec2Scale(knockbackDir, knockback));
    }

    // Special effects
    if (hazard.type === 'ice_patch') {
      // Extra slippery
      player.velocity = vec2Scale(player.velocity, 1.2);
    }
  }

  private updateShrinkZone(deltaTime: number): void {
    if (this.currentTime < SHRINK_START_TIME) return;

    if (this.shrinkZone.currentRadius > this.shrinkZone.targetRadius) {
      this.shrinkZone.currentRadius -= this.shrinkZone.shrinkSpeed * (deltaTime / 1000);
      this.shrinkZone.currentRadius = Math.max(
        this.shrinkZone.currentRadius,
        this.shrinkZone.targetRadius
      );
    }

    // Apply damage to players outside zone
    for (const player of this.players.values()) {
      if (player.status !== 'alive') continue;

      const damage = getShrinkZoneDamage(player.position, this.shrinkZone, deltaTime);
      if (damage > 0) {
        player.health -= damage;
      }
    }
  }

  private updateChaosEvents(deltaTime: number): void {
    // Remove expired events
    this.activeChaosEvents = this.activeChaosEvents.filter((event) => {
      const elapsed = this.currentTime - event.startTime;
      return elapsed < event.duration;
    });

    // Trigger new events
    if (this.currentTime >= this.nextChaosEvent) {
      this.triggerChaosEvent();

      // Schedule next event (faster in later phases)
      let interval = this.rng.int(CHAOS_EVENT_INTERVAL_MIN, CHAOS_EVENT_INTERVAL_MAX);
      if (this.phase === 'crisis') interval *= 0.7;
      if (this.phase === 'finale') interval *= 0.5;
      if (this.phase === 'overtime') interval *= 0.3;

      this.nextChaosEvent = this.currentTime + interval;
    }
  }

  private triggerChaosEvent(): void {
    const excludeTypes = this.activeChaosEvents.map((e) => e.type);
    const eventDef = selectChaosEvent(this.phase, this.rng, excludeTypes);

    if (!eventDef) return;

    const event = createChaosEventState(eventDef, this.rng, this.currentTime);
    this.activeChaosEvents.push(event);

    // Announce
    this.announce(event.announcement, 'chaos');

    console.log(`[Match ${this.id}] Chaos event: ${eventDef.name}`);
  }

  private checkDeaths(): void {
    for (const player of this.players.values()) {
      if (player.status !== 'alive') continue;

      let shouldDie = false;
      let cause: 'hazard' | 'player' | 'boundary' | 'self' | 'shrink' = 'self';
      let causeDetail = '';

      // Check health
      if (player.health <= 0) {
        shouldDie = true;
        if (player.lastDamagedBy) {
          cause = 'player';
          causeDetail = player.lastDamagedBy;
        } else {
          cause = 'hazard';
          causeDetail = 'damage';
        }
      }

      // Check death zone
      if (isInDeathZone(player.position)) {
        shouldDie = true;
        cause = 'boundary';
        causeDetail = 'fell_off';
      }

      if (shouldDie) {
        const killChain = this.buildKillChain(player);
        this.eliminatePlayer(player, cause, causeDetail, killChain);
      }
    }
  }

  private buildKillChain(victim: PlayerState): { type: 'player' | 'hazard' | 'chaos'; id: string; name: string }[] {
    const chain: { type: 'player' | 'hazard' | 'chaos'; id: string; name: string }[] = [];

    if (victim.lastDamagedBy) {
      const attacker = this.players.get(victim.lastDamagedBy);
      if (attacker) {
        chain.push({ type: 'player', id: attacker.id, name: attacker.displayName });
      }
    }

    return chain;
  }

  private eliminatePlayer(
    player: PlayerState,
    cause: 'hazard' | 'player' | 'boundary' | 'self' | 'shrink',
    causeDetail: string,
    killChain: { type: 'player' | 'hazard' | 'chaos'; id: string; name: string }[]
  ): void {
    player.status = 'dead';
    this.ghosts.add(player.id);
    this.eliminationOrder++;

    const remainingPlayers = Array.from(this.players.values()).filter(p => p.status === 'alive').length;
    const placement = remainingPlayers + 1;

    const death: DeathEvent = {
      victimId: player.id,
      victimName: player.displayName,
      timestamp: this.currentTime,
      position: { ...player.position },
      cause,
      causeDetail,
      killChain,
      placement,
      finalWords: null,
    };

    this.deaths.push(death);

    // Broadcast death
    this.broadcast({
      type: 'death',
      data: death,
    });

    // Announce
    if (this.deaths.length === 1) {
      this.announce(getAnnouncerLine('first_elimination', this.rng), 'death');
    } else {
      this.announce(getAnnouncerLine('generic_death', this.rng), 'death');
    }

    // Announce remaining players
    if (remainingPlayers === 3) {
      this.announce(getAnnouncerLine('final_three', this.rng), 'info');
    } else if (remainingPlayers === 2) {
      this.announce(getAnnouncerLine('final_two', this.rng), 'info');
    }

    console.log(`[Match ${this.id}] ${player.displayName} eliminated (${remainingPlayers} remaining)`);
  }

  private checkWinCondition(): void {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.status === 'alive');

    if (alivePlayers.length <= 1) {
      this.endMatch(alivePlayers[0] || null);
    }
  }

  private endMatch(winner: PlayerState | null): void {
    this.status = 'ended';

    // Build placements
    const placements = this.deaths
      .sort((a, b) => b.placement - a.placement)
      .map((d, index) => ({
        playerId: d.victimId,
        name: d.victimName,
        placement: d.placement,
        eliminations: this.countEliminations(d.victimId),
      }));

    if (winner) {
      placements.unshift({
        playerId: winner.id,
        name: winner.displayName,
        placement: 1,
        eliminations: this.countEliminations(winner.id),
      });
    }

    // Send end message to each player with their stats
    for (const connection of this.connections) {
      const playerId = this.connectionToPlayer.get(connection.id);
      if (!playerId) continue;

      const player = this.players.get(playerId);
      if (!player) continue;

      const death = this.deaths.find(d => d.victimId === playerId);
      const placement = death?.placement || 1;

      this.connectionManager.send(connection, {
        type: 'end',
        data: {
          winnerId: winner?.id || null,
          winnerName: winner?.displayName || null,
          isDraw: !winner,
          placements,
          yourStats: {
            placement,
            eliminations: this.countEliminations(playerId),
            damageDealt: 0,  // Would track this properly
            timeAlive: death?.timestamp || this.currentTime,
            chaosEventsSurvived: this.activeChaosEvents.length,
            xpEarned: this.calculateXP(playerId, placement),
          },
        },
      });
    }

    // Announce winner
    if (winner) {
      this.announce(
        getAnnouncerLine('victory', this.rng, { winnerName: winner.displayName }),
        'victory'
      );
    } else {
      this.announce(getAnnouncerLine('draw', this.rng), 'victory');
    }

    console.log(`[Match ${this.id}] Ended - Winner: ${winner?.displayName || 'DRAW'}`);

    // Notify matchmaker
    setTimeout(() => this.onMatchEnd(this.id), 3000);
  }

  private forceEndMatch(): void {
    // Find player with most health
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.status === 'alive')
      .sort((a, b) => b.health - a.health);

    this.endMatch(alivePlayers[0] || null);
  }

  private countEliminations(playerId: string): number {
    return this.deaths.filter(d =>
      d.killChain.some(k => k.type === 'player' && k.id === playerId)
    ).length;
  }

  private calculateXP(playerId: string, placement: number): number {
    let xp = 10;  // Base completion
    xp += this.countEliminations(playerId) * 5;
    if (placement === 1) xp += 25;
    else if (placement <= 3) xp += 10;
    return xp;
  }

  // ============================================
  // PROJECTILE SYSTEM
  // ============================================

  private updateProjectiles(deltaTime: number): void {
    const toRemove: string[] = [];

    for (const [id, proj] of this.projectiles) {
      // Update lifetime
      proj.lifetime -= deltaTime;
      if (proj.lifetime <= 0) {
        toRemove.push(id);
        continue;
      }

      // Handle homing behavior
      if (proj.behavior === 'homing' && proj.homingTarget) {
        const target = this.players.get(proj.homingTarget);
        if (target && target.status === 'alive') {
          const toTarget = vec2Sub(target.position, proj.position);
          const targetDir = vec2Normalize(toTarget);
          const currentDir = vec2Normalize(proj.velocity);
          const speed = vec2Length(proj.velocity);

          // Blend current direction with target direction
          const homingStrength = 0.03;  // Adjust for more/less homing
          const newDir = vec2Normalize(vec2Add(
            vec2Scale(currentDir, 1 - homingStrength),
            vec2Scale(targetDir, homingStrength)
          ));
          proj.velocity = vec2Scale(newDir, speed);
          proj.angle = Math.atan2(proj.velocity.y, proj.velocity.x);
        }
      }

      // Update position
      proj.position = vec2Add(
        proj.position,
        vec2Scale(proj.velocity, deltaTime / 1000)
      );

      // Check collision with players
      for (const player of this.players.values()) {
        if (player.id === proj.ownerId) continue;  // Don't hit self
        if (player.status !== 'alive') continue;
        if (player.invulnerableUntil > this.currentTime) continue;
        if (player.isInVent) continue;

        // Skip if already hit (for chain lightning)
        if (proj.chainHit.includes(player.id)) continue;

        const dist = vec2Distance(proj.position, player.position);
        const playerRadius = 25;

        if (dist < proj.radius + playerRadius) {
          this.applyProjectileHit(proj, player);

          // Handle chain behavior
          if (proj.behavior === 'chain') {
            proj.chainHit.push(player.id);
            // Find next target
            const nextTarget = this.findChainTarget(proj, player.position, 150);
            if (nextTarget && proj.chainHit.length < 4) {
              const toNext = vec2Normalize(vec2Sub(nextTarget.position, proj.position));
              proj.velocity = vec2Scale(toNext, vec2Length(proj.velocity));
            } else {
              toRemove.push(id);
            }
          } else if (!proj.piercing) {
            // Non-piercing projectile dies on hit
            toRemove.push(id);
          }
          break;
        }
      }

      // Check collision with destructibles
      for (const [destId, dest] of this.destructibles) {
        const dist = vec2Distance(proj.position, dest.position);
        if (dist < proj.radius + 25) {
          this.damageDestructible(destId, proj.damage);
          if (!proj.piercing) {
            toRemove.push(id);
          }
          break;
        }
      }

      // Remove if out of bounds
      if (proj.position.x < -50 || proj.position.x > ARENA_WIDTH + 50 ||
          proj.position.y < -50 || proj.position.y > ARENA_HEIGHT + 50) {
        toRemove.push(id);
      }
    }

    // Remove expired/hit projectiles
    for (const id of toRemove) {
      const proj = this.projectiles.get(id);
      if (proj?.effect && proj.effect.type !== 'none') {
        this.spawnEffectZone(proj.position, proj.effect, proj.ownerId);
      }
      this.projectiles.delete(id);
    }
  }

  private applyProjectileHit(proj: ProjectileState, target: PlayerState): void {
    // Apply damage
    target.health -= proj.damage;

    // Apply knockback
    const knockbackDir = vec2Normalize(vec2Sub(target.position, proj.position));
    target.velocity = vec2Add(target.velocity, vec2Scale(knockbackDir, proj.knockback));

    // Track attacker for kill credit
    target.lastDamagedBy = proj.ownerId;
    (target as any).lastDamagedAt = this.currentTime;

    // Brief invulnerability
    target.invulnerableUntil = this.currentTime + INVULNERABILITY_DURATION;

    // Increase knockback multiplier
    target.knockbackMultiplier += 0.05;
  }

  private findChainTarget(proj: ProjectileState, fromPos: Vector2, range: number): PlayerState | null {
    let nearest: PlayerState | null = null;
    let nearestDist = range;

    for (const player of this.players.values()) {
      if (player.id === proj.ownerId) continue;
      if (player.status !== 'alive') continue;
      if (proj.chainHit.includes(player.id)) continue;

      const dist = vec2Distance(fromPos, player.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }

    return nearest;
  }

  private spawnProjectile(
    owner: PlayerState,
    abilityConfig: NonNullable<AbilityDefinition['projectile']>,
    direction: Vector2,
    index: number = 0
  ): void {
    const id = uuidv4();

    // Calculate spread angle for multi-projectiles
    let angle = Math.atan2(direction.y, direction.x);
    if (abilityConfig.count > 1 && abilityConfig.spreadAngle) {
      const spreadOffset = (index - (abilityConfig.count - 1) / 2) * (abilityConfig.spreadAngle / (abilityConfig.count - 1));
      angle += spreadOffset;
    }

    const velocity = vec2FromAngle(angle, abilityConfig.speed);

    const proj: ProjectileState = {
      id,
      ownerId: owner.id,
      ownerName: owner.displayName,
      abilityId: getBeast(owner.beastId)?.ability?.id || 'unknown',
      position: { ...owner.position },
      velocity,
      angle,
      damage: abilityConfig.damage,
      knockback: abilityConfig.knockback,
      piercing: abilityConfig.piercing,
      lifetime: abilityConfig.lifetime,
      maxLifetime: abilityConfig.lifetime,
      radius: abilityConfig.radius,
      behavior: abilityConfig.behavior,
      chainHit: [],
      effect: abilityConfig.effect,
    };

    // For homing projectiles, find initial target
    if (abilityConfig.behavior === 'homing') {
      const target = this.findNearestEnemy(owner);
      if (target) {
        proj.homingTarget = target.id;
      }
    }

    this.projectiles.set(id, proj);
  }

  private findNearestEnemy(player: PlayerState): PlayerState | null {
    let nearest: PlayerState | null = null;
    let nearestDist = Infinity;

    for (const other of this.players.values()) {
      if (other.id === player.id || other.status !== 'alive') continue;
      const dist = vec2Distance(player.position, other.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }

    return nearest;
  }

  // ============================================
  // MOVEMENT ABILITIES
  // ============================================

  private updateMovementAbilities(deltaTime: number): void {
    for (const player of this.players.values()) {
      if (!player.movementAbility) continue;

      const ability = player.movementAbility;
      const elapsed = this.currentTime - ability.startTime;

      if (elapsed >= ability.duration) {
        // Ability ended
        this.endMovementAbility(player);
      } else {
        // Apply ability effects
        switch (ability.type) {
          case 'dash':
            // Dash moves player toward target
            if (ability.targetPosition) {
              const t = elapsed / ability.duration;
              player.position = vec2Lerp(ability.startPosition, ability.targetPosition, t);
            }
            break;

          case 'speed_boost':
            // Speed multiplier is applied in processInputs
            break;

          case 'phase':
            // Invulnerability is handled via player.invulnerableUntil
            break;
        }
      }
    }
  }

  private startMovementAbility(player: PlayerState, ability: AbilityDefinition): void {
    if (!ability.movement) return;

    const config = ability.movement;

    switch (config.movementType) {
      case 'dash': {
        const direction = vec2Normalize(player.aimDirection);
        const distance = config.distance || 200;
        const targetPos = vec2Add(player.position, vec2Scale(direction, distance));

        // Clamp to arena bounds
        targetPos.x = Math.max(30, Math.min(ARENA_WIDTH - 30, targetPos.x));
        targetPos.y = Math.max(30, Math.min(ARENA_HEIGHT - 30, targetPos.y));

        player.movementAbility = {
          playerId: player.id,
          type: 'dash',
          startTime: this.currentTime,
          duration: 200,  // Dash takes 200ms
          startPosition: { ...player.position },
          targetPosition: targetPos,
          invulnerable: config.invulnerable || false,
        };

        if (config.invulnerable) {
          player.invulnerableUntil = this.currentTime + 200;
        }
        break;
      }

      case 'teleport': {
        // For tax raccoon - teleport to random nearby position
        const direction = vec2Normalize(player.aimDirection);
        const distance = config.distance || 200;
        const targetPos = vec2Add(player.position, vec2Scale(direction, distance));

        // Clamp to arena bounds
        targetPos.x = Math.max(30, Math.min(ARENA_WIDTH - 30, targetPos.x));
        targetPos.y = Math.max(30, Math.min(ARENA_HEIGHT - 30, targetPos.y));

        // Instant teleport
        player.position = targetPos;

        if (config.invulnerable) {
          player.invulnerableUntil = this.currentTime + 300;
        }
        break;
      }

      case 'speed_boost': {
        player.movementAbility = {
          playerId: player.id,
          type: 'speed_boost',
          startTime: this.currentTime,
          duration: config.duration || 2000,
          startPosition: { ...player.position },
          speedMultiplier: config.speedMultiplier || 2.0,
          invulnerable: false,
        };
        break;
      }

      case 'phase': {
        player.movementAbility = {
          playerId: player.id,
          type: 'phase',
          startTime: this.currentTime,
          duration: config.duration || 2000,
          startPosition: { ...player.position },
          speedMultiplier: config.speedMultiplier || 1.5,
          invulnerable: true,
        };
        player.invulnerableUntil = this.currentTime + (config.duration || 2000);
        break;
      }

      case 'rewind': {
        // Find position from 3 seconds ago
        const rewindMs = config.rewindDuration || 3000;
        const historyNeeded = Math.floor(rewindMs / REWIND_RECORD_INTERVAL);
        const historyIndex = Math.min(historyNeeded, player.positionHistory.length - 1);

        if (historyIndex >= 0 && player.positionHistory.length > 0) {
          const rewindPos = player.positionHistory[player.positionHistory.length - 1 - historyIndex];
          player.position = { ...rewindPos };
          player.velocity = { x: 0, y: 0 };

          if (config.invulnerable) {
            player.invulnerableUntil = this.currentTime + 500;
          }
        }
        break;
      }
    }
  }

  private endMovementAbility(player: PlayerState): void {
    if (!player.movementAbility) return;

    const ability = player.movementAbility;

    // Apply end-of-dash knockback if applicable
    if (ability.type === 'dash') {
      const beast = getBeast(player.beastId);
      const abilityDef = beast?.ability;
      if (abilityDef?.movement?.knockbackOnEnd) {
        // Knockback enemies at end position
        this.aoeKnockback(player.position, 80, abilityDef.movement.knockbackOnEnd);
      }
    }

    player.movementAbility = undefined;
  }

  private recordPositionHistory(): void {
    // Record position every REWIND_RECORD_INTERVAL ms
    if (this.currentTime - this.lastPositionRecordTime < REWIND_RECORD_INTERVAL) return;
    this.lastPositionRecordTime = this.currentTime;

    const maxHistory = Math.ceil(REWIND_DURATION / REWIND_RECORD_INTERVAL);

    for (const player of this.players.values()) {
      if (player.status !== 'alive') continue;

      player.positionHistory.push({ ...player.position });

      // Keep only last 3 seconds of history
      while (player.positionHistory.length > maxHistory) {
        player.positionHistory.shift();
      }
    }
  }

  // ============================================
  // COVER SYSTEM
  // ============================================

  private updateCoverSystem(): void {
    // Reset all cover player lists
    for (const cover of this.coverAreas.values()) {
      cover.playersInside = [];
    }

    // Check which players are in cover
    for (const player of this.players.values()) {
      if (player.status !== 'alive') continue;
      if (player.isAttacking || player.isUsingAbility) {
        player.isHidden = false;
        continue;
      }

      let inCover = false;

      for (const cover of this.coverAreas.values()) {
        if (this.isPlayerInCover(player, cover)) {
          cover.playersInside.push(player.id);
          inCover = true;
          break;
        }
      }

      player.isHidden = inCover;
    }
  }

  private isPlayerInCover(player: PlayerState, cover: CoverState): boolean {
    const halfW = cover.size.x / 2;
    const halfH = cover.size.y / 2;

    return (
      player.position.x >= cover.position.x - halfW &&
      player.position.x <= cover.position.x + halfW &&
      player.position.y >= cover.position.y - halfH &&
      player.position.y <= cover.position.y + halfH
    );
  }

  // ============================================
  // VENT SYSTEM
  // ============================================

  private updateVentSystem(deltaTime: number): void {
    // Check for players exiting vents
    for (const player of this.players.values()) {
      if (!player.isInVent) continue;

      // Check if travel time is complete
      const ventTravelEnd = (player as any).ventTravelEndTime || 0;
      if (this.currentTime >= ventTravelEnd) {
        // Exit vent
        const exitVentId = (player as any).ventExitId;
        const exitVent = this.vents.get(exitVentId);
        if (exitVent) {
          player.position = { ...exitVent.position };
          exitVent.cooldownUntil = this.currentTime + VENT_COOLDOWN;
        }
        player.isInVent = false;
        player.invulnerableUntil = this.currentTime + 500;  // Brief invuln on exit
        (player as any).ventTravelEndTime = undefined;
        (player as any).ventExitId = undefined;
      }
    }
  }

  private tryEnterVent(player: PlayerState): boolean {
    if (player.isInVent) return false;

    // Find nearest vent
    for (const vent of this.vents.values()) {
      const dist = vec2Distance(player.position, vent.position);
      if (dist < VENT_INTERACT_RANGE && vent.cooldownUntil < this.currentTime) {
        // Enter vent
        player.isInVent = true;
        player.isHidden = false;
        (player as any).ventTravelEndTime = this.currentTime + VENT_TRAVEL_DURATION;
        (player as any).ventExitId = vent.linkedVentId;

        // Put entry vent on cooldown
        vent.cooldownUntil = this.currentTime + VENT_COOLDOWN;

        return true;
      }
    }

    return false;
  }

  // ============================================
  // DESTRUCTIBLES & POWER-UPS
  // ============================================

  private damageDestructible(id: string, damage: number): void {
    const dest = this.destructibles.get(id);
    if (!dest) return;

    dest.health -= damage;

    if (dest.health <= 0) {
      // Spawn power-up at location
      if (this.rng.next() < DESTRUCTIBLE_DROP_CHANCE) {
        this.spawnPowerUp(dest.position);
      }
      this.destructibles.delete(id);
    }
  }

  private spawnPowerUp(position: Vector2): void {
    const types: Array<'speed_boost' | 'damage_boost' | 'shield' | 'ability_refresh'> = [
      'speed_boost', 'damage_boost', 'shield', 'ability_refresh'
    ];
    const type = this.rng.pick(types);

    const id = uuidv4();
    const powerUp: PowerUpState = {
      id,
      type,
      position: { ...position },
      spawnTime: this.currentTime,
      lifetime: POWERUP_LIFETIME,
    };

    this.powerUps.set(id, powerUp);
  }

  private updatePowerUps(deltaTime: number): void {
    const toRemove: string[] = [];

    // Check power-up pickup
    for (const [id, powerUp] of this.powerUps) {
      // Check for expiration
      if (this.currentTime - powerUp.spawnTime > powerUp.lifetime) {
        toRemove.push(id);
        continue;
      }

      // Check for player pickup
      for (const player of this.players.values()) {
        if (player.status !== 'alive') continue;

        const dist = vec2Distance(player.position, powerUp.position);
        if (dist < 40) {
          this.applyPowerUp(player, powerUp.type);
          toRemove.push(id);
          break;
        }
      }
    }

    for (const id of toRemove) {
      this.powerUps.delete(id);
    }

    // Update active power-ups on players
    for (const player of this.players.values()) {
      player.activePowerUps = player.activePowerUps.filter(pu => {
        const elapsed = this.currentTime - pu.startTime;
        return elapsed < pu.duration;
      });
    }
  }

  private applyPowerUp(player: PlayerState, type: PowerUpState['type']): void {
    const effect = POWERUP_EFFECTS[type];

    switch (type) {
      case 'speed_boost':
        player.activePowerUps.push({
          type,
          startTime: this.currentTime,
          duration: effect.duration,
        });
        break;

      case 'damage_boost':
        player.activePowerUps.push({
          type,
          startTime: this.currentTime,
          duration: effect.duration,
        });
        break;

      case 'shield':
        player.activePowerUps.push({
          type,
          startTime: this.currentTime,
          duration: (effect as any).duration || 3000,
        });
        break;

      case 'ability_refresh':
        player.abilityCooldownRemaining = 0;
        player.abilityCharges = 1;
        break;
    }
  }

  private getPlayerPowerUpMultiplier(player: PlayerState, type: 'speed' | 'damage'): number {
    let multiplier = 1.0;

    for (const pu of player.activePowerUps) {
      if (type === 'speed' && pu.type === 'speed_boost') {
        multiplier *= POWERUP_EFFECTS.speed_boost.multiplier;
      }
      if (type === 'damage' && pu.type === 'damage_boost') {
        multiplier *= POWERUP_EFFECTS.damage_boost.multiplier;
      }
    }

    return multiplier;
  }

  private hasShieldPowerUp(player: PlayerState): boolean {
    return player.activePowerUps.some(pu => pu.type === 'shield');
  }

  // ============================================
  // EFFECT ZONES
  // ============================================

  private spawnEffectZone(position: Vector2, effect: ProjectileEffect, ownerId: string): void {
    // Only spawn if type is not 'none' (caller should check, but double-check here)
    if (effect.type === 'none') return;

    const id = uuidv4();
    const zone: EffectZoneState = {
      id,
      type: effect.type,
      position: { ...position },
      radius: effect.radius,
      startTime: this.currentTime,
      duration: effect.duration,
      slowAmount: effect.slowAmount,
      ownerId,
    };
    this.effectZones.set(id, zone);
  }

  private updateEffectZones(deltaTime: number): void {
    const toRemove: string[] = [];

    // Reset slow multipliers
    for (const player of this.players.values()) {
      player.slowMultiplier = 1.0;
    }

    // Apply effect zones
    for (const [id, zone] of this.effectZones) {
      const elapsed = this.currentTime - zone.startTime;
      if (elapsed >= zone.duration) {
        toRemove.push(id);
        continue;
      }

      // Apply slow zones to players
      if (zone.type === 'slow_zone') {
        for (const player of this.players.values()) {
          if (player.id === zone.ownerId) continue;  // Don't slow self
          if (player.status !== 'alive') continue;

          const dist = vec2Distance(player.position, zone.position);
          if (dist < zone.radius) {
            player.slowMultiplier = Math.min(player.slowMultiplier, zone.slowAmount || 0.5);
          }
        }
      }
    }

    for (const id of toRemove) {
      this.effectZones.delete(id);
    }
  }

  // ============================================
  // INTERACTIVE ELEMENTS
  // ============================================

  private updateInteractiveElements(): void {
    // Update buttons
    for (const button of this.buttons.values()) {
      let isPressed = false;
      let pressedBy: string | undefined;

      // Check if any player is standing on the button
      for (const player of this.players.values()) {
        if (player.status !== 'alive') continue;

        const dist = vec2Distance(player.position, button.position);
        if (dist < BUTTON_INTERACT_RANGE) {
          isPressed = true;
          pressedBy = player.id;
          break;
        }
      }

      // Handle button state change
      if (button.type === 'momentary') {
        // Momentary buttons activate while standing on them
        if (isPressed !== button.isPressed) {
          button.isPressed = isPressed;
          button.pressedBy = pressedBy;
          this.toggleLinkedDoor(button.linkedElementId, isPressed);
        }
      } else if (button.type === 'toggle' && isPressed && !button.isPressed) {
        // Toggle buttons flip state on press
        button.isPressed = true;
        button.pressedBy = pressedBy;

        const door = this.doors.get(button.linkedElementId);
        if (door) {
          door.isOpen = !door.isOpen;
        }

        // Reset button after short delay
        setTimeout(() => {
          button.isPressed = false;
          button.pressedBy = undefined;
        }, 200);
      }
    }
  }

  private toggleLinkedDoor(doorId: string, open: boolean): void {
    const door = this.doors.get(doorId);
    if (door) {
      door.isOpen = open;
    }
  }

  // ============================================
  // COMBAT
  // ============================================

  private performAttack(attacker: PlayerState): void {
    const beast = getBeast(attacker.beastId);
    if (!beast) return;

    attacker.isAttacking = true;
    setTimeout(() => { attacker.isAttacking = false; }, 200);

    const effects = getCombinedEffects(this.activeChaosEvents);

    // Find players in range
    for (const target of this.players.values()) {
      if (target.id === attacker.id || target.status !== 'alive') continue;
      if (target.invulnerableUntil > this.currentTime) continue;

      const dist = vec2Distance(attacker.position, target.position);
      if (dist <= beast.attackRange) {
        // Apply knockback
        const knockback = calculateKnockback(attacker, target);
        const scaledKnockback = vec2Scale(knockback, effects.knockbackMultiplier || 1.0);
        target.velocity = vec2Add(target.velocity, scaledKnockback);

        // Apply damage
        const damage = 10 * beast.attackPower;
        target.health -= damage;
        target.knockbackMultiplier += 0.05;  // Increase future knockback

        // Track attacker for kill credit
        target.lastDamagedBy = attacker.id;
        (target as any).lastDamagedAt = this.currentTime;

        // Brief invulnerability
        target.invulnerableUntil = this.currentTime + INVULNERABILITY_DURATION;
      }
    }
  }

  private performAbility(player: PlayerState): void {
    const beast = getBeast(player.beastId);
    if (!beast || !beast.ability) return;

    const ability = beast.ability;

    player.isUsingAbility = true;
    setTimeout(() => { player.isUsingAbility = false; }, 500);

    switch (ability.type) {
      case 'projectile':
        if (ability.projectile) {
          const direction = vec2Length(player.aimDirection) > 0
            ? player.aimDirection
            : vec2FromAngle(player.facingAngle, 1);

          // Spawn projectiles
          for (let i = 0; i < ability.projectile.count; i++) {
            this.spawnProjectile(player, ability.projectile, direction, i);
          }
        }
        break;

      case 'movement':
        this.startMovementAbility(player, ability);
        break;

      case 'aoe':
        if (ability.aoe) {
          const aoeConfig = ability.aoe;

          // Handle delay (for hibernate, etc.)
          if (aoeConfig.delay && aoeConfig.delay > 0) {
            // Make player invulnerable during wind-up if specified
            if (aoeConfig.invulnerableDuring) {
              player.invulnerableUntil = this.currentTime + aoeConfig.delay;
            }

            // Schedule the AOE
            setTimeout(() => {
              if (player.status !== 'alive') return;
              this.executeAOE(player, aoeConfig);
            }, aoeConfig.delay);
          } else {
            this.executeAOE(player, aoeConfig);
          }
        }
        break;

      case 'special':
        // Handle special abilities (copycat, good boy paradox)
        this.handleSpecialAbility(player, ability);
        break;
    }
  }

  private executeAOE(player: PlayerState, aoeConfig: NonNullable<AbilityDefinition['aoe']>): void {
    // Apply damage multiplier from power-ups
    const damageMultiplier = this.getPlayerPowerUpMultiplier(player, 'damage');
    const damage = aoeConfig.damage * damageMultiplier;

    for (const target of this.players.values()) {
      if (target.id === player.id || target.status !== 'alive') continue;
      if (target.invulnerableUntil > this.currentTime) continue;

      const dist = vec2Distance(player.position, target.position);
      if (dist <= aoeConfig.radius) {
        // Apply knockback with distance falloff
        const falloff = 1 - (dist / aoeConfig.radius);
        const knockbackDir = vec2Normalize(vec2Sub(target.position, player.position));
        const knockback = vec2Scale(knockbackDir, aoeConfig.knockback * falloff);
        target.velocity = vec2Add(target.velocity, knockback);

        // Apply damage
        let finalDamage = damage;
        if (this.hasShieldPowerUp(target)) {
          finalDamage *= POWERUP_EFFECTS.shield.damageReduction;
        }
        target.health -= finalDamage;
        target.knockbackMultiplier += 0.05;

        // Apply stun if specified
        if (aoeConfig.stunDuration && aoeConfig.stunDuration > 0) {
          target.stunUntil = this.currentTime + aoeConfig.stunDuration;
        }

        // Track for kill credit
        target.lastDamagedBy = player.id;
        (target as any).lastDamagedAt = this.currentTime;
        target.invulnerableUntil = this.currentTime + INVULNERABILITY_DURATION;
      }
    }
  }

  private handleSpecialAbility(player: PlayerState, ability: AbilityDefinition): void {
    // Handle copycat (mirror monkey)
    if (ability.id === 'copycat') {
      const nearest = this.findNearestEnemy(player);
      if (nearest) {
        const nearestBeast = getBeast(nearest.beastId);
        if (nearestBeast?.ability) {
          // Temporarily use the nearest enemy's ability
          const originalAbility = ability;
          this.performAbilityWithConfig(player, nearestBeast.ability);
        }
      }
    }
    // Handle good boy paradox (reality dog) - for now just a quick teleport+duplicate effect
    else if (ability.id === 'good_boy_paradox') {
      // Create brief confusion with a dash
      const direction = vec2Normalize(player.aimDirection);
      const distance = 150;
      const targetPos = vec2Add(player.position, vec2Scale(direction, distance));
      targetPos.x = Math.max(30, Math.min(ARENA_WIDTH - 30, targetPos.x));
      targetPos.y = Math.max(30, Math.min(ARENA_HEIGHT - 30, targetPos.y));
      player.position = targetPos;
      player.invulnerableUntil = this.currentTime + 500;
    }
  }

  private performAbilityWithConfig(player: PlayerState, ability: AbilityDefinition): void {
    // Execute an ability with a specific config (used by copycat)
    switch (ability.type) {
      case 'projectile':
        if (ability.projectile) {
          const direction = vec2Length(player.aimDirection) > 0
            ? player.aimDirection
            : vec2FromAngle(player.facingAngle, 1);
          for (let i = 0; i < ability.projectile.count; i++) {
            this.spawnProjectile(player, ability.projectile, direction, i);
          }
        }
        break;
      case 'aoe':
        if (ability.aoe) {
          this.executeAOE(player, ability.aoe);
        }
        break;
      default:
        break;
    }
  }

  private aoeKnockback(center: Vector2, radius: number, force: number): void {
    for (const target of this.players.values()) {
      if (target.status !== 'alive') continue;

      const dist = vec2Distance(center, target.position);
      if (dist <= radius && dist > 0) {
        const dir = vec2Normalize(vec2Sub(target.position, center));
        const knockback = vec2Scale(dir, force * (1 - dist / radius));
        target.velocity = vec2Add(target.velocity, knockback);
      }
    }
  }

  private coneKnockback(attacker: PlayerState, range: number, force: number, angle: number): void {
    const facing = attacker.facingAngle;

    for (const target of this.players.values()) {
      if (target.id === attacker.id || target.status !== 'alive') continue;

      const toTarget = vec2Sub(target.position, attacker.position);
      const dist = vec2Length(toTarget);
      if (dist > range) continue;

      const targetAngle = Math.atan2(toTarget.y, toTarget.x);
      let angleDiff = targetAngle - facing;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= angle / 2) {
        const dir = vec2Normalize(toTarget);
        const knockback = vec2Scale(dir, force);
        target.velocity = vec2Add(target.velocity, knockback);
      }
    }
  }

  // ============================================
  // PANIC BUTTON
  // ============================================

  private selectPanicOutcome(): string {
    const outcomes = [
      { weight: 30, action: 'scream' },
      { weight: 20, action: 'trip' },
      { weight: 15, action: 'honk' },
      { weight: 10, action: 'spin' },
      { weight: 10, action: 'banana' },
      { weight: 8, action: 'confetti' },
      { weight: 5, action: 'nothing' },
      { weight: 1, action: 'dodge' },
      { weight: 1, action: 'shockwave' },
    ];

    const total = outcomes.reduce((sum, o) => sum + o.weight, 0);
    let random = this.rng.float(0, total);

    for (const outcome of outcomes) {
      random -= outcome.weight;
      if (random <= 0) return outcome.action;
    }

    return 'nothing';
  }

  private applyPanicEffect(player: PlayerState, action: string): void {
    switch (action) {
      case 'trip':
        player.velocity = vec2Scale(player.velocity, 0.3);
        break;

      case 'spin':
        player.facingAngle += Math.PI * 4;  // Spin animation
        break;

      case 'dodge':
        // The 1% clutch!
        player.invulnerableUntil = this.currentTime + 500;
        break;

      case 'shockwave':
        this.aoeKnockback(player.position, 80, 200);
        break;

      case 'banana':
        // Drop hazard at position (simplified)
        break;

      default:
        // Visual/audio only effects handled client-side
        break;
    }
  }

  // ============================================
  // NETWORKING
  // ============================================

  private broadcastSnapshot(): void {
    const state = this.getMatchState();

    this.broadcast({
      type: 'snapshot',
      data: state,
    });
  }

  private broadcast(message: ServerMessage): void {
    this.connectionManager.broadcast(this.connections, message);
  }

  private announce(text: string, type: 'info' | 'warning' | 'chaos' | 'death' | 'victory'): void {
    this.broadcast({
      type: 'announce',
      data: {
        text,
        type,
        duration: 3000,
      },
    });
  }

  private getMatchState(): MatchState {
    return {
      id: this.id,
      arena: this.arenaId,
      seed: this.seed,
      status: this.status,
      phase: this.phase,
      currentTime: this.currentTime,
      players: Array.from(this.players.values()),
      ghosts: Array.from(this.ghosts),
      hazards: Array.from(this.hazards.values()),
      activeChaosEvents: this.activeChaosEvents,
      shrinkZone: this.shrinkZone,
      remainingPlayers: Array.from(this.players.values()).filter(p => p.status === 'alive').length,
      deaths: this.deaths,
      // New combat system state
      projectiles: Array.from(this.projectiles.values()),
      coverAreas: Array.from(this.coverAreas.values()),
      vents: Array.from(this.vents.values()),
      destructibles: Array.from(this.destructibles.values()),
      powerUps: Array.from(this.powerUps.values()),
      buttons: Array.from(this.buttons.values()),
      doors: Array.from(this.doors.values()),
      effectZones: Array.from(this.effectZones.values()),
    };
  }
}

// Helper function for linear interpolation
function vec2Lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// Helper function
function vec2FromAngle(angle: number, length: number = 1): Vector2 {
  return {
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length,
  };
}
