// ============================================================
// init.js — Game bootstrap entry point
// ============================================================

import { startLoop } from './engine/loop.js';
import { events, EV } from './engine/events.js';

// ---- Placeholder update / render --------------------------------
// These will be filled in by subsequent phases.
// For now they simply keep the loop alive with a black canvas.

let ctx = null;

function update(dt) {
  // dt = milliseconds since last frame (capped at 100ms)
  // Subsequent phases will register their update logic here
}

function render() {
  if (!ctx) return;
  const w = ctx.canvas.width  / (window.devicePixelRatio || 1);
  const h = ctx.canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  // Subsequent phases will add draw calls here
}

// ---- Canvas bootstrap ------------------------------------------
function initCanvas() {
  const canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  window.addEventListener('resize', resize);
  resize();
  return ctx;
}

// ---- Start -------------------------------------------------
function start() {
  ctx = initCanvas();
  startLoop(update, render);
  console.log('[Medieval Survival] Game loop started');
}

// Wait for DOM then boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

// Export for debugging in console
export { events, EV };
