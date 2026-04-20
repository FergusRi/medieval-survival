// ============================================================
// tile_sprites.js — Image-based tile sprite loader (Phase 5)
// ============================================================

import { T } from '../world/tiles.js';

const tileLoaded = new Map(); // tileId → ImageBitmap (or ImageBitmap[] for variants)
const treeLoaded = new Map(); // name   → ImageBitmap

// Full ground tile sprites (fully opaque 32×32)
const TILE_IMAGES = {
  [T.DIRT]:           'assets/tiles/dirt.png',
  [T.SAND]:           'assets/tiles/sand.png',
  [T.MOUNTAIN_STONE]: 'assets/tiles/mountain_stone.png',
  [T.WATER]:          'assets/tiles/water.png',
  [T.DEEP_WATER]:     'assets/tiles/deep_water.png',
  [T.STONE]:          'assets/tiles/stone.png',
};

// Grass uses a spritesheet: 128×160px = 4 cols × 5 rows of 32×32 tiles
// Weights by row — row 0 (lushest) is most common, row 4 (sparsest) is rarest
// Cumulative weight table is built at load time for O(log N) sampling
const GRASS_SHEET_PATH = 'assets/tiles/grass_sheet.png';
const GRASS_COLS = 4;
const GRASS_ROWS = 5;
const GRASS_TILE_SIZE = 32;
// Row weights: [row0, row1, row2, row3, row4]
const GRASS_ROW_WEIGHTS = [40, 30, 20, 7, 3]; // sums to 100

let grassVariants = [];   // ImageBitmap[20], index = row*4+col
let grassCumWeights = []; // cumulative weight per tile index

// Tree sprites (transparent PNG, Y-sorted pass)
const TREE_IMAGES = {
  pine:  'assets/trees/tree_pine.png',
  stump: 'assets/trees/tree_stump.png',
};

export const PINE_TILES = new Set([T.FOREST]);

async function loadImage(path) {
  const res  = await fetch(path);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

async function loadGrassSheet() {
  const res  = await fetch(GRASS_SHEET_PATH);
  const blob = await res.blob();
  const sheet = await createImageBitmap(blob);

  // Slice all 20 tiles
  const jobs = [];
  for (let row = 0; row < GRASS_ROWS; row++) {
    for (let col = 0; col < GRASS_COLS; col++) {
      jobs.push(
        createImageBitmap(sheet,
          col * GRASS_TILE_SIZE,
          row * GRASS_TILE_SIZE,
          GRASS_TILE_SIZE,
          GRASS_TILE_SIZE
        )
      );
    }
  }
  grassVariants = await Promise.all(jobs);

  // Build cumulative weight table
  let cumulative = 0;
  grassCumWeights = [];
  for (let row = 0; row < GRASS_ROWS; row++) {
    const w = GRASS_ROW_WEIGHTS[row] / GRASS_COLS; // weight per individual tile in this row
    for (let col = 0; col < GRASS_COLS; col++) {
      cumulative += w;
      grassCumWeights.push(cumulative);
    }
  }

  console.log(`[sprites] Loaded ${grassVariants.length} grass variants`);
}

// Deterministic pseudo-random per tile position (lcg-style hash)
function tileHash(tx, ty) {
  let h = (tx * 1619 + ty * 31337) ^ (tx ^ ty);
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0;
  h = (h >>> 16) ^ h;
  return (h >>> 0) / 0xFFFFFFFF; // 0..1
}

// Pick grass variant for tile coords (tx, ty) using weighted random
export function getGrassVariant(tx, ty) {
  if (!grassVariants.length) return null;
  const r = tileHash(tx, ty) * grassCumWeights[grassCumWeights.length - 1];
  for (let i = 0; i < grassCumWeights.length; i++) {
    if (r < grassCumWeights[i]) return grassVariants[i];
  }
  return grassVariants[0];
}

export async function preloadSprites() {
  const jobs = [
    loadGrassSheet(),
    ...Object.entries(TILE_IMAGES).map(async ([id, path]) => {
      try { tileLoaded.set(Number(id), await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed tile ${path}:`, e); }
    }),
    ...Object.entries(TREE_IMAGES).map(async ([name, path]) => {
      try { treeLoaded.set(name, await loadImage(path)); }
      catch (e) { console.warn(`[sprites] Failed tree ${path}:`, e); }
    }),
  ];
  await Promise.all(jobs);
  console.log(`[sprites] Loaded ${tileLoaded.size} non-grass tiles, ${treeLoaded.size} trees`);
}

export function getTileSprite(tileId) { return tileLoaded.get(tileId) ?? null; }
export function getTreeSprite(name)   { return treeLoaded.get(name)   ?? null; }
