// ============================================
// BEAST ROYALE - ENHANCED RENDERER
// ============================================

import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  BlurFilter,
  ColorMatrixFilter,
} from 'pixi.js';
import {
  MatchState,
  PlayerState,
  HazardState,
  ShrinkZone,
  ChaosEventState,
  Vector2,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  getBeast,
  ProjectileState,
  CoverState,
  VentState,
  DestructibleState,
  PowerUpState,
  ButtonState,
  DoorState,
  EffectZoneState,
} from '@beast-royale/shared';
import { audio } from './audio';

// ============================================
// PARTICLE SYSTEM
// ============================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  type: 'circle' | 'square' | 'star' | 'trail';
}

class ParticleSystem {
  private particles: Particle[] = [];
  private graphics: Graphics;

  constructor(container: Container) {
    this.graphics = new Graphics();
    container.addChild(this.graphics);
  }

  emit(config: {
    x: number;
    y: number;
    count: number;
    color: number;
    speed: number;
    spread: number;
    life: number;
    size: number;
    type?: 'circle' | 'square' | 'star' | 'trail';
  }): void {
    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed * (0.5 + Math.random() * 0.5);

      this.particles.push({
        x: config.x + (Math.random() - 0.5) * config.spread,
        y: config.y + (Math.random() - 0.5) * config.spread,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life,
        maxLife: config.life,
        size: config.size * (0.5 + Math.random() * 0.5),
        color: config.color,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: config.type || 'circle',
      });
    }
  }

  burst(x: number, y: number, color: number, count: number = 20): void {
    this.emit({
      x, y, count, color,
      speed: 200,
      spread: 10,
      life: 500,
      size: 8,
    });
  }

  trail(x: number, y: number, color: number): void {
    this.emit({
      x, y,
      count: 1,
      color,
      speed: 20,
      spread: 5,
      life: 300,
      size: 6,
      type: 'trail',
    });
  }

  update(deltaTime: number): void {
    this.graphics.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update
      p.x += p.vx * (deltaTime / 1000);
      p.y += p.vy * (deltaTime / 1000);
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, p.life / p.maxLife);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Draw
      const size = p.size * (0.5 + p.alpha * 0.5);

      if (p.type === 'circle' || p.type === 'trail') {
        this.graphics.circle(p.x, p.y, size);
        this.graphics.fill({ color: p.color, alpha: p.alpha });
      } else if (p.type === 'square') {
        this.graphics.rect(p.x - size/2, p.y - size/2, size, size);
        this.graphics.fill({ color: p.color, alpha: p.alpha });
      } else if (p.type === 'star') {
        this.drawStar(p.x, p.y, size, p.color, p.alpha, p.rotation);
      }
    }
  }

  private drawStar(x: number, y: number, size: number, color: number, alpha: number, rotation: number): void {
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    this.graphics.moveTo(
      x + Math.cos(rotation) * outerRadius,
      y + Math.sin(rotation) * outerRadius
    );

    for (let i = 1; i <= points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotation + (i * Math.PI) / points;
      this.graphics.lineTo(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      );
    }

    this.graphics.fill({ color, alpha });
  }
}

// ============================================
// BEAST VISUAL COMPONENTS
// ============================================

interface BeastSprite {
  container: Container;
  body: Graphics;
  face: Graphics;
  eyes: Graphics;
  accessory: Graphics;
  shadow: Graphics;
  nameTag: Text;
  healthBarBg: Graphics;
  healthBar: Graphics;
  effectsContainer: Container;
  trailPoints: Vector2[];
  animationTime: number;
  lastPosition: Vector2;
  squashStretch: number;
  expression: 'normal' | 'attack' | 'hurt' | 'happy';
}

// Among Us inspired color palettes (bright, saturated colors)
const BEAST_PALETTES: Record<string, { primary: number; secondary: number; accent: number; eye: number }> = {
  rock_tortoise: { primary: 0x50ef39, secondary: 0x3bc92a, accent: 0x7fff6b, eye: 0x000000 },   // Lime
  honk_goose: { primary: 0xf5f557, secondary: 0xd4d44a, accent: 0xffffff, eye: 0x000000 },      // Yellow
  stretchy_ferret: { primary: 0xed54ba, secondary: 0xc94199, accent: 0xff8fd4, eye: 0x000000 }, // Pink
  boom_frog: { primary: 0x117f2d, secondary: 0x0d6623, accent: 0x4ade80, eye: 0xff0000 },       // Green
  punch_crab: { primary: 0xc51111, secondary: 0x9a0d0d, accent: 0xff4444, eye: 0xffffff },      // Red
  sleepy_bear: { primary: 0x71491e, secondary: 0x573815, accent: 0x9a6b3a, eye: 0x000000 },     // Brown
  mirror_monkey: { primary: 0x6b2fbb, secondary: 0x5425a0, accent: 0x9b5de5, eye: 0xffffff },   // Purple
  glass_rhino: { primary: 0x38fedc, secondary: 0x2cd4b9, accent: 0x7ffff0, eye: 0x000000 },     // Cyan
  panic_octopus: { primary: 0xed54ba, secondary: 0xc94199, accent: 0xff8fd4, eye: 0xffffff },   // Pink
  unicycle_giraffe: { primary: 0xef7d0d, secondary: 0xc96609, accent: 0xffaa44, eye: 0x000000 }, // Orange
  electric_eel: { primary: 0x132ed1, secondary: 0x0f24a8, accent: 0x5577ff, eye: 0xffff00 },    // Blue
  pigeon_king: { primary: 0x3f474e, secondary: 0x2f363c, accent: 0x6b7680, eye: 0xff6600 },     // Black/Gray
  screaming_goat: { primary: 0xd6e0f0, secondary: 0xb8c4d8, accent: 0xffffff, eye: 0x000000 },  // White
  slime_cow: { primary: 0x50ef39, secondary: 0x3bc92a, accent: 0x7fff6b, eye: 0x000000 },       // Lime
  cactus_cat: { primary: 0x117f2d, secondary: 0x0d6623, accent: 0x4ade80, eye: 0xffffff },      // Green
  time_hamster: { primary: 0xed54ba, secondary: 0xc94199, accent: 0xff8fd4, eye: 0x000000 },    // Pink
  tax_evasion_raccoon: { primary: 0x3f474e, secondary: 0x2f363c, accent: 0x6b7680, eye: 0xffffff }, // Black
  cosmic_duck: { primary: 0x6b2fbb, secondary: 0x5425a0, accent: 0x9b5de5, eye: 0x00ffff },     // Purple
  reality_dog: { primary: 0xef7d0d, secondary: 0xc96609, accent: 0xffaa44, eye: 0x00ff00 },     // Orange
  the_human: { primary: 0xf5f557, secondary: 0xd4d44a, accent: 0xffffff, eye: 0x3b82f6 },       // Yellow
  // New beasts (10)
  laser_cat: { primary: 0xef4444, secondary: 0xdc2626, accent: 0xff6b6b, eye: 0xff0000 },       // Red
  bouncy_bunny: { primary: 0xf472b6, secondary: 0xec4899, accent: 0xfda4cf, eye: 0x000000 },    // Pink
  thunder_bear: { primary: 0xfacc15, secondary: 0xeab308, accent: 0xfde047, eye: 0x000000 },    // Yellow
  ninja_squirrel: { primary: 0x78350f, secondary: 0x5c2d0f, accent: 0xa16207, eye: 0xffffff }, // Brown
  rocket_penguin: { primary: 0x0ea5e9, secondary: 0x0284c7, accent: 0x38bdf8, eye: 0x000000 }, // Blue
  sonic_bat: { primary: 0x6366f1, secondary: 0x4f46e5, accent: 0x818cf8, eye: 0xffffff },      // Indigo
  bubble_fish: { primary: 0x22d3ee, secondary: 0x06b6d4, accent: 0x67e8f9, eye: 0x000000 },    // Cyan
  ghost_fox: { primary: 0xc4b5fd, secondary: 0xa78bfa, accent: 0xddd6fe, eye: 0x7c3aed },      // Purple
  magnet_mole: { primary: 0x94a3b8, secondary: 0x64748b, accent: 0xcbd5e1, eye: 0x000000 },    // Gray
  disco_peacock: { primary: 0xd946ef, secondary: 0xc026d3, accent: 0xf0abfc, eye: 0x00ffff },  // Fuchsia
};

// ============================================
// MAIN RENDERER
// ============================================

export class Renderer {
  private app: Application;
  private gameContainer: Container;
  private backgroundContainer: Container;
  private arenaContainer: Container;
  private hazardsContainer: Container;
  private playersContainer: Container;
  private effectsContainer: Container;
  private uiContainer: Container;

  private beastSprites: Map<string, BeastSprite> = new Map();
  private hazardGraphics: Map<string, { container: Container; graphic: Graphics; glow: Graphics }> = new Map();

  // New combat system graphics
  private projectileGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private coverGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private ventGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private destructibleGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private powerUpGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private buttonGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private doorGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();
  private effectZoneGraphics: Map<string, { container: Container; graphic: Graphics }> = new Map();

  private particles: ParticleSystem;
  private shrinkZoneGraphic: Graphics;
  private shrinkZoneGlow: Graphics;
  private arenaBackground: Graphics;

  private scale: number = 1;
  private time: number = 0;
  private screenShake: { intensity: number; duration: number } = { intensity: 0, duration: 0 };
  private localPlayerId: string | null = null;

  constructor(app: Application) {
    this.app = app;

    // Create container hierarchy
    this.gameContainer = new Container();
    this.backgroundContainer = new Container();
    this.arenaContainer = new Container();
    this.hazardsContainer = new Container();
    this.playersContainer = new Container();
    this.effectsContainer = new Container();
    this.uiContainer = new Container();

    this.gameContainer.addChild(this.backgroundContainer);
    this.gameContainer.addChild(this.arenaContainer);
    this.gameContainer.addChild(this.hazardsContainer);
    this.gameContainer.addChild(this.playersContainer);
    this.gameContainer.addChild(this.effectsContainer);
    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.uiContainer);

    // Create arena graphics
    this.arenaBackground = new Graphics();
    this.backgroundContainer.addChild(this.arenaBackground);

    this.shrinkZoneGlow = new Graphics();
    this.shrinkZoneGraphic = new Graphics();
    this.arenaContainer.addChild(this.shrinkZoneGlow);
    this.arenaContainer.addChild(this.shrinkZoneGraphic);

    // Create particle system
    this.particles = new ParticleSystem(this.effectsContainer);

