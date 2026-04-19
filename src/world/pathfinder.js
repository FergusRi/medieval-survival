// ============================================================
// pathfinder.js — A* with binary min-heap
// Phase 10: Citizens navigate around obstacles properly.
//
// Usage:
//   findPath(startTX, startTY, goalTX, goalTY)
//   → [ {tx,ty}, … ] waypoint list, or [] if unreachable
//
// Tile passability: isWalkable() from map.js
// TILE_PASSABILITY_CHANGED event invalidates cached paths.
// ============================================================

import { isWalkable, moveCost, MAP_SIZE } from './map.js';
import { events, EV } from '../engine/events.js';

// ── Binary min-heap ──────────────────────────────────────────
class MinHeap {
  constructor() { this._data = []; }
  get size() { return this._data.length; }
  push(item) {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }
  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._siftDown(0);
    }
    return top;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].f <= this._data[i].f) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }
  _siftDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this._data[l].f < this._data[smallest].f) smallest = l;
      if (r < n && this._data[r].f < this._data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
    }
  }
}

// ── Neighbours (4-directional + diagonals) ───────────────────
const DIRS = [
  { dx:  1, dy:  0, cost: 1.0 },
  { dx: -1, dy:  0, cost: 1.0 },
  { dx:  0, dy:  1, cost: 1.0 },
  { dx:  0, dy: -1, cost: 1.0 },
  { dx:  1, dy:  1, cost: 1.414 },
  { dx: -1, dy:  1, cost: 1.414 },
  { dx:  1, dy: -1, cost: 1.414 },
  { dx: -1, dy: -1, cost: 1.414 },
];

// ── Heuristic: octile distance ───────────────────────────────
function heuristic(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

// ── Path cache — key → waypoint array ───────────────────────
const _cache = new Map();
const MAX_CACHE = 256;

function cacheKey(sx, sy, gx, gy) {
  return `${sx},${sy}|${gx},${gy}`;
}

// Invalidate cache entries that pass through a changed tile
events.on(EV.TILE_PASSABILITY_CHANGED, ({ tx, ty }) => {
  for (const [key, path] of _cache) {
    if (path.some(wp => wp.tx === tx && wp.ty === ty)) {
      _cache.delete(key);
    }
  }
});

// ── Main A* function ─────────────────────────────────────────
/**
 * findPath(startTX, startTY, goalTX, goalTY)
 * Returns array of {tx, ty} waypoints from start (exclusive) to goal (inclusive).
 * Returns [] if no path found.
 * Max search nodes: 4096 to stay real-time safe.
 */
export function findPath(startTX, startTY, goalTX, goalTY) {
  // Clamp
  startTX = Math.max(0, Math.min(MAP_SIZE - 1, startTX));
  startTY = Math.max(0, Math.min(MAP_SIZE - 1, startTY));
  goalTX  = Math.max(0, Math.min(MAP_SIZE - 1, goalTX));
  goalTY  = Math.max(0, Math.min(MAP_SIZE - 1, goalTY));

  if (startTX === goalTX && startTY === goalTY) return [];

  // Goal must be walkable (or close enough — snap to nearest walkable)
  if (!isWalkable(goalTX, goalTY)) {
    const snapped = snapToWalkable(goalTX, goalTY, 3);
    if (!snapped) return [];
    goalTX = snapped.tx;
    goalTY = snapped.ty;
  }

  const key = cacheKey(startTX, startTY, goalTX, goalTY);
  if (_cache.has(key)) return _cache.get(key);

  const open   = new MinHeap();
  const gScore = new Map();
  const cameFrom = new Map();
  const closed = new Set();

  const startKey = nodeKey(startTX, startTY);
  gScore.set(startKey, 0);
  open.push({ f: heuristic(startTX, startTY, goalTX, goalTY), tx: startTX, ty: startTY });

  let iterations = 0;
  const MAX_ITER = 4096;

  while (open.size > 0 && iterations++ < MAX_ITER) {
    const { tx, ty } = open.pop();
    const nk = nodeKey(tx, ty);

    if (closed.has(nk)) continue;
    closed.add(nk);

    if (tx === goalTX && ty === goalTY) {
      const path = reconstructPath(cameFrom, goalTX, goalTY);
      if (_cache.size >= MAX_CACHE) {
        // Evict oldest entry
        _cache.delete(_cache.keys().next().value);
      }
      _cache.set(key, path);
      return path;
    }

    const g = gScore.get(nk) ?? Infinity;

    for (const { dx, dy, cost } of DIRS) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) continue;
      if (!isWalkable(nx, ny)) continue;
      // For diagonals, check both cardinal neighbours to avoid corner-cutting
      if (dx !== 0 && dy !== 0) {
        if (!isWalkable(tx + dx, ty) || !isWalkable(tx, ty + dy)) continue;
      }

      const nnk = nodeKey(nx, ny);
      if (closed.has(nnk)) continue;

      const tileCost = moveCost(nx, ny) || 1;
      const tentativeG = g + cost * tileCost;
      const existing = gScore.get(nnk) ?? Infinity;
      if (tentativeG < existing) {
        gScore.set(nnk, tentativeG);
        cameFrom.set(nnk, { tx, ty });
        const f = tentativeG + heuristic(nx, ny, goalTX, goalTY);
        open.push({ f, tx: nx, ty: ny });
      }
    }
  }

  // No path found — cache empty result too
  _cache.set(key, []);
  return [];
}

function nodeKey(tx, ty) {
  return ty * MAP_SIZE + tx;
}

function reconstructPath(cameFrom, gx, gy) {
  const path = [];
  let cur = { tx: gx, ty: gy };
  while (cameFrom.has(nodeKey(cur.tx, cur.ty))) {
    path.push({ tx: cur.tx, ty: cur.ty });
    cur = cameFrom.get(nodeKey(cur.tx, cur.ty));
  }
  path.push({ tx: cur.tx, ty: cur.ty }); // include start neighbour
  path.reverse();
  return path;
}

function snapToWalkable(tx, ty, radius) {
  for (let r = 1; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = tx + dx, ny = ty + dy;
        if (isWalkable(nx, ny)) return { tx: nx, ty: ny };
      }
    }
  }
  return null;
}

/** Clear the entire path cache (call after large map changes) */
export function clearPathCache() {
  _cache.clear();
}
