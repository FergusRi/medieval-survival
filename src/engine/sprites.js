// ============================================================
// sprites.js — LRU OffscreenCanvas sprite cache (Phase 5)
// ============================================================
// Usage: getSprite(key, size, drawFn) → OffscreenCanvas
// Cache evicts least-recently-used entry when > MAX_CACHE entries.
// ============================================================

const cache = new Map(); // key → { canvas, lastUsed }
const MAX_CACHE = 256;
let tick = 0;

/**
 * Return a cached OffscreenCanvas for the given key.
 * If not cached, call drawFn(ctx, size) to render it, cache, and return.
 */
export function getSprite(key, size, drawFn) {
  tick++;
  if (cache.has(key)) {
    const entry = cache.get(key);
    entry.lastUsed = tick;
    return entry.canvas;
  }

  // Evict LRU if at capacity
  if (cache.size >= MAX_CACHE) {
    let oldestKey = null, oldestTick = Infinity;
    for (const [k, v] of cache) {
      if (v.lastUsed < oldestTick) { oldestTick = v.lastUsed; oldestKey = k; }
    }
    if (oldestKey !== null) cache.delete(oldestKey);
  }

  const oc = new OffscreenCanvas(size, size);
  const octx = oc.getContext('2d');
  octx.imageSmoothingEnabled = false;
  drawFn(octx, size);
  cache.set(key, { canvas: oc, lastUsed: tick });
  return oc;
}

/** Invalidate a specific key (e.g. animated tiles each frame). */
export function invalidateSprite(key) {
  cache.delete(key);
}

/** Clear all cached sprites (e.g. on map regen). */
export function clearSpriteCache() {
  cache.clear();
  tick = 0;
}
