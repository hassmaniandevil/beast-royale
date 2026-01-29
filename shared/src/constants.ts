// ============================================
// BEAST ROYALE - GAME CONSTANTS
// ============================================

// Server tick rates
export const PHYSICS_TICK_RATE = 60;  // Internal physics Hz
export const NETWORK_TICK_RATE = 20;  // Network broadcast Hz
export const PHYSICS_TIMESTEP = 1000 / PHYSICS_TICK_RATE;
export const NETWORK_TIMESTEP = 1000 / NETWORK_TICK_RATE;

// Match parameters
export const MIN_PLAYERS = 9;
export const MAX_PLAYERS = 19;
export const IDEAL_PLAYERS = 13;
export const MATCH_FILL_TIMEOUT = 30000;  // ms
export const MATCH_START_COUNTDOWN = 8000;  // ms at min players
export const MATCH_START_COUNTDOWN_SHORT = 5000;  // ms when new player joins
export const MATCH_MAX_DURATION = 300000;  // 5 minutes hard cap
export const OVERTIME_DURATION = 60000;  // 1 minute overtime

// Match phases (times in ms from match start)
export const PHASE_SCATTER_END = 30000;
export const PHASE_ESCALATION_END = 90000;
export const PHASE_CRISIS_END = 150000;
export const PHASE_FINALE_END = 240000;  // overtime starts

// Movement
export const BASE_MOVE_SPEED = 300;  // pixels per second
export const FRICTION = 0.85;  // velocity multiplier per frame
export const MAX_VELOCITY = 800;

// Physics
export const BASE_KNOCKBACK = 400;
export const KNOCKBACK_SCALING = 0.015;  // per % damage taken
export const GRAVITY = 0;  // top-down, no gravity by default
export const BOUNCE_RESTITUTION = 0.7;

// Combat
export const BASE_ATTACK_RANGE = 60;
export const BASE_ATTACK_COOLDOWN = 500;  // ms
export const BASE_ABILITY_COOLDOWN = 8000;  // ms
export const INVULNERABILITY_DURATION = 500;  // ms after being hit
export const KILL_CREDIT_DURATION = 5000;  // ms to credit killer

// Arena
export const ARENA_WIDTH = 1600;
export const ARENA_HEIGHT = 1200;
export const SHRINK_DAMAGE_PER_SECOND = 10;
export const INITIAL_SAFE_RADIUS = 700;
export const FINAL_SAFE_RADIUS = 100;
export const OVERTIME_SAFE_RADIUS = 50;

// Chaos events
export const CHAOS_EVENT_INTERVAL_MIN = 30000;  // ms
export const CHAOS_EVENT_INTERVAL_MAX = 45000;  // ms
export const CHAOS_EVENT_DURATION_MIN = 5000;   // ms
export const CHAOS_EVENT_DURATION_MAX = 12000;  // ms
export const CHAOS_EVENT_WARNING_TIME = 2000;   // ms before effect

// Shrink timing
export const SHRINK_START_TIME = 45000;  // ms from match start
export const SHRINK_SPEED_INITIAL = 10;  // pixels per second
export const SHRINK_SPEED_CRISIS = 25;
export const SHRINK_SPEED_FINALE = 50;
export const SHRINK_SPEED_OVERTIME = 100;

// Death zone (boundary)
export const DEATH_ZONE_MARGIN = 50;  // pixels outside arena

// UI
export const ANNOUNCER_MESSAGE_DURATION = 3000;  // ms

// Networking
export const INTERPOLATION_DELAY = 100;  // ms
export const MAX_EXTRAPOLATION = 50;  // ms
export const SNAPSHOT_BUFFER_SIZE = 30;

// Matchmaking
export const BOT_FILL_THRESHOLD = 5;  // players needed before bots
export const BOT_FILL_DELAY = 20000;  // ms before adding bots
export const QUEUE_TIMEOUT = 60000;   // ms before giving up

// Player limits
export const MAX_NAME_LENGTH = 16;
export const MIN_NAME_LENGTH = 2;

// XP rewards
export const XP_MATCH_COMPLETION = 10;
export const XP_PER_ELIMINATION = 5;
export const XP_WIN = 25;
export const XP_CHAOS_SURVIVED = 2;
export const XP_TOP_THREE = 10;
export const XP_FIRST_MATCH_BONUS = 20;

// Weight class modifiers
export const WEIGHT_MODIFIERS = {
  light: {
    knockbackReceived: 1.3,
    knockbackDealt: 0.8,
    speedMultiplier: 1.2,
  },
  medium: {
    knockbackReceived: 1.0,
    knockbackDealt: 1.0,
    speedMultiplier: 1.0,
  },
  heavy: {
    knockbackReceived: 0.7,
    knockbackDealt: 1.2,
    speedMultiplier: 0.85,
  },
} as const;

// Panic button outcomes (weighted)
export const PANIC_OUTCOMES = [
  { weight: 30, action: 'scream', effect: 'plays scream sound' },
  { weight: 20, action: 'trip', effect: 'brief stumble' },
  { weight: 15, action: 'honk', effect: 'honks regardless of beast' },
  { weight: 10, action: 'spin', effect: 'spins in place' },
  { weight: 10, action: 'banana', effect: 'drops banana peel' },
  { weight: 8, action: 'confetti', effect: 'shoots confetti' },
  { weight: 5, action: 'nothing', effect: 'literally nothing' },
  { weight: 1, action: 'dodge', effect: 'brief invulnerability' },  // The 1% clutch
  { weight: 1, action: 'shockwave', effect: 'tiny knockback around you' },
] as const;

