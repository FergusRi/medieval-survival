// ============================================================
// tiles.js — Tile type constants + metadata
// ============================================================

export const T = {
  VOID:           0,
  GRASS:          1,

  DIRT:           3,
  SAND:           4,
  SCRUBLAND:      5,
  FOREST:         6,

  WATER:          11,
  DEEP_WATER:     12,
  MOUNTAIN:       16,  // mountain interior — flat grey colour fill
  MOUNTAIN_STONE: 17,  // mountain edge — sprite tile
  STONE:          18,  // scattered rocks on ground (walkable)
};

export const TILE_DEF = {
  [T.VOID]:           { walkable: false, moveCost: 0,   colour: '#0a0a0a' },
  [T.GRASS]:          { walkable: true,  moveCost: 1.0, colour: '#5a8a4a' },

  [T.DIRT]:           { walkable: true,  moveCost: 1.2, colour: '#a07840' },
  [T.SAND]:           { walkable: true,  moveCost: 1.4, colour: '#d4b86a' },
  [T.SCRUBLAND]:      { walkable: true,  moveCost: 1.3, colour: '#9aaa55' },
  [T.FOREST]:         { walkable: true,  moveCost: 1.8, colour: '#3a6e30' },

  [T.WATER]:          { walkable: false, moveCost: 0,   colour: '#4a90c4' },
  [T.DEEP_WATER]:     { walkable: false, moveCost: 0,   colour: '#2a5a9a' },
  [T.MOUNTAIN]:       { walkable: false, moveCost: 0,   colour: '#808080' },
  [T.MOUNTAIN_STONE]: { walkable: false, moveCost: 0,   colour: '#6a6a6a' },
  [T.STONE]:          { walkable: true,  moveCost: 1.2, colour: '#7a7060' },
};
