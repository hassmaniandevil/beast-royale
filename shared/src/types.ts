// ============================================
// BEAST ROYALE - CORE TYPES
// ============================================

// Vector for positions and velocities
export interface Vector2 {
  x: number;
  y: number;
}

// Player status in match
export type PlayerStatus = 'alive' | 'dead' | 'spectating';

// Match phases
export type MatchPhase = 'scatter' | 'escalation' | 'crisis' | 'finale' | 'overtime';

// Match status
export type MatchStatus = 'filling' | 'starting' | 'running' | 'ended';

// Beast weight class
export type WeightClass = 'light' | 'medium' | 'heavy';

// Beast unlock type
export type UnlockType = 'starter' | 'achievement' | 'premium';

// Input actions
export interface PlayerInput {
  sequenceNumber: number;
  timestamp: number;
  movement: Vector2;  // -1 to 1 for each axis
  attack: boolean;
  ability: boolean;
  panic: boolean;
  interact: boolean;  // E key for vents, etc.
  aimDirection: Vector2;  // Mouse/joystick aim for projectiles
}

// Beast definition
export interface BeastDefinition {
  id: string;
  name: string;
  silhouette: string;
  weight: WeightClass;
  speed: number;        // base movement speed
  health: number;       // max health
  attackPower: number;  // base knockback dealt
  attackRange: number;  // attack radius
  attackCooldown: number;  // ms between attacks
  abilityCooldown: number; // ms between ability uses
  quirk: string;
  special: string;
  unlock: UnlockType;
  color: string;        // primary color hex
  description: string;
  ability: AbilityDefinition;  // Structured ability definition
}

// Player state in game
export interface PlayerState {
  id: string;
  sessionId: string;
  displayName: string;
  beastId: string;
  skinId: string | null;
  position: Vector2;
  velocity: Vector2;
  health: number;
  maxHealth: number;
  knockbackMultiplier: number;  // increases as damage taken
  status: PlayerStatus;
  lastInputSequence: number;
  attackCooldownRemaining: number;
  abilityCooldownRemaining: number;
  abilityCharges: number;
  facingAngle: number;  // radians
  isAttacking: boolean;
  isUsingAbility: boolean;
  invulnerableUntil: number;  // timestamp
  lastDamagedBy: string | null;  // player id for kill credit

  // New combat system fields
  aimDirection: Vector2;           // Mouse/joystick aim direction for abilities
  isHidden: boolean;               // In cover (grass/bush)
  isInVent: boolean;               // Traveling through vent
  activePowerUps: ActivePowerUp[]; // Current power-up effects
  movementAbility?: MovementAbilityState;  // Active movement ability (dash, etc.)
  stunUntil: number;               // Timestamp when stun ends
  slowMultiplier: number;          // Speed multiplier from slow effects (1.0 = normal)
  positionHistory: Vector2[];      // Last 3 seconds of positions (for rewind)
}

// Hazard types
export type HazardType =
  | 'crumbling_tile'
  | 'ice_patch'
  | 'bounce_pad'
  | 'rotating_arm'
  | 'slap_wall'
  | 'rolling_boulder'
  | 'spike_trap'
  | 'fire_vent';

// Hazard state
export interface HazardState {
  id: string;
  type: HazardType;
  position: Vector2;
  size: Vector2;
  rotation: number;
  active: boolean;
  triggerTime: number;
  damage: number;
  knockback: number;
  knockbackDirection: Vector2 | null;  // null = away from center
}

// Chaos event types
export type ChaosEventType =
  | 'gravity_doubled'
  | 'slippery_floor'
  | 'controls_reversed'
  | 'big_heads'
  | 'everyone_bouncy'
  | 'low_gravity'
  | 'speed_boost'
  | 'jumpscare'
  | 'screen_shake'
  | 'fog_of_war';

// Chaos event state
export interface ChaosEventState {
  id: string;
  type: ChaosEventType;
  startTime: number;
  duration: number;
  announcement: string;
}

// Arena shrink zone
export interface ShrinkZone {
  currentRadius: number;
  targetRadius: number;
  centerX: number;
  centerY: number;
  shrinkSpeed: number;
  damagePerSecond: number;
}

// Death event for kill chain tracking
export interface DeathEvent {
  victimId: string;
  victimName: string;
  timestamp: number;
  position: Vector2;
  cause: 'hazard' | 'player' | 'boundary' | 'self' | 'shrink';
  causeDetail: string;
  killChain: KillChainLink[];
  placement: number;
  finalWords: string | null;
}

export interface KillChainLink {
  type: 'player' | 'hazard' | 'chaos';
  id: string;
  name: string;
}

// Match state (full snapshot)
export interface MatchState {
  id: string;
  arena: string;
  seed: number;
  status: MatchStatus;
  phase: MatchPhase;
  currentTime: number;  // ms since match start
  players: PlayerState[];
  ghosts: string[];  // player ids of dead players still spectating
  hazards: HazardState[];
  activeChaosEvents: ChaosEventState[];
  shrinkZone: ShrinkZone;
  remainingPlayers: number;
  deaths: DeathEvent[];

