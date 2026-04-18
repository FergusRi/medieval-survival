// ============================================================
// tiles.js — Tile type constants + metadata
// ============================================================

// Tile IDs (Uint16)
export const T = {
  VOID:           0,
  GRASS:          1,
  DIRT:           2,
  SAND:           3,
  WATER:          4,
  DEEP_WATER:     5,
  STONE_PATH:     6,
  COBBLESTONE:    7,
  FOREST:         8,
  // Mountain layers (all impassable until mined)
  MOUNTAIN:       9,   // rocky foothills / mountain edge
  MOUNTAIN_STONE: 10,  // solid stone — mid mountain
  MOUNTAIN_DEEP:  11,  // deep mountain interior (mineable to open caverns)
  // Ores (embedded in MOUNTAIN_DEEP zones)
  ORE_COAL:       12,
  ORE_IRON:       13,
  ORE_GOLD:       14,
  // Water features
  POND:           15,
  // Mined-out tiles (created when citizen mines through mountain)
  TUNNEL:         16,  // walkable, dark, inside mountain
};

// walkable  — can units path through this tile normally
// mineable  — can citizens mine this tile to open it up
// moveCost  — relative path cost (higher = slower)
// colour    — flat colour for debug tile renderer
export const TILE_DEF = {
  [T.VOID]:           { walkable: false, mineable: false, moveCost: 0,    colour: '#000000' },
  [T.GRASS]:          { walkable: true,  mineable: false, moveCost: 1.0,  colour: '#4a7c4e' },
  [T.DIRT]:           { walkable: true,  mineable: false, moveCost: 1.2,  colour: '#8b6914' },
  [T.SAND]:           { walkable: true,  mineable: false, moveCost: 1.4,  colour: '#c9a84c' },
  [T.WATER]:          { walkable: false, mineable: false, moveCost: 0,    colour: '#2a6aad' },
  [T.DEEP_WATER]:     { walkable: false, mineable: false, moveCost: 0,    colour: '#1a4a8a' },
  [T.STONE_PATH]:     { walkable: true,  mineable: false, moveCost: 0.7,  colour: '#9e9e9e' },
  [T.COBBLESTONE]:    { walkable: true,  mineable: false, moveCost: 0.8,  colour: '#b0b0b0' },
  [T.FOREST]:         { walkable: true,  mineable: false, moveCost: 1.8,  colour: '#2d5a30' },
  [T.MOUNTAIN]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#7a7a72' },
  [T.MOUNTAIN_STONE]: { walkable: false, mineable: true,  moveCost: 0,    colour: '#5e5e58' },
  [T.MOUNTAIN_DEEP]:  { walkable: false, mineable: true,  moveCost: 0,    colour: '#3a3a36' },
  [T.ORE_COAL]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#2b2b27', ore: 'coal',  yield: 8  },
  [T.ORE_IRON]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#8a5c3a', ore: 'iron',  yield: 5  },
  [T.ORE_GOLD]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#d4a017', ore: 'gold',  yield: 2  },
  [T.POND]:           { walkable: false, mineable: false, moveCost: 0,    colour: '#3a7abd' },
  [T.TUNNEL]:         { walkable: true,  mineable: false, moveCost: 1.2,  colour: '#2a2a28' },
};
