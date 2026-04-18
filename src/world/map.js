// ============================================================
// map.js — 500×500 Uint16Array tile store + Whittaker biomes
// ============================================================

import { T, TILE_DEF } from './tiles.js';
import { events, EV } from '../engine/events.js';

export const MAP_SIZE  = 500;
export const TILE_SIZE = 32;
export const MAP_PX    = MAP_SIZE * TILE_SIZE; // 16000px

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
  return (TILE_DEF[getTile(tx, ty)] || {}).walkable || false;
}
export function moveCost(tx, ty) {
  return (TILE_DEF[getTile(tx, ty)] || {}).moveCost || 0;
}

// Returns true if tile is walkable AND has at least one mountain neighbour
// Used to validate Mine building placement
export function isMountainEdge(tx, ty) {
  if (!isWalkable(tx, ty)) return false;
  const MOUNTAIN_TILES = new Set([9,10,11,12,13,14]); // T.MOUNTAIN*  + T.ORE_*
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs.some(([dx,dy]) => MOUNTAIN_TILES.has(getTile(tx+dx, ty+dy)));
}

// Returns the total count of mountain tiles in a radius — used for ore yield scaling
export function mountainMass(tx, ty, radius = 8) {
  const MOUNTAIN_TILES = new Set([9,10,11,12,13,14]);
  let count = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx*dx + dy*dy <= radius*radius) {
        if (MOUNTAIN_TILES.has(getTile(tx+dx, ty+dy))) count++;
      }
    }
  }
  return count;
}

// ---- Whittaker biome lookup (elev 0-1, moist 0-1, temp 0-1) --
function whittaker(e, m, t) {
  // Ocean / water
  if (e < 0.22) return T.DEEP_WATER;
  if (e < 0.30) return T.WATER;
  if (e < 0.36) return T.SAND;

  // Mountain layers
  if (e > 0.82) return T.MOUNTAIN_DEEP;
  if (e > 0.72) return T.MOUNTAIN_STONE;
  if (e > 0.64) return T.MOUNTAIN;

  // Cold (high latitude / altitude)
  if (t < 0.20) return e > 0.55 ? T.SNOW : T.TUNDRA;
  if (t < 0.35) return m > 0.5  ? T.TUNDRA : T.PLAINS;

  // Temperate
  if (t < 0.60) {
    if (m > 0.70) return T.FOREST;
    if (m > 0.45) return T.GRASS;
    if (m > 0.25) return T.PLAINS;
    return T.SCRUBLAND;
  }

  // Warm / tropical
  if (m > 0.75) return T.JUNGLE;
  if (m > 0.55) return T.FOREST;
  if (m > 0.35) return T.GRASS;
  if (m > 0.20) return T.SCRUBLAND;
  return T.SAND;
}

