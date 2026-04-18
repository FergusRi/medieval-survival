// ============================================================
// input.js — Keyboard, mouse, and wheel input handling
// ============================================================

import { camera } from './camera.js';

// ---- Keyboard state -----------------------------------------
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// ---- Click + drag pan ---------------------------------------
let dragging  = false;
let dragStart = { x: 0, y: 0 };
let camStart  = { x: 0, y: 0 };
let dragMoved = false; // true if mouse moved >4px — distinguishes drag from click

const canvas = document.getElementById('game');

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return; // left button only
  dragging  = true;
  dragMoved = false;
  dragStart = { x: e.clientX, y: e.clientY };
  camStart  = { x: camera.x,  y: camera.y  };
});

canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
  camera.x = camStart.x - dx / camera.zoom;
  camera.y = camStart.y - dy / camera.zoom;
});

canvas.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  dragging = false;
});

canvas.addEventListener('mouseleave', () => { dragging = false; });

// ---- Zoom (scroll wheel) ------------------------------------
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  // Zoom toward the mouse cursor position
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const worldBefore = camera.screenToWorld(mx, my);

  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  camera.zoom = Math.min(camera.maxZoom, Math.max(camera.minZoom, camera.zoom * factor));

  // Adjust camera so the world point under the cursor stays fixed
  const worldAfter = camera.screenToWorld(mx, my);
  camera.x -= worldAfter.x - worldBefore.x;
  camera.y -= worldAfter.y - worldBefore.y;
}, { passive: false });

// ---- WASD / arrow key pan (call from update loop) -----------
const PAN_SPEED = 400; // CSS px/s at zoom 1.0

export function handleKeyPan(dt) {
  const speed = PAN_SPEED / camera.zoom * (dt / 1000);
  if (keys['w'] || keys['ArrowUp'])    camera.y -= speed;
  if (keys['s'] || keys['ArrowDown'])  camera.y += speed;
  if (keys['a'] || keys['ArrowLeft'])  camera.x -= speed;
  if (keys['d'] || keys['ArrowRight']) camera.x += speed;
}

// ---- Click dispatch -----------------------------------------
// Listeners registered with onTileClick receive { tx, ty, sx, sy }
const clickListeners = [];

export function onTileClick(fn) { clickListeners.push(fn); }

canvas.addEventListener('click', e => {
  if (dragMoved) return; // was a drag, not a click
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { tx, ty } = camera.screenToTile(sx, sy);
  clickListeners.forEach(fn => fn({ tx, ty, sx, sy }));
});

// ---- Hover state --------------------------------------------
export const hover = { tx: -1, ty: -1, sx: 0, sy: 0 };

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  hover.sx = e.clientX - rect.left;
  hover.sy = e.clientY - rect.top;
  const t = camera.screenToTile(hover.sx, hover.sy);
  hover.tx = t.tx;
  hover.ty = t.ty;
});

// ---- Right-click context (prevent default menu) -------------
canvas.addEventListener('contextmenu', e => e.preventDefault());
