// ============================================================
// init.js — Game bootstrap entry point (Phase 4)
// ============================================================

import { startLoop } from './engine/loop.js';
import { events, EV } from './engine/events.js';
import { initRenderer, beginFrame, endFrame, getCtx } from './engine/renderer.js';
import { initInput, handleKeyPan } from './engine/input.js';
import { camera } from './engine/camera.js';
import { generateMap, getTile, MAP_SIZE, TILE_SIZE, MAP_PX } from './world/map.js';
import { TILE_DEF } from './world/tiles.js';
import { drawMinimap } from './ui/minimap.js';
import { initFog, updateFog, drawFog, VISION_RADIUS } from './world/fog.js';

// Vision sources for this phase: one "capital-level" reveal at start
// Phase 5+ will populate this from real entities
let visionSources = [];

// ---- Update ---------------------------------------------------
function update(dt) {
  handleKeyPan(dt);
  camera.clamp(MAP_PX, MAP_PX);

  // Re-compute fog from current vision sources each frame
  // (cheap — only needed when sources move, but fine to run each frame for now)
  updateFog(visionSources);
}

// ---- Render ---------------------------------------------------
function render() {
  beginFrame();
  const ctx = getCtx();

  // Viewport-culled tile render
  const topLeft     = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(window.innerWidth, window.innerHeight);

  const tx0 = Math.max(0,        Math.floor(topLeft.x     / TILE_SIZE));
  const ty0 = Math.max(0,        Math.floor(topLeft.y     / TILE_SIZE));
  const tx1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.x / TILE_SIZE));
  const ty1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.y / TILE_SIZE));

  // 1 — Tiles
  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id  = getTile(tx, ty);
      const def = TILE_DEF[id];
      ctx.fillStyle = def ? def.colour : '#000';
      ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // 2 — Grid lines at zoom ≥ 0.8
  if (camera.zoom >= 0.8) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth   = 1 / camera.zoom;
    ctx.beginPath();
    for (let tx = tx0; tx <= tx1; tx++) {
      ctx.moveTo(tx * TILE_SIZE, ty0 * TILE_SIZE);
      ctx.lineTo(tx * TILE_SIZE, ty1 * TILE_SIZE);
    }
    for (let ty = ty0; ty <= ty1; ty++) {
      ctx.moveTo(tx0 * TILE_SIZE, ty * TILE_SIZE);
      ctx.lineTo(tx1 * TILE_SIZE, ty * TILE_SIZE);
    }
    ctx.stroke();
  }

  // 3 — Fog of War overlay (after tiles, before entities)
  drawFog(ctx, tx0, ty0, tx1, ty1, TILE_SIZE);

  endFrame();

  // Minimap overlay (screen-space, outside camera transform)
  drawMinimap(getCtx());
}

// ---- Find a walkable tile near the map centre ----------------
function findStartTile() {
  const { T, TILE_DEF } = await import('./world/tiles.js').catch(() => ({ T: null, TILE_DEF: null }));
  const cx = Math.floor(MAP_SIZE / 2);
  const cy = Math.floor(MAP_SIZE / 2);

  // Spiral outward from centre to find first walkable tile
  for (let r = 0; r < 50; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // edge of ring only
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
        const id  = getTile(tx, ty);
        const def = TILE_DEF[id];
        if (def && def.walkable) return { tx, ty };
      }
    }
  }
  return { tx: cx, ty: cy }; // fallback
}

// ---- Start -------------------------------------------------
async function start() {
  initRenderer();
  initInput();
  generateMap();

  // Find walkable start tile near centre
  const { TILE_DEF } = await import('./world/tiles.js');
  const cx = Math.floor(MAP_SIZE / 2);
  const cy = Math.floor(MAP_SIZE / 2);
  let startTx = cx, startTy = cy;

  outer:
  for (let r = 0; r < 60; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const tx = cx + dx, ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
        const def = TILE_DEF[getTile(tx, ty)];
        if (def && def.walkable) { startTx = tx; startTy = ty; break outer; }
      }
    }
  }

  // Initialise fog — everything dark except starting circle
  initFog(startTx, startTy);

  // Seed vision sources with the starting "Capital-level" reveal
  visionSources = [{ tx: startTx, ty: startTy, radius: VISION_RADIUS.CAPITAL }];

  // Centre camera on start tile
  camera.x = startTx * TILE_SIZE - window.innerWidth  / 2;
  camera.y = startTy * TILE_SIZE - window.innerHeight / 2;
  camera.clamp(MAP_PX, MAP_PX);

  startLoop(update, render);
  console.log(`[Medieval Survival] Phase 4 — Fog of War | start tile (${startTx}, ${startTy})`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export { events, EV, camera };