// ---- Map generation ------------------------------------------
export function generateMap(seed = 42317) {
  const rng = mulberry32(seed);

  // Elevation: broad continent shapes + detail
  const elevMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.004, amp: 1.00 },
    { scale: 0.010, amp: 0.50 },
    { scale: 0.025, amp: 0.25 },
    { scale: 0.060, amp: 0.12 },
    { scale: 0.120, amp: 0.06 },
  ], rng);

  // Moisture: independent slow + fast layers
  const moistMap = buildNoiseMap(MAP_SIZE, [
    { scale: 0.006, amp: 1.00 },
    { scale: 0.018, amp: 0.50 },
    { scale: 0.050, amp: 0.25 },
    { scale: 0.100, amp: 0.10 },
  ], rng);

  // Temperature: gradient from north (cold) to south (warm) + noise
  const tempNoise = buildNoiseMap(MAP_SIZE, [
    { scale: 0.008, amp: 0.30 },
    { scale: 0.030, amp: 0.15 },
  ], rng);

  // ---- Classify tiles -----------------------------------------
  for (let ty = 0; ty < MAP_SIZE; ty++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const i = ty * MAP_SIZE + tx;
      const e = elevMap[i];
      const m = moistMap[i];
      // Temperature: latitude gradient (top=cold, bottom=warm) + noise
      const latT = ty / MAP_SIZE;                // 0=north cold, 1=south warm
      const t = Math.min(1, Math.max(0, latT * 0.7 + 0.15 + tempNoise[i] * 0.3));
      setTile(tx, ty, whittaker(e, m, t));
    }
  }

  // ---- Wetlands: low elev + high moisture lowlands ------------
  for (let ty = 1; ty < MAP_SIZE - 1; ty++) {
    for (let tx = 1; tx < MAP_SIZE - 1; tx++) {
      const i = ty * MAP_SIZE + tx;
      const e = elevMap[i];
      const m = moistMap[i];
      const cur = getTile(tx, ty);
      if (cur === T.GRASS && e > 0.30 && e < 0.42 && m > 0.80) {
        setTile(tx, ty, T.WETLAND);
      }
    }
  }

  // ---- Inland ponds -------------------------------------------
  for (let ty = 1; ty < MAP_SIZE - 1; ty++) {
    for (let tx = 1; tx < MAP_SIZE - 1; tx++) {
      if (getTile(tx, ty) !== T.WATER) continue;
      const hasDeep =
        getTile(tx-1,ty) === T.DEEP_WATER || getTile(tx+1,ty) === T.DEEP_WATER ||
        getTile(tx,ty-1) === T.DEEP_WATER || getTile(tx,ty+1) === T.DEEP_WATER;
      if (!hasDeep) setTile(tx, ty, T.POND);
    }
  }

  // ---- Ore clusters inside mountains --------------------------
  // Small 3-8 tile blob clusters seeded inside mountain stone
  spawnOreClusters(T.ORE_COAL, 120, 3, 8, [T.MOUNTAIN_STONE, T.MOUNTAIN_DEEP], rng);
  spawnOreClusters(T.ORE_IRON,  70, 3, 7, [T.MOUNTAIN_STONE, T.MOUNTAIN_DEEP], rng);
  spawnOreClusters(T.ORE_GOLD,  25, 3, 5, [T.MOUNTAIN_DEEP],                   rng);

  // ---- Stone paths (winding lowland trails) -------------------
  for (let p = 0; p < 18; p++) {
    let px = Math.floor(rng() * MAP_SIZE);
    let py = Math.floor(rng() * MAP_SIZE);
    const len = 30 + Math.floor(rng() * 70);
    let angle = rng() * Math.PI * 2;
    for (let s = 0; s < len; s++) {
      const ttx = Math.round(px);
      const tty = Math.round(py);
      const cur = getTile(ttx, tty);
      if (cur === T.GRASS || cur === T.PLAINS || cur === T.DIRT) {
        setTile(ttx, tty, T.STONE_PATH);
      }
      angle += (rng() - 0.5) * 0.45;
      px += Math.cos(angle);
      py += Math.sin(angle);
    }
  }

  events.emit(EV.MAP_LOADED, { width: MAP_SIZE, height: MAP_SIZE });
  console.log('[map] generated — 500×500');
}

// ---- Ore cluster spawner ------------------------------------
// Places blob-shaped clusters of oreType inside allowed host tiles
function spawnOreClusters(oreType, count, minSize, maxSize, hostTiles, rng) {
  const hostSet = new Set(hostTiles);
  let attempts = 0;
  let placed = 0;
  while (placed < count && attempts < count * 20) {
    attempts++;
    const ox = Math.floor(rng() * MAP_SIZE);
    const oy = Math.floor(rng() * MAP_SIZE);
    if (!hostSet.has(getTile(ox, oy))) continue;

    // Grow a small blob using flood-fill style random walk
    const size = minSize + Math.floor(rng() * (maxSize - minSize + 1));
    const cluster = [{ x: ox, y: oy }];
    const visited = new Set([oy * MAP_SIZE + ox]);

    while (cluster.length < size) {
      const base = cluster[Math.floor(rng() * cluster.length)];
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      const [dx, dy] = dirs[Math.floor(rng() * 4)];
      const nx = base.x + dx;
      const ny = base.y + dy;
      const key = ny * MAP_SIZE + nx;
      if (visited.has(key)) continue;
      if (!hostSet.has(getTile(nx, ny))) continue;
      visited.add(key);
      cluster.push({ x: nx, y: ny });
    }

    for (const { x, y } of cluster) setTile(x, y, oreType);
    placed++;
  }
}

// ---- Value noise (layered cosine interpolation) -------------
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
        const top    = grid[gy0*gs+gx0] + cx * (grid[gy0*gs+gx1] - grid[gy0*gs+gx0]);
        const bottom = grid[gy1*gs+gx0] + cx * (grid[gy1*gs+gx1] - grid[gy1*gs+gx0]);
        out[ty * size + tx] += (top + cy * (bottom - top)) * amp;
      }
    }
  }
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < out.length; i++) { if (out[i]<mn) mn=out[i]; if (out[i]>mx) mx=out[i]; }
  const r = mx - mn || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - mn) / r;
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
