// ============================================================
// map.js — 500×500 Uint16Array tile store + Whittaker biomes
// Decoration pass: trees + rocks scattered as entities, not tiles
// ============================================================

import { T, TILE_DEF } from './tiles.js';
import { events, EV } from '../engine/events.js';

export const MAP_SIZE  = 500;
export const TILE_SIZE = 32;
export const MAP_PX    = MAP_SIZE * TILE_SIZE;

export const tileMap = new Uint16Array(MAP_SIZE * MAP_SIZE);

// Decoration entity list — populated by generateMap()
// Each entry: { tx, ty, type: 'tree'|'rock', variant: 0|1 }
export const decorations = [];

// ---- Accessors -----------------------------------------------
export function getTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) return T.VOID;
  return tileMap[ty * MAP_SIZE + tx];
}
export function setTile(tx, ty, type) {
  if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) return;
  tileMap[ty * MAP_SIZE + tx] = type;
}
export function isWalkable(tx, ty) {
  return (TILE_DEF[getTile(tx, ty)] || {}).walkable || false;
}
export function moveCost(tx, ty) {
  return (TILE_DEF[getTile(tx, ty)] || {}).moveCost || 0;
}

export function isMountainEdge(tx, ty) {
  if (!isWalkable(tx, ty)) return false;
  const MT = new Set([T.MOUNTAIN, T.MOUNTAIN_STONE]);
  return [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => MT.has(getTile(tx+dx, ty+dy)));
}

// ---- Whittaker biome lookup ----------------------------------
function whittaker(e, m, t) {
  if (e < 0.22) return T.DEEP_WATER;
  if (e < 0.30) return T.WATER;
  if (e < 0.36) return T.SAND;
  if (e > 0.82) return T.MOUNTAIN;
  if (e > 0.68) return T.MOUNTAIN_STONE;
  if (t < 0.25) return T.GRASS;
  if (t < 0.38) return m > 0.5 ? T.FOREST  : T.GRASS;
  if (t < 0.60) {
    if (m > 0.70) return T.FOREST;
    if (m > 0.45) return T.GRASS;
    if (m > 0.25) return T.GRASS;
    return T.SCRUBLAND;
  }
  if (m > 0.75) return T.FOREST;
  if (m > 0.55) return T.FOREST;
  if (m > 0.35) return T.GRASS;
  if (m > 0.20) return T.SCRUBLAND;
  return T.SAND;
}

// Tiles eligible for tree/rock decoration placement
const TREE_ELIGIBLE = new Set([T.GRASS, T.FOREST, T.SCRUBLAND]);
const ROCK_ELIGIBLE = new Set([T.GRASS, T.SCRUBLAND, T.DIRT]);
const TREE_RATE     = 0.03;  // ~3% of eligible tiles get a tree
const ROCK_RATE     = 0.0125; // ~1.25% of eligible tiles get a rock

// ---- Map generation ------------------------------------------
export let MAP_SEED = 0;

export function generateMap(seed = Date.now()) {
  MAP_SEED = seed;
  decorations.length = 0;
  const rng = mulberry32(seed);

  const elevMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.004, amp: 1.00 },
    { scale: 0.010, amp: 0.50 },
    { scale: 0.025, amp: 0.25 },
    { scale: 0.060, amp: 0.12 },
    { scale: 0.120, amp: 0.06 },
  ], rng);

  const moistMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.006, amp: 1.00 },
    { scale: 0.018, amp: 0.50 },
    { scale: 0.050, amp: 0.25 },
    { scale: 0.100, amp: 0.10 },
  ], rng);

  const tempNoise = buildNoiseMap(MAP_SIZE, [
    { scale: 0.008, amp: 0.30 },
    { scale: 0.030, amp: 0.15 },
  ], rng);

  // Pass 1: classify biomes
  for (let ty = 0; ty < MAP_SIZE; ty++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const i = ty * MAP_SIZE + tx;
      const e = elevMap[i];
      const m = moistMap[i];
      const latT = ty / MAP_SIZE;
      const t = Math.min(1, Math.max(0, latT * 0.7 + 0.15 + tempNoise[i] * 0.3));
      setTile(tx, ty, whittaker(e, m, t));
    }
  }

  // Pass 2: scatter decoration entities (trees + rocks)
  // Uses a separate deterministic hash so it doesn't conflict with tile RNG
  for (let ty = 1; ty < MAP_SIZE - 1; ty++) {
    for (let tx = 1; tx < MAP_SIZE - 1; tx++) {
      const tile = getTile(tx, ty);
      const h = tileHash(MAP_SEED + 1, tx, ty);
      const frac = h / 0xFFFFFFFF;

      if (TREE_ELIGIBLE.has(tile) && frac < TREE_RATE) {
        // variant 0 = primary tree, 1 = secondary tree for this theme
        decorations.push({ tx, ty, type: 'tree', variant: (h >> 8) & 1 });
      } else if (ROCK_ELIGIBLE.has(tile) && frac < ROCK_RATE) {
        decorations.push({ tx, ty, type: 'rock', variant: (h >> 8) & 1 });
      }
    }
  }

  console.log(`[map] generated — ${MAP_SIZE}×${MAP_SIZE}, seed=${seed}, ${decorations.filter(d=>d.type==='tree').length} trees, ${decorations.filter(d=>d.type==='rock').length} rocks`);
  events.emit(EV.MAP_LOADED, { width: MAP_SIZE, height: MAP_SIZE });
}

// ---- Deterministic per-tile hash ----------------------------
function tileHash(seed, tx, ty) {
  let h = (seed ^ (tx * 2246822519) ^ (ty * 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// ---- Value noise --------------------------------------------
function buildNoiseMap(size, layers, rng) {
  const out = new Float32Array(size * size);
  for (const { scale, amp } of layers) {
    const gs = Math.ceil(size * scale) + 2;
    const grid = new Float32Array(gs * gs);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    for (let ty = 0; ty < size; ty++) {
      for (let tx = 0; tx < size; tx++) {
        const fx = tx * scale, fy = ty * scale;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const cx = cosInterp(fx - ix), cy = cosInterp(fy - iy);
        const gx0 = ix % gs, gx1 = (ix+1) % gs;
        const gy0 = iy % gs, gy1 = (iy+1) % gs;
        const top    = grid[gy0*gs+gx0] + cx*(grid[gy0*gs+gx1]-grid[gy0*gs+gx0]);
        const bottom = grid[gy1*gs+gx0] + cx*(grid[gy1*gs+gx1]-grid[gy1*gs+gx0]);
        out[ty*size+tx] += (top + cy*(bottom-top)) * amp;
      }
    }
  }
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < out.length; i++) { if (out[i]<mn) mn=out[i]; if (out[i]>mx) mx=out[i]; }
  const r = mx - mn || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i]-mn)/r;
  return out;
}

function cosInterp(t) { return (1 - Math.cos(t * Math.PI)) * 0.5; }

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
