// ============================================================
// renderer.js — Canvas setup, DPR, and render orchestration
// ============================================================

import { camera } from './camera.js';

let canvas, ctx;

// ---- Canvas / DPR init ---------------------------------------
export function initRenderer() {
  canvas = document.getElementById('game');
  ctx    = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w   = window.innerWidth;
    const h   = window.innerHeight;

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    // setTransform instead of scale — avoids cumulative scaling on repeated resize
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false; // crisp pixel art
  }

  window.addEventListener('resize', resize);
  resize();

  return ctx;
}

// ---- Begin frame: clear + apply camera transform ------------
export function beginFrame() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  // Fill background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);

  // Apply camera: translate then scale so world coords work naturally
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

// ---- End frame: restore transform ---------------------------
export function endFrame() {
  ctx.restore();
}

// ---- Draw UI overlay (no camera transform) -------------------
export function beginUI() {
  // ctx is already restored to identity after endFrame — draw UI directly
}

// ---- Expose ctx for other modules ---------------------------
export function getCtx() { return ctx; }
export function getCanvas() { return canvas; }
