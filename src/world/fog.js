// ============================================================
// fog.js — Fog of War (Phase 4)
// ============================================================
// FOG_UNEXPLORED = 0  → black fill
// FOG_SEEN       = 1  → semi-transparent dark overlay
// FOG_VISIBLE    = 2  → no overlay (fully lit)
// ============================================================

import { MAP_SIZE } from './map.js';

export const FOG_UNEXPLORED = 0;
export const FOG_SEEN       = 1;
export const FOG_VISIBLE    = 2;

// Vision radii (in tiles) for different sources
export const VISION_RADIUS = {
  CAPITAL:     6,
  SETTLEMENT:  5,
  WATCHTOWER:  8,
  CITIZEN:     3,
};

// Fog state — one byte per tile
export const fog = new Uint8Array(MAP_SIZE * MAP_SIZE);

// ---- revealCircle -------------------------------------------
// Mark all tiles within `radius` of (cx, cy) as FOG_VISIBLE.
// Uses squared-distance check (no sqrt needed).
export function revealCircle(cx, cy, radius) {
  const r2  = radius * radius;
  const x0  = Math.max(0,        cx - radius);
  const x1  = Math.min(MAP_SIZE - 1, cx + radius);
  const y0  = Math.max(0,        cy - radius);
  const y1  = Math.min(MAP_SIZE - 1, cy + radius);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy <= r2) {
        fog[ty * MAP_SIZE + tx] = FOG_VISIBLE;
      }
    }
  }
}

// ---- updateFog ----------------------------------------------
// Call once per frame (or whenever vision sources change).
// visionSources: array of { tx, ty, radius }
// Step 1: demote all VISIBLE → SEEN  (preserve explored memory)
// Step 2: re-reveal from every source
export function updateFog(visionSources) {
  // Demote visible → seen
  for (let i = 0; i < fog.length; i++) {
    if (fog[i] === FOG_VISIBLE) fog[i] = FOG_SEEN;
  }

  // Re-reveal from all current sources
  for (const src of visionSources) {
    revealCircle(src.tx, src.ty, src.radius);
  }
}

// ---- initFog ------------------------------------------------
// Call once after map generation.
// startTx/startTy: tile coords of first revealed position.
// Typically the starting citizen's tile or map centre.
export function initFog(startTx, startTy) {
  fog.fill(FOG_UNEXPLORED);
  revealCircle(startTx, startTy, VISION_RADIUS.CAPITAL);
}

// ---- drawFog ------------------------------------------------
// Render the fog overlay.  Call AFTER all tiles, BEFORE entities.
// ctx must already have the camera transform applied (world-space).
// Only iterates the visible viewport region for performance.
export function drawFog(ctx, tx0, ty0, tx1, ty1, tileSize) {
  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const state = fog[ty * MAP_SIZE + tx];
      if (state === FOG_VISIBLE) continue;          // fully lit — skip

      ctx.fillStyle = state === FOG_UNEXPLORED
        ? '#000000'
        : 'rgba(0,0,0,0.55)';

      ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
    }
  }
}
