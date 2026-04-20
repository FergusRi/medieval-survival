// ============================================================
// tile_sprites.js — Tile + decoration sprite loader
// Map Theme System: one theme per playthrough (grasslands/tundra/plains)
// Ground tiles + decoration sprites (trees, rocks) all theme-matched.
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded  = new Map(); // tileId → ImageBitmap[]
const decorLoaded = new Map(); // key ('tree_0','rock_1' etc) → ImageBitmap

// ── Base ground tile variants ─────────────────────────────────
const BASE_VARIANTS = {
  [T.GRASS]:          ['assets/tiles/grass.png'],
  [T.DIRT]:           ['assets/tiles/dirt.png'],
  [T.SAND]:           ['assets/tiles/sand.png'],
  [T.SCRUBLAND]:      ['assets/tiles/scrubland.png'],
  [T.FOREST]:         ['assets/tiles/forest.png'],
  [T.MOUNTAIN_STONE]: ['assets/tiles/mountain_stone.png'],
  [T.WATER]:          ['assets/tiles/water.png'],
  [T.DEEP_WATER]:     ['assets/tiles/deep_water.png'],
};

// ── Map Themes ────────────────────────────────────────────────
// tile_overrides: remap ground tiles for this theme
// decor: tree[0], tree[1], rock[0], rock[1] sprites
const MAP_THEMES = {
  grasslands: {
    name: 'Grasslands',
    tile_overrides: {},
    decor: {
      tree: ['assets/trees/tree_pine_grass.png', 'assets/trees/tree_oak.png'],
      rock: ['assets/decor/rock_grass.png',      'assets/decor/rock_grass2.png'],
    },
  },
  tundra: {
    name: 'Tundra',
    tile_overrides: {
      [T.GRASS]:     ['assets/tiles/tundra.png'],
      [T.SCRUBLAND]: ['assets/tiles/tundra.png'],
      [T.DIRT]:      ['assets/tiles/tundra.png'],
      [T.SAND]:      ['assets/tiles/tundra.png'],
      [T.FOREST]:    ['assets/tiles/tundra.png'],
    },
    decor: {
      tree: ['assets/trees/tree_dead.png',   'assets/trees/tree_snow.png'],
      rock: ['assets/decor/rock_tundra.png', 'assets/decor/rock_tundra2.png'],
    },
  },
  plains: {
    name: 'Plains',
    tile_overrides: {
      [T.GRASS]:     ['assets/tiles/plains.png'],
      [T.SCRUBLAND]: ['assets/tiles/plains.png'],
      [T.FOREST]:    ['assets/tiles/plains.png'],
    },
    decor: {
      tree: ['assets/trees/tree_acacia.png',  'assets/trees/tree_scrub.png'],
      rock: ['assets/decor/rock_plains.png',  'assets/decor/rock_plains2.png'],
    },
  },
};

const THEME_KEYS = Object.keys(MAP_THEMES);
export let currentTheme = null;

// Chunk size: 2^4 = 16 tiles per chunk
const CHUNK_BITS = 4;

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

function buildThemeVariants() {
  const key   = THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
  const theme = MAP_THEMES[key];
  currentTheme = key;
  console.log(`[sprites] Map theme: ${theme.name}`);

  // Merge base + overrides for ground tiles
  const merged = {};
  for (const [id, paths] of Object.entries(BASE_VARIANTS)) {
    merged[id] = theme.tile_overrides[id] ?? paths;
  }
  return { tileVariants: merged, decor: theme.decor };
}

export async function preloadSprites() {
  const { tileVariants, decor } = buildThemeVariants();

  const jobs = [
    // Ground tiles
    ...Object.entries(tileVariants).map(async ([id, paths]) => {
      const bitmaps = [];
      for (const path of paths) {
        try { bitmaps.push(await loadImage(path)); }
        catch (e) { console.warn(`[sprites] Failed tile ${path}:`, e); }
      }
      if (bitmaps.length) tileLoaded.set(Number(id), bitmaps);
    }),
    // Decoration sprites: tree_0, tree_1, rock_0, rock_1
    ...Object.entries(decor).flatMap(([kind, paths]) =>
      paths.map(async (path, i) => {
        try {
          decorLoaded.set(`${kind}_${i}`, await loadImage(path));
        } catch (e) { console.warn(`[sprites] Failed decor ${path}:`, e); }
      })
    ),
  ];

  await Promise.all(jobs);
  console.log(`[sprites] Loaded ${tileLoaded.size} tile types, ${decorLoaded.size} decor sprites`);
}

// ── Tile sprite lookup ────────────────────────────────────────
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

// ── Decoration sprite lookup ──────────────────────────────────
// kind: 'tree' | 'rock', variant: 0 | 1
export function getDecorSprite(kind, variant = 0) {
  return decorLoaded.get(`${kind}_${variant}`) ?? decorLoaded.get(`${kind}_0`) ?? null;
}

// Legacy tree sprite (kept for backwards compat — returns theme tree_0)
export function getTreeSprite(name) {
  if (name === 'pine' || name === 'tree') return decorLoaded.get('tree_0') ?? null;
  return decorLoaded.get('tree_1') ?? decorLoaded.get('tree_0') ?? null;
}

export const PINE_TILES = new Set([T.FOREST]);
