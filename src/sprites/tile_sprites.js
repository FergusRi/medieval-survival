// ============================================================
// tile_sprites.js — Kenney RPG tile + tree sprite loader (Phase 5)
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded = new Map(); // tileId  → ImageBitmap
const treeLoaded = new Map(); // key str → ImageBitmap

// Ground tile → asset path
const TILE_IMAGES = {
  [T.GRASS]:          'assets/tiles/grass.png',
  [T.PLAINS]:         'assets/tiles/plains.png',
  [T.DIRT]:           'assets/tiles/dirt.png',
  [T.SAND]:           'assets/tiles/sand.png',
  [T.SCRUBLAND]:      'assets/tiles/scrubland.png',
  [T.FOREST]:         'assets/tiles/grass.png',   // base grass; tree drawn on top
  [T.JUNGLE]:         'assets/tiles/jungle.png',  // base grass; tree drawn on top
  [T.WETLAND]:        'assets/tiles/wetland.png',
  [T.TUNDRA]:         'assets/tiles/tundra.png',
  [T.SNOW]:           'assets/tiles/snow.png',
  [T.WATER]:          'assets/tiles/water.png',
  [T.DEEP_WATER]:     'assets/tiles/deep_water.png',
  [T.POND]:           'assets/tiles/pond.png',
  [T.STONE_PATH]:     'assets/tiles/stone_path.png',
  [T.COBBLESTONE]:    'assets/tiles/cobblestone.png',
  [T.MOUNTAIN]:       'assets/tiles/mountain.png',
  [T.MOUNTAIN_STONE]: 'assets/tiles/mountain.png',
  [T.MOUNTAIN_DEEP]:  'assets/tiles/mountain.png',
  [T.ORE_COAL]:       'assets/tiles/mountain.png',
  [T.ORE_IRON]:       'assets/tiles/mountain.png',
  [T.ORE_GOLD]:       'assets/tiles/mountain.png',
  [T.TUNNEL]:         'assets/tiles/dirt.png',
};

// Tree sprites
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',   // 32×64
  stump: 'assets/trees/tree_stump.png',  // 32×32
};

// Tile types that get a pine tree drawn on top
export const PINE_TILES = new Set([T.FOREST, T.JUNGLE]);

export async function preloadSprites() {
  const jobs = [
    ...Object.entries(TILE_IMAGES).map(async ([id, path]) => {
      // Avoid loading the same path twice
      const existing = [...tileLoaded.entries()].find(([, bmp]) => bmp._path === path);
      try {
        const bmp = await fetchBitmap(path);
        bmp._path = path;
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
