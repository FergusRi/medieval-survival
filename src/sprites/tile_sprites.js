// ============================================================
// tile_sprites.js — Image-based tile sprite loader
// Chunk-based biome tile variation: each 16×16 tile chunk picks
// a variant so large patches look natural (like reference RTS games)
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded  = new Map(); // tileId → ImageBitmap[]  (array of variants)
const treeLoaded  = new Map(); // name   → ImageBitmap

// Each biome tile has 1–4 variants (different seeds generated at build time)
// Currently 1 per type; add more paths to get more variety per biome
const TILE_VARIANTS = {
  [T.GRASS]:          ['assets/tiles/grass.png', 'assets/tiles/grass2.png', 'assets/tiles/grass3.png', 'assets/tiles/grass4.png'],
  [T.DIRT]:           ['assets/tiles/dirt.png'],
  [T.SAND]:           ['assets/tiles/sand.png'],
  [T.SCRUBLAND]:      ['assets/tiles/scrubland.png'],
  [T.FOREST]:         ['assets/tiles/forest.png'],
  [T.STONE]:          ['assets/tiles/stone.png'],
  [T.MOUNTAIN_STONE]: ['assets/tiles/mountain_stone.png'],
  [T.WATER]:          ['assets/tiles/water.png'],
  [T.DEEP_WATER]:     ['assets/tiles/deep_water.png'],
};

// Tree sprites (transparent PNG, Y-sorted pass)
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',
  stump: 'assets/trees/tree_stump.png',
};

export const PINE_TILES = new Set([T.FOREST]);

// Chunk size in tiles — each chunk gets a consistent variant
const CHUNK_BITS = 4; // 2^4 = 16 tiles per chunk

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

export async function preloadSprites() {
  const jobs = [
    // Load all tile variants
    ...Object.entries(TILE_VARIANTS).map(async ([id, paths]) => {
      const bitmaps = [];
      for (const path of paths) {
        try { bitmaps.push(await loadImage(path)); }
        catch (e) { console.warn(`[sprites] Failed tile ${path}:`, e); }
      }
      if (bitmaps.length) tileLoaded.set(Number(id), bitmaps);
    }),
    // Load tree sprites
    ...Object.entries(TREE_IMAGES).map(async ([name, path]) => {
      try { treeLoaded.set(name, await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed tree ${path}:`, e); }
    }),
  ];
  await Promise.all(jobs);
  console.log(`[sprites] Loaded ${tileLoaded.size} tile types, ${treeLoaded.size} trees`);
}

// Deterministic chunk-level hash — same chunk always picks same variant
// Chunk coords = (tx >> CHUNK_BITS, ty >> CHUNK_BITS)
function chunkHash(tx, ty) {
  const cx = tx >> CHUNK_BITS;
  const cy = ty >> CHUNK_BITS;
  let h = (cx * 1619 + cy * 31337) ^ (cx ^ cy);
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = (h >>> 16) ^ h;
  return (h >>> 0);
}

// Get tile sprite for a given tile type + world position
// Returns a consistent variant for the 16×16 chunk the tile belongs to
export function getTileSprite(tileId, tx = 0, ty = 0) {
  const variants = tileLoaded.get(tileId);
  if (!variants || !variants.length) return null;
  if (variants.length === 1) return variants[0];
  const idx = chunkHash(tx, ty) % variants.length;
  return variants[idx];
}

export function getTreeSprite(name) { return treeLoaded.get(name) ?? null; }
