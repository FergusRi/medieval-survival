// ============================================================
// init.js — Game bootstrap entry point (Phase 3)
// ============================================================

import { startLoop } from './engine/loop.js';
import { events, EV } from './engine/events.js';
import { initRenderer, beginFrame, endFrame, getCtx } from './engine/renderer.js';
import { initInput, handleKeyPan } from './engine/input.js';
import { camera } from './engine/camera.js';
import { generateMap, getTile, MAP_SIZE, TILE_SIZE, MAP_PX } from './world/map.js';
import { drawMinimap } from './ui/minimap.js';
import { TILE_DEF } from './world/tiles.js';

// ---- Update ---------------------------------------------------
function update(dt) {
  handleKeyPan(dt);
  // Clamp camera to map bounds
  camera.clamp(MAP_PX, MAP_PX);
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

  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id  = getTile(tx, ty);
      const def = TILE_DEF[id];
      ctx.fillStyle = def ? def.colour : '#000';
      ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Thin grid lines at zoom ≥ 1
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

  endFrame();

  // Minimap overlay (screen-space, no camera transform)
  const screenCtx = getCtx();
  drawMinimap(screenCtx);
}

// ---- Start -------------------------------------------------
function start() {
  initRenderer();
  initInput();
  generateMap();
  startLoop(update, render);
  console.log('[Medieval Survival] Phase 3 — map data online');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export { events, EV, camera };
