// ============================================================
// tiles.js — Tile type constants + metadata
// ============================================================

export const T = {
  VOID:           0,
  // Lowland biomes
  GRASS:          1,
  PLAINS:         2,   // drier open grassland — yellow-green
  DIRT:           3,
  SAND:           4,
  SCRUBLAND:      5,   // dry sparse vegetation
  // Wet/lush biomes
  FOREST:         6,
  JUNGLE:         7,   // dense tropical — deep green
  WETLAND:        8,   // marshy low ground
  // Cold biomes
  TUNDRA:         9,
  SNOW:           10,
  // Water
  WATER:          11,
  DEEP_WATER:     12,
  POND:           13,
  // Paths / constructed
  STONE_PATH:     14,
  COBBLESTONE:    15,
  // Mountain layers
  MOUNTAIN:       16,  // foothills
  MOUNTAIN_STONE: 17,  // solid stone
  MOUNTAIN_DEEP:  18,  // deep interior
  // Ores
  ORE_COAL:       19,
  ORE_IRON:       20,
  ORE_GOLD:       21,
  // Mined
  TUNNEL:         22,
};

// colour values chosen to match Civ6-style warm palette
export const TILE_DEF = {
  [T.VOID]:           { walkable: false, mineable: false, moveCost: 0,    colour: '#0a0a0a' },
  [T.GRASS]:          { walkable: true,  mineable: false, moveCost: 1.0,  colour: '#5a8a4a' },
  [T.PLAINS]:         { walkable: true,  mineable: false, moveCost: 1.0,  colour: '#8aaa44' },
  [T.DIRT]:           { walkable: true,  mineable: false, moveCost: 1.2,  colour: '#a07840' },
  [T.SAND]:           { walkable: true,  mineable: false, moveCost: 1.4,  colour: '#d4b86a' },
  [T.SCRUBLAND]:      { walkable: true,  mineable: false, moveCost: 1.3,  colour: '#9aaa55' },
  [T.FOREST]:         { walkable: true,  mineable: false, moveCost: 1.8,  colour: '#3a6e30' },
  [T.JUNGLE]:         { walkable: true,  mineable: false, moveCost: 2.2,  colour: '#2a5e25' },
  [T.WETLAND]:        { walkable: true,  mineable: false, moveCost: 2.0,  colour: '#4a7a5a' },
  [T.TUNDRA]:         { walkable: true,  mineable: false, moveCost: 1.5,  colour: '#8aaa88' },
  [T.SNOW]:           { walkable: true,  mineable: false, moveCost: 1.8,  colour: '#d8e8e0' },
  [T.WATER]:          { walkable: false, mineable: false, moveCost: 0,    colour: '#4a90c4' },
  [T.DEEP_WATER]:     { walkable: false, mineable: false, moveCost: 0,    colour: '#2a5a9a' },
  [T.POND]:           { walkable: false, mineable: false, moveCost: 0,    colour: '#5aA0d4' },
  [T.STONE_PATH]:     { walkable: true,  mineable: false, moveCost: 0.7,  colour: '#aaaaaa' },
  [T.COBBLESTONE]:    { walkable: true,  mineable: false, moveCost: 0.8,  colour: '#b8b8b0' },
  [T.MOUNTAIN]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#8a8a7a' },
  [T.MOUNTAIN_STONE]: { walkable: false, mineable: true,  moveCost: 0,    colour: '#6a6a60' },
  [T.MOUNTAIN_DEEP]:  { walkable: false, mineable: true,  moveCost: 0,    colour: '#404038' },
  [T.ORE_COAL]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#2e2e28', ore: 'coal', yield: 8 },
  [T.ORE_IRON]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#9a6040', ore: 'iron', yield: 5 },
  [T.ORE_GOLD]:       { walkable: false, mineable: true,  moveCost: 0,    colour: '#d4aa18', ore: 'gold', yield: 2 },
  [T.TUNNEL]:         { walkable: true,  mineable: false, moveCost: 1.2,  colour: '#282824' },
};
