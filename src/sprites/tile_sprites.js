// ============================================================
// tile_sprites.js — Image-based tile sprite loader (Phase 5)
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded    = new Map(); // tileId → ImageBitmap
const overlayLoaded = new Map(); // name   → ImageBitmap
const treeLoaded    = new Map(); // name   → ImageBitmap

// Full ground tile sprites (opaque 32×32)
const TILE_IMAGES = {
  [T.DIRT]:           'assets/tiles/dirt.png',
  [T.MOUNTAIN_STONE]: 'assets/tiles/mountain_stone.png',
  [T.WATER]:          'assets/tiles/water.png',
  [T.DEEP_WATER]:     'assets/tiles/deep_water.png',
  [T.STONE]:          'assets/tiles/stone.png',
};

// Overlay sprites (transparent, drawn on top of flat colour)
const OVERLAY_IMAGES = {
  grass:  'assets/tiles/grass_tuft.png',
  plains: 'assets/tiles/plains_tuft.png',
  sand:   'assets/tiles/sand_detail.png',
};

// Tree sprites (transparent, Y-sorted pass)
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',   // 32×64
  stump: 'assets/trees/tree_stump.png',  // 32×32
};

// Which tiles spawn pine trees
export const PINE_TILES = new Set([T.FOREST]);

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

export async function preloadSprites() {
  const jobs = [
    ...Object.entries(TILE_IMAGES).map(async ([id, path]) => {
      try { tileLoaded.set(Number(id), await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed tile ${path}:`, e); }
    }),
    ...Object.entries(OVERLAY_IMAGES).map(async ([name, path]) => {
      try { overlayLoaded.set(name, await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed overlay ${path}:`, e); }
    }),
    ...Object.entries(TREE_IMAGES).map(async ([name, path]) => {
      try { treeLoaded.set(name, await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed tree ${path}:`, e); }
    }),
  ];
  await Promise.all(jobs);
  console.log(`[sprites] Loaded ${tileLoaded.size} tiles, ${overlayLoaded.size} overlays, ${treeLoaded.size} trees`);
}

export function getTileSprite(tileId)    { return tileLoaded.get(tileId)    ?? null; }
export function getOverlaySprite(name)   { return overlayLoaded.get(name)   ?? null; }
export function getTreeSprite(name)      { return treeLoaded.get(name)      ?? null; }
