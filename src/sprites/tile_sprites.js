// ============================================================
// tile_sprites.js — Image-based tile sprite loader
// Map Theme System: each playthrough picks ONE theme at random.
// All tiles remap to that theme's palette — no biome mixing.
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded = new Map(); // tileId → ImageBitmap[]
const treeLoaded = new Map(); // name   → ImageBitmap

// ── Map Themes ───────────────────────────────────────────────
// Each theme defines tile path overrides. Unspecified tiles
// fall back to the BASE_VARIANTS defaults below.
const BASE_VARIANTS = {
  [T.GRASS]:          ['assets/tiles/grass.png', 'assets/tiles/grass2.png'],
  [T.DIRT]:           ['assets/tiles/dirt.png'],
  [T.SAND]:           ['assets/tiles/sand.png'],
  [T.SCRUBLAND]:      ['assets/tiles/scrubland.png'],
  [T.FOREST]:         ['assets/tiles/forest.png'],
  [T.MOUNTAIN_STONE]: ['assets/tiles/mountain_stone.png'],
  [T.WATER]:          ['assets/tiles/water.png'],
  [T.DEEP_WATER]:     ['assets/tiles/deep_water.png'],
};

const MAP_THEMES = {
  grasslands: {
    name: 'Grasslands',
    // grass + forest — default palette, lush green
    overrides: {}, // uses BASE_VARIANTS as-is
  },
  tundra: {
    name: 'Tundra',
    overrides: {
      [T.GRASS]:     ['assets/tiles/tundra.png'],   // icy ground instead of green
      [T.SCRUBLAND]: ['assets/tiles/tundra.png'],   // scrubland → frozen brush
      [T.DIRT]:      ['assets/tiles/tundra.png'],   // dirt → frozen soil
      [T.SAND]:      ['assets/tiles/tundra.png'],   // no sand in tundra
    },
  },
  plains: {
    name: 'Plains',
    overrides: {
      [T.GRASS]:     ['assets/tiles/plains.png'],   // savannah/plains ground
      [T.SCRUBLAND]: ['assets/tiles/plains.png'],   // dry brush same base
      [T.DIRT]:      ['assets/tiles/dirt.png'],
    },
  },
};

const THEME_KEYS = Object.keys(MAP_THEMES);

// Picked once per game load — exported so UI/map gen can read it
export let currentTheme = null;

// ── Tree sprites ─────────────────────────────────────────────
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',
  stump: 'assets/trees/tree_stump.png',
};

export const PINE_TILES = new Set([T.FOREST]);

// Chunk size: 2^4 = 16 tiles per chunk
const CHUNK_BITS = 4;

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

// Pick a random theme and build the final TILE_VARIANTS map for this run
function buildThemeVariants() {
  const key   = THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
  const theme = MAP_THEMES[key];
  currentTheme = key;
  console.log(`[sprites] Map theme: ${theme.name}`);

  const merged = {};
  for (const [id, paths] of Object.entries(BASE_VARIANTS)) {
    merged[id] = theme.overrides[id] ?? paths;
  }
  return merged;
}

export async function preloadSprites() {
  const variants = buildThemeVariants();

  const jobs = [
    ...Object.entries(variants).map(async ([id, paths]) => {
      const bitmaps = [];
      for (const path of paths) {
        try { bitmaps.push(await loadImage(path)); }
        catch (e) { console.warn(`[sprites] Failed tile ${path}:`, e); }
      }
      if (bitmaps.length) tileLoaded.set(Number(id), bitmaps);
    }),
    ...Object.entries(TREE_IMAGES).map(async ([name, path]) => {
      try { treeLoaded.set(name, await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed tree ${path}:`, e); }
    }),
  ];
  await Promise.all(jobs);
  console.log(`[sprites] Loaded ${tileLoaded.size} tile types, ${treeLoaded.size} trees`);
}

// Deterministic chunk-level hash — same 16×16 chunk always picks same variant
function chunkHash(tx, ty) {
  const cx = tx >> CHUNK_BITS;
  const cy = ty >> CHUNK_BITS;
  let h = (cx * 1619 + cy * 31337) ^ (cx ^ cy);
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = (h >>> 16) ^ h;
  return (h >>> 0);
}

export function getTileSprite(tileId, tx = 0, ty = 0) {
  const variants = tileLoaded.get(tileId);
  if (!variants || !variants.length) return null;
  if (variants.length === 1) return variants[0];
  const idx = chunkHash(tx, ty) % variants.length;
  return variants[idx];
}

export function getTreeSprite(name) { return treeLoaded.get(name) ?? null; }
