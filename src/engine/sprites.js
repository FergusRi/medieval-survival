// ============================================================
// sprites.js — LRU OffscreenCanvas sprite cache (Phase 5)
// ============================================================

const MAX = 256;
const cache = new Map(); // key → { canvas, tick }
let tick = 0;

export function getSprite(key, size, drawFn) {
  if (cache.has(key)) {
    const entry = cache.get(key);
    entry.tick = ++tick;
    return entry.canvas;
  }
  // Evict LRU if at capacity
  if (cache.size >= MAX) {
    let oldest = Infinity, oldKey = null;
    for (const [k, v] of cache) {
      if (v.tick < oldest) { oldest = v.tick; oldKey = k; }
    }
    cache.delete(oldKey);
  }
  const canvas = new OffscreenCanvas(size, size);
  drawFn(canvas.getContext('2d'), size);
  cache.set(key, { canvas, tick: ++tick });
  return canvas;
}

export function invalidateSprite(key) { cache.delete(key); }
export function clearSpriteCache()    { cache.clear(); tick = 0; }
