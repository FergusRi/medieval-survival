// ============================================================
// map.js — 250×250 Uint16Array tile store + world state
// ============================================================

import { T, TILE_DEF } from './tiles.js';
import { events, EV } from '../engine/events.js';

export const MAP_SIZE  = 250;          // tiles per axis
export const TILE_SIZE = 32;           // CSS pixels per tile
export const MAP_PX    = MAP_SIZE * TILE_SIZE; // 8000px

// Flat Uint16Array — index = ty * MAP_SIZE + tx
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
export function generateMap() {
  // Fill with grass
  tileMap.fill(T.GRASS);

  const rng = mulberry32(12345); // deterministic seed

  // Scatter dirt patches
  for (let i = 0; i < 80; i++) {
    const cx = Math.floor(rng() * MAP_SIZE);
    const cy = Math.floor(rng() * MAP_SIZE);
    const r  = 2 + Math.floor(rng() * 5);
    paintCircle(cx, cy, r, T.DIRT, rng);
  }

  // Forest clusters
  for (let i = 0; i < 40; i++) {
    const cx = Math.floor(rng() * MAP_SIZE);
    const cy = Math.floor(rng() * MAP_SIZE);
    const r  = 3 + Math.floor(rng() * 6);
    paintCircle(cx, cy, r, T.FOREST, rng);
  }

  // Mountain ridges
  for (let i = 0; i < 15; i++) {
    const cx = Math.floor(rng() * MAP_SIZE);
    const cy = Math.floor(rng() * MAP_SIZE);
    const r  = 2 + Math.floor(rng() * 4);
    paintCircle(cx, cy, r, T.MOUNTAIN, rng);
  }

  // Ponds (small water features)
  for (let i = 0; i < 12; i++) {
    const cx = Math.floor(rng() * MAP_SIZE);
    const cy = Math.floor(rng() * MAP_SIZE);
    const r  = 2 + Math.floor(rng() * 3);
    paintCircle(cx, cy, r, T.POND, rng);
    // Ring of sand around pond
    paintRing(cx, cy, r + 1, T.SAND);
  }

  // Keep centre clear for Capital spawn (20×20 area around 125,125)
  const cx = MAP_SIZE >> 1;
  const cy = MAP_SIZE >> 1;
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -10; dx <= 10; dx++) {
      setTile(cx + dx, cy + dy, T.GRASS);
    }
  }

  events.emit(EV.MAP_LOADED, { width: MAP_SIZE, height: MAP_SIZE });
  console.log('[map] generated');
}

// ---- Helpers --------------------------------------------------
function paintCircle(cx, cy, r, type, rng) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + rng() * r) {
        setTile(cx + dx, cy + dy, type);
      }
    }
  }
}

function paintRing(cx, cy, r, type) {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
    const tx = Math.round(cx + Math.cos(angle) * r);
    const ty = Math.round(cy + Math.sin(angle) * r);
    if (getTile(tx, ty) === T.GRASS) setTile(tx, ty, type);
  }
}

// Deterministic PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
