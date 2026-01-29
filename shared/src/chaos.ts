// ============================================
// BEAST ROYALE - CHAOS EVENTS SYSTEM
// ============================================

import { ChaosEventType, ChaosEventState, MatchPhase } from './types.js';
import {
  CHAOS_EVENT_DURATION_MIN,
  CHAOS_EVENT_DURATION_MAX,
} from './constants.js';
import { SeededRandom } from './physics.js';

// ============================================
// CHAOS EVENT DEFINITIONS
// ============================================

export interface ChaosEventDefinition {
  type: ChaosEventType;
  name: string;
  announcement: string;
  description: string;
  minDuration: number;
  maxDuration: number;
  availablePhases: MatchPhase[];
  weight: number;  // Higher = more likely
  stackable: boolean;  // Can occur with other events
  effect: ChaosEffectParams;
}

export interface ChaosEffectParams {
  gravityMultiplier?: number;
  frictionMultiplier?: number;
  speedMultiplier?: number;
  knockbackMultiplier?: number;
  controlsReversed?: boolean;
  headScale?: number;
  bounceMultiplier?: number;
  visionRadius?: number;
  screenShake?: number;
}

export const CHAOS_EVENTS: Record<ChaosEventType, ChaosEventDefinition> = {
  gravity_doubled: {
    type: 'gravity_doubled',
    name: 'Heavy Day',
    announcement: 'GRAVITY DOUBLED! What goes up... comes down HARDER!',
    description: 'Everyone feels heavier, knockback reduced but harder to recover',
    minDuration: 8000,
    maxDuration: 12000,
    availablePhases: ['escalation', 'crisis', 'finale'],
    weight: 10,
    stackable: true,
    effect: {
      gravityMultiplier: 2.0,
      knockbackMultiplier: 0.7,
    },
  },

  slippery_floor: {
    type: 'slippery_floor',
    name: 'Ice Age',
    announcement: 'SLIPPERY FLOOR! Hope you like ice skating!',
    description: 'Reduced friction, everyone slides around',
    minDuration: 10000,
    maxDuration: 15000,
    availablePhases: ['scatter', 'escalation', 'crisis', 'finale'],
    weight: 12,
    stackable: true,
    effect: {
      frictionMultiplier: 0.3,
    },
  },

  controls_reversed: {
    type: 'controls_reversed',
    name: 'Opposite Day',
    announcement: 'CONTROLS REVERSED! Left is right! Up is down!',
    description: 'All movement inputs are inverted',
    minDuration: 5000,
    maxDuration: 8000,
    availablePhases: ['escalation', 'crisis'],
    weight: 6,
    stackable: false,
    effect: {
      controlsReversed: true,
    },
  },

  big_heads: {
    type: 'big_heads',
    name: 'Big Brain Time',
    announcement: 'BIG HEADS! Literally big brain time!',
    description: 'Everyone\'s head grows, easier to hit',
    minDuration: 12000,
    maxDuration: 18000,
    availablePhases: ['escalation', 'crisis', 'finale'],
    weight: 8,
    stackable: true,
    effect: {
      headScale: 2.0,
    },
  },

  everyone_bouncy: {
    type: 'everyone_bouncy',
    name: 'Boing',
    announcement: 'EVERYONE BOUNCY! Boing. Boing. BOING.',
    description: 'All collisions have increased restitution',
    minDuration: 10000,
    maxDuration: 15000,
    availablePhases: ['scatter', 'escalation', 'crisis', 'finale'],
    weight: 10,
    stackable: true,
    effect: {
      bounceMultiplier: 1.8,
      knockbackMultiplier: 1.3,
    },
  },

  low_gravity: {
    type: 'low_gravity',
    name: 'Moon Mode',
    announcement: 'LOW GRAVITY! Float like a beast!',
    description: 'Reduced gravity, floatier movement',
    minDuration: 10000,
    maxDuration: 14000,
    availablePhases: ['scatter', 'escalation', 'crisis'],
    weight: 8,
    stackable: true,
    effect: {
      gravityMultiplier: 0.4,
      knockbackMultiplier: 1.5,
    },
  },

  speed_boost: {
    type: 'speed_boost',
    name: 'Turbo Mode',
    announcement: 'SPEED BOOST! Gotta go fast!',
    description: 'Everyone moves faster',
    minDuration: 8000,
    maxDuration: 12000,
    availablePhases: ['escalation', 'crisis', 'finale'],
    weight: 10,
    stackable: true,
    effect: {
      speedMultiplier: 1.5,
    },
  },

  jumpscare: {
    type: 'jumpscare',
    name: 'BOO!',
    announcement: 'BOO!',
    description: 'Brief scare effect, everyone flinches',
    minDuration: 1000,
    maxDuration: 2000,
    availablePhases: ['escalation', 'crisis', 'finale'],
    weight: 4,
    stackable: false,
    effect: {
      screenShake: 20,
    },
  },

  screen_shake: {
    type: 'screen_shake',
    name: 'Earthquake',
    announcement: 'EARTHQUAKE! Hold on tight!',
    description: 'Screen shakes, disorienting',
    minDuration: 6000,
    maxDuration: 10000,
    availablePhases: ['crisis', 'finale'],
    weight: 6,
    stackable: false,
    effect: {
      screenShake: 8,
    },
  },

  fog_of_war: {
    type: 'fog_of_war',
    name: 'Fog Rolling In',
    announcement: 'FOG OF WAR! Can\'t see far!',
    description: 'Limited vision radius',
    minDuration: 10000,
    maxDuration: 15000,
    availablePhases: ['escalation', 'crisis'],
    weight: 5,
    stackable: false,
    effect: {
      visionRadius: 200,
    },
  },
};

