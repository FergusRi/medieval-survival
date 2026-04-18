// ============================================================
// init.js — Game bootstrap entry point (Phase 2)
// ============================================================

import { startLoop } from './engine/loop.js';
import { events, EV } from './engine/events.js';
import { initRenderer, beginFrame, endFrame, getCtx } from './engine/renderer.js';
import { initInput, handleKeyPan } from './engine/input.js';
import { camera } from './engine/camera.js';

// ---- Update ---------------------------------------------------
function update(dt) {
  // WASD / arrow-key camera pan
  handleKeyPan(dt);
}

// ---- Render ---------------------------------------------------
function render() {
  beginFrame();

  const ctx = getCtx();

  // ---- Draw a reference grid (debug, Phase 2 only) -----------
  // 250×250 tiles @ 32px = 8000×8000 world pixels
  const MAP_TILES = 250;
  const TILE = 32;
  const MAP_PX = MAP_TILES * TILE;

  // Compute visible tile range from camera
  const zoom = camera.zoom;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const topLeft     = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(vw, vh);

  const tx0 = Math.max(0,          Math.floor(topLeft.x     / TILE));
  const ty0 = Math.max(0,          Math.floor(topLeft.y     / TILE));
  const tx1 = Math.min(MAP_TILES,  Math.ceil (bottomRight.x / TILE));
  const ty1 = Math.min(MAP_TILES,  Math.ceil (bottomRight.y / TILE));

  // Map background
  ctx.fillStyle = '#4a7c4e';
  ctx.fillRect(0, 0, MAP_PX, MAP_PX);

  // Grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth   = 1 / zoom;
  ctx.beginPath();
  for (let tx = tx0; tx <= tx1; tx++) {
    ctx.moveTo(tx * TILE, ty0 * TILE);
    ctx.lineTo(tx * TILE, ty1 * TILE);
  }
  for (let ty = ty0; ty <= ty1; ty++) {
    ctx.moveTo(tx0 * TILE, ty * TILE);
    ctx.lineTo(tx1 * TILE, ty * TILE);
  }
  ctx.stroke();

  // Origin marker
  ctx.fillStyle = '#e8c46a';
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = '#000';
  ctx.font = `${10 / zoom}px monospace`;
  ctx.fillText('0,0', 2 / zoom, 10 / zoom);

  endFrame();
}

// ---- Start -------------------------------------------------
function start() {
  initRenderer();
  initInput();
  startLoop(update, render);
  console.log('[Medieval Survival] Phase 2 — camera/input online');
}

// Wait for DOM then boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

// Export for debugging in console
export { events, EV, camera };
