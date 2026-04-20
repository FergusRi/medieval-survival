// ============================================================
// tile_sprites.js — Spritesheet-based tile loader
// Single tileset.png (384×32) with 12 tiles × 32px each.
// Column index matches T enum value in tiles.js.
// ============================================================

import { T } from '../world/tiles.js';

// Column in spritesheet for each tile type (matches T enum)
// T.VOID=0, T.GRASS=1, T.PINE/FOREST=2, T.DIRT=3, T.SAND=4,
// T.SCRUBLAND=5, T.PINE_SNOW=6, T.WATER=7, T.DEEP_WATER=8,
// T.MOUNTAIN=9, T.MOUNTAIN_STONE=10, T.STONE=11
const TILE_SIZE = 32;
const tileCache = new Map(); // tileId → ImageBitmap
let   _sheet    = null;      // full spritesheet ImageBitmap

// Tree sprites (transparent PNG, Y-sorted pass)
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',
  stump: 'assets/trees/tree_stump.png',
};
const treeLoaded = new Map();

export const PINE_TILES = new Set([T.FOREST]);

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

export async function preloadSprites() {
  // Load spritesheet
  try {
    _sheet = await loadImage('assets/tileset.png');
    console.log(`[sprites] Spritesheet loaded: ${_sheet.width}×${_sheet.height}`);

    // Slice each tile into its own ImageBitmap for fast drawImage calls
    const tileIds = [
      T.VOID, T.GRASS, T.FOREST, T.DIRT, T.SAND, T.SCRUBLAND,
      6 /* PINE_SNOW */, T.WATER, T.DEEP_WATER, T.MOUNTAIN, T.MOUNTAIN_STONE, T.STONE
    ];
    await Promise.all(tileIds.map(async (id, col) => {
      try {
        const bmp = await createImageBitmap(_sheet, col * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
        tileCache.set(id, bmp);
      } catch(e) { console.warn(`[sprites] Failed to slice tile col ${col}:`, e); }
    }));
    console.log(`[sprites] Sliced ${tileCache.size} tile bitmaps`);
  } catch(e) {
    console.warn('[sprites] Spritesheet load failed, falling back to colour fills:', e);
  }

  // Tree sprites
  await Promise.all(Object.entries(TREE_IMAGES).map(async ([name, path]) => {
    try { treeLoaded.set(name, await loadImage(path)); }
    catch(e) { console.warn(`[sprites] Failed tree ${path}:`, e); }
  }));
  console.log(`[sprites] Loaded ${treeLoaded.size} tree sprites`);
}

export function getTileSprite(tileId) { return tileCache.get(tileId) ?? null; }
export function getTreeSprite(name)   { return treeLoaded.get(name)   ?? null; }
