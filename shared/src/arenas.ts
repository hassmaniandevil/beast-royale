// ============================================
// BEAST ROYALE - ARENA DEFINITIONS
// ============================================

import {
  ArenaDefinition,
  HazardType,
  Vector2,
  CoverAreaDefinition,
  VentDefinition,
  DestructibleDefinition,
  ButtonDefinition,
  DoorDefinition,
} from './types.js';
import { ARENA_WIDTH, ARENA_HEIGHT, INITIAL_SAFE_RADIUS, FINAL_SAFE_RADIUS } from './constants.js';

// Helper to create spawn points in a circle
function circularSpawns(count: number, centerX: number, centerY: number, radius: number): Vector2[] {
  const spawns: Vector2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    spawns.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
  return spawns;
}

export const ARENAS: Record<string, ArenaDefinition> = {
  // ============================================
  // ARENA 1: THE COLOSSEUM
  // Classic circular arena with rotating hazards
  // ============================================
  colosseum: {
    id: 'colosseum',
    name: 'The Colosseum',
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: circularSpawns(19, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 450),
    platforms: [
      // Main platform (the floor)
      {
        id: 'main_floor',
        position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        size: { x: 1400, y: 1000 },
        type: 'solid',
      },
      // Center raised platform
      {
        id: 'center_platform',
        position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        size: { x: 200, y: 200 },
        type: 'solid',
      },
      // Four crumbling corner platforms
      {
        id: 'corner_nw',
        position: { x: 300, y: 250 },
        size: { x: 150, y: 150 },
        type: 'crumbling',
        crumbleDelay: 2000,
      },
      {
        id: 'corner_ne',
        position: { x: 1300, y: 250 },
        size: { x: 150, y: 150 },
        type: 'crumbling',
        crumbleDelay: 2000,
      },
      {
        id: 'corner_sw',
        position: { x: 300, y: 950 },
        size: { x: 150, y: 150 },
        type: 'crumbling',
        crumbleDelay: 2000,
      },
      {
        id: 'corner_se',
        position: { x: 1300, y: 950 },
        size: { x: 150, y: 150 },
        type: 'crumbling',
        crumbleDelay: 2000,
      },
    ],
    hazardSpawns: [
      // Rotating arms in center
      {
        position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        possibleTypes: ['rotating_arm'],
        spawnPhase: 'escalation',
        respawnDelay: 0,  // Always active
      },
      // Bounce pads around edges
      {
        position: { x: 200, y: ARENA_HEIGHT / 2 },
        possibleTypes: ['bounce_pad'],
        spawnPhase: 'scatter',
        respawnDelay: 0,
      },
      {
        position: { x: ARENA_WIDTH - 200, y: ARENA_HEIGHT / 2 },
        possibleTypes: ['bounce_pad'],
        spawnPhase: 'scatter',
        respawnDelay: 0,
      },
      // Fire vents
      {
        position: { x: 500, y: 400 },
        possibleTypes: ['fire_vent'],
        spawnPhase: 'crisis',
        respawnDelay: 5000,
      },
      {
        position: { x: 1100, y: 800 },
        possibleTypes: ['fire_vent'],
        spawnPhase: 'crisis',
        respawnDelay: 5000,
      },
      // Rolling boulders
      {
        position: { x: 100, y: 100 },
        possibleTypes: ['rolling_boulder'],
        spawnPhase: 'escalation',
        respawnDelay: 15000,
      },
    ],
    toyLocations: [
      { x: ARENA_WIDTH / 2, y: 150 },  // Bell at top
      { x: 150, y: ARENA_HEIGHT / 2 }, // Lever on left
    ],
    backgroundTheme: 'stone',
    shrinkPattern: 'circular',
    initialSafeRadius: INITIAL_SAFE_RADIUS,
    finalSafeRadius: FINAL_SAFE_RADIUS,

    // Cover areas (4 grass patches + 2 bushes)
    coverAreas: [
      { id: 'grass_nw', position: { x: 200, y: 200 }, size: { x: 120, y: 100 }, type: 'tall_grass' },
      { id: 'grass_ne', position: { x: 1400, y: 200 }, size: { x: 120, y: 100 }, type: 'tall_grass' },
      { id: 'grass_sw', position: { x: 200, y: 1000 }, size: { x: 120, y: 100 }, type: 'tall_grass' },
      { id: 'grass_se', position: { x: 1400, y: 1000 }, size: { x: 120, y: 100 }, type: 'tall_grass' },
      { id: 'bush_left', position: { x: 350, y: 600 }, size: { x: 80, y: 80 }, type: 'bush' },
      { id: 'bush_right', position: { x: 1250, y: 600 }, size: { x: 80, y: 80 }, type: 'bush' },
    ],

    // Vent pairs (2 pairs on opposite sides)
    vents: [
      { id: 'vent_a', position: { x: 250, y: 400 }, linkedVentId: 'vent_b' },
      { id: 'vent_b', position: { x: 1350, y: 400 }, linkedVentId: 'vent_a' },
      { id: 'vent_c', position: { x: 250, y: 800 }, linkedVentId: 'vent_d' },
      { id: 'vent_d', position: { x: 1350, y: 800 }, linkedVentId: 'vent_c' },
    ],

    // Destructibles (crates, barrels, pots)
    destructibles: [
      { id: 'crate_1', position: { x: 600, y: 300 }, type: 'crate' },
      { id: 'crate_2', position: { x: 1000, y: 300 }, type: 'crate' },
      { id: 'crate_3', position: { x: 600, y: 900 }, type: 'crate' },
      { id: 'crate_4', position: { x: 1000, y: 900 }, type: 'crate' },
      { id: 'barrel_1', position: { x: 400, y: 500 }, type: 'barrel' },
      { id: 'barrel_2', position: { x: 1200, y: 500 }, type: 'barrel' },
      { id: 'barrel_3', position: { x: 400, y: 700 }, type: 'barrel' },
      { id: 'barrel_4', position: { x: 1200, y: 700 }, type: 'barrel' },
      { id: 'pot_1', position: { x: 700, y: 500 }, type: 'pot' },
      { id: 'pot_2', position: { x: 900, y: 500 }, type: 'pot' },
      { id: 'pot_3', position: { x: 700, y: 700 }, type: 'pot' },
      { id: 'pot_4', position: { x: 900, y: 700 }, type: 'pot' },
    ],

    // Buttons and doors
    buttons: [
      { id: 'btn_top', position: { x: ARENA_WIDTH / 2, y: 250 }, linkedElementId: 'door_top', type: 'momentary' },
      { id: 'btn_bottom', position: { x: ARENA_WIDTH / 2, y: 950 }, linkedElementId: 'door_bottom', type: 'momentary' },
      { id: 'btn_side', position: { x: 500, y: 600 }, linkedElementId: 'door_side', type: 'toggle' },
    ],

    doors: [
      { id: 'door_top', position: { x: ARENA_WIDTH / 2, y: 350 }, size: { x: 150, y: 30 }, isOpen: false },
      { id: 'door_bottom', position: { x: ARENA_WIDTH / 2, y: 850 }, size: { x: 150, y: 30 }, isOpen: false },
      { id: 'door_side', position: { x: 1100, y: 600 }, size: { x: 30, y: 150 }, isOpen: true },
    ],
  },

  // ============================================
  // ARENA 2: SLIPPERY SLOPES
  // Ice theme with lots of bounce and slide
  // ============================================
  slippery_slopes: {
    id: 'slippery_slopes',
    name: 'Slippery Slopes',
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: circularSpawns(19, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 400),
    platforms: [
      // Main ice floor
      {
        id: 'main_ice',
        position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        size: { x: 1300, y: 900 },
        type: 'solid',
      },
      // Bouncy islands
      {
        id: 'bounce_island_1',
        position: { x: 400, y: 350 },
        size: { x: 120, y: 120 },
        type: 'bouncy',
      },
      {
        id: 'bounce_island_2',
        position: { x: 1200, y: 350 },
        size: { x: 120, y: 120 },
        type: 'bouncy',
      },
      {
        id: 'bounce_island_3',
        position: { x: 400, y: 850 },
        size: { x: 120, y: 120 },
        type: 'bouncy',
      },
      {
        id: 'bounce_island_4',
        position: { x: 1200, y: 850 },
        size: { x: 120, y: 120 },
        type: 'bouncy',
      },
      // Moving platform
      {
        id: 'moving_bridge',
        position: { x: ARENA_WIDTH / 2, y: 300 },
        size: { x: 200, y: 60 },
        type: 'moving',
        movePath: [
          { x: 500, y: 300 },
          { x: 1100, y: 300 },
        ],
        moveSpeed: 100,
      },
    ],
    hazardSpawns: [
      // Ice patches everywhere
      { position: { x: 600, y: 500 }, possibleTypes: ['ice_patch'], spawnPhase: 'scatter', respawnDelay: 0 },
      { position: { x: 1000, y: 500 }, possibleTypes: ['ice_patch'], spawnPhase: 'scatter', respawnDelay: 0 },
      { position: { x: 800, y: 700 }, possibleTypes: ['ice_patch'], spawnPhase: 'scatter', respawnDelay: 0 },
      { position: { x: 600, y: 900 }, possibleTypes: ['ice_patch'], spawnPhase: 'scatter', respawnDelay: 0 },
      { position: { x: 1000, y: 900 }, possibleTypes: ['ice_patch'], spawnPhase: 'scatter', respawnDelay: 0 },
      // Slap walls
      { position: { x: 250, y: ARENA_HEIGHT / 2 }, possibleTypes: ['slap_wall'], spawnPhase: 'escalation', respawnDelay: 0 },
      { position: { x: ARENA_WIDTH - 250, y: ARENA_HEIGHT / 2 }, possibleTypes: ['slap_wall'], spawnPhase: 'escalation', respawnDelay: 0 },
      // Spike traps
      { position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, possibleTypes: ['spike_trap'], spawnPhase: 'crisis', respawnDelay: 8000 },
    ],
    toyLocations: [
      { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },  // Button in center
    ],
    backgroundTheme: 'ice',
    shrinkPattern: 'circular',
    initialSafeRadius: INITIAL_SAFE_RADIUS,
    finalSafeRadius: FINAL_SAFE_RADIUS,

    // Cover areas (snow drifts and ice bushes)
    coverAreas: [
      { id: 'snow_nw', position: { x: 250, y: 250 }, size: { x: 100, y: 80 }, type: 'tall_grass' },
      { id: 'snow_ne', position: { x: 1350, y: 250 }, size: { x: 100, y: 80 }, type: 'tall_grass' },
      { id: 'snow_sw', position: { x: 250, y: 950 }, size: { x: 100, y: 80 }, type: 'tall_grass' },
      { id: 'snow_se', position: { x: 1350, y: 950 }, size: { x: 100, y: 80 }, type: 'tall_grass' },
      { id: 'bush_center_l', position: { x: 650, y: 600 }, size: { x: 70, y: 70 }, type: 'bush' },
      { id: 'bush_center_r', position: { x: 950, y: 600 }, size: { x: 70, y: 70 }, type: 'bush' },
    ],

    // Vent pairs (ice tunnels)
    vents: [
      { id: 'vent_top_l', position: { x: 400, y: 200 }, linkedVentId: 'vent_bottom_r' },
      { id: 'vent_bottom_r', position: { x: 1200, y: 1000 }, linkedVentId: 'vent_top_l' },
      { id: 'vent_top_r', position: { x: 1200, y: 200 }, linkedVentId: 'vent_bottom_l' },
      { id: 'vent_bottom_l', position: { x: 400, y: 1000 }, linkedVentId: 'vent_top_r' },
    ],

    // Destructibles (ice crates)
    destructibles: [
      { id: 'ice_crate_1', position: { x: 550, y: 400 }, type: 'crate' },
      { id: 'ice_crate_2', position: { x: 1050, y: 400 }, type: 'crate' },
      { id: 'ice_crate_3', position: { x: 550, y: 800 }, type: 'crate' },
      { id: 'ice_crate_4', position: { x: 1050, y: 800 }, type: 'crate' },
      { id: 'barrel_center_1', position: { x: 750, y: 450 }, type: 'barrel' },
      { id: 'barrel_center_2', position: { x: 850, y: 450 }, type: 'barrel' },
      { id: 'barrel_center_3', position: { x: 750, y: 750 }, type: 'barrel' },
      { id: 'barrel_center_4', position: { x: 850, y: 750 }, type: 'barrel' },
      { id: 'pot_edge_1', position: { x: 300, y: 600 }, type: 'pot' },
      { id: 'pot_edge_2', position: { x: 1300, y: 600 }, type: 'pot' },
    ],

    // Buttons and doors (ice bridges)
    buttons: [
      { id: 'btn_bridge_l', position: { x: 300, y: 450 }, linkedElementId: 'door_bridge', type: 'momentary' },
      { id: 'btn_bridge_r', position: { x: 1300, y: 450 }, linkedElementId: 'door_bridge', type: 'momentary' },
    ],

    doors: [
      { id: 'door_bridge', position: { x: ARENA_WIDTH / 2, y: 600 }, size: { x: 200, y: 40 }, isOpen: false },
    ],
  },

  // ============================================
  // ARENA 3: CHAOS FACTORY
  // Industrial theme, lots of moving hazards
  // ============================================
  chaos_factory: {
    id: 'chaos_factory',
    name: 'Chaos Factory',
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    spawnPoints: circularSpawns(19, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 420),
    platforms: [
      // Main factory floor
      {
        id: 'factory_floor',
        position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        size: { x: 1200, y: 800 },
        type: 'solid',
      },
      // Conveyor belts (moving platforms)
      {
        id: 'conveyor_top',
        position: { x: ARENA_WIDTH / 2, y: 250 },
        size: { x: 400, y: 80 },
        type: 'moving',
        movePath: [
          { x: 400, y: 250 },
          { x: 1200, y: 250 },
        ],
        moveSpeed: 150,
      },
      {
        id: 'conveyor_bottom',
        position: { x: ARENA_WIDTH / 2, y: 950 },
        size: { x: 400, y: 80 },
        type: 'moving',
        movePath: [
          { x: 1200, y: 950 },
          { x: 400, y: 950 },
        ],
        moveSpeed: 150,
      },
      // Crumbling catwalks
      {
        id: 'catwalk_left',
        position: { x: 250, y: ARENA_HEIGHT / 2 },
        size: { x: 80, y: 300 },
        type: 'crumbling',
        crumbleDelay: 1500,
      },
      {
        id: 'catwalk_right',
        position: { x: ARENA_WIDTH - 250, y: ARENA_HEIGHT / 2 },
        size: { x: 80, y: 300 },
        type: 'crumbling',
        crumbleDelay: 1500,
      },
    ],
    hazardSpawns: [
      // Rotating arms (gears)
      { position: { x: 500, y: 500 }, possibleTypes: ['rotating_arm'], spawnPhase: 'scatter', respawnDelay: 0 },
      { position: { x: 1100, y: 700 }, possibleTypes: ['rotating_arm'], spawnPhase: 'scatter', respawnDelay: 0 },
      // Fire vents
      { position: { x: 400, y: 400 }, possibleTypes: ['fire_vent'], spawnPhase: 'escalation', respawnDelay: 4000 },
      { position: { x: 800, y: 600 }, possibleTypes: ['fire_vent'], spawnPhase: 'escalation', respawnDelay: 4000 },
      { position: { x: 1200, y: 400 }, possibleTypes: ['fire_vent'], spawnPhase: 'escalation', respawnDelay: 4000 },
      { position: { x: 400, y: 800 }, possibleTypes: ['fire_vent'], spawnPhase: 'crisis', respawnDelay: 3000 },
      { position: { x: 1200, y: 800 }, possibleTypes: ['fire_vent'], spawnPhase: 'crisis', respawnDelay: 3000 },
      // Rolling boulders (barrels)
      { position: { x: 100, y: 200 }, possibleTypes: ['rolling_boulder'], spawnPhase: 'escalation', respawnDelay: 12000 },
      { position: { x: ARENA_WIDTH - 100, y: 200 }, possibleTypes: ['rolling_boulder'], spawnPhase: 'escalation', respawnDelay: 12000 },
      // Spike traps
      { position: { x: ARENA_WIDTH / 2, y: 450 }, possibleTypes: ['spike_trap'], spawnPhase: 'crisis', respawnDelay: 6000 },
      { position: { x: ARENA_WIDTH / 2, y: 750 }, possibleTypes: ['spike_trap'], spawnPhase: 'crisis', respawnDelay: 6000 },
    ],
    toyLocations: [
      { x: ARENA_WIDTH / 2, y: 150 },  // Horn
      { x: 150, y: 150 },               // Bell
      { x: ARENA_WIDTH - 150, y: 150 }, // Lever
    ],
    backgroundTheme: 'industrial',
    shrinkPattern: 'square',
    initialSafeRadius: INITIAL_SAFE_RADIUS,
    finalSafeRadius: FINAL_SAFE_RADIUS,

    // Cover areas (pipes and machinery)
    coverAreas: [
      { id: 'pipe_nw', position: { x: 300, y: 350 }, size: { x: 90, y: 90 }, type: 'bush' },
      { id: 'pipe_ne', position: { x: 1300, y: 350 }, size: { x: 90, y: 90 }, type: 'bush' },
      { id: 'pipe_sw', position: { x: 300, y: 850 }, size: { x: 90, y: 90 }, type: 'bush' },
      { id: 'pipe_se', position: { x: 1300, y: 850 }, size: { x: 90, y: 90 }, type: 'bush' },
      { id: 'grass_corner_1', position: { x: 150, y: 500 }, size: { x: 80, y: 100 }, type: 'tall_grass' },
      { id: 'grass_corner_2', position: { x: 1450, y: 500 }, size: { x: 80, y: 100 }, type: 'tall_grass' },
    ],

    // Vent pairs (factory ducts)
    vents: [
      { id: 'duct_1', position: { x: 350, y: 500 }, linkedVentId: 'duct_2' },
      { id: 'duct_2', position: { x: 1250, y: 500 }, linkedVentId: 'duct_1' },
      { id: 'duct_3', position: { x: 500, y: 350 }, linkedVentId: 'duct_4' },
      { id: 'duct_4', position: { x: 500, y: 850 }, linkedVentId: 'duct_3' },
    ],

    // Destructibles (factory crates and barrels)
    destructibles: [
      { id: 'factory_crate_1', position: { x: 550, y: 350 }, type: 'crate' },
      { id: 'factory_crate_2', position: { x: 650, y: 350 }, type: 'crate' },
      { id: 'factory_crate_3', position: { x: 950, y: 350 }, type: 'crate' },
      { id: 'factory_crate_4', position: { x: 1050, y: 350 }, type: 'crate' },
      { id: 'factory_barrel_1', position: { x: 550, y: 850 }, type: 'barrel' },
      { id: 'factory_barrel_2', position: { x: 650, y: 850 }, type: 'barrel' },
      { id: 'factory_barrel_3', position: { x: 950, y: 850 }, type: 'barrel' },
      { id: 'factory_barrel_4', position: { x: 1050, y: 850 }, type: 'barrel' },
      { id: 'pot_center_1', position: { x: 700, y: 550 }, type: 'pot' },
      { id: 'pot_center_2', position: { x: 900, y: 550 }, type: 'pot' },
      { id: 'pot_center_3', position: { x: 700, y: 650 }, type: 'pot' },
      { id: 'pot_center_4', position: { x: 900, y: 650 }, type: 'pot' },
    ],

    // Buttons and doors (factory gates)
    buttons: [
      { id: 'btn_gate_left', position: { x: 400, y: 600 }, linkedElementId: 'door_gate_left', type: 'toggle' },
      { id: 'btn_gate_right', position: { x: 1200, y: 600 }, linkedElementId: 'door_gate_right', type: 'toggle' },
      { id: 'btn_center', position: { x: 800, y: 400 }, linkedElementId: 'door_center', type: 'momentary' },
    ],

    doors: [
      { id: 'door_gate_left', position: { x: 450, y: 600 }, size: { x: 30, y: 120 }, isOpen: true },
      { id: 'door_gate_right', position: { x: 1150, y: 600 }, size: { x: 30, y: 120 }, isOpen: true },
      { id: 'door_center', position: { x: 800, y: 500 }, size: { x: 120, y: 30 }, isOpen: false },
    ],
  },
};

export const ALL_ARENA_IDS = Object.keys(ARENAS);

export function getArena(id: string): ArenaDefinition | undefined {
  return ARENAS[id];
}

export function getRandomArena(): ArenaDefinition {
  const ids = ALL_ARENA_IDS;
  const randomId = ids[Math.floor(Math.random() * ids.length)];
  return ARENAS[randomId];
}

export function isValidArena(id: string): boolean {
  return id in ARENAS;
}