    // Initial setup
    this.drawArenaBackground();
    this.handleResize(window.innerWidth, window.innerHeight);
  }

  async loadAssets(): Promise<void> {
    console.log('[Renderer] Enhanced renderer loaded');
  }

  handleResize(width: number, height: number): void {
    const scaleX = width / ARENA_WIDTH;
    const scaleY = height / ARENA_HEIGHT;
    this.scale = Math.min(scaleX, scaleY) * 0.9;

    this.gameContainer.scale.set(this.scale);
    this.gameContainer.x = (width - ARENA_WIDTH * this.scale) / 2;
    this.gameContainer.y = (height - ARENA_HEIGHT * this.scale) / 2;
  }

  // ============================================
  // ARENA BACKGROUND
  // ============================================

  private drawArenaBackground(): void {
    this.arenaBackground.clear();

    // Among Us style dark background with slight purple tint
    this.arenaBackground.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.arenaBackground.fill({ color: 0x0a0a12 });

    // Subtle grid pattern (like Among Us task rooms)
    this.drawAmongUsGrid();

    // Glowing center spotlight
    this.arenaBackground.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 400);
    this.arenaBackground.fill({ color: 0x6b2fbb, alpha: 0.05 });
    this.arenaBackground.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 250);
    this.arenaBackground.fill({ color: 0x50ef39, alpha: 0.03 });
    this.arenaBackground.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 120);
    this.arenaBackground.fill({ color: 0xffffff, alpha: 0.02 });

    // Chunky border (Among Us style thick outlines)
    this.arenaBackground.roundRect(10, 10, ARENA_WIDTH - 20, ARENA_HEIGHT - 20, 20);
    this.arenaBackground.stroke({ color: 0x3f474e, width: 8 });
    this.arenaBackground.roundRect(10, 10, ARENA_WIDTH - 20, ARENA_HEIGHT - 20, 20);
    this.arenaBackground.stroke({ color: 0x000000, width: 12, alpha: 0.5 });

    // Corner lights/decorations
    this.drawCornerLight(50, 50, 0x50ef39);
    this.drawCornerLight(ARENA_WIDTH - 50, 50, 0xc51111);
    this.drawCornerLight(ARENA_WIDTH - 50, ARENA_HEIGHT - 50, 0x132ed1);
    this.drawCornerLight(50, ARENA_HEIGHT - 50, 0xf5f557);
  }

  private drawAmongUsGrid(): void {
    // Simple rectangular grid like Among Us task rooms
    const gridSize = 100;

    // Horizontal lines
    for (let y = gridSize; y < ARENA_HEIGHT; y += gridSize) {
      this.arenaBackground.moveTo(20, y);
      this.arenaBackground.lineTo(ARENA_WIDTH - 20, y);
      this.arenaBackground.stroke({ color: 0x1a1a2e, width: 2, alpha: 0.5 });
    }

    // Vertical lines
    for (let x = gridSize; x < ARENA_WIDTH; x += gridSize) {
      this.arenaBackground.moveTo(x, 20);
      this.arenaBackground.lineTo(x, ARENA_HEIGHT - 20);
      this.arenaBackground.stroke({ color: 0x1a1a2e, width: 2, alpha: 0.5 });
    }

    // Add some subtle floor tiles/panels
    for (let row = 0; row < ARENA_HEIGHT / gridSize; row++) {
      for (let col = 0; col < ARENA_WIDTH / gridSize; col++) {
        if ((row + col) % 3 === 0) {
          const x = col * gridSize + 25;
          const y = row * gridSize + 25;
          this.arenaBackground.roundRect(x, y, gridSize - 50, gridSize - 50, 8);
          this.arenaBackground.fill({ color: 0x1a1a2e, alpha: 0.3 });
        }
      }
    }
  }

  private drawCornerLight(x: number, y: number, color: number): void {
    // Glowing corner indicator (like Among Us task lights)
    this.arenaBackground.circle(x, y, 25);
    this.arenaBackground.fill({ color, alpha: 0.15 });
    this.arenaBackground.circle(x, y, 15);
    this.arenaBackground.fill({ color, alpha: 0.3 });
    this.arenaBackground.circle(x, y, 8);
    this.arenaBackground.fill({ color });
    this.arenaBackground.circle(x, y, 8);
    this.arenaBackground.stroke({ color: 0x000000, width: 3 });
  }

  // ============================================
  // UPDATE & RENDER
  // ============================================

  update(state: MatchState, localPlayerId: string | null, deltaTime: number): void {
    this.time += deltaTime;
    this.localPlayerId = localPlayerId;

    // Update particles
    this.particles.update(deltaTime);

    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= deltaTime;
      const shake = this.screenShake.intensity * (this.screenShake.duration / 500);
      this.gameContainer.x += (Math.random() - 0.5) * shake;
      this.gameContainer.y += (Math.random() - 0.5) * shake;
    }

    // Animate beasts
    for (const [id, sprite] of this.beastSprites) {
      this.animateBeast(sprite, deltaTime);
    }
  }

  renderState(state: MatchState, localPlayerId: string | null): void {
    this.localPlayerId = localPlayerId;

    // Render shrink zone
    this.renderShrinkZone(state.shrinkZone);

    // Render cover areas (behind players)
    this.renderCoverAreas(state.coverAreas || []);

    // Render vents
    this.renderVents(state.vents || []);

    // Render buttons and doors
    this.renderButtons(state.buttons || []);
    this.renderDoors(state.doors || []);

    // Render effect zones (behind players)
    this.renderEffectZones(state.effectZones || []);

    // Render hazards
    this.renderHazards(state.hazards);

    // Render destructibles
    this.renderDestructibles(state.destructibles || []);

    // Render power-ups
    this.renderPowerUps(state.powerUps || []);

    // Render players
    this.renderPlayers(state.players, localPlayerId);

    // Render projectiles (on top)
    this.renderProjectiles(state.projectiles || []);

    // Render chaos effects
    this.renderChaosEffects(state.activeChaosEvents);

    // Cleanup
    this.cleanupSprites(state);
  }

  // ============================================
  // SHRINK ZONE
  // ============================================

  private renderShrinkZone(shrinkZone: ShrinkZone): void {
    this.shrinkZoneGraphic.clear();
    this.shrinkZoneGlow.clear();

    // Danger zone overlay (Among Us red danger style)
    this.shrinkZoneGraphic.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.shrinkZoneGraphic.fill({ color: 0xc51111, alpha: 0.2 });

    // Cut out safe zone
    this.shrinkZoneGraphic.circle(
      shrinkZone.centerX,
      shrinkZone.centerY,
      shrinkZone.currentRadius
    );
    this.shrinkZoneGraphic.cut();

    // Animated border glow (Among Us lime green)
    const pulseAlpha = 0.7 + Math.sin(this.time / 200) * 0.3;
    const pulseWidth = 6 + Math.sin(this.time / 150) * 2;

    // Outer glow
    this.shrinkZoneGlow.circle(
      shrinkZone.centerX,
      shrinkZone.centerY,
      shrinkZone.currentRadius + 15
    );
    this.shrinkZoneGlow.stroke({ color: 0x50ef39, width: 12, alpha: pulseAlpha * 0.2 });

    // Main chunky border (Among Us thick outline style)
    this.shrinkZoneGraphic.circle(
      shrinkZone.centerX,
      shrinkZone.centerY,
      shrinkZone.currentRadius
    );
    this.shrinkZoneGraphic.stroke({ color: 0x000000, width: pulseWidth + 4, alpha: 0.8 });

    this.shrinkZoneGraphic.circle(
      shrinkZone.centerX,
      shrinkZone.centerY,
      shrinkZone.currentRadius
    );
    this.shrinkZoneGraphic.stroke({ color: 0x50ef39, width: pulseWidth, alpha: pulseAlpha });

    // Inner accent
    this.shrinkZoneGraphic.circle(
      shrinkZone.centerX,
      shrinkZone.centerY,
      shrinkZone.currentRadius - 8
    );
    this.shrinkZoneGraphic.stroke({ color: 0x7fff6b, width: 2, alpha: pulseAlpha * 0.5 });
  }

  // ============================================
  // HAZARDS
  // ============================================

  private renderHazards(hazards: HazardState[]): void {
    for (const hazard of hazards) {
      let sprite = this.hazardGraphics.get(hazard.id);

      if (!sprite) {
        sprite = this.createHazardSprite(hazard);
        this.hazardGraphics.set(hazard.id, sprite);
        this.hazardsContainer.addChild(sprite.container);
      }

      // Update
      sprite.container.x = hazard.position.x;
      sprite.container.y = hazard.position.y;
      sprite.container.rotation = hazard.rotation;
      sprite.container.alpha = hazard.active ? 1 : 0.4;

      // Animate glow
      const glowPulse = 0.3 + Math.sin(this.time / 300 + hazard.position.x) * 0.2;
      sprite.glow.alpha = glowPulse;
    }
  }

  private createHazardSprite(hazard: HazardState): { container: Container; graphic: Graphics; glow: Graphics } {
    const container = new Container();
    const glow = new Graphics();
    const graphic = new Graphics();

    const hw = hazard.size.x / 2;
    const hh = hazard.size.y / 2;

    // Different visuals per hazard type
    switch (hazard.type) {
      case 'bounce_pad':
        // Glow
        glow.circle(0, 0, hw + 15);
        glow.fill({ color: 0x22c55e, alpha: 0.3 });
        // Base
        graphic.circle(0, 0, hw);
        graphic.fill({ color: 0x22c55e });
        // Inner rings
        graphic.circle(0, 0, hw * 0.7);
        graphic.stroke({ color: 0x4ade80, width: 3 });
        graphic.circle(0, 0, hw * 0.4);
        graphic.stroke({ color: 0x86efac, width: 2 });
        // Arrow up
        graphic.moveTo(0, -hw * 0.3);
        graphic.lineTo(-hw * 0.2, hw * 0.1);
        graphic.lineTo(hw * 0.2, hw * 0.1);
        graphic.fill({ color: 0xffffff });
        break;

      case 'ice_patch':
        // Glow
        glow.ellipse(0, 0, hw + 10, hh + 10);
        glow.fill({ color: 0x67e8f9, alpha: 0.2 });
        // Ice
        graphic.ellipse(0, 0, hw, hh);
        graphic.fill({ color: 0x67e8f9, alpha: 0.7 });
        // Cracks
        graphic.moveTo(-hw * 0.5, 0);
        graphic.lineTo(0, -hh * 0.3);
        graphic.lineTo(hw * 0.3, hh * 0.2);
        graphic.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
        // Shine
        graphic.ellipse(-hw * 0.3, -hh * 0.3, hw * 0.2, hh * 0.15);
        graphic.fill({ color: 0xffffff, alpha: 0.4 });
        break;

      case 'rotating_arm':
        // Glow
        glow.roundRect(-hw - 5, -hh - 5, hazard.size.x + 10, hazard.size.y + 10, 8);
        glow.fill({ color: 0xef4444, alpha: 0.3 });
        // Arm
        graphic.roundRect(-hw, -hh, hazard.size.x, hazard.size.y, 5);
        graphic.fill({ color: 0xef4444 });
        // Stripes
        for (let i = -hw + 20; i < hw; i += 30) {
          graphic.rect(i, -hh, 10, hazard.size.y);
          graphic.fill({ color: 0xfbbf24 });
        }
        // Border
        graphic.roundRect(-hw, -hh, hazard.size.x, hazard.size.y, 5);
        graphic.stroke({ color: 0xb91c1c, width: 3 });
        break;

      case 'fire_vent':
        // Glow (animated via alpha)
        glow.circle(0, 0, hw + 20);
        glow.fill({ color: 0xf97316, alpha: 0.4 });
        // Base
        graphic.circle(0, 0, hw);
        graphic.fill({ color: 0x374151 });
        // Inner fire
        graphic.circle(0, 0, hw * 0.7);
        graphic.fill({ color: 0xf97316 });
        graphic.circle(0, 0, hw * 0.4);
        graphic.fill({ color: 0xfbbf24 });
        graphic.circle(0, 0, hw * 0.2);
        graphic.fill({ color: 0xfef3c7 });
        // Grate lines
        graphic.moveTo(-hw * 0.6, 0);
        graphic.lineTo(hw * 0.6, 0);
        graphic.moveTo(0, -hw * 0.6);
        graphic.lineTo(0, hw * 0.6);
        graphic.stroke({ color: 0x1f2937, width: 4 });
        break;

      case 'spike_trap':
        // Glow
        glow.circle(0, 0, hw + 10);
        glow.fill({ color: 0x71717a, alpha: 0.3 });
        // Base
        graphic.circle(0, 0, hw);
        graphic.fill({ color: 0x52525b });
        // Spikes
        const spikes = 8;
        for (let i = 0; i < spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2;
          const innerR = hw * 0.4;
          const outerR = hw * 0.9;
          graphic.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
          graphic.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
          graphic.lineTo(Math.cos(angle + 0.2) * innerR, Math.sin(angle + 0.2) * innerR);
          graphic.fill({ color: 0xa1a1aa });
        }
        break;

      case 'rolling_boulder':
        // Shadow
        glow.ellipse(5, 5, hw, hw * 0.5);
        glow.fill({ color: 0x000000, alpha: 0.3 });
        // Boulder
        graphic.circle(0, 0, hw);
        graphic.fill({ color: 0x78716c });
        // Texture
        graphic.circle(-hw * 0.2, -hw * 0.2, hw * 0.3);
        graphic.fill({ color: 0x57534e });
        graphic.circle(hw * 0.3, hw * 0.1, hw * 0.2);
        graphic.fill({ color: 0x57534e });
        // Highlight
        graphic.circle(-hw * 0.3, -hw * 0.3, hw * 0.15);
        graphic.fill({ color: 0xa8a29e, alpha: 0.5 });
        break;

      default:
        glow.rect(-hw - 5, -hh - 5, hazard.size.x + 10, hazard.size.y + 10);
        glow.fill({ color: 0xf59e0b, alpha: 0.3 });
        graphic.rect(-hw, -hh, hazard.size.x, hazard.size.y);
        graphic.fill({ color: 0xf59e0b });
    }

    container.addChild(glow);
    container.addChild(graphic);

    return { container, graphic, glow };
  }

  // ============================================
  // PLAYERS / BEASTS
  // ============================================

  private renderPlayers(players: PlayerState[], localPlayerId: string | null): void {
    for (const player of players) {
      if (player.status !== 'alive') {
        // Remove dead player sprites with death effect
        const sprite = this.beastSprites.get(player.id);
        if (sprite) {
          this.spawnDeathEffect(player.position, player.beastId);
          this.playersContainer.removeChild(sprite.container);
          this.beastSprites.delete(player.id);
        }
        continue;
      }

      let sprite = this.beastSprites.get(player.id);

      if (!sprite) {
        sprite = this.createBeastSprite(player);
        this.beastSprites.set(player.id, sprite);
        this.playersContainer.addChild(sprite.container);
      }

      // Update position with smoothing
      const targetX = player.position.x;
      const targetY = player.position.y;
      sprite.container.x += (targetX - sprite.container.x) * 0.3;
      sprite.container.y += (targetY - sprite.container.y) * 0.3;

      // Calculate movement for effects
      const dx = sprite.container.x - sprite.lastPosition.x;
      const dy = sprite.container.y - sprite.lastPosition.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Add trail particles when moving fast
      if (speed > 3) {
        const palette = BEAST_PALETTES[player.beastId] || BEAST_PALETTES.rock_tortoise;
        this.particles.trail(sprite.container.x, sprite.container.y + 15, palette.secondary);
      }

      // Squash and stretch based on movement
      sprite.squashStretch = Math.min(1.3, 1 + speed * 0.02);

      // Update facing
      if (speed > 0.5) {
        sprite.body.rotation = player.facingAngle;
      }

      // Update health bar (Among Us colors)
      const healthPercent = player.health / player.maxHealth;
      sprite.healthBar.clear();
      sprite.healthBar.roundRect(-30, -58, 60 * healthPercent, 6, 3);
      sprite.healthBar.fill({ color: healthPercent > 0.3 ? 0x50ef39 : 0xc51111 });

      // Expression based on state
      if (player.isAttacking) {
        sprite.expression = 'attack';
        this.spawnAttackEffect(player);
      } else if (player.isUsingAbility) {
        sprite.expression = 'attack';
        this.spawnAbilityEffect(player);
      } else if (player.invulnerableUntil > 0) {
        sprite.expression = 'hurt';
      } else {
        sprite.expression = 'normal';
      }

      // Local player highlight
      if (player.id === localPlayerId) {
        sprite.container.zIndex = 1000;
        sprite.shadow.alpha = 0.5;
      } else {
        sprite.container.zIndex = Math.floor(sprite.container.y);
        sprite.shadow.alpha = 0.3;
      }

      // Invulnerability flash
      if (player.invulnerableUntil > 0) {
        sprite.body.alpha = 0.5 + Math.sin(this.time / 30) * 0.3;
      } else {
        sprite.body.alpha = 1;
      }

      sprite.lastPosition = { x: sprite.container.x, y: sprite.container.y };
    }

    this.playersContainer.sortChildren();
  }

  private createBeastSprite(player: PlayerState): BeastSprite {
    const container = new Container();
    const beast = getBeast(player.beastId);
    const palette = BEAST_PALETTES[player.beastId] || BEAST_PALETTES.rock_tortoise;

    // Shadow (larger for blob style)
    const shadow = new Graphics();
    shadow.ellipse(0, 35, 30, 15);
    shadow.fill({ color: 0x000000, alpha: 0.4 });

    // Effects container (for particles, etc.)
    const effectsContainer = new Container();

    // Main body container (for rotation)
    const body = new Graphics();
    this.drawBeastBody(body, player.beastId, palette);

    // Face (visor effects)
    const face = new Graphics();
    this.drawBeastFace(face, player.beastId, palette, 'normal');

    // Eyes (separate for animation - not used in Among Us style)
    const eyes = new Graphics();

    // Accessory (hats, etc.)
    const accessory = new Graphics();
    this.drawBeastAccessory(accessory, player.beastId, palette);

    // Health bar background (positioned above the blob)
    const healthBarBg = new Graphics();
    healthBarBg.roundRect(-32, -60, 64, 10, 5);
    healthBarBg.fill({ color: 0x000000, alpha: 0.7 });
    healthBarBg.roundRect(-32, -60, 64, 10, 5);
    healthBarBg.stroke({ color: 0x000000, width: 3 });

    // Health bar
    const healthBar = new Graphics();
    healthBar.roundRect(-30, -58, 60, 6, 3);
    healthBar.fill({ color: 0x50ef39 });

    // Name tag (Fredoka style font)
    const nameStyle = new TextStyle({
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontSize: 14,
      fontWeight: '600',
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 4 },
      dropShadow: {
        color: 0x000000,
        blur: 0,
        distance: 2,
      },
    });
    const nameTag = new Text({ text: player.displayName, style: nameStyle });
    nameTag.anchor.set(0.5, 0.5);
    nameTag.y = 50;

    // Assemble
    container.addChild(shadow);
    container.addChild(effectsContainer);
    body.addChild(face);
    body.addChild(eyes);
    body.addChild(accessory);
    container.addChild(body);
    container.addChild(healthBarBg);
    container.addChild(healthBar);
    container.addChild(nameTag);

    return {
      container,
      body,
      face,
      eyes,
      accessory,
      shadow,
      nameTag,
      healthBarBg,
      healthBar,
      effectsContainer,
      trailPoints: [],
      animationTime: Math.random() * 1000,
      lastPosition: { x: player.position.x, y: player.position.y },
      squashStretch: 1,
      expression: 'normal',
    };
  }

  private drawBeastBody(g: Graphics, beastId: string, palette: { primary: number; secondary: number; accent: number; eye: number }): void {
    const p = palette;

    // Draw creature-specific body while keeping cute blob style
    switch (beastId) {
      case 'rock_tortoise':
        this.drawTortoise(g, p);
        break;
      case 'honk_goose':
        this.drawGoose(g, p);
        break;
      case 'stretchy_ferret':
        this.drawFerret(g, p);
        break;
      case 'boom_frog':
        this.drawFrog(g, p);
        break;
      case 'punch_crab':
        this.drawCrab(g, p);
        break;
      case 'sleepy_bear':
      case 'thunder_bear':
        this.drawBear(g, p);
        break;
      case 'mirror_monkey':
        this.drawMonkey(g, p);
        break;
      case 'glass_rhino':
        this.drawRhino(g, p);
        break;
      case 'panic_octopus':
        this.drawOctopus(g, p);
        break;
      case 'unicycle_giraffe':
        this.drawGiraffe(g, p);
        break;
      case 'electric_eel':
        this.drawEel(g, p);
        break;
      case 'pigeon_king':
        this.drawPigeon(g, p);
        break;
      case 'screaming_goat':
        this.drawGoat(g, p);
        break;
      case 'slime_cow':
        this.drawCow(g, p);
        break;
      case 'cactus_cat':
      case 'laser_cat':
        this.drawCat(g, p, beastId === 'laser_cat');
        break;
      case 'time_hamster':
        this.drawHamster(g, p);
        break;
      case 'tax_evasion_raccoon':
        this.drawRaccoon(g, p);
        break;
      case 'cosmic_duck':
        this.drawDuck(g, p);
        break;
      case 'reality_dog':
        this.drawDog(g, p);
        break;
      case 'the_human':
        this.drawHuman(g, p);
        break;
      case 'bouncy_bunny':
        this.drawBunny(g, p);
        break;
      case 'ninja_squirrel':
        this.drawSquirrel(g, p);
        break;
      case 'rocket_penguin':
        this.drawPenguin(g, p);
        break;
      case 'sonic_bat':
        this.drawBat(g, p);
        break;
      case 'bubble_fish':
        this.drawFish(g, p);
        break;
      case 'ghost_fox':
        this.drawFox(g, p);
        break;
      case 'magnet_mole':
        this.drawMole(g, p);
        break;
      case 'disco_peacock':
        this.drawPeacock(g, p);
        break;
      default:
        this.drawDefaultBlob(g, p);
    }
  }

  // Helper to draw cute eyes
  private drawCuteEyes(g: Graphics, x: number, y: number, size: number, eyeColor: number, angry = false): void {
    // Left eye
    g.circle(x - size * 0.8, y, size);
    g.fill({ color: 0xffffff });
    g.circle(x - size * 0.8, y, size);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(x - size * 0.8 + size * 0.2, y + (angry ? -1 : 1), size * 0.5);
    g.fill({ color: eyeColor });
    g.circle(x - size * 0.8 + size * 0.3, y - size * 0.2, size * 0.2);
    g.fill({ color: 0xffffff });

    // Right eye
    g.circle(x + size * 0.8, y, size);
    g.fill({ color: 0xffffff });
    g.circle(x + size * 0.8, y, size);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(x + size * 0.8 + size * 0.2, y + (angry ? -1 : 1), size * 0.5);
    g.fill({ color: eyeColor });
    g.circle(x + size * 0.8 + size * 0.3, y - size * 0.2, size * 0.2);
    g.fill({ color: 0xffffff });

    // Angry eyebrows
    if (angry) {
      g.moveTo(x - size * 1.5, y - size * 1.2);
      g.lineTo(x - size * 0.2, y - size * 0.8);
      g.stroke({ color: 0x000000, width: 3 });
      g.moveTo(x + size * 1.5, y - size * 1.2);
      g.lineTo(x + size * 0.2, y - size * 0.8);
      g.stroke({ color: 0x000000, width: 3 });
    }
  }

  private drawTortoise(g: Graphics, p: any): void {
    // Shell (dome shape)
    g.ellipse(0, 5, 32, 25);
    g.fill({ color: p.secondary });
    g.ellipse(0, 5, 32, 25);
    g.stroke({ color: 0x000000, width: 4 });
    // Shell pattern
    g.ellipse(0, 0, 18, 12);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(-12, 8, 8, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(12, 8, 8, 6);
    g.stroke({ color: 0x000000, width: 2 });
    // Head
    g.circle(0, -25, 18);
    g.fill({ color: p.primary });
    g.circle(0, -25, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Eyes
    this.drawCuteEyes(g, 0, -28, 6, p.eye);
    // Cute smile
    g.arc(0, -20, 8, 0.2, Math.PI - 0.2);
    g.stroke({ color: 0x000000, width: 2 });
    // Feet
    g.ellipse(-22, 25, 10, 6);
    g.fill({ color: p.primary });
    g.ellipse(-22, 25, 10, 6);
    g.stroke({ color: 0x000000, width: 3 });
    g.ellipse(22, 25, 10, 6);
    g.fill({ color: p.primary });
    g.ellipse(22, 25, 10, 6);
    g.stroke({ color: 0x000000, width: 3 });
  }

  private drawGoose(g: Graphics, p: any): void {
    // Body (plump)
    g.ellipse(0, 10, 26, 22);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 26, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Long neck
    g.roundRect(-8, -40, 16, 45, 8);
    g.fill({ color: p.primary });
    g.roundRect(-8, -40, 16, 45, 8);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -48, 14);
    g.fill({ color: p.primary });
    g.circle(0, -48, 14);
    g.stroke({ color: 0x000000, width: 4 });
    // Orange beak
    g.moveTo(14, -50);
    g.lineTo(28, -46);
    g.lineTo(14, -42);
    g.closePath();
    g.fill({ color: 0xf97316 });
    g.moveTo(14, -50);
    g.lineTo(28, -46);
    g.lineTo(14, -42);
    g.closePath();
    g.stroke({ color: 0x000000, width: 3 });
    // Angry eyes
    this.drawCuteEyes(g, 2, -52, 5, p.eye, true);
    // Wing
    g.ellipse(-18, 8, 12, 18);
    g.fill({ color: p.secondary });
    g.ellipse(-18, 8, 12, 18);
    g.stroke({ color: 0x000000, width: 3 });
  }

  private drawFerret(g: Graphics, p: any): void {
    // Long body
    g.roundRect(-35, -5, 70, 30, 15);
    g.fill({ color: p.primary });
    g.roundRect(-35, -5, 70, 30, 15);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.ellipse(25, -5, 18, 16);
    g.fill({ color: p.primary });
    g.ellipse(25, -5, 18, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Mask marking
    g.ellipse(30, -5, 10, 8);
    g.fill({ color: p.secondary });
    // Small ears
    g.ellipse(18, -18, 6, 8);
    g.fill({ color: p.primary });
    g.ellipse(18, -18, 6, 8);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(32, -18, 6, 8);
    g.fill({ color: p.primary });
    g.ellipse(32, -18, 6, 8);
    g.stroke({ color: 0x000000, width: 2 });
    // Eyes
    this.drawCuteEyes(g, 30, -8, 5, p.eye);
    // Nose
    g.circle(40, -3, 4);
    g.fill({ color: 0x000000 });
    // Tail
    g.roundRect(-50, 5, 20, 12, 6);
    g.fill({ color: p.primary });
    g.roundRect(-50, 5, 20, 12, 6);
    g.stroke({ color: 0x000000, width: 3 });
  }

  private drawFrog(g: Graphics, p: any): void {
    // Body (wide and squat)
    g.ellipse(0, 10, 30, 22);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 30, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Big bulging eyes
    g.circle(-12, -15, 14);
    g.fill({ color: p.primary });
    g.circle(-12, -15, 14);
    g.stroke({ color: 0x000000, width: 3 });
    g.circle(12, -15, 14);
    g.fill({ color: p.primary });
    g.circle(12, -15, 14);
    g.stroke({ color: 0x000000, width: 3 });
    // Eye whites and pupils
    g.circle(-12, -17, 10);
    g.fill({ color: 0xffffff });
    g.circle(-12, -17, 10);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-10, -16, 5);
    g.fill({ color: p.eye });
    g.circle(12, -17, 10);
    g.fill({ color: 0xffffff });
    g.circle(12, -17, 10);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(14, -16, 5);
    g.fill({ color: p.eye });
    // Wide mouth
    g.arc(0, 12, 20, 0, Math.PI);
    g.stroke({ color: 0x000000, width: 3 });
    // Belly
    g.ellipse(0, 15, 18, 14);
    g.fill({ color: p.accent });
    // Legs
    g.ellipse(-28, 25, 12, 8);
    g.fill({ color: p.primary });
    g.ellipse(-28, 25, 12, 8);
    g.stroke({ color: 0x000000, width: 3 });
    g.ellipse(28, 25, 12, 8);
    g.fill({ color: p.primary });
    g.ellipse(28, 25, 12, 8);
    g.stroke({ color: 0x000000, width: 3 });
  }

  private drawCrab(g: Graphics, p: any): void {
    // Body (wide)
    g.ellipse(0, 5, 28, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 5, 28, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Eyes on stalks
    g.roundRect(-10, -25, 6, 15, 3);
    g.fill({ color: p.primary });
    g.roundRect(-10, -25, 6, 15, 3);
    g.stroke({ color: 0x000000, width: 2 });
    g.roundRect(4, -25, 6, 15, 3);
    g.fill({ color: p.primary });
    g.roundRect(4, -25, 6, 15, 3);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-7, -28, 6);
    g.fill({ color: 0xffffff });
    g.circle(-7, -28, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-6, -27, 3);
    g.fill({ color: p.eye });
    g.circle(7, -28, 6);
    g.fill({ color: 0xffffff });
    g.circle(7, -28, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(8, -27, 3);
    g.fill({ color: p.eye });
    // Big claws
    g.ellipse(-42, -5, 16, 12);
    g.fill({ color: p.primary });
    g.ellipse(-42, -5, 16, 12);
    g.stroke({ color: 0x000000, width: 4 });
    g.ellipse(-48, -12, 8, 10);
    g.fill({ color: p.primary });
    g.ellipse(-48, -12, 8, 10);
    g.stroke({ color: 0x000000, width: 3 });
    g.ellipse(42, -5, 16, 12);
    g.fill({ color: p.primary });
    g.ellipse(42, -5, 16, 12);
    g.stroke({ color: 0x000000, width: 4 });
    g.ellipse(48, -12, 8, 10);
    g.fill({ color: p.primary });
    g.ellipse(48, -12, 8, 10);
    g.stroke({ color: 0x000000, width: 3 });
    // Legs
    for (let i = -1; i <= 1; i += 2) {
      g.moveTo(i * 20, 15);
      g.lineTo(i * 30, 28);
      g.stroke({ color: p.secondary, width: 5 });
      g.stroke({ color: 0x000000, width: 2 });
    }
  }

  private drawBear(g: Graphics, p: any): void {
    // Big round body
    g.circle(0, 8, 30);
    g.fill({ color: p.primary });
    g.circle(0, 8, 30);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -25, 22);
    g.fill({ color: p.primary });
    g.circle(0, -25, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Round ears
    g.circle(-18, -42, 10);
    g.fill({ color: p.primary });
    g.circle(-18, -42, 10);
    g.stroke({ color: 0x000000, width: 3 });
    g.circle(-18, -42, 5);
    g.fill({ color: p.secondary });
    g.circle(18, -42, 10);
    g.fill({ color: p.primary });
    g.circle(18, -42, 10);
    g.stroke({ color: 0x000000, width: 3 });
    g.circle(18, -42, 5);
    g.fill({ color: p.secondary });
    // Snout
    g.ellipse(0, -18, 12, 10);
    g.fill({ color: p.accent });
    g.ellipse(0, -18, 12, 10);
    g.stroke({ color: 0x000000, width: 2 });
    // Nose
    g.ellipse(0, -20, 6, 4);
    g.fill({ color: 0x000000 });
    // Sleepy/cute eyes
    this.drawCuteEyes(g, 0, -30, 5, p.eye);
    // Belly
    g.ellipse(0, 12, 18, 16);
    g.fill({ color: p.accent });
  }

  private drawMonkey(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 8, 24, 22);
    g.fill({ color: p.primary });
    g.ellipse(0, 8, 24, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -22, 20);
    g.fill({ color: p.primary });
    g.circle(0, -22, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Face (lighter)
    g.ellipse(0, -18, 14, 12);
    g.fill({ color: p.accent });
    // Big ears
    g.circle(-22, -22, 10);
    g.fill({ color: p.primary });
    g.circle(-22, -22, 10);
    g.stroke({ color: 0x000000, width: 3 });
    g.circle(-22, -22, 5);
    g.fill({ color: p.accent });
    g.circle(22, -22, 10);
    g.fill({ color: p.primary });
    g.circle(22, -22, 10);
    g.stroke({ color: 0x000000, width: 3 });
    g.circle(22, -22, 5);
    g.fill({ color: p.accent });
    // Eyes
    this.drawCuteEyes(g, 0, -25, 5, p.eye);
    // Curly tail
    g.arc(-30, 15, 15, -Math.PI / 2, Math.PI);
    g.stroke({ color: p.secondary, width: 6 });
    g.arc(-30, 15, 15, -Math.PI / 2, Math.PI);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawRhino(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 8, 30, 24);
    g.fill({ color: p.primary });
    g.ellipse(0, 8, 30, 24);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.ellipse(20, -10, 22, 18);
    g.fill({ color: p.primary });
    g.ellipse(20, -10, 22, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Horn
    g.moveTo(40, -20);
    g.lineTo(50, -35);
    g.lineTo(38, -15);
    g.closePath();
    g.fill({ color: p.accent });
    g.moveTo(40, -20);
    g.lineTo(50, -35);
    g.lineTo(38, -15);
    g.closePath();
    g.stroke({ color: 0x000000, width: 3 });
    // Small ears
    g.ellipse(8, -25, 6, 10);
    g.fill({ color: p.primary });
    g.ellipse(8, -25, 6, 10);
    g.stroke({ color: 0x000000, width: 2 });
    // Eyes
    g.circle(28, -15, 6);
    g.fill({ color: 0xffffff });
    g.circle(28, -15, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(29, -14, 3);
    g.fill({ color: p.eye });
    // Legs
    g.roundRect(-20, 25, 14, 12, 5);
    g.fill({ color: p.primary });
    g.roundRect(-20, 25, 14, 12, 5);
    g.stroke({ color: 0x000000, width: 3 });
    g.roundRect(6, 25, 14, 12, 5);
    g.fill({ color: p.primary });
    g.roundRect(6, 25, 14, 12, 5);
    g.stroke({ color: 0x000000, width: 3 });
  }

  private drawOctopus(g: Graphics, p: any): void {
    // Tentacles first (behind body)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI + Math.PI / 6;
      const x = Math.cos(angle) * 25;
      const y = 15 + Math.sin(angle) * 15;
      g.roundRect(x - 5, y, 10, 25, 5);
      g.fill({ color: p.secondary });
      g.roundRect(x - 5, y, 10, 25, 5);
      g.stroke({ color: 0x000000, width: 2 });
    }
    // Round body/head
    g.ellipse(0, -5, 28, 32);
    g.fill({ color: p.primary });
    g.ellipse(0, -5, 28, 32);
    g.stroke({ color: 0x000000, width: 4 });
    // Big worried eyes
    g.circle(-10, -12, 10);
    g.fill({ color: 0xffffff });
    g.circle(-10, -12, 10);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-8, -10, 5);
    g.fill({ color: p.eye });
    g.circle(10, -12, 10);
    g.fill({ color: 0xffffff });
    g.circle(10, -12, 10);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(12, -10, 5);
    g.fill({ color: p.eye });
    // Worried eyebrows
    g.moveTo(-18, -22);
    g.lineTo(-5, -18);
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(18, -22);
    g.lineTo(5, -18);
    g.stroke({ color: 0x000000, width: 2 });
    // O mouth
    g.circle(0, 5, 6);
    g.fill({ color: p.secondary });
    g.circle(0, 5, 6);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawGiraffe(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 15, 22, 18);
    g.fill({ color: p.primary });
    g.ellipse(0, 15, 22, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Spots
    g.circle(-8, 12, 5);
    g.fill({ color: p.secondary });
    g.circle(8, 18, 4);
    g.fill({ color: p.secondary });
    // Long neck
    g.roundRect(-8, -45, 16, 55, 8);
    g.fill({ color: p.primary });
    g.roundRect(-8, -45, 16, 55, 8);
    g.stroke({ color: 0x000000, width: 4 });
    // Spots on neck
    g.circle(-2, -20, 4);
    g.fill({ color: p.secondary });
    g.circle(3, -35, 3);
    g.fill({ color: p.secondary });
    // Head
    g.ellipse(0, -55, 14, 12);
    g.fill({ color: p.primary });
    g.ellipse(0, -55, 14, 12);
    g.stroke({ color: 0x000000, width: 4 });
    // Ossicones (horns)
    g.roundRect(-10, -72, 6, 14, 3);
    g.fill({ color: p.secondary });
    g.roundRect(-10, -72, 6, 14, 3);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-7, -74, 4);
    g.fill({ color: p.secondary });
    g.circle(-7, -74, 4);
    g.stroke({ color: 0x000000, width: 2 });
    g.roundRect(4, -72, 6, 14, 3);
    g.fill({ color: p.secondary });
    g.roundRect(4, -72, 6, 14, 3);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(7, -74, 4);
    g.fill({ color: p.secondary });
    g.circle(7, -74, 4);
    g.stroke({ color: 0x000000, width: 2 });
    // Eyes
    this.drawCuteEyes(g, 0, -58, 4, p.eye);
  }

  private drawEel(g: Graphics, p: any): void {
    // Long wavy body
    g.moveTo(-40, 0);
    g.bezierCurveTo(-30, -15, -10, 15, 0, 0);
    g.bezierCurveTo(10, -15, 30, 15, 40, 0);
    g.lineTo(40, 15);
    g.bezierCurveTo(30, 30, 10, 0, 0, 15);
    g.bezierCurveTo(-10, 30, -30, 0, -40, 15);
    g.closePath();
    g.fill({ color: p.primary });
    g.moveTo(-40, 0);
    g.bezierCurveTo(-30, -15, -10, 15, 0, 0);
    g.bezierCurveTo(10, -15, 30, 15, 40, 0);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.ellipse(40, 7, 16, 14);
    g.fill({ color: p.primary });
    g.ellipse(40, 7, 16, 14);
    g.stroke({ color: 0x000000, width: 4 });
    // Electric sparks
    g.moveTo(-30, -8);
    g.lineTo(-25, -15);
    g.lineTo(-20, -5);
    g.stroke({ color: p.accent, width: 3 });
    g.moveTo(10, -8);
    g.lineTo(15, -18);
    g.lineTo(20, -5);
    g.stroke({ color: p.accent, width: 3 });
    // Eyes
    this.drawCuteEyes(g, 42, 3, 5, p.eye);
    // Tail fin
    g.moveTo(-40, 7);
    g.lineTo(-55, 0);
    g.lineTo(-55, 15);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawPigeon(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 8, 24, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 8, 24, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -18, 16);
    g.fill({ color: p.primary });
    g.circle(0, -18, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Crown!
    g.moveTo(-8, -38);
    g.lineTo(-5, -45);
    g.lineTo(0, -38);
    g.lineTo(5, -48);
    g.lineTo(8, -38);
    g.closePath();
    g.fill({ color: 0xffd700 });
    g.moveTo(-8, -38);
    g.lineTo(-5, -45);
    g.lineTo(0, -38);
    g.lineTo(5, -48);
    g.lineTo(8, -38);
    g.closePath();
    g.stroke({ color: 0x000000, width: 2 });
    // Beak
    g.moveTo(10, -18);
    g.lineTo(22, -16);
    g.lineTo(10, -14);
    g.closePath();
    g.fill({ color: 0xffa500 });
    g.stroke({ color: 0x000000, width: 2 });
    // Snobby eyes
    g.circle(-5, -22, 5);
    g.fill({ color: 0xffffff });
    g.circle(-5, -22, 5);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-4, -21, 2);
    g.fill({ color: p.eye });
    // Wings
    g.ellipse(-20, 5, 10, 16);
    g.fill({ color: p.secondary });
    g.ellipse(-20, 5, 10, 16);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawGoat(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 10, 26, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 26, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.ellipse(0, -18, 18, 16);
    g.fill({ color: p.primary });
    g.ellipse(0, -18, 18, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Horns
    g.moveTo(-12, -30);
    g.quadraticCurveTo(-20, -50, -8, -45);
    g.stroke({ color: p.secondary, width: 6 });
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(12, -30);
    g.quadraticCurveTo(20, -50, 8, -45);
    g.stroke({ color: p.secondary, width: 6 });
    g.stroke({ color: 0x000000, width: 2 });
    // Ears
    g.ellipse(-16, -22, 8, 5);
    g.fill({ color: p.primary });
    g.ellipse(-16, -22, 8, 5);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(16, -22, 8, 5);
    g.fill({ color: p.primary });
    g.ellipse(16, -22, 8, 5);
    g.stroke({ color: 0x000000, width: 2 });
    // Wide open screaming mouth
    g.ellipse(0, -8, 10, 8);
    g.fill({ color: 0x000000 });
    g.ellipse(0, -10, 6, 4);
    g.fill({ color: 0xff6b6b });
    // Crazed eyes
    this.drawCuteEyes(g, 0, -22, 6, p.eye, true);
    // Beard
    g.moveTo(-5, -2);
    g.lineTo(0, 8);
    g.lineTo(5, -2);
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawCow(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 8, 28, 22);
    g.fill({ color: p.primary });
    g.ellipse(0, 8, 28, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Spots
    g.ellipse(-10, 5, 8, 6);
    g.fill({ color: p.secondary });
    g.ellipse(12, 12, 6, 5);
    g.fill({ color: p.secondary });
    // Head
    g.ellipse(0, -20, 20, 16);
    g.fill({ color: p.primary });
    g.ellipse(0, -20, 20, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Snout
    g.ellipse(0, -12, 14, 10);
    g.fill({ color: p.accent });
    g.ellipse(0, -12, 14, 10);
    g.stroke({ color: 0x000000, width: 2 });
    // Nostrils
    g.ellipse(-5, -10, 3, 2);
    g.fill({ color: p.secondary });
    g.ellipse(5, -10, 3, 2);
    g.fill({ color: p.secondary });
    // Eyes
    this.drawCuteEyes(g, 0, -25, 5, p.eye);
    // Horns
    g.moveTo(-14, -32);
    g.lineTo(-18, -45);
    g.stroke({ color: p.accent, width: 5 });
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(14, -32);
    g.lineTo(18, -45);
    g.stroke({ color: p.accent, width: 5 });
    g.stroke({ color: 0x000000, width: 2 });
    // Ears
    g.ellipse(-18, -25, 8, 5);
    g.fill({ color: p.primary });
    g.ellipse(-18, -25, 8, 5);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(18, -25, 8, 5);
    g.fill({ color: p.primary });
    g.ellipse(18, -25, 8, 5);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawCat(g: Graphics, p: any, isLaser: boolean): void {
    // Body
    g.ellipse(0, 8, 24, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 8, 24, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -18, 18);
    g.fill({ color: p.primary });
    g.circle(0, -18, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Pointy ears
    g.moveTo(-18, -28);
    g.lineTo(-12, -45);
    g.lineTo(-6, -28);
    g.closePath();
    g.fill({ color: p.primary });
    g.stroke({ color: 0x000000, width: 3 });
    g.moveTo(-14, -32);
    g.lineTo(-12, -40);
    g.lineTo(-10, -32);
    g.closePath();
    g.fill({ color: p.accent });
    g.moveTo(18, -28);
    g.lineTo(12, -45);
    g.lineTo(6, -28);
    g.closePath();
    g.fill({ color: p.primary });
    g.stroke({ color: 0x000000, width: 3 });
    g.moveTo(14, -32);
    g.lineTo(12, -40);
    g.lineTo(10, -32);
    g.closePath();
    g.fill({ color: p.accent });
    // Eyes
    if (isLaser) {
      // Glowing laser eyes
      g.circle(-8, -20, 7);
      g.fill({ color: 0xff0000 });
      g.circle(-8, -20, 7);
      g.stroke({ color: 0x000000, width: 2 });
      g.circle(-8, -20, 4);
      g.fill({ color: 0xffffff });
      g.circle(8, -20, 7);
      g.fill({ color: 0xff0000 });
      g.circle(8, -20, 7);
      g.stroke({ color: 0x000000, width: 2 });
      g.circle(8, -20, 4);
      g.fill({ color: 0xffffff });
    } else {
      this.drawCuteEyes(g, 0, -22, 6, p.eye);
    }
    // Nose
    g.moveTo(0, -14);
    g.lineTo(-4, -10);
    g.lineTo(4, -10);
    g.closePath();
    g.fill({ color: p.accent });
    // Whiskers
    g.moveTo(-15, -12);
    g.lineTo(-30, -15);
    g.stroke({ color: 0x000000, width: 1 });
    g.moveTo(-15, -10);
    g.lineTo(-30, -10);
    g.stroke({ color: 0x000000, width: 1 });
    g.moveTo(15, -12);
    g.lineTo(30, -15);
    g.stroke({ color: 0x000000, width: 1 });
    g.moveTo(15, -10);
    g.lineTo(30, -10);
    g.stroke({ color: 0x000000, width: 1 });
    // Tail
    g.moveTo(-20, 15);
    g.quadraticCurveTo(-40, 10, -35, -5);
    g.stroke({ color: p.primary, width: 8 });
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawHamster(g: Graphics, p: any): void {
    // Round chubby body
    g.circle(0, 5, 28);
    g.fill({ color: p.primary });
    g.circle(0, 5, 28);
    g.stroke({ color: 0x000000, width: 4 });
    // Cheek pouches
    g.circle(-20, 0, 12);
    g.fill({ color: p.accent });
    g.circle(-20, 0, 12);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(20, 0, 12);
    g.fill({ color: p.accent });
    g.circle(20, 0, 12);
    g.stroke({ color: 0x000000, width: 2 });
    // Small round ears
    g.circle(-15, -25, 8);
    g.fill({ color: p.primary });
    g.circle(-15, -25, 8);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-15, -25, 4);
    g.fill({ color: p.accent });
    g.circle(15, -25, 8);
    g.fill({ color: p.primary });
    g.circle(15, -25, 8);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(15, -25, 4);
    g.fill({ color: p.accent });
    // Eyes
    this.drawCuteEyes(g, 0, -8, 6, p.eye);
    // Nose
    g.circle(0, 2, 4);
    g.fill({ color: p.accent });
    // Tiny paws
    g.ellipse(-18, 28, 8, 5);
    g.fill({ color: p.accent });
    g.ellipse(-18, 28, 8, 5);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(18, 28, 8, 5);
    g.fill({ color: p.accent });
    g.ellipse(18, 28, 8, 5);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawRaccoon(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 10, 24, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 24, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Striped tail
    g.roundRect(-35, 5, 20, 12, 6);
    g.fill({ color: p.primary });
    g.roundRect(-35, 5, 20, 12, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.rect(-32, 5, 4, 12);
    g.fill({ color: 0x000000 });
    g.rect(-24, 5, 4, 12);
    g.fill({ color: 0x000000 });
    // Head
    g.circle(0, -18, 18);
    g.fill({ color: p.primary });
    g.circle(0, -18, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Mask
    g.ellipse(-10, -20, 10, 6);
    g.fill({ color: 0x000000 });
    g.ellipse(10, -20, 10, 6);
    g.fill({ color: 0x000000 });
    // Eyes in mask
    g.circle(-10, -20, 5);
    g.fill({ color: 0xffffff });
    g.circle(-9, -19, 2);
    g.fill({ color: p.eye });
    g.circle(10, -20, 5);
    g.fill({ color: 0xffffff });
    g.circle(11, -19, 2);
    g.fill({ color: p.eye });
    // Ears
    g.ellipse(-14, -32, 6, 8);
    g.fill({ color: p.primary });
    g.ellipse(-14, -32, 6, 8);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(14, -32, 6, 8);
    g.fill({ color: p.primary });
    g.ellipse(14, -32, 6, 8);
    g.stroke({ color: 0x000000, width: 2 });
    // Nose
    g.circle(0, -12, 4);
    g.fill({ color: 0x000000 });
  }

  private drawDuck(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 10, 24, 18);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 24, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -16, 16);
    g.fill({ color: p.primary });
    g.circle(0, -16, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Bill
    g.ellipse(16, -12, 14, 6);
    g.fill({ color: 0xffa500 });
    g.ellipse(16, -12, 14, 6);
    g.stroke({ color: 0x000000, width: 2 });
    // Eyes (cosmic sparkle)
    g.circle(-5, -20, 6);
    g.fill({ color: 0xffffff });
    g.circle(-5, -20, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(-4, -19, 3);
    g.fill({ color: p.eye });
    // Sparkles
    g.moveTo(-5, -28);
    g.lineTo(-5, -32);
    g.stroke({ color: p.accent, width: 2 });
    g.moveTo(-10, -25);
    g.lineTo(-14, -25);
    g.stroke({ color: p.accent, width: 2 });
    // Wing
    g.ellipse(-15, 8, 10, 14);
    g.fill({ color: p.secondary });
    g.ellipse(-15, 8, 10, 14);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawDog(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 10, 26, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 26, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -16, 18);
    g.fill({ color: p.primary });
    g.circle(0, -16, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Floppy ears
    g.ellipse(-18, -10, 10, 18);
    g.fill({ color: p.secondary });
    g.ellipse(-18, -10, 10, 18);
    g.stroke({ color: 0x000000, width: 3 });
    g.ellipse(18, -10, 10, 18);
    g.fill({ color: p.secondary });
    g.ellipse(18, -10, 10, 18);
    g.stroke({ color: 0x000000, width: 3 });
    // Snout
    g.ellipse(0, -8, 12, 10);
    g.fill({ color: p.accent });
    g.ellipse(0, -8, 12, 10);
    g.stroke({ color: 0x000000, width: 2 });
    // Nose
    g.ellipse(0, -10, 5, 4);
    g.fill({ color: 0x000000 });
    // Happy eyes
    this.drawCuteEyes(g, 0, -20, 5, p.eye);
    // Tongue
    g.ellipse(0, 2, 5, 8);
    g.fill({ color: 0xff6b6b });
    g.ellipse(0, 2, 5, 8);
    g.stroke({ color: 0x000000, width: 1 });
    // Wagging tail
    g.moveTo(-22, 15);
    g.quadraticCurveTo(-35, 5, -30, -5);
    g.stroke({ color: p.primary, width: 8 });
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawHuman(g: Graphics, p: any): void {
    // Body (plain shirt)
    g.roundRect(-20, -5, 40, 35, 10);
    g.fill({ color: p.primary });
    g.roundRect(-20, -5, 40, 35, 10);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -25, 18);
    g.fill({ color: p.accent });
    g.circle(0, -25, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Hair
    g.ellipse(0, -38, 16, 8);
    g.fill({ color: p.secondary });
    g.ellipse(0, -38, 16, 8);
    g.stroke({ color: 0x000000, width: 2 });
    // Normal eyes
    this.drawCuteEyes(g, 0, -28, 5, p.eye);
    // Neutral expression
    g.moveTo(-6, -18);
    g.lineTo(6, -18);
    g.stroke({ color: 0x000000, width: 2 });
    // Arms
    g.roundRect(-32, 0, 14, 8, 4);
    g.fill({ color: p.accent });
    g.roundRect(-32, 0, 14, 8, 4);
    g.stroke({ color: 0x000000, width: 2 });
    g.roundRect(18, 0, 14, 8, 4);
    g.fill({ color: p.accent });
    g.roundRect(18, 0, 14, 8, 4);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawBunny(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 10, 22, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 22, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -15, 18);
    g.fill({ color: p.primary });
    g.circle(0, -15, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Long ears
    g.roundRect(-12, -65, 10, 45, 5);
    g.fill({ color: p.primary });
    g.roundRect(-12, -65, 10, 45, 5);
    g.stroke({ color: 0x000000, width: 3 });
    g.roundRect(-10, -60, 6, 35, 3);
    g.fill({ color: p.accent });
    g.roundRect(2, -65, 10, 45, 5);
    g.fill({ color: p.primary });
    g.roundRect(2, -65, 10, 45, 5);
    g.stroke({ color: 0x000000, width: 3 });
    g.roundRect(4, -60, 6, 35, 3);
    g.fill({ color: p.accent });
    // Eyes
    this.drawCuteEyes(g, 0, -18, 6, p.eye);
    // Nose
    g.moveTo(0, -10);
    g.lineTo(-4, -6);
    g.lineTo(4, -6);
    g.closePath();
    g.fill({ color: p.accent });
    // Fluffy tail
    g.circle(-18, 20, 10);
    g.fill({ color: 0xffffff });
    g.circle(-18, 20, 10);
    g.stroke({ color: 0x000000, width: 2 });
    // Big feet
    g.ellipse(-12, 28, 12, 6);
    g.fill({ color: p.primary });
    g.ellipse(-12, 28, 12, 6);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(12, 28, 12, 6);
    g.fill({ color: p.primary });
    g.ellipse(12, 28, 12, 6);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawSquirrel(g: Graphics, p: any): void {
    // Big fluffy tail (behind)
    g.moveTo(-25, -10);
    g.quadraticCurveTo(-50, -30, -40, 20);
    g.quadraticCurveTo(-30, 35, -15, 15);
    g.closePath();
    g.fill({ color: p.secondary });
    g.moveTo(-25, -10);
    g.quadraticCurveTo(-50, -30, -40, 20);
    g.quadraticCurveTo(-30, 35, -15, 15);
    g.stroke({ color: 0x000000, width: 3 });
    // Body
    g.ellipse(0, 10, 20, 18);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 20, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -14, 16);
    g.fill({ color: p.primary });
    g.circle(0, -14, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Pointed ears
    g.ellipse(-10, -28, 5, 8);
    g.fill({ color: p.primary });
    g.ellipse(-10, -28, 5, 8);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(10, -28, 5, 8);
    g.fill({ color: p.primary });
    g.ellipse(10, -28, 5, 8);
    g.stroke({ color: 0x000000, width: 2 });
    // Eyes
    this.drawCuteEyes(g, 0, -16, 5, p.eye);
    // Nose
    g.circle(0, -8, 3);
    g.fill({ color: 0x000000 });
    // Ninja mask
    g.rect(-18, -20, 36, 8);
    g.fill({ color: 0x000000, alpha: 0.6 });
    // Holding acorn
    g.ellipse(15, 5, 8, 10);
    g.fill({ color: 0x8B4513 });
    g.ellipse(15, 5, 8, 10);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(15, -3, 6, 4);
    g.fill({ color: 0x654321 });
  }

  private drawPenguin(g: Graphics, p: any): void {
    // Body (tuxedo shape)
    g.ellipse(0, 8, 24, 26);
    g.fill({ color: 0x000000 });
    g.ellipse(0, 8, 24, 26);
    g.stroke({ color: 0x000000, width: 4 });
    // White belly
    g.ellipse(0, 12, 16, 20);
    g.fill({ color: 0xffffff });
    // Head
    g.circle(0, -20, 18);
    g.fill({ color: 0x000000 });
    g.circle(0, -20, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // White face
    g.ellipse(0, -16, 12, 10);
    g.fill({ color: 0xffffff });
    // Beak
    g.moveTo(0, -14);
    g.lineTo(-6, -8);
    g.lineTo(6, -8);
    g.closePath();
    g.fill({ color: 0xffa500 });
    g.stroke({ color: 0x000000, width: 2 });
    // Eyes
    this.drawCuteEyes(g, 0, -22, 5, 0x000000);
    // Rocket pack
    g.roundRect(-8, 20, 16, 18, 4);
    g.fill({ color: p.primary });
    g.roundRect(-8, 20, 16, 18, 4);
    g.stroke({ color: 0x000000, width: 2 });
    // Flame
    g.moveTo(-4, 38);
    g.lineTo(0, 48);
    g.lineTo(4, 38);
    g.closePath();
    g.fill({ color: 0xff6600 });
    g.moveTo(-2, 38);
    g.lineTo(0, 44);
    g.lineTo(2, 38);
    g.closePath();
    g.fill({ color: 0xffff00 });
    // Flippers
    g.ellipse(-26, 5, 8, 16);
    g.fill({ color: 0x000000 });
    g.ellipse(-26, 5, 8, 16);
    g.stroke({ color: 0x000000, width: 2 });
    g.ellipse(26, 5, 8, 16);
    g.fill({ color: 0x000000 });
    g.ellipse(26, 5, 8, 16);
    g.stroke({ color: 0x000000, width: 2 });
  }

  private drawBat(g: Graphics, p: any): void {
    // Wings (spread out)
    g.moveTo(-20, 0);
    g.quadraticCurveTo(-50, -20, -45, 10);
    g.quadraticCurveTo(-40, 25, -20, 15);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(20, 0);
    g.quadraticCurveTo(50, -20, 45, 10);
    g.quadraticCurveTo(40, 25, 20, 15);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
    // Body
    g.ellipse(0, 10, 18, 20);
    g.fill({ color: p.primary });
    g.ellipse(0, 10, 18, 20);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.circle(0, -15, 16);
    g.fill({ color: p.primary });
    g.circle(0, -15, 16);
    g.stroke({ color: 0x000000, width: 4 });
    // Huge ears
    g.moveTo(-12, -25);
    g.lineTo(-18, -55);
    g.lineTo(-5, -30);
    g.closePath();
    g.fill({ color: p.primary });
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(-14, -30);
    g.lineTo(-16, -45);
    g.lineTo(-8, -32);
    g.closePath();
    g.fill({ color: p.accent });
    g.moveTo(12, -25);
    g.lineTo(18, -55);
    g.lineTo(5, -30);
    g.closePath();
    g.fill({ color: p.primary });
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(14, -30);
    g.lineTo(16, -45);
    g.lineTo(8, -32);
    g.closePath();
    g.fill({ color: p.accent });
    // Eyes
    this.drawCuteEyes(g, 0, -18, 5, p.eye);
    // Fangs
    g.moveTo(-4, -5);
    g.lineTo(-3, 2);
    g.lineTo(-2, -5);
    g.fill({ color: 0xffffff });
    g.moveTo(4, -5);
    g.lineTo(3, 2);
    g.lineTo(2, -5);
    g.fill({ color: 0xffffff });
  }

  private drawFish(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 0, 30, 22);
    g.fill({ color: p.primary });
    g.ellipse(0, 0, 30, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Tail fin
    g.moveTo(-25, 0);
    g.lineTo(-45, -15);
    g.lineTo(-45, 15);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
    // Top fin
    g.moveTo(-5, -20);
    g.lineTo(0, -35);
    g.lineTo(10, -20);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
    // Side fin
    g.ellipse(10, 15, 10, 6);
    g.fill({ color: p.secondary });
    g.ellipse(10, 15, 10, 6);
    g.stroke({ color: 0x000000, width: 2 });
    // Big eyes
    g.circle(15, -5, 10);
    g.fill({ color: 0xffffff });
    g.circle(15, -5, 10);
    g.stroke({ color: 0x000000, width: 2 });
    g.circle(17, -4, 5);
    g.fill({ color: p.eye });
    // Bubbles
    g.circle(35, -10, 4);
    g.fill({ color: 0xffffff, alpha: 0.6 });
    g.circle(35, -10, 4);
    g.stroke({ color: p.accent, width: 1 });
    g.circle(40, -18, 3);
    g.fill({ color: 0xffffff, alpha: 0.6 });
    g.circle(40, -18, 3);
    g.stroke({ color: p.accent, width: 1 });
    g.circle(38, -25, 2);
    g.fill({ color: 0xffffff, alpha: 0.6 });
    // Cute mouth
    g.circle(28, 2, 4);
    g.fill({ color: p.secondary });
  }

  private drawFox(g: Graphics, p: any): void {
    // Fluffy tail
    g.moveTo(-20, 10);
    g.quadraticCurveTo(-45, 0, -40, 25);
    g.quadraticCurveTo(-30, 40, -15, 20);
    g.closePath();
    g.fill({ color: p.primary, alpha: 0.8 });
    g.stroke({ color: 0x000000, width: 2, alpha: 0.5 });
    // White tail tip
    g.circle(-35, 25, 8);
    g.fill({ color: 0xffffff, alpha: 0.8 });
    // Body (slightly transparent for ghost effect)
    g.ellipse(0, 10, 22, 18);
    g.fill({ color: p.primary, alpha: 0.85 });
    g.ellipse(0, 10, 22, 18);
    g.stroke({ color: 0x000000, width: 4, alpha: 0.7 });
    // Head
    g.circle(0, -15, 18);
    g.fill({ color: p.primary, alpha: 0.85 });
    g.circle(0, -15, 18);
    g.stroke({ color: 0x000000, width: 4, alpha: 0.7 });
    // Big pointy ears
    g.moveTo(-15, -28);
    g.lineTo(-18, -50);
    g.lineTo(-5, -32);
    g.closePath();
    g.fill({ color: p.primary, alpha: 0.85 });
    g.stroke({ color: 0x000000, width: 2, alpha: 0.7 });
    g.moveTo(-14, -35);
    g.lineTo(-16, -45);
    g.lineTo(-8, -35);
    g.closePath();
    g.fill({ color: p.accent, alpha: 0.8 });
    g.moveTo(15, -28);
    g.lineTo(18, -50);
    g.lineTo(5, -32);
    g.closePath();
    g.fill({ color: p.primary, alpha: 0.85 });
    g.stroke({ color: 0x000000, width: 2, alpha: 0.7 });
    g.moveTo(14, -35);
    g.lineTo(16, -45);
    g.lineTo(8, -35);
    g.closePath();
    g.fill({ color: p.accent, alpha: 0.8 });
    // White muzzle
    g.ellipse(0, -8, 10, 8);
    g.fill({ color: 0xffffff, alpha: 0.8 });
    // Ghostly glowing eyes
    g.circle(-8, -18, 6);
    g.fill({ color: p.eye });
    g.circle(-8, -18, 3);
    g.fill({ color: 0xffffff });
    g.circle(8, -18, 6);
    g.fill({ color: p.eye });
    g.circle(8, -18, 3);
    g.fill({ color: 0xffffff });
    // Nose
    g.circle(0, -5, 3);
    g.fill({ color: 0x000000, alpha: 0.7 });
  }

  private drawMole(g: Graphics, p: any): void {
    // Body
    g.ellipse(0, 8, 26, 22);
    g.fill({ color: p.primary });
    g.ellipse(0, 8, 26, 22);
    g.stroke({ color: 0x000000, width: 4 });
    // Head
    g.ellipse(0, -15, 20, 18);
    g.fill({ color: p.primary });
    g.ellipse(0, -15, 20, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Big digging claws
    g.moveTo(-30, 5);
    g.lineTo(-42, -5);
    g.lineTo(-38, 5);
    g.lineTo(-45, 10);
    g.lineTo(-38, 12);
    g.lineTo(-42, 20);
    g.lineTo(-30, 12);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
    g.moveTo(30, 5);
    g.lineTo(42, -5);
    g.lineTo(38, 5);
    g.lineTo(45, 10);
    g.lineTo(38, 12);
    g.lineTo(42, 20);
    g.lineTo(30, 12);
    g.closePath();
    g.fill({ color: p.secondary });
    g.stroke({ color: 0x000000, width: 2 });
    // Big pink nose
    g.circle(0, -8, 10);
    g.fill({ color: 0xffb6c1 });
    g.circle(0, -8, 10);
    g.stroke({ color: 0x000000, width: 2 });
    // Tiny eyes (moles are nearly blind)
    g.circle(-8, -18, 3);
    g.fill({ color: 0x000000 });
    g.circle(8, -18, 3);
    g.fill({ color: 0x000000 });
    // Magnet symbol on belly
    g.moveTo(-8, 15);
    g.lineTo(-8, 5);
    g.arc(0, 5, 8, Math.PI, 0);
    g.lineTo(8, 15);
    g.stroke({ color: 0xff0000, width: 4 });
  }

  private drawPeacock(g: Graphics, p: any): void {
    // Tail feathers (fan behind)
    for (let i = -4; i <= 4; i++) {
      const angle = (i / 4) * 0.8 - Math.PI / 2;
      const x = Math.cos(angle) * 45;
      const y = Math.sin(angle) * 45 + 10;
      g.ellipse(x, y, 12, 25);
      g.fill({ color: i % 2 === 0 ? p.primary : p.secondary });
      g.ellipse(x, y, 12, 25);
      g.stroke({ color: 0x000000, width: 2 });
      // Eye spots on feathers
      g.circle(x, y - 10, 6);
      g.fill({ color: 0x00ffff });
      g.circle(x, y - 10, 6);
      g.stroke({ color: 0x000000, width: 1 });
      g.circle(x, y - 10, 3);
      g.fill({ color: 0x000080 });
    }
    // Body
    g.ellipse(0, 15, 20, 18);
    g.fill({ color: p.primary });
    g.ellipse(0, 15, 20, 18);
    g.stroke({ color: 0x000000, width: 4 });
    // Neck
    g.roundRect(-6, -25, 12, 35, 6);
    g.fill({ color: p.primary });
    g.roundRect(-6, -25, 12, 35, 6);
    g.stroke({ color: 0x000000, width: 3 });
    // Head
    g.circle(0, -32, 12);
    g.fill({ color: p.primary });
    g.circle(0, -32, 12);
    g.stroke({ color: 0x000000, width: 3 });
    // Crown feathers
    g.moveTo(-3, -42);
    g.lineTo(-4, -55);
    g.lineTo(-1, -45);
    g.stroke({ color: p.accent, width: 2 });
    g.circle(-4, -57, 3);
    g.fill({ color: p.accent });
    g.moveTo(0, -42);
    g.lineTo(0, -58);
    g.lineTo(0, -45);
    g.stroke({ color: p.accent, width: 2 });
    g.circle(0, -60, 3);
    g.fill({ color: p.accent });
    g.moveTo(3, -42);
    g.lineTo(4, -55);
    g.lineTo(1, -45);
    g.stroke({ color: p.accent, width: 2 });
    g.circle(4, -57, 3);
    g.fill({ color: p.accent });
    // Beak
    g.moveTo(8, -32);
    g.lineTo(18, -30);
    g.lineTo(8, -28);
    g.closePath();
    g.fill({ color: 0xffa500 });
    g.stroke({ color: 0x000000, width: 1 });
    // Fabulous eye
    g.circle(-3, -34, 5);
    g.fill({ color: 0xffffff });
    g.circle(-3, -34, 5);
    g.stroke({ color: 0x000000, width: 1 });
    g.circle(-2, -33, 2);
    g.fill({ color: p.eye });
  }

  private drawDefaultBlob(g: Graphics, p: any): void {
    // Fallback blob body
    g.roundRect(-28, -32, 56, 64, 28);
    g.fill({ color: p.primary });
    g.roundRect(-28, -32, 56, 64, 28);
    g.stroke({ color: 0x000000, width: 5 });
    g.ellipse(-8, -10, 14, 10);
    g.fill({ color: 0xffffff, alpha: 0.3 });
    this.drawCuteEyes(g, 0, -10, 6, p.eye);
  }

  private drawBeastFace(g: Graphics, beastId: string, palette: any, expression: string): void {
    // Expression effects are now integrated into the body drawings
    // This function adds overlay effects for states
    const isAttack = expression === 'attack';
    const isHurt = expression === 'hurt';

    if (isAttack) {
      // Anger lines
      g.moveTo(-20, -35);
      g.lineTo(-12, -30);
      g.stroke({ color: 0xff4444, width: 3 });
      g.moveTo(20, -35);
      g.lineTo(12, -30);
      g.stroke({ color: 0xff4444, width: 3 });
    }

    if (isHurt) {
      // Pain stars
      g.moveTo(-15, -40);
      g.lineTo(-18, -35);
      g.lineTo(-12, -35);
      g.closePath();
      g.fill({ color: 0xffffff });
      g.moveTo(15, -38);
      g.lineTo(12, -33);
      g.lineTo(18, -33);
      g.closePath();
      g.fill({ color: 0xffffff });
    }
  }

  private drawBeastAccessory(g: Graphics, beastId: string, palette: any): void {
    // Accessories are now integrated into the creature-specific drawings
    // This function is kept for any additional overlays if needed
  }

  private animateBeast(sprite: BeastSprite, deltaTime: number): void {
    sprite.animationTime += deltaTime;

    // Among Us style bouncy idle bob
    const bob = Math.sin(sprite.animationTime / 250) * 4;
    sprite.body.y = bob;

    // Squash and stretch (more pronounced for cartoony feel)
    const stretch = sprite.squashStretch;
    sprite.body.scale.x = 1 / stretch;
    sprite.body.scale.y = stretch;
    sprite.squashStretch = 1 + (sprite.squashStretch - 1) * 0.85;

    // Shadow scales and moves with body
    sprite.shadow.scale.x = 1 + (sprite.squashStretch - 1) * 0.4;
    sprite.shadow.scale.y = 1 - bob * 0.02;
    sprite.shadow.y = 35 + bob * 0.5;
  }

  // ============================================
  // EFFECTS
  // ============================================

  private spawnAttackEffect(player: PlayerState): void {
    const palette = BEAST_PALETTES[player.beastId] || BEAST_PALETTES.rock_tortoise;
    const angle = player.facingAngle;
    const range = 90;

    // Play attack sound
    audio.playSound('attack', Math.random());

    // Screen shake for attack feedback
    this.triggerScreenShake(4);

    // Draw a visible slash arc
    const slashGraphic = new Graphics();
    slashGraphic.x = player.position.x;
    slashGraphic.y = player.position.y;
    slashGraphic.rotation = angle;

    // Draw the slash arc
    slashGraphic.arc(0, 0, range, -0.8, 0.8);
    slashGraphic.stroke({ color: 0xffffff, width: 12, alpha: 0.9 });
    slashGraphic.arc(0, 0, range - 5, -0.7, 0.7);
    slashGraphic.stroke({ color: palette.accent, width: 8, alpha: 0.8 });
    slashGraphic.arc(0, 0, range - 10, -0.6, 0.6);
    slashGraphic.stroke({ color: palette.primary, width: 6, alpha: 0.7 });

    this.effectsContainer.addChild(slashGraphic);

    // Animate and remove the slash
    let slashLife = 150;
    const animateSlash = () => {
      slashLife -= 16;
      slashGraphic.alpha = slashLife / 150;
      slashGraphic.scale.set(1 + (1 - slashLife / 150) * 0.3);
      if (slashLife > 0) {
        requestAnimationFrame(animateSlash);
      } else {
        this.effectsContainer.removeChild(slashGraphic);
      }
    };
    requestAnimationFrame(animateSlash);

    // Attack swipe particles along the arc
    for (let i = -6; i <= 6; i++) {
      const a = angle + (i * 0.12);
      const dist = range * (0.6 + Math.abs(i) * 0.05);
      this.particles.emit({
        x: player.position.x + Math.cos(a) * dist,
        y: player.position.y + Math.sin(a) * dist,
        count: 4,
        color: palette.accent,
        speed: 300,
        spread: 20,
        life: 350,
        size: 12,
        type: 'star',
      });
    }

    // Big impact burst at attack point
    const impactX = player.position.x + Math.cos(angle) * range;
    const impactY = player.position.y + Math.sin(angle) * range;
    this.particles.burst(impactX, impactY, palette.primary, 25);
    this.particles.burst(impactX, impactY, 0xffffff, 15);
    this.particles.burst(impactX, impactY, palette.accent, 20);
  }

  private spawnAbilityEffect(player: PlayerState): void {
    const palette = BEAST_PALETTES[player.beastId] || BEAST_PALETTES.rock_tortoise;
    const beast = getBeast(player.beastId);

    // Play ability sound
    audio.playSound('ability');

    // Screen shake for ability
    this.triggerScreenShake(5);

    // Radial burst around player
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.emit({
        x: player.position.x + Math.cos(angle) * 30,
        y: player.position.y + Math.sin(angle) * 30,
        count: 3,
        color: palette.accent,
        speed: 250,
        spread: 30,
        life: 400,
        size: 12,
        type: 'star',
      });
    }

    // Central burst
    this.particles.burst(player.position.x, player.position.y, palette.primary, 20);
    this.particles.burst(player.position.x, player.position.y, 0xffffff, 10);

    // Ring effect
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      this.particles.emit({
        x: player.position.x + Math.cos(angle) * 50,
        y: player.position.y + Math.sin(angle) * 50,
        count: 2,
        color: palette.secondary,
        speed: 100,
        spread: 10,
        life: 300,
        size: 8,
        type: 'star',
      });
    }
  }

  private spawnDeathEffect(position: Vector2, beastId: string): void {
    const palette = BEAST_PALETTES[beastId] || BEAST_PALETTES.rock_tortoise;

    // Play death sound
    audio.playSound('explosion');

    // Big burst of particles
    this.particles.burst(position.x, position.y, palette.primary, 30);
    this.particles.burst(position.x, position.y, palette.secondary, 20);
    this.particles.burst(position.x, position.y, 0xffffff, 10);

    // Screen shake
    this.triggerScreenShake(8);
  }

  triggerScreenShake(intensity: number = 5): void {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = 300;
  }

  private renderChaosEffects(events: ChaosEventState[]): void {
    // Apply visual effects based on active chaos events
    for (const event of events) {
      switch (event.type) {
        case 'big_heads':
          // Scale up player heads (handled in beast rendering)
          break;
        case 'fog_of_war':
          // Add fog overlay
          break;
        case 'screen_shake':
          this.triggerScreenShake(3);
          break;
      }
    }
  }

  // ============================================
  // PROJECTILES
  // ============================================

  private renderProjectiles(projectiles: ProjectileState[]): void {
    const currentIds = new Set(projectiles.map(p => p.id));

    // Remove old projectile graphics
    for (const [id, sprite] of this.projectileGraphics) {
      if (!currentIds.has(id)) {
        this.effectsContainer.removeChild(sprite.container);
        this.projectileGraphics.delete(id);
      }
    }

    for (const proj of projectiles) {
      let sprite = this.projectileGraphics.get(proj.id);

      if (!sprite) {
        sprite = this.createProjectileSprite(proj);
        this.projectileGraphics.set(proj.id, sprite);
        this.effectsContainer.addChild(sprite.container);
      }

      // Update position
      sprite.container.x = proj.position.x;
      sprite.container.y = proj.position.y;
      sprite.container.rotation = proj.angle;

      // Animate (spin, glow, etc.)
      const lifePercent = proj.lifetime / proj.maxLifetime;
      sprite.graphic.alpha = lifePercent;
    }
  }

  private createProjectileSprite(proj: ProjectileState): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();

    // Different visuals based on ability
    const colors: Record<string, number> = {
      tongue_lash: 0x22c55e,      // Green slime
      chain_lightning: 0x3b82f6,   // Blue electric
      spine_barrage: 0x16a34a,     // Green needles
      moocus_missile: 0x84cc16,    // Lime slime
      ink_bomb: 0x1f2937,          // Dark ink
      quasar_blast: 0x7c3aed,      // Purple cosmic
      crystal_shard: 0x06b6d4,     // Cyan crystal
      royal_volley: 0x64748b,      // Gray pigeon
    };

    const color = colors[proj.abilityId] || 0xfbbf24;

    // Glow
    graphic.circle(0, 0, proj.radius + 5);
    graphic.fill({ color, alpha: 0.3 });

    // Main projectile
    graphic.circle(0, 0, proj.radius);
    graphic.fill({ color });
    graphic.circle(0, 0, proj.radius);
    graphic.stroke({ color: 0x000000, width: 2 });

    // Trail effect (elongated shape)
    graphic.ellipse(-proj.radius, 0, proj.radius * 0.8, proj.radius * 0.5);
    graphic.fill({ color, alpha: 0.5 });

    container.addChild(graphic);
    return { container, graphic };
  }

  // ============================================
  // COVER AREAS
  // ============================================

  private renderCoverAreas(covers: CoverState[]): void {
    const currentIds = new Set(covers.map(c => c.id));

    // Remove old graphics
    for (const [id, sprite] of this.coverGraphics) {
      if (!currentIds.has(id)) {
        this.arenaContainer.removeChild(sprite.container);
        this.coverGraphics.delete(id);
      }
    }

    for (const cover of covers) {
      let sprite = this.coverGraphics.get(cover.id);

      if (!sprite) {
        sprite = this.createCoverSprite(cover);
        this.coverGraphics.set(cover.id, sprite);
        this.arenaContainer.addChild(sprite.container);
      }

      // Update position
      sprite.container.x = cover.position.x;
      sprite.container.y = cover.position.y;

      // Animate grass sway
      const sway = Math.sin(this.time / 500 + cover.position.x * 0.01) * 0.02;
      sprite.container.rotation = sway;
    }
  }

  private createCoverSprite(cover: CoverState): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();

    const hw = cover.size.x / 2;
    const hh = cover.size.y / 2;

    if (cover.type === 'tall_grass') {
      // Green grass patch with multiple grass blades
      for (let i = 0; i < 8; i++) {
        const x = -hw + Math.random() * cover.size.x;
        const grassHeight = hh * 0.6 + Math.random() * hh * 0.4;

        // Draw grass blade
        graphic.moveTo(x, hh * 0.3);
        graphic.lineTo(x - 5, -grassHeight);
        graphic.lineTo(x + 5, -grassHeight);
        graphic.lineTo(x, hh * 0.3);
        graphic.fill({ color: 0x22c55e, alpha: 0.8 });
      }

      // Base ground
      graphic.ellipse(0, hh * 0.4, hw, hh * 0.3);
      graphic.fill({ color: 0x166534, alpha: 0.6 });
    } else {
      // Bush - rounder shape
      graphic.circle(0, 0, Math.min(hw, hh));
      graphic.fill({ color: 0x16a34a, alpha: 0.7 });
      graphic.circle(-hw * 0.3, -hh * 0.2, Math.min(hw, hh) * 0.6);
      graphic.fill({ color: 0x22c55e, alpha: 0.8 });
      graphic.circle(hw * 0.3, -hh * 0.3, Math.min(hw, hh) * 0.5);
      graphic.fill({ color: 0x4ade80, alpha: 0.7 });
    }

    // Border
    graphic.ellipse(0, 0, hw, hh);
    graphic.stroke({ color: 0x000000, width: 2, alpha: 0.3 });

    container.addChild(graphic);
    return { container, graphic };
  }

  // ============================================
  // VENTS
  // ============================================

  private renderVents(vents: VentState[]): void {
    const currentIds = new Set(vents.map(v => v.id));

    for (const [id, sprite] of this.ventGraphics) {
      if (!currentIds.has(id)) {
        this.arenaContainer.removeChild(sprite.container);
        this.ventGraphics.delete(id);
      }
    }

    for (const vent of vents) {
      let sprite = this.ventGraphics.get(vent.id);

      if (!sprite) {
        sprite = this.createVentSprite();
        this.ventGraphics.set(vent.id, sprite);
        this.arenaContainer.addChild(sprite.container);
      }

      sprite.container.x = vent.position.x;
      sprite.container.y = vent.position.y;

      // Visual feedback for cooldown
      const onCooldown = vent.cooldownUntil > 0;
      sprite.graphic.alpha = onCooldown ? 0.5 : 1.0;
    }
  }

  private createVentSprite(): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();

    // Vent grate
    graphic.roundRect(-25, -25, 50, 50, 5);
    graphic.fill({ color: 0x374151 });
    graphic.roundRect(-25, -25, 50, 50, 5);
    graphic.stroke({ color: 0x000000, width: 3 });

    // Grate lines
    for (let i = -15; i <= 15; i += 10) {
      graphic.moveTo(i, -20);
      graphic.lineTo(i, 20);
      graphic.stroke({ color: 0x1f2937, width: 3 });
    }

    // Inner shadow
    graphic.roundRect(-20, -20, 40, 40, 3);
    graphic.fill({ color: 0x000000, alpha: 0.5 });

    container.addChild(graphic);
    return { container, graphic };
  }

  // ============================================
  // DESTRUCTIBLES
  // ============================================

  private renderDestructibles(destructibles: DestructibleState[]): void {
    const currentIds = new Set(destructibles.map(d => d.id));

    for (const [id, sprite] of this.destructibleGraphics) {
      if (!currentIds.has(id)) {
        // Spawn destruction particles
        const dest = destructibles.find(d => d.id === id);
        if (dest) {
          this.particles.burst(dest.position.x, dest.position.y, 0x78716c, 15);
        }
        this.hazardsContainer.removeChild(sprite.container);
        this.destructibleGraphics.delete(id);
      }
    }

    for (const dest of destructibles) {
      let sprite = this.destructibleGraphics.get(dest.id);

      if (!sprite) {
        sprite = this.createDestructibleSprite(dest);
        this.destructibleGraphics.set(dest.id, sprite);
        this.hazardsContainer.addChild(sprite.container);
      }

      sprite.container.x = dest.position.x;
      sprite.container.y = dest.position.y;

      // Show damage with alpha
      const healthPercent = dest.health / dest.maxHealth;
      sprite.graphic.alpha = 0.5 + healthPercent * 0.5;
    }
  }

  private createDestructibleSprite(dest: DestructibleState): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();

    const colors: Record<string, { main: number; accent: number }> = {
      crate: { main: 0xa3873a, accent: 0x7c6330 },
      barrel: { main: 0x64748b, accent: 0x475569 },
      pot: { main: 0xd97706, accent: 0xb45309 },
    };

    const color = colors[dest.type] || colors.crate;

    if (dest.type === 'crate') {
      // Wooden crate
      graphic.roundRect(-20, -20, 40, 40, 3);
      graphic.fill({ color: color.main });
      graphic.roundRect(-20, -20, 40, 40, 3);
      graphic.stroke({ color: 0x000000, width: 3 });
      // Cross pattern
      graphic.moveTo(-15, -15);
      graphic.lineTo(15, 15);
      graphic.moveTo(15, -15);
      graphic.lineTo(-15, 15);
      graphic.stroke({ color: color.accent, width: 2 });
    } else if (dest.type === 'barrel') {
      // Metal barrel
      graphic.ellipse(0, 0, 18, 22);
      graphic.fill({ color: color.main });
      graphic.ellipse(0, 0, 18, 22);
      graphic.stroke({ color: 0x000000, width: 3 });
      // Bands
      graphic.ellipse(0, -10, 16, 3);
      graphic.fill({ color: color.accent });
      graphic.ellipse(0, 10, 16, 3);
      graphic.fill({ color: color.accent });
    } else {
      // Ceramic pot
      graphic.circle(0, 5, 15);
      graphic.fill({ color: color.main });
      graphic.circle(0, 5, 15);
      graphic.stroke({ color: 0x000000, width: 3 });
      // Rim
      graphic.ellipse(0, -8, 12, 5);
      graphic.fill({ color: color.accent });
      graphic.ellipse(0, -8, 12, 5);
      graphic.stroke({ color: 0x000000, width: 2 });
    }

    container.addChild(graphic);
    return { container, graphic };
  }

  // ============================================
  // POWER-UPS
  // ============================================

  private renderPowerUps(powerUps: PowerUpState[]): void {
    const currentIds = new Set(powerUps.map(p => p.id));

    for (const [id, sprite] of this.powerUpGraphics) {
      if (!currentIds.has(id)) {
        this.effectsContainer.removeChild(sprite.container);
        this.powerUpGraphics.delete(id);
      }
    }

    for (const pu of powerUps) {
      let sprite = this.powerUpGraphics.get(pu.id);

      if (!sprite) {
        sprite = this.createPowerUpSprite(pu);
        this.powerUpGraphics.set(pu.id, sprite);
        this.effectsContainer.addChild(sprite.container);
      }

      sprite.container.x = pu.position.x;
      sprite.container.y = pu.position.y;

      // Floating animation
      sprite.container.y += Math.sin(this.time / 300 + pu.position.x) * 3;

      // Spin animation
      sprite.graphic.rotation = this.time / 500;

      // Pulse glow
      const pulse = 0.7 + Math.sin(this.time / 200) * 0.3;
      sprite.graphic.alpha = pulse;
    }
  }

  private createPowerUpSprite(pu: PowerUpState): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();

    const colors: Record<string, number> = {
      speed_boost: 0x3b82f6,    // Blue
      damage_boost: 0xef4444,   // Red
      shield: 0xa855f7,         // Purple
      ability_refresh: 0x22c55e, // Green
    };

    const color = colors[pu.type] || 0xfbbf24;

    // Outer glow
    graphic.circle(0, 0, 25);
    graphic.fill({ color, alpha: 0.2 });

    // Main orb
    graphic.circle(0, 0, 15);
    graphic.fill({ color });
    graphic.circle(0, 0, 15);
    graphic.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });

    // Icon based on type
    if (pu.type === 'speed_boost') {
      // Lightning bolt
      graphic.moveTo(-5, -8);
      graphic.lineTo(2, -2);
      graphic.lineTo(-2, 0);
      graphic.lineTo(5, 8);
      graphic.lineTo(-2, 2);
      graphic.lineTo(2, 0);
      graphic.fill({ color: 0xffffff });
    } else if (pu.type === 'damage_boost') {
      // Sword
      graphic.moveTo(0, -10);
      graphic.lineTo(0, 6);
      graphic.moveTo(-5, -4);
      graphic.lineTo(5, -4);
      graphic.stroke({ color: 0xffffff, width: 2 });
    } else if (pu.type === 'shield') {
      // Shield shape
      graphic.moveTo(0, -8);
      graphic.lineTo(7, -3);
      graphic.lineTo(5, 6);
      graphic.lineTo(0, 10);
      graphic.lineTo(-5, 6);
      graphic.lineTo(-7, -3);
      graphic.fill({ color: 0xffffff, alpha: 0.5 });
    } else {
      // Star for ability refresh
      this.drawStar5(graphic, 0, 0, 8, 0xffffff);
    }

    container.addChild(graphic);
    return { container, graphic };
  }

  private drawStar5(g: Graphics, x: number, y: number, size: number, color: number): void {
    const points = 5;
    g.moveTo(x + size * Math.cos(-Math.PI / 2), y + size * Math.sin(-Math.PI / 2));
    for (let i = 1; i <= points * 2; i++) {
      const r = i % 2 === 0 ? size : size * 0.4;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      g.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    g.fill({ color });
  }

  // ============================================
  // BUTTONS & DOORS
  // ============================================

  private renderButtons(buttons: ButtonState[]): void {
    for (const button of buttons) {
      let sprite = this.buttonGraphics.get(button.id);

      if (!sprite) {
        sprite = this.createButtonSprite();
        this.buttonGraphics.set(button.id, sprite);
        this.arenaContainer.addChild(sprite.container);
      }

      sprite.container.x = button.position.x;
      sprite.container.y = button.position.y;

      // Update visual based on pressed state
      sprite.graphic.clear();
      const pressed = button.isPressed;
      const baseY = pressed ? 3 : 0;

      sprite.graphic.circle(0, baseY, 20);
      sprite.graphic.fill({ color: pressed ? 0x22c55e : 0xef4444 });
      sprite.graphic.circle(0, baseY, 20);
      sprite.graphic.stroke({ color: 0x000000, width: 3 });

      // Platform
      sprite.graphic.ellipse(0, 8, 25, 8);
      sprite.graphic.fill({ color: 0x64748b });
      sprite.graphic.ellipse(0, 8, 25, 8);
      sprite.graphic.stroke({ color: 0x000000, width: 2 });
    }
  }

  private createButtonSprite(): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();
    container.addChild(graphic);
    return { container, graphic };
  }

  private renderDoors(doors: DoorState[]): void {
    for (const door of doors) {
      let sprite = this.doorGraphics.get(door.id);

      if (!sprite) {
        sprite = this.createDoorSprite();
        this.doorGraphics.set(door.id, sprite);
        this.arenaContainer.addChild(sprite.container);
      }

      sprite.container.x = door.position.x;
      sprite.container.y = door.position.y;

      // Update visual based on open state
      sprite.graphic.clear();

      const hw = door.size.x / 2;
      const hh = door.size.y / 2;

      if (door.isOpen) {
        // Open door - transparent/outline only
        sprite.graphic.roundRect(-hw, -hh, door.size.x, door.size.y, 3);
        sprite.graphic.stroke({ color: 0x22c55e, width: 2, alpha: 0.5 });
      } else {
        // Closed door - solid
        sprite.graphic.roundRect(-hw, -hh, door.size.x, door.size.y, 3);
        sprite.graphic.fill({ color: 0xef4444, alpha: 0.8 });
        sprite.graphic.roundRect(-hw, -hh, door.size.x, door.size.y, 3);
        sprite.graphic.stroke({ color: 0x000000, width: 3 });

        // Warning stripes
        for (let i = -hw; i < hw; i += 20) {
          sprite.graphic.moveTo(i, -hh);
          sprite.graphic.lineTo(i + 10, hh);
          sprite.graphic.stroke({ color: 0xfbbf24, width: 3 });
        }
      }
    }
  }

  private createDoorSprite(): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();
    container.addChild(graphic);
    return { container, graphic };
  }

  // ============================================
  // EFFECT ZONES
  // ============================================

  private renderEffectZones(zones: EffectZoneState[]): void {
    const currentIds = new Set(zones.map(z => z.id));

    for (const [id, sprite] of this.effectZoneGraphics) {
      if (!currentIds.has(id)) {
        this.arenaContainer.removeChild(sprite.container);
        this.effectZoneGraphics.delete(id);
      }
    }

    for (const zone of zones) {
      let sprite = this.effectZoneGraphics.get(zone.id);

      if (!sprite) {
        sprite = this.createEffectZoneSprite(zone);
        this.effectZoneGraphics.set(zone.id, sprite);
        this.arenaContainer.addChild(sprite.container);
      }

      sprite.container.x = zone.position.x;
      sprite.container.y = zone.position.y;

      // Fade out over time
      const elapsed = this.time;  // Would need actual currentTime
      sprite.graphic.alpha = 0.6;
    }
  }

  private createEffectZoneSprite(zone: EffectZoneState): { container: Container; graphic: Graphics } {
    const container = new Container();
    const graphic = new Graphics();

    if (zone.type === 'slow_zone') {
      // Green slime zone
      graphic.circle(0, 0, zone.radius);
      graphic.fill({ color: 0x22c55e, alpha: 0.3 });
      graphic.circle(0, 0, zone.radius);
      graphic.stroke({ color: 0x16a34a, width: 3, alpha: 0.5 });

      // Slime bubbles
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * zone.radius * 0.7;
        graphic.circle(Math.cos(angle) * r, Math.sin(angle) * r, 5 + Math.random() * 5);
        graphic.fill({ color: 0x4ade80, alpha: 0.6 });
      }
    } else if (zone.type === 'vision_block') {
      // Dark ink splatter
      graphic.circle(0, 0, zone.radius);
      graphic.fill({ color: 0x1f2937, alpha: 0.8 });

      // Irregular edges
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = zone.radius * (0.8 + Math.random() * 0.4);
        graphic.circle(Math.cos(angle) * r * 0.7, Math.sin(angle) * r * 0.7, r * 0.3);
        graphic.fill({ color: 0x374151, alpha: 0.7 });
      }
    }

    container.addChild(graphic);
    return { container, graphic };
  }

  // ============================================
  // CLEANUP
  // ============================================

  private cleanupSprites(state: MatchState): void {
    const currentPlayerIds = new Set(state.players.map(p => p.id));
    for (const [id, sprite] of this.beastSprites) {
      if (!currentPlayerIds.has(id)) {
        this.playersContainer.removeChild(sprite.container);
        this.beastSprites.delete(id);
      }
    }

    const currentHazardIds = new Set(state.hazards.map(h => h.id));
    for (const [id, sprite] of this.hazardGraphics) {
      if (!currentHazardIds.has(id)) {
        this.hazardsContainer.removeChild(sprite.container);
        this.hazardGraphics.delete(id);
      }
    }

    // Cleanup new elements (buttons and doors are persistent, don't clean)
    const currentCoverIds = new Set((state.coverAreas || []).map(c => c.id));
    for (const [id, sprite] of this.coverGraphics) {
      if (!currentCoverIds.has(id)) {
        this.arenaContainer.removeChild(sprite.container);
        this.coverGraphics.delete(id);
      }
    }

    const currentVentIds = new Set((state.vents || []).map(v => v.id));
    for (const [id, sprite] of this.ventGraphics) {
      if (!currentVentIds.has(id)) {
        this.arenaContainer.removeChild(sprite.container);
        this.ventGraphics.delete(id);
      }
    }
  }

  // Get local player screen position for aim calculation
  getLocalPlayerScreenPosition(): Vector2 | null {
    if (!this.localPlayerId) return null;
    const sprite = this.beastSprites.get(this.localPlayerId);
    if (!sprite) return null;

    // Convert world position to screen position
    const worldPos = { x: sprite.container.x, y: sprite.container.y };
    return {
      x: worldPos.x * this.scale + this.gameContainer.x,
      y: worldPos.y * this.scale + this.gameContainer.y,
    };
  }
}
