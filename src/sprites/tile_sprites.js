// ============================================================
// tile_sprites.js — Image-based tile sprite loader (Phase 5)
// ============================================================

import { T } from '../world/tiles.js';

const loaded = new Map(); // key → ImageBitmap
const pending = new Map(); // key → Promise

// Preload all known tile images
const TILE_IMAGES = {
  [T.GRASS]:       'assets/tiles/grass.png',
  [T.DIRT]:        'assets/tiles/dirt.png',
  // Tilled/Seeded dirt are farming states, not world tiles yet — kept for future use
};

export async function preloadSprites() {
  const promises = Object.entries(TILE_IMAGES).map(async ([id, path]) => {
    try {
      const res = await fetch(path);
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      loaded.set(Number(id), bmp);
    } catch (e) {
      console.warn(`[sprites] Failed to load ${path}:`, e);
    }
  });
  await Promise.all(promises);
  console.log(`[sprites] Loaded ${loaded.size} tile sprites`);
}

/** Returns ImageBitmap if available, null otherwise (caller falls back to flat colour) */
export function getTileSprite(tileId) {
  return loaded.get(tileId) ?? null;
}