// ============================================
// CHAOS EVENT SELECTION
// ============================================

// Get available chaos events for a phase
export function getAvailableEvents(phase: MatchPhase): ChaosEventDefinition[] {
  return Object.values(CHAOS_EVENTS).filter((event) =>
    event.availablePhases.includes(phase)
  );
}

// Select a random chaos event using weighted random
export function selectChaosEvent(
  phase: MatchPhase,
  rng: SeededRandom,
  excludeTypes: ChaosEventType[] = []
): ChaosEventDefinition | null {
  const available = getAvailableEvents(phase).filter(
    (event) => !excludeTypes.includes(event.type)
  );

  if (available.length === 0) {
    return null;
  }

  // Calculate total weight
  const totalWeight = available.reduce((sum, event) => sum + event.weight, 0);

  // Pick random event based on weight
  let random = rng.float(0, totalWeight);
  for (const event of available) {
    random -= event.weight;
    if (random <= 0) {
      return event;
    }
  }

  // Fallback to last event
  return available[available.length - 1];
}

// Create a chaos event state from definition
export function createChaosEventState(
  definition: ChaosEventDefinition,
  rng: SeededRandom,
  currentTime: number
): ChaosEventState {
  const duration = rng.int(definition.minDuration, definition.maxDuration);
  return {
    id: `chaos_${definition.type}_${currentTime}`,
    type: definition.type,
    startTime: currentTime,
    duration,
    announcement: definition.announcement,
  };
}

// Check if an event can stack with current active events
export function canEventStack(
  newEvent: ChaosEventDefinition,
  activeEvents: ChaosEventState[]
): boolean {
  if (!newEvent.stackable) {
    return activeEvents.length === 0;
  }

  // Check if any active event is non-stackable
  for (const active of activeEvents) {
    const activeDef = CHAOS_EVENTS[active.type];
    if (!activeDef.stackable) {
      return false;
    }
  }

  return true;
}

