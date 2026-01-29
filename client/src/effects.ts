// ============================================
// BEAST ROYALE - CLIENT EFFECTS
// ============================================

import { Vector2 } from '@beast-royale/shared';

// Visual effect types
export type EffectType =
  | 'projectile_trail'
  | 'dash_trail'
  | 'teleport_flash'
  | 'explosion'
  | 'slow_zone_spawn'
  | 'ink_splat'
  | 'power_up_collect'
  | 'destructible_break'
  | 'stun_stars'
  | 'shield_glow'
  | 'speed_lines';

export interface EffectDefinition {
  type: EffectType;
  duration: number;
  particleCount: number;
  particleSpeed: number;
  particleSize: number;
  color: number;
  spread: number;
}

// Effect presets
export const EFFECT_PRESETS: Record<string, EffectDefinition> = {
  // Projectile effects
  fireball_trail: {
    type: 'projectile_trail',
    duration: 200,
    particleCount: 3,
    particleSpeed: 50,
    particleSize: 6,
    color: 0xf97316,
    spread: 10,
  },

  lightning_spark: {
    type: 'projectile_trail',
    duration: 100,
    particleCount: 2,
    particleSpeed: 100,
    particleSize: 4,
    color: 0x3b82f6,
    spread: 15,
  },

  slime_drip: {
    type: 'projectile_trail',
    duration: 300,
    particleCount: 1,
    particleSpeed: 20,
    particleSize: 8,
    color: 0x22c55e,
    spread: 5,
  },

  // Movement effects
  dash_burst: {
    type: 'dash_trail',
    duration: 300,
    particleCount: 10,
    particleSpeed: 150,
    particleSize: 8,
    color: 0xffffff,
    spread: 20,
  },

  teleport_in: {
    type: 'teleport_flash',
    duration: 200,
    particleCount: 20,
    particleSpeed: 200,
    particleSize: 6,
    color: 0xa855f7,
    spread: 30,
  },

  teleport_out: {
    type: 'teleport_flash',
    duration: 200,
    particleCount: 20,
    particleSpeed: 100,
    particleSize: 6,
    color: 0xa855f7,
    spread: 50,
  },

  // AOE effects
  explosion_large: {
    type: 'explosion',
    duration: 400,
    particleCount: 30,
    particleSpeed: 300,
    particleSize: 10,
    color: 0xf97316,
    spread: 50,
  },

  shockwave: {
    type: 'explosion',
    duration: 300,
    particleCount: 20,
    particleSpeed: 400,
    particleSize: 8,
    color: 0xfbbf24,
    spread: 100,
  },

  // Zone effects
  slow_zone_appear: {
    type: 'slow_zone_spawn',
    duration: 500,
    particleCount: 15,
    particleSpeed: 50,
    particleSize: 12,
    color: 0x22c55e,
    spread: 80,
  },

  ink_splat: {
    type: 'ink_splat',
    duration: 400,
    particleCount: 25,
    particleSpeed: 150,
    particleSize: 15,
    color: 0x1f2937,
    spread: 100,
  },

  // Power-up effects
  power_up_speed: {
    type: 'power_up_collect',
    duration: 300,
    particleCount: 15,
    particleSpeed: 200,
    particleSize: 8,
    color: 0x3b82f6,
    spread: 40,
  },

  power_up_damage: {
    type: 'power_up_collect',
    duration: 300,
    particleCount: 15,
    particleSpeed: 200,
    particleSize: 8,
    color: 0xef4444,
    spread: 40,
  },

  power_up_shield: {
    type: 'power_up_collect',
    duration: 300,
    particleCount: 15,
    particleSpeed: 200,
    particleSize: 8,
    color: 0xa855f7,
    spread: 40,
  },

  power_up_ability: {
    type: 'power_up_collect',
    duration: 300,
    particleCount: 15,
    particleSpeed: 200,
    particleSize: 8,
    color: 0x22c55e,
    spread: 40,
  },

  // Destructible effects
  crate_break: {
    type: 'destructible_break',
    duration: 400,
    particleCount: 12,
    particleSpeed: 150,
    particleSize: 10,
    color: 0xa3873a,
    spread: 30,
  },

  barrel_break: {
    type: 'destructible_break',
    duration: 400,
    particleCount: 12,
    particleSpeed: 150,
    particleSize: 10,
    color: 0x64748b,
    spread: 30,
  },

  pot_break: {
    type: 'destructible_break',
    duration: 400,
    particleCount: 12,
    particleSpeed: 150,
    particleSize: 8,
    color: 0xd97706,
    spread: 25,
  },

  // Status effects
  stun_effect: {
    type: 'stun_stars',
    duration: 1000,
    particleCount: 5,
    particleSpeed: 20,
    particleSize: 6,
    color: 0xfbbf24,
    spread: 25,
  },

  shield_active: {
    type: 'shield_glow',
    duration: 100,
    particleCount: 3,
    particleSpeed: 30,
    particleSize: 12,
    color: 0xa855f7,
    spread: 35,
  },

  speed_active: {
    type: 'speed_lines',
    duration: 100,
    particleCount: 2,
    particleSpeed: 50,
    particleSize: 15,
    color: 0x3b82f6,
    spread: 20,
  },
};

