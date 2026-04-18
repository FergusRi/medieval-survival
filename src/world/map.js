// ============================================================
// map.js — 250×250 Uint16Array tile store + world state
// ============================================================

import { T, TILE_DEF } from './tiles.js';
import { events, EV } from '../engine/events.js';

export const MAP_SIZE  = 250;
export const TILE_SIZE = 32;
export const MAP_PX    = MAP_SIZE * TILE_SIZE;

export const tileMap = new Uint16Array(MAP_SIZE * MAP_SIZE);

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
  const def = TILE_DEF[getTile(tx, ty)];
  return def ? def.walkable : false;
}

export function moveCost(tx, ty) {
  const def = TILE_DEF[getTile(tx, ty)];
  return def ? def.moveCost : 0;
}

// ---- Map generation ------------------------------------------
export function generateMap(seed = 12345) {
  const rng = mulberry32(seed);

  // Build layered value-noise maps
  const elevMap  = buildNoiseMap(MAP_SIZE, [
    { scale: 0.008, amp: 1.0 },
    { scale: 0.020, amp: 0.5 },
    { scale: 0.050, amp: 0.25 },
    { scale: 0.100, amp: 0.12 },
  ], rng);

  const moistMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.010, amp: 1.0 },
    { scale: 0.030, amp: 0.4 },
    { scale: 0.070, amp: 0.2 },
  ], rng);

  // Classify tiles from elevation + moisture
  for (let ty = 0; ty < MAP_SIZE; ty++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const e = elevMap[ty * MAP_SIZE + tx];  // 0–1
      const m = moistMap[ty * MAP_SIZE + tx]; // 0–1

      let tile;
      if (e < 0.20)       tile = T.DEEP_WATER;
      else if (e < 0.28)  tile = T.WATER;
      else if (e < 0.33)  tile = T.SAND;
      else if (e < 0.72) {
        // Mid-range: grass vs dirt vs forest by moisture
        if (m > 0.65)     tile = T.FOREST;
        else if (m < 0.30) tile = T.DIRT;
        else               tile = T.GRASS;
      } else if (e < 0.82) tile = T.MOUNTAIN;
      else                   tile = T.MOUNTAIN;

      setTile(tx, ty, tile);
    }
  }

  // Mark shallow-water edges as POND (decorative inland water)
  // Any WATER tile with no DEEP_WATER neighbour becomes POND
  for (let ty = 1; ty < MAP_SIZE - 1; ty++) {
    for (let tx = 1; tx < MAP_SIZE - 1; tx++) {
      if (getTile(tx, ty) !== T.WATER) continue;
      const hasDeep = (
        getTile(tx-1, ty) === T.DEEP_WATER ||
        getTile(tx+1, ty) === T.DEEP_WATER ||
        getTile(tx, ty-1) === T.DEEP_WATER ||
        getTile(tx, ty+1) === T.DEEP_WATER
      );
      if (!hasDeep) setTile(tx, ty, T.POND);
    }
  }

  // Scatter stone paths (small natural trails through grass)
  const numPaths = 8;
  for (let p = 0; p < numPaths; p++) {
    let px = Math.floor(rng() * MAP_SIZE);
    let py = Math.floor(rng() * MAP_SIZE);
    const len = 20 + Math.floor(rng() * 40);
    let angle = rng() * Math.PI * 2;
    for (let s = 0; s < len; s++) {
      const tx = Math.round(px);
      const ty = Math.round(py);
      if (getTile(tx, ty) === T.GRASS || getTile(tx, ty) === T.DIRT) {
        setTile(tx, ty, T.STONE_PATH);
      }
      angle += (rng() - 0.5) * 0.6;
      px += Math.cos(angle);
      py += Math.sin(angle);
    }
  }

  events.emit(EV.MAP_LOADED, { width: MAP_SIZE, height: MAP_SIZE });
  console.log('[map] generated');
}

// ---- Value noise ---------------------------------------------
// Each layer: smooth random grid interpolated with cosine
function buildNoiseMap(size, layers, rng) {
  const out = new Float32Array(size * size);

  for (const { scale, amp } of layers) {
    const gridSize = Math.ceil(size * scale) + 2;
    // Random gradient grid
    const grid = new Float32Array(gridSize * gridSize);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();

    for (let ty = 0; ty < size; ty++) {
      for (let tx = 0; tx < size; tx++) {
        const fx = tx * scale;
        const fy = ty * scale;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const fracX = fx - ix;
        const fracY = fy - iy;

        const gx0 = ix     % gridSize;
        const gx1 = (ix+1) % gridSize;
        const gy0 = iy     % gridSize;
        const gy1 = (iy+1) % gridSize;

        const v00 = grid[gy0 * gridSize + gx0];
        const v10 = grid[gy0 * gridSize + gx1];
        const v01 = grid[gy1 * gridSize + gx0];
        const v11 = grid[gy1 * gridSize + gx1];

        const cx = cosInterp(fracX);
        const cy = cosInterp(fracY);

        const top    = v00 + cx * (v10 - v00);
        const bottom = v01 + cx * (v11 - v01);
        out[ty * size + tx] += (top + cy * (bottom - top)) * amp;
      }
    }
  }

  // Normalise to 0–1
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < out.length; i++) {
    if (out[i] < min) min = out[i];
    if (out[i] > max) max = out[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) / range;

  return out;
}

function cosInterp(t) { return (1 - Math.cos(t * Math.PI)) * 0.5; }

// Deterministic PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