// Get combined effect params from active events
export function getCombinedEffects(
  activeEvents: ChaosEventState[]
): ChaosEffectParams {
  const combined: ChaosEffectParams = {
    gravityMultiplier: 1.0,
    frictionMultiplier: 1.0,
    speedMultiplier: 1.0,
    knockbackMultiplier: 1.0,
    controlsReversed: false,
    headScale: 1.0,
    bounceMultiplier: 1.0,
    visionRadius: Infinity,
    screenShake: 0,
  };

  for (const event of activeEvents) {
    const def = CHAOS_EVENTS[event.type];
    const effect = def.effect;

    // Multiply multipliers
    if (effect.gravityMultiplier !== undefined) {
      combined.gravityMultiplier! *= effect.gravityMultiplier;
    }
    if (effect.frictionMultiplier !== undefined) {
      combined.frictionMultiplier! *= effect.frictionMultiplier;
    }
    if (effect.speedMultiplier !== undefined) {
      combined.speedMultiplier! *= effect.speedMultiplier;
    }
    if (effect.knockbackMultiplier !== undefined) {
      combined.knockbackMultiplier! *= effect.knockbackMultiplier;
    }
    if (effect.headScale !== undefined) {
      combined.headScale! *= effect.headScale;
    }
    if (effect.bounceMultiplier !== undefined) {
      combined.bounceMultiplier! *= effect.bounceMultiplier;
    }

    // Boolean OR
    if (effect.controlsReversed) {
      combined.controlsReversed = true;
    }

    // Take minimum vision radius
    if (effect.visionRadius !== undefined) {
      combined.visionRadius = Math.min(combined.visionRadius!, effect.visionRadius);
    }

    // Take maximum screen shake
    if (effect.screenShake !== undefined) {
      combined.screenShake = Math.max(combined.screenShake!, effect.screenShake);
    }
  }

  return combined;
}

// ============================================
// ANNOUNCER LINES
// ============================================

export const ANNOUNCER_LINES = {
  match_start: [
    "Welcome to Beast Royale! May the best beast... survive!",
    "Alright, {playerCount} players! Fight! Or don't! I'm not your mom!",
    "Let's see some chaos!",
    "Everyone looks confident. That won't last.",
    "Beast Royale! Where the rules are made up and your skill doesn't matter!",
  ],

  first_elimination: [
    "And we have our first victim— I mean, participant!",
    "Someone's going home early!",
    "First blood! Classic.",
    "One down. Many to go.",
    "The first elimination! Probably deserved it.",
  ],

  false_info: [
    "Only two left!",  // (there are nine)
    "That's the winner!",  // (three players remain)
    "You're doing great!",  // (player just died)
    "This seems safe.",  // (chaos event incoming)
    "Careful, that's dangerous—",  // (pointing at nothing)
    "And the match is over!",  // (it isn't)
    "Nobody's been eliminated yet!",  // (five have died)
  ],

  final_two: [
    "FINAL TWO! One of you is about to be very sad!",
    "It's down to the wire!",
    "Two beasts enter! Well, they already entered. One leaves!",
    "The tension is palpable! I don't know what palpable means!",
  ],

  final_three: [
    "FINAL THREE! Things are getting spicy!",
    "Three left! Who will betray whom first?",
    "The final triangle of chaos!",
  ],

  overtime: [
    "OVERTIME! The arena is collapsing!",
    "This is taking too long! SPEED IT UP!",
    "Overtime means CHAOS TIME!",
  ],

  victory: [
    "WE HAVE A WINNER! {winnerName}, you absolute beast!",
    "Victory! {winnerName} did it! Against all odds! And some help from chaos!",
    "Champion! {winnerName}! You survived the unsurvivable!",
    "{winnerName} wins! Everyone else... well, you tried.",
  ],

  draw: [
    "IT'S A TIE? THAT'S ALLOWED?",
    "Nobody wins! Everybody loses! Perfect!",
    "Mutual destruction! Beautiful!",
    "A draw! How anticlimactic! I love it!",
  ],

  generic_death: [
    "Ouch.",
    "That looked painful.",
    "Eliminated!",
    "Gone but not forgotten! Actually, probably forgotten.",
    "Another one bites the dust!",
  ],

  chaos_generic: [
    "Here we go!",
    "Things are about to get interesting!",
    "I love this part!",
    "Chaos incoming!",
  ],
};

// Get a random announcer line
export function getAnnouncerLine(
  category: keyof typeof ANNOUNCER_LINES,
  rng: SeededRandom,
  replacements: Record<string, string> = {}
): string {
  const lines = ANNOUNCER_LINES[category];
  let line = rng.pick(lines);

  // Replace placeholders
  for (const [key, value] of Object.entries(replacements)) {
    line = line.replace(`{${key}}`, value);
  }

  return line;
}

// Decide if announcer should lie (10% chance)
export function shouldAnnouncerLie(rng: SeededRandom): boolean {
  return rng.float(0, 1) < 0.1;
}
