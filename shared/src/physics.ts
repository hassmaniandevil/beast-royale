// ============================================
// BEAST ROYALE - PHYSICS SYSTEM
// ============================================

import { Vector2, PlayerState, HazardState, ShrinkZone } from './types.js';
import {
  FRICTION,
  MAX_VELOCITY,
  BASE_KNOCKBACK,
  KNOCKBACK_SCALING,
  WEIGHT_MODIFIERS,
  DEATH_ZONE_MARGIN,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  SHRINK_DAMAGE_PER_SECOND,
  BOUNCE_RESTITUTION,
} from './constants.js';
import { getBeast } from './beasts.js';

// ============================================
// VECTOR MATH
// ============================================

export function vec2(x: number, y: number): Vector2 {
  return { x, y };
}

export function vec2Add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Normalize(v: Vector2): Vector2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vec2Distance(a: Vector2, b: Vector2): number {
  return vec2Length(vec2Sub(a, b));
}

export function vec2Dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function vec2Lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function vec2Clamp(v: Vector2, maxLength: number): Vector2 {
  const len = vec2Length(v);
  if (len <= maxLength) return v;
  return vec2Scale(vec2Normalize(v), maxLength);
}

export function vec2Rotate(v: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function vec2Angle(v: Vector2): number {
  return Math.atan2(v.y, v.x);
}

export function vec2FromAngle(angle: number, length: number = 1): Vector2 {
  return {
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length,
  };
}

// ============================================
// COLLISION DETECTION
// ============================================

export interface Circle {
  position: Vector2;
  radius: number;
}

export interface Rectangle {
  position: Vector2;  // center
  size: Vector2;      // width, height
}

export function circleCircleCollision(a: Circle, b: Circle): boolean {
  const dist = vec2Distance(a.position, b.position);
  return dist < a.radius + b.radius;
}

export function circleRectCollision(circle: Circle, rect: Rectangle): boolean {
  // Find closest point on rectangle to circle center
  const halfWidth = rect.size.x / 2;
  const halfHeight = rect.size.y / 2;

  const closestX = Math.max(rect.position.x - halfWidth,
    Math.min(circle.position.x, rect.position.x + halfWidth));
  const closestY = Math.max(rect.position.y - halfHeight,
    Math.min(circle.position.y, rect.position.y + halfHeight));

  const dist = vec2Distance(circle.position, { x: closestX, y: closestY });
  return dist < circle.radius;
}

export function pointInCircle(point: Vector2, circle: Circle): boolean {
  return vec2Distance(point, circle.position) < circle.radius;
}

export function pointInRect(point: Vector2, rect: Rectangle): boolean {
  const halfWidth = rect.size.x / 2;
  const halfHeight = rect.size.y / 2;
  return (
    point.x >= rect.position.x - halfWidth &&
    point.x <= rect.position.x + halfWidth &&
    point.y >= rect.position.y - halfHeight &&
    point.y <= rect.position.y + halfHeight
  );
}

// ============================================
// PLAYER PHYSICS
// ============================================

// Get player hitbox as circle
export function getPlayerHitbox(player: PlayerState): Circle {
  const beast = getBeast(player.beastId);
  const baseRadius = 25;  // Base player radius
  const weightMod = beast?.weight === 'heavy' ? 1.2 : beast?.weight === 'light' ? 0.85 : 1.0;
  return {
    position: player.position,
    radius: baseRadius * weightMod,
  };
}

// Apply friction to velocity
export function applyFriction(velocity: Vector2, friction: number = FRICTION): Vector2 {
  return vec2Scale(velocity, friction);
}

// Apply velocity cap
export function capVelocity(velocity: Vector2, max: number = MAX_VELOCITY): Vector2 {
  return vec2Clamp(velocity, max);
}

// Calculate knockback received
export function calculateKnockback(
  attacker: PlayerState,
  victim: PlayerState,
  baseKnockback: number = BASE_KNOCKBACK
): Vector2 {
  const attackerBeast = getBeast(attacker.beastId);
  const victimBeast = getBeast(victim.beastId);

  if (!attackerBeast || !victimBeast) {
    return vec2(0, 0);
  }

  // Direction from attacker to victim
  const direction = vec2Normalize(vec2Sub(victim.position, attacker.position));

  // Base knockback
  let knockback = baseKnockback;

  // Apply attacker's power
  knockback *= attackerBeast.attackPower;

  // Apply weight modifiers
  const attackerWeight = WEIGHT_MODIFIERS[attackerBeast.weight];
  const victimWeight = WEIGHT_MODIFIERS[victimBeast.weight];
  knockback *= attackerWeight.knockbackDealt;
  knockback *= victimWeight.knockbackReceived;

  // Apply damage scaling (more damage = more knockback)
  const damagePercent = 1 - (victim.health / victim.maxHealth);
  knockback *= 1 + (damagePercent * KNOCKBACK_SCALING * 100);

  // Apply victim's knockback multiplier (stacks over match)
  knockback *= victim.knockbackMultiplier;

  return vec2Scale(direction, knockback);
}

// Check if player is in death zone
export function isInDeathZone(position: Vector2): boolean {
  return (
    position.x < -DEATH_ZONE_MARGIN ||
    position.x > ARENA_WIDTH + DEATH_ZONE_MARGIN ||
    position.y < -DEATH_ZONE_MARGIN ||
    position.y > ARENA_HEIGHT + DEATH_ZONE_MARGIN
  );
}

// Check if player is outside shrink zone
export function isOutsideShrinkZone(position: Vector2, shrinkZone: ShrinkZone): boolean {
  const dist = vec2Distance(position, { x: shrinkZone.centerX, y: shrinkZone.centerY });
  return dist > shrinkZone.currentRadius;
}

// Get shrink zone damage
export function getShrinkZoneDamage(
  position: Vector2,
  shrinkZone: ShrinkZone,
  deltaTime: number
): number {
  if (!isOutsideShrinkZone(position, shrinkZone)) {
    return 0;
  }
  return SHRINK_DAMAGE_PER_SECOND * (deltaTime / 1000);
}

// ============================================
// HAZARD PHYSICS
// ============================================

// Check if player collides with hazard
export function playerHazardCollision(
  player: PlayerState,
  hazard: HazardState
): boolean {
  const playerHitbox = getPlayerHitbox(player);

  // Most hazards are rectangles
  const hazardRect: Rectangle = {
    position: hazard.position,
    size: hazard.size,
  };

  return circleRectCollision(playerHitbox, hazardRect);
}

// Get knockback direction from hazard
export function getHazardKnockback(
  player: PlayerState,
  hazard: HazardState
): Vector2 {
  if (hazard.knockbackDirection) {
    return vec2Scale(hazard.knockbackDirection, hazard.knockback);
  }
  // Default: away from hazard center
  const direction = vec2Normalize(vec2Sub(player.position, hazard.position));
  return vec2Scale(direction, hazard.knockback);
}

// ============================================
// BOUNDARY PHYSICS
// ============================================

// Bounce off arena boundaries
export function bounceOffBoundaries(
  position: Vector2,
  velocity: Vector2,
  radius: number
): { position: Vector2; velocity: Vector2 } {
  let newPos = { ...position };
  let newVel = { ...velocity };

  // Left boundary
  if (position.x - radius < 0) {
    newPos.x = radius;
    newVel.x = -newVel.x * BOUNCE_RESTITUTION;
  }
  // Right boundary
  if (position.x + radius > ARENA_WIDTH) {
    newPos.x = ARENA_WIDTH - radius;
    newVel.x = -newVel.x * BOUNCE_RESTITUTION;
  }
  // Top boundary
  if (position.y - radius < 0) {
    newPos.y = radius;
    newVel.y = -newVel.y * BOUNCE_RESTITUTION;
  }
  // Bottom boundary
  if (position.y + radius > ARENA_HEIGHT) {
    newPos.y = ARENA_HEIGHT - radius;
    newVel.y = -newVel.y * BOUNCE_RESTITUTION;
  }

  return { position: newPos, velocity: newVel };
}

// ============================================
// INTERPOLATION
// ============================================

// Interpolate between two player states
export function interpolatePlayerState(
  from: PlayerState,
  to: PlayerState,
  t: number
): Partial<PlayerState> {
  return {
    position: vec2Lerp(from.position, to.position, t),
    velocity: vec2Lerp(from.velocity, to.velocity, t),
    facingAngle: lerpAngle(from.facingAngle, to.facingAngle, t),
    health: lerp(from.health, to.health, t),
  };
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Angle interpolation (handles wraparound)
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// ============================================
// UTILITY
// ============================================

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Random float between min and max
export function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Random integer between min and max (inclusive)
export function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

// Seeded random number generator (for deterministic randomness)
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a random float between 0 and 1
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Returns a random float between min and max
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns a random integer between min and max (inclusive)
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  // Returns a random element from an array
  pick<T>(array: T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  // Shuffle an array in place
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