  // New combat system state
  projectiles: ProjectileState[];
  coverAreas: CoverState[];
  vents: VentState[];
  destructibles: DestructibleState[];
  powerUps: PowerUpState[];
  buttons: ButtonState[];
  doors: DoorState[];
  effectZones: EffectZoneState[];
}

// Delta update (partial state)
export interface MatchDelta {
  timestamp: number;
  playerUpdates: Partial<PlayerState>[];
  hazardUpdates: Partial<HazardState>[];
  newChaosEvents: ChaosEventState[];
  endedChaosEvents: string[];
  shrinkZone: Partial<ShrinkZone>;
  newDeaths: DeathEvent[];
  phaseChange: MatchPhase | null;
}

// ============================================
// NETWORK MESSAGES
// ============================================

// Client -> Server messages
export type ClientMessage =
  | { type: 'join'; data: JoinMessage }
  | { type: 'input'; data: PlayerInput }
  | { type: 'ping'; data: { timestamp: number } }
  | { type: 'panic'; data: {} }
  | { type: 'final_words'; data: { message: string } }
  | { type: 'select_beast'; data: { beastId: string } };

export interface JoinMessage {
  displayName: string;
  beastId: string;
  skinId: string | null;
  sessionToken: string | null;
}

// Server -> Client messages
export type ServerMessage =
  | { type: 'joined'; data: JoinedMessage }
  | { type: 'match_found'; data: MatchFoundMessage }
  | { type: 'match_start'; data: MatchStartMessage }
  | { type: 'snapshot'; data: MatchState }
  | { type: 'delta'; data: MatchDelta }
  | { type: 'death'; data: DeathEvent }
  | { type: 'announce'; data: AnnounceMessage }
  | { type: 'chaos'; data: ChaosEventState }
  | { type: 'end'; data: MatchEndMessage }
  | { type: 'pong'; data: { clientTimestamp: number; serverTimestamp: number } }
  | { type: 'error'; data: { message: string } };

export interface JoinedMessage {
  playerId: string;
  sessionId: string;
}

export interface MatchFoundMessage {
  matchId: string;
  arena: string;
  playerCount: number;
  countdown: number;
}

export interface MatchStartMessage {
  matchId: string;
  playerId: string;
  arena: string;
}

export interface AnnounceMessage {
  text: string;
  type: 'info' | 'warning' | 'chaos' | 'death' | 'victory';
  duration: number;
}

export interface MatchEndMessage {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  placements: { playerId: string; name: string; placement: number; eliminations: number }[];
  yourStats: {
    placement: number;
    eliminations: number;
    damageDealt: number;
    timeAlive: number;
    chaosEventsSurvived: number;
    xpEarned: number;
  };
}

// ============================================
// ARENA DEFINITIONS
// ============================================

export interface ArenaDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnPoints: Vector2[];
  platforms: PlatformDefinition[];
  hazardSpawns: HazardSpawnDefinition[];
  toyLocations: Vector2[];
  backgroundTheme: string;
  shrinkPattern: 'circular' | 'square' | 'irregular';
  initialSafeRadius: number;
  finalSafeRadius: number;

  // New arena elements
  coverAreas: CoverAreaDefinition[];
  vents: VentDefinition[];
  destructibles: DestructibleDefinition[];
  buttons: ButtonDefinition[];
  doors: DoorDefinition[];
}

export interface PlatformDefinition {
  id: string;
  position: Vector2;
  size: Vector2;
  type: 'solid' | 'crumbling' | 'moving' | 'bouncy';
  movePath?: Vector2[];  // for moving platforms
  moveSpeed?: number;
  crumbleDelay?: number;  // ms after player touches
}

export interface HazardSpawnDefinition {
  position: Vector2;
  possibleTypes: HazardType[];
  spawnPhase: MatchPhase;
  respawnDelay: number;
}

// ============================================
// ABILITY SYSTEM
// ============================================

// Ability types
export type AbilityType = 'projectile' | 'movement' | 'aoe' | 'buff' | 'special';

// Projectile behavior types
export type ProjectileBehavior = 'straight' | 'homing' | 'spread' | 'chain' | 'arc';

// Movement ability types
export type MovementAbilityType = 'dash' | 'teleport' | 'speed_boost' | 'phase' | 'rewind';

// Ability definition for beasts
export interface AbilityDefinition {
  id: string;
  name: string;
  type: AbilityType;
  description: string;
  cooldown: number;

