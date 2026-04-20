// ============================================================
// registry.js — Modular RimWorld-style building roster
// ============================================================

export const BUILDINGS = {

  // ── Structures (tile-by-tile walls + doors) ───────────────
  wall_wood: {
    name: 'Wood Wall',
    w: 1, h: 1,
    buildTime: 5,
    hp: 40,
    staffSlots: 0,
    isWall: true,
    description: 'Quick timber wall. Cheap but burns.',
  },

  wall_stone: {
    name: 'Stone Wall',
    w: 1, h: 1,
    buildTime: 15,
    hp: 180,
    staffSlots: 0,
    isWall: true,
    description: 'Solid mortared stone. Much tougher.',
  },

  wall_metal: {
    name: 'Metal Wall',
    w: 1, h: 1,
    buildTime: 25,
    hp: 400,
    staffSlots: 0,
    isWall: true,
    description: 'Steel-reinforced wall. Near-indestructible.',
  },

  door_wood: {
    name: 'Wood Door',
    w: 1, h: 1,
    buildTime: 8,
    hp: 50,
    staffSlots: 0,
    isWall: true,
    isDoor: true,
    description: 'Wooden door. Citizens pass through freely.',
  },

  door_reinforced: {
    name: 'Reinforced Door',
    w: 1, h: 1,
    buildTime: 18,
    hp: 200,
    staffSlots: 0,
    isWall: true,
    isDoor: true,
    description: 'Iron-banded door. Slows enemies significantly.',
  },

  // ── Floors (isFloor: true — no movement block, render pass 1.5) ──
  floor_dirt: {
    name: 'Dirt Floor',
    w: 1, h: 1,
    buildTime: 0,
    hp: 10,
    staffSlots: 0,
    isFloor: true,
    description: 'Packed earth. Free to lay.',
  },

  floor_wood: {
    name: 'Wood Floor',
    w: 1, h: 1,
    buildTime: 3,
    hp: 20,
    staffSlots: 0,
    isFloor: true,
    description: 'Timber planks. Warm underfoot.',
  },

  floor_stone: {
    name: 'Stone Tile',
    w: 1, h: 1,
    buildTime: 6,
    hp: 30,
    staffSlots: 0,
    isFloor: true,
    description: 'Cut stone tiles. Durable and clean.',
  },

  // ── Furniture (isFurniture: true — placed inside rooms) ───
  bed: {
    name: 'Bed',
    w: 1, h: 1,
    buildTime: 8,
    hp: 30,
    staffSlots: 0,
    isFurniture: true,
    description: 'A sleeping spot. Increases max population and rest rate.',
  },

  workbench: {
    name: 'Workbench',
    w: 1, h: 1,
    buildTime: 12,
    hp: 40,
    staffSlots: 1,
    isFurniture: true,
    description: 'Crafting station for tools and equipment.',
  },

  storage_crate: {
    name: 'Storage Crate',
    w: 1, h: 1,
    buildTime: 6,
    hp: 25,
    staffSlots: 0,
    isFurniture: true,
    isStorage: true,
    description: 'Stores resources. Place in storage zones.',
  },

  cooking_pot: {
    name: 'Cooking Pot',
    w: 1, h: 1,
    buildTime: 10,
    hp: 35,
    staffSlots: 1,
    isFurniture: true,
    description: 'Turns raw food into meals. Staffed cook produces more.',
  },

  torch: {
    name: 'Torch',
    w: 1, h: 1,
    buildTime: 3,
    hp: 10,
    staffSlots: 0,
    isFurniture: true,
    description: 'Provides light. Decorative.',
  },

  table: {
    name: 'Table',
    w: 1, h: 1,
    buildTime: 8,
    hp: 30,
    staffSlots: 0,
    isFurniture: true,
    description: 'A place to eat. Improves morale.',
  },

  // ── Production (standalone — keep from old system) ────────
  farm_plot: {
    name: 'Farm Plot',
    w: 2, h: 2,
    buildTime: 15,
    hp: 60,
    staffSlots: 1,
    description: 'Tilled earth for growing crops. Produces food when staffed.',
  },

  lumber_camp: {
    name: 'Lumber Camp',
    w: 1, h: 1,
    buildTime: 20,
    hp: 80,
    staffSlots: 1,
    description: 'Workers fell nearby trees for timber.',
  },

  pit_mine: {
    name: 'Pit Mine',
    w: 1, h: 1,
    buildTime: 30,
    hp: 100,
    staffSlots: 1,
    description: 'Digs earth for stone and ore.',
  },

  // ── Military (auto-turrets) ────────────────────────────────
  turret_ballista: {
    name: 'Ballista',
    w: 1, h: 1,
    buildTime: 25,
    hp: 120,
    staffSlots: 0,
    isTurret: true,
    description: 'Long-range bolt thrower. Fast fire rate. Auto-targets enemies.',
  },

  turret_cannon: {
    name: 'Cannon',
    w: 1, h: 1,
    buildTime: 35,
    hp: 150,
    staffSlots: 0,
    isTurret: true,
    description: 'Heavy cannon. Slower but devastating damage.',
  },
};

// ── Tab categories for the build panel ───────────────────────
export const BUILDING_CATEGORIES = [
  {
    key:   'structure',
    label: '🧱 Structure',
    types: ['wall_wood', 'wall_stone', 'wall_metal', 'door_wood', 'door_reinforced'],
  },
  {
    key:   'floors',
    label: '🟫 Floors',
    types: ['floor_dirt', 'floor_wood', 'floor_stone'],
  },
  {
    key:   'furniture',
    label: '🪑 Furniture',
    types: ['bed', 'workbench', 'storage_crate', 'cooking_pot', 'torch', 'table'],
  },
  {
    key:   'production',
    label: '⚒️ Production',
    types: ['lumber_camp', 'pit_mine', 'farm_plot'],
  },
  {
    key:   'military',
    label: '⚔️ Military',
    types: ['turret_ballista', 'turret_cannon'],
  },
];
