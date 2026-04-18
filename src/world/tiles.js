// ============================================================
// tiles.js — Tile type constants + metadata
// ============================================================

// Tile IDs (Uint16, so max 65535)
export const T = {
  VOID:        0,
  GRASS:       1,
  DIRT:        2,
  SAND:        3,
  WATER:       4,
  DEEP_WATER:  5,
  STONE_PATH:  6,
  COBBLESTONE: 7,
  FOREST:      8,  // walkable but slows
  MOUNTAIN:    9,  // impassable
  POND:        10, // decorative water feature
};

// Tile metadata: walkable, moveCost, colour (debug renderer)
export const TILE_DEF = {
  [T.VOID]:        { walkable: false, moveCost: 0,   colour: '#000000' },
  [T.GRASS]:       { walkable: true,  moveCost: 1,   colour: '#4a7c4e' },
  [T.DIRT]:        { walkable: true,  moveCost: 1,   colour: '#8b6914' },
  [T.SAND]:        { walkable: true,  moveCost: 1.2, colour: '#c9a84c' },
  [T.WATER]:       { walkable: false, moveCost: 0,   colour: '#2a6aad' },
  [T.DEEP_WATER]:  { walkable: false, moveCost: 0,   colour: '#1a4a8a' },
  [T.STONE_PATH]:  { walkable: true,  moveCost: 0.7, colour: '#888888' },
  [T.COBBLESTONE]: { walkable: true,  moveCost: 0.8, colour: '#999999' },
  [T.FOREST]:      { walkable: true,  moveCost: 2,   colour: '#2d5a30' },
  [T.MOUNTAIN]:    { walkable: false, moveCost: 0,   colour: '#6b6b6b' },
  [T.POND]:        { walkable: false, moveCost: 0,   colour: '#3a7abd' },
};