  // Projectile config (if type === 'projectile')
  projectile?: {
    behavior: ProjectileBehavior;
    speed: number;
    damage: number;
    knockback: number;
    piercing: boolean;
    count: number;             // Number of projectiles (for spread)
    spreadAngle?: number;      // Angle spread for multi-projectiles
    chainRange?: number;       // Range for chain lightning
    chainCount?: number;       // Max chain targets
    homingStrength?: number;   // 0-1 homing factor
    lifetime: number;          // ms until projectile expires
    radius: number;            // Collision radius
    effect?: ProjectileEffect; // Special effect on hit
  };

  // Movement config (if type === 'movement')
  movement?: {
    movementType: MovementAbilityType;
    distance?: number;         // For dash
    duration?: number;         // For speed boost, phase
    speedMultiplier?: number;  // For speed boost
    invulnerable?: boolean;    // Invulnerable during movement
    knockbackOnEnd?: number;   // Knockback at end of dash
    rewindDuration?: number;   // How far back to rewind (ms)
  };

  // AOE config (if type === 'aoe')
  aoe?: {
    radius: number;
    damage: number;
    knockback: number;
    stunDuration?: number;     // Stun enemies
    delay?: number;            // Wind-up time
    invulnerableDuring?: boolean;
  };
}

// Projectile special effects
export interface ProjectileEffect {
  type: 'slow_zone' | 'vision_block' | 'none';
  radius: number;
  duration: number;
  slowAmount?: number;  // Multiplier (0.5 = 50% slow)
}

// ============================================
// PROJECTILE STATE
// ============================================

export interface ProjectileState {
  id: string;
  ownerId: string;
  ownerName: string;
  abilityId: string;
  position: Vector2;
  velocity: Vector2;
  angle: number;
  damage: number;
  knockback: number;
  piercing: boolean;
  lifetime: number;
  maxLifetime: number;
  radius: number;
  behavior: ProjectileBehavior;
  homingTarget?: string;       // Target player ID for homing
  chainHit: string[];          // IDs of players already hit (for chain)
  effect?: ProjectileEffect;
}

// ============================================
// MOVEMENT ABILITY STATE
// ============================================

export interface MovementAbilityState {
  playerId: string;
  type: MovementAbilityType;
  startTime: number;
  duration: number;
  startPosition: Vector2;
  targetPosition?: Vector2;
  speedMultiplier?: number;
  invulnerable: boolean;
  positionHistory?: Vector2[]; // For rewind
}

// ============================================
// EFFECT ZONES
// ============================================

export interface EffectZoneState {
  id: string;
  type: 'slow_zone' | 'vision_block';
  position: Vector2;
  radius: number;
  startTime: number;
  duration: number;
  slowAmount?: number;
  ownerId: string;
}

// ============================================
// COVER SYSTEM
// ============================================

export interface CoverAreaDefinition {
  id: string;
  position: Vector2;
  size: Vector2;
  type: 'tall_grass' | 'bush';
}

export interface CoverState {
  id: string;
  type: 'tall_grass' | 'bush';
  position: Vector2;
  size: Vector2;
  playersInside: string[];  // Player IDs currently hidden
}

// ============================================
// VENT SYSTEM
// ============================================

export interface VentDefinition {
  id: string;
  position: Vector2;
  linkedVentId: string;  // ID of the connected vent
}

export interface VentState {
  id: string;
  position: Vector2;
  linkedVentId: string;
  cooldownUntil: number;  // Timestamp when vent can be used again
  playerInside?: string;  // Player currently traveling
}

// ============================================
// DESTRUCTIBLE OBJECTS
// ============================================

export type DestructibleType = 'crate' | 'barrel' | 'pot';

export interface DestructibleDefinition {
  id: string;
  position: Vector2;
  type: DestructibleType;
}

export interface DestructibleState {
  id: string;
  type: DestructibleType;
  position: Vector2;
  size: Vector2;
  health: number;
  maxHealth: number;
}

// ============================================
// POWER-UPS
// ============================================

export type PowerUpType = 'speed_boost' | 'damage_boost' | 'shield' | 'ability_refresh';

export interface PowerUpState {
  id: string;
  type: PowerUpType;
  position: Vector2;
  spawnTime: number;
  lifetime: number;  // Despawns after this many ms
}

export interface ActivePowerUp {
  type: PowerUpType;
  startTime: number;
  duration: number;
}

// ============================================
// INTERACTIVE ELEMENTS
// ============================================

export interface ButtonDefinition {
  id: string;
  position: Vector2;
  linkedElementId: string;  // Door or trap ID
  type: 'momentary' | 'toggle';  // Momentary = active while standing, toggle = on/off
}

export interface ButtonState {
  id: string;
  position: Vector2;
  linkedElementId: string;
  type: 'momentary' | 'toggle';
  isPressed: boolean;
  pressedBy?: string;  // Player ID
}

export interface DoorDefinition {
  id: string;
  position: Vector2;
  size: Vector2;
  isOpen: boolean;  // Initial state
}

export interface DoorState {
  id: string;
  position: Vector2;
  size: Vector2;
  isOpen: boolean;
}