// Color palettes for different ability types
export const ABILITY_COLORS: Record<string, number> = {
  // Projectiles
  tongue_lash: 0x22c55e,
  chain_lightning: 0x3b82f6,
  spine_barrage: 0x16a34a,
  moocus_missile: 0x84cc16,
  ink_bomb: 0x1f2937,
  quasar_blast: 0x7c3aed,
  crystal_shard: 0x06b6d4,
  royal_volley: 0x64748b,
  laser_beam: 0xef4444,
  acorn_barrage: 0x78350f,
  bubble_blast: 0x22d3ee,

  // Movement
  slinky_dash: 0xd97706,
  flap_burst: 0xf8fafc,
  rewind: 0xf472b6,
  shadow_step: 0x374151,
  phase_shift: 0xf97316,
  quick_swap: 0xa855f7,
  wheel_boost: 0xfbbf24,
  super_bounce: 0xf472b6,
  rocket_boost: 0x0ea5e9,
  spirit_walk: 0xc4b5fd,

  // AOE
  shell_slam: 0x6b7280,
  one_two_punch: 0xef4444,
  hibernate_rage: 0x78350f,
  scream: 0xf5f5f4,
  existential_crisis: 0xfcd34d,
  thunder_stomp: 0xfacc15,
  sonic_screech: 0x6366f1,
  magnetic_pull: 0x94a3b8,
  disco_flash: 0xd946ef,
};

// Get effect preset for an ability
export function getAbilityEffect(abilityId: string): EffectDefinition | null {
  const color = ABILITY_COLORS[abilityId];
  if (!color) return null;

  // Determine effect type based on ability
  const projectileAbilities = ['tongue_lash', 'chain_lightning', 'spine_barrage', 'moocus_missile', 'ink_bomb', 'quasar_blast', 'crystal_shard', 'royal_volley', 'laser_beam', 'acorn_barrage', 'bubble_blast'];
  const movementAbilities = ['slinky_dash', 'flap_burst', 'rewind', 'shadow_step', 'phase_shift', 'quick_swap', 'wheel_boost', 'super_bounce', 'rocket_boost', 'spirit_walk'];
  const aoeAbilities = ['shell_slam', 'one_two_punch', 'hibernate_rage', 'scream', 'existential_crisis', 'thunder_stomp', 'sonic_screech', 'magnetic_pull', 'disco_flash'];

  if (projectileAbilities.includes(abilityId)) {
    return {
      type: 'projectile_trail',
      duration: 200,
      particleCount: 3,
      particleSpeed: 50,
      particleSize: 6,
      color,
      spread: 10,
    };
  }

  if (movementAbilities.includes(abilityId)) {
    return {
      type: 'dash_trail',
      duration: 300,
      particleCount: 10,
      particleSpeed: 150,
      particleSize: 8,
      color,
      spread: 20,
    };
  }

  if (aoeAbilities.includes(abilityId)) {
    return {
      type: 'explosion',
      duration: 400,
      particleCount: 25,
      particleSpeed: 300,
      particleSize: 10,
      color,
      spread: 50,
    };
  }

  return null;
}
