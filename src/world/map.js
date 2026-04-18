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

  // Layer 1: elevation (large + medium + fine detail)
  const elevMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.006, amp: 1.0  },
    { scale: 0.018, amp: 0.5  },
    { scale: 0.045, amp: 0.25 },
    { scale: 0.090, amp: 0.10 },
  ], rng);

  // Layer 2: moisture (for grass/dirt/forest variation)
  const moistMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.010, amp: 1.0 },
    { scale: 0.030, amp: 0.4 },
    { scale: 0.070, amp: 0.2 },
  ], rng);

  // Layer 3: ruggedness (adds rocky detail inside mountains)
  const rugMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.040, amp: 1.0 },
    { scale: 0.100, amp: 0.5 },
  ], rng);

  // ---- Classify base tiles from elevation + moisture ----------
  for (let ty = 0; ty < MAP_SIZE; ty++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const e = elevMap[ty * MAP_SIZE + tx];
      const m = moistMap[ty * MAP_SIZE + tx];

      let tile;
      if      (e < 0.20) tile = T.DEEP_WATER;
      else if (e < 0.28) tile = T.WATER;
      else if (e < 0.34) tile = T.SAND;
      else if (e < 0.70) {
        if      (m > 0.62) tile = T.FOREST;
        else if (m < 0.28) tile = T.DIRT;
        else               tile = T.GRASS;
      }
      else if (e < 0.76) tile = T.MOUNTAIN;        // foothills
      else if (e < 0.87) tile = T.MOUNTAIN_STONE;  // solid stone
      else               tile = T.MOUNTAIN_DEEP;   // deep interior

      setTile(tx, ty, tile);
    }
  }

  // ---- Inland ponds (WATER with no DEEP_WATER neighbour) ------
  for (let ty = 1; ty < MAP_SIZE - 1; ty++) {
    for (let tx = 1; tx < MAP_SIZE - 1; tx++) {
      if (getTile(tx, ty) !== T.WATER) continue;
      const hasDeep =
        getTile(tx-1,ty) === T.DEEP_WATER || getTile(tx+1,ty) === T.DEEP_WATER ||
        getTile(tx,ty-1) === T.DEEP_WATER || getTile(tx,ty+1) === T.DEEP_WATER;
      if (!hasDeep) setTile(tx, ty, T.POND);
    }
  }

  // ---- Ore veins inside MOUNTAIN_DEEP -------------------------
  // Each ore type seeded with small cluster noise
  const oreCoalMap = buildNoiseMap(MAP_SIZE, [{ scale: 0.12, amp: 1.0 }, { scale: 0.25, amp: 0.5 }], rng);
  const oreIronMap = buildNoiseMap(MAP_SIZE, [{ scale: 0.10, amp: 1.0 }, { scale: 0.22, amp: 0.5 }], rng);
  const oreGoldMap = buildNoiseMap(MAP_SIZE, [{ scale: 0.08, amp: 1.0 }, { scale: 0.18, amp: 0.5 }], rng);

  for (let ty = 0; ty < MAP_SIZE; ty++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const cur = getTile(tx, ty);
      if (cur !== T.MOUNTAIN_DEEP && cur !== T.MOUNTAIN_STONE) continue;

      const i = ty * MAP_SIZE + tx;
      // Gold: rarest, only deepest
      if (cur === T.MOUNTAIN_DEEP && oreGoldMap[i] > 0.78) {
        setTile(tx, ty, T.ORE_GOLD);
      }
      // Iron: mid-frequency
      else if (oreIronMap[i] > 0.72) {
        setTile(tx, ty, T.ORE_IRON);
      }
      // Coal: most common
      else if (oreCoalMap[i] > 0.65) {
        setTile(tx, ty, T.ORE_COAL);
      }
    }
  }

  // ---- Stone paths (winding trails through lowlands) ----------
  for (let p = 0; p < 10; p++) {
    let px = Math.floor(rng() * MAP_SIZE);
    let py = Math.floor(rng() * MAP_SIZE);
    const len = 25 + Math.floor(rng() * 50);
    let angle = rng() * Math.PI * 2;
    for (let s = 0; s < len; s++) {
      const ttx = Math.round(px);
      const tty = Math.round(py);
      const cur = getTile(ttx, tty);
      if (cur === T.GRASS || cur === T.DIRT) setTile(ttx, tty, T.STONE_PATH);
      angle += (rng() - 0.5) * 0.5;
      px += Math.cos(angle);
      py += Math.sin(angle);
    }
  }

  events.emit(EV.MAP_LOADED, { width: MAP_SIZE, height: MAP_SIZE });
  console.log('[map] generated');
}

// ---- Value noise --------------------------------------------
function buildNoiseMap(size, layers, rng) {
  const out = new Float32Array(size * size);

  for (const { scale, amp } of layers) {
    const gridSize = Math.ceil(size * scale) + 2;
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

  // Normalise 0–1
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

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
