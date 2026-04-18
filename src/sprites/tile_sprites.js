// ============================================================
// tile_sprites.js — Image-based tile + tree sprite loader (Phase 5)
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded  = new Map(); // tileId  → ImageBitmap
const treeLoaded  = new Map(); // key str → ImageBitmap

// Ground tiles that have sprites
const TILE_IMAGES = {
  [T.GRASS]: 'assets/tiles/grass.png',
  [T.DIRT]:  'assets/tiles/dirt.png',
};

// Tree sprites: keyed by string name
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',   // 32×64
  stump: 'assets/trees/tree_stump.png',  // 32×32
};

// Which tile IDs should render a pine tree on top
export const PINE_TILES = new Set([T.FOREST, T.JUNGLE]);

export async function preloadSprites() {
  const jobs = [
    ...Object.entries(TILE_IMAGES).map(async ([id, path]) => {
      try {
        const bmp = await fetchBitmap(path);
        tileLoaded.set(Number(id), bmp);
      } catch (e) { console.warn(`[sprites] failed: ${path}`, e); }
    }),
    ...Object.entries(TREE_IMAGES).map(async ([key, path]) => {
      try {
        const bmp = await fetchBitmap(path);
        treeLoaded.set(key, bmp);
      } catch (e) { console.warn(`[sprites] failed: ${path}`, e); }
    }),
  ];
  await Promise.all(jobs);
  console.log(`[sprites] tiles:${tileLoaded.size} trees:${treeLoaded.size}`);
}

async function fetchBitmap(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/** Ground tile sprite, or null (caller falls back to flat colour) */
export function getTileSprite(tileId) {
  return tileLoaded.get(tileId) ?? null;
}

/** Tree sprite by name ('pine' | 'stump'), or null */
export function getTreeSprite(name) {
  return treeLoaded.get(name) ?? null;
}
