// ============================================================
// tile_sprites.js — Image-based tile sprite loader (Phase 5)
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded = new Map(); // tileId → ImageBitmap
const treeLoaded = new Map(); // name   → ImageBitmap

// Ground tiles with sprite sheets
const TILE_IMAGES = {
  [T.GRASS]: 'assets/tiles/grass.png',
  [T.DIRT]:  'assets/tiles/dirt.png',
};

// Tree sprites (name → path)
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',
  stump: 'assets/trees/tree_stump.png',
};

// Which tile IDs can spawn pine trees
export const PINE_TILES  = new Set([T.FOREST, T.JUNGLE]);
export const STUMP_TILES = new Set([T.FOREST]);

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

export async function preloadSprites() {
  const tileJobs = Object.entries(TILE_IMAGES).map(async ([id, path]) => {
    try {
      tileLoaded.set(Number(id), await loadImage(path));
    } catch (e) {
      console.warn(`[sprites] Failed to load tile ${path}:`, e);
    }
  });

  const treeJobs = Object.entries(TREE_IMAGES).map(async ([name, path]) => {
    try {
      treeLoaded.set(name, await loadImage(path));
    } catch (e) {
      console.warn(`[sprites] Failed to load tree ${path}:`, e);
    }
  });

  await Promise.all([...tileJobs, ...treeJobs]);
  console.log(`[sprites] Loaded ${tileLoaded.size} tile + ${treeLoaded.size} tree sprites`);
}

/** Returns ImageBitmap if available, null otherwise */
export function getTileSprite(tileId) { return tileLoaded.get(tileId) ?? null; }
export function getTreeSprite(name)   { return treeLoaded.get(name)   ?? null; }