// Near-miss thresholds
export const NEAR_MISS_HEALTH_THRESHOLD = 5;  // % health remaining
export const NEAR_MISS_SPATIAL_THRESHOLD = 20;  // pixels
export const NEAR_MISS_EDGE_THRESHOLD = 30;  // pixels from death
export const NEAR_MISS_TIME_THRESHOLD = 100;  // ms

// ============================================
// PROJECTILE SYSTEM
// ============================================

export const PROJECTILE_CONFIGS = {
  fireball: { speed: 500, damage: 20, knockback: 350, radius: 15, lifetime: 2000 },
  lightning: { speed: 800, damage: 15, knockback: 200, radius: 10, lifetime: 1500 },
  ink_bomb: { speed: 400, damage: 10, knockback: 150, radius: 20, lifetime: 2500 },
  spine_needle: { speed: 600, damage: 8, knockback: 100, radius: 8, lifetime: 1500 },
  slime_glob: { speed: 350, damage: 5, knockback: 50, radius: 25, lifetime: 3000 },
  crystal_shard: { speed: 700, damage: 25, knockback: 400, radius: 12, lifetime: 1500 },
  pigeon: { speed: 300, damage: 8, knockback: 150, radius: 18, lifetime: 4000 },
  quasar: { speed: 450, damage: 18, knockback: 300, radius: 20, lifetime: 3000 },
} as const;

// ============================================
// COVER SYSTEM
// ============================================

export const COVER_REVEAL_ON_ATTACK = true;  // Attacking reveals you
export const COVER_REVEAL_ON_DAMAGE = true;  // Taking damage reveals you
export const COVER_REVEAL_DURATION = 500;    // ms before you can hide again
export const COVER_SAME_COVER_VISIBILITY = true;  // Players in same cover can see each other

// ============================================
// VENT SYSTEM
// ============================================

export const VENT_TRAVEL_DURATION = 1000;  // ms to travel through vent
export const VENT_COOLDOWN = 5000;  // ms before vent can be used again
export const VENT_INTERACT_RANGE = 50;  // pixels from vent center to interact

// ============================================
// DESTRUCTIBLES
// ============================================

export const DESTRUCTIBLE_HP = {
  crate: 30,
  barrel: 20,
  pot: 10,
} as const;

export const DESTRUCTIBLE_DROP_CHANCE = 0.7;  // 70% chance to drop power-up

// ============================================
// POWER-UPS
// ============================================

export const POWERUP_LIFETIME = 15000;  // ms before despawn

export const POWERUP_EFFECTS = {
  speed_boost: { duration: 5000, multiplier: 1.3 },      // +30% speed for 5s
  damage_boost: { duration: 5000, multiplier: 1.5 },    // +50% damage for 5s
  shield: { duration: 3000, damageReduction: 0.5 },     // -50% damage for 3s
  ability_refresh: { duration: 0, cooldownReset: true }, // Instant cooldown reset
} as const;

// ============================================
// INTERACTIVE ELEMENTS
// ============================================

export const BUTTON_INTERACT_RANGE = 40;  // pixels from button center
export const DOOR_COLLISION_ENABLED = true;  // Closed doors block movement

// ============================================
// EFFECT ZONES
// ============================================

export const SLOW_ZONE_DURATION = 5000;  // ms
export const SLOW_ZONE_AMOUNT = 0.5;     // 50% speed reduction
export const VISION_BLOCK_DURATION = 4000;  // ms
export const VISION_BLOCK_RADIUS = 120;  // pixels

// ============================================
// MOVEMENT ABILITIES
// ============================================

export const DASH_INVULN_DURATION = 300;  // ms of invulnerability during dash
export const PHASE_DURATION = 2000;  // ms of phase shift
export const SPEED_BOOST_ABILITY_DURATION = 2000;  // ms
export const SPEED_BOOST_ABILITY_MULTIPLIER = 2.0;  // 2x speed
export const REWIND_RECORD_INTERVAL = 100;  // Record position every 100ms
export const REWIND_DURATION = 3000;  // Can rewind up to 3 seconds

// Clip detection thresholds
export const MULTI_KILL_WINDOW = 5000;  // ms for multi-kill
export const CHAIN_REACTION_MIN_LENGTH = 4;  // links for auto-clip
export const LAST_SECOND_THRESHOLD = 3000;  // ms remaining for "last second" win

// Colors
export const COLORS = {
  // UI colors
  health: '#4ade80',
  healthLow: '#ef4444',
  ability: '#3b82f6',
  abilityReady: '#22c55e',

  // Effect colors
  damage: '#ef4444',
  heal: '#4ade80',
  knockback: '#f97316',
  chaos: '#a855f7',
  shrink: '#dc2626',

  // Arena colors
  safeZone: '#22c55e',
  dangerZone: '#ef4444',
  platform: '#64748b',
  hazard: '#f59e0b',
} as const;
