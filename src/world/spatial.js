// ============================================================
// spatial.js — 64px bucket spatial grid
// Phase 11: Fast radius / rect queries for collision, combat,
// and citizen targeting without O(n²) loops.
//
// Usage:
//   import { spatialGrid } from '../world/spatial.js';
//
//   // Each frame (after updating all entity positions):
//   spatialGrid.rebuild(citizens, enemies, placedBuildings);
//
//   // Query:
//   const nearby = spatialGrid.queryRadius(worldX, worldY, radius);
//   const inBox  = spatialGrid.queryRect(x, y, w, h);
// ============================================================

const BUCKET_SIZE = 64; // px — coarse cell size

export class SpatialGrid {
  constructor() {
    this._cells = new Map(); // "cx,cy" → Set of entities
    this._entityCell = new Map(); // entity id → "cx,cy"
  }

  // ── Full rebuild every frame ────────────────────────────────
  /**
   * entities: any iterable of objects with { id, x, y }
   * Accepts multiple iterables (citizens, enemies, buildings…).
   */
  rebuild(...iterables) {
    this._cells.clear();
    this._entityCell.clear();

    for (const iterable of iterables) {
      for (const entity of iterable) {
        this._insert(entity);
      }
    }
  }

  _insert(entity) {
    const cx = Math.floor(entity.x / BUCKET_SIZE);
    const cy = Math.floor(entity.y / BUCKET_SIZE);
    const key = `${cx},${cy}`;

    if (!this._cells.has(key)) this._cells.set(key, new Set());
    this._cells.get(key).add(entity);
    this._entityCell.set(entity.id, key);
  }

  // ── Radius query ────────────────────────────────────────────
  /**
   * Returns array of entities within `radius` px of (wx, wy).
   * Checks surrounding bucket ring, then exact distance filter.
   */
  queryRadius(wx, wy, radius) {
    const results = [];
    const r2 = radius * radius;

    const minCX = Math.floor((wx - radius) / BUCKET_SIZE);
    const maxCX = Math.floor((wx + radius) / BUCKET_SIZE);
    const minCY = Math.floor((wy - radius) / BUCKET_SIZE);
    const maxCY = Math.floor((wy + radius) / BUCKET_SIZE);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this._cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const entity of cell) {
          const dx = entity.x - wx;
          const dy = entity.y - wy;
          if (dx * dx + dy * dy <= r2) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  // ── Rect query ──────────────────────────────────────────────
  /**
   * Returns array of entities whose position falls within the
   * axis-aligned rectangle (x, y, x+w, y+h).
   */
  queryRect(x, y, w, h) {
    const results = [];

    const minCX = Math.floor(x / BUCKET_SIZE);
    const maxCX = Math.floor((x + w) / BUCKET_SIZE);
    const minCY = Math.floor(y / BUCKET_SIZE);
    const maxCY = Math.floor((y + h) / BUCKET_SIZE);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this._cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const entity of cell) {
          if (
            entity.x >= x && entity.x <= x + w &&
            entity.y >= y && entity.y <= y + h
          ) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  // ── Nearest entity query ────────────────────────────────────
  /**
   * Returns the single nearest entity within `radius` of (wx, wy),
   * optionally filtered by a predicate fn(entity) → bool.
   * Returns null if none found.
   */
  nearest(wx, wy, radius, filterFn = null) {
    let best = null, bestDist = Infinity;
    const candidates = this.queryRadius(wx, wy, radius);
    for (const e of candidates) {
      if (filterFn && !filterFn(e)) continue;
      const d = Math.hypot(e.x - wx, e.y - wy);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  get size() {
    return this._entityCell.size;
  }
}

// Singleton used game-wide
export const spatialGrid = new SpatialGrid();
