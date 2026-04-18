// ============================================================
// minimap.js — Press M to toggle full-map overlay
// ============================================================

import { tileMap, MAP_SIZE } from '../world/map.js';
import { TILE_DEF } from '../world/tiles.js';
import { camera } from '../engine/camera.js';

let visible = false;
let mapCanvas = null;
let mapCtx    = null;
let dirty     = true; // rebuild texture on first show

const MINIMAP_MAX = 900; // max px for the overlay (fits any screen)

// ---- Toggle with M ------------------------------------------
window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') { visible = !visible; }
});

// ---- Pre-render map to an OffscreenCanvas -------------------
function buildTexture() {
  const size = MAP_SIZE; // 1px per tile
  mapCanvas        = new OffscreenCanvas(size, size);
  mapCtx           = mapCanvas.getContext('2d');
  const img        = mapCtx.createImageData(size, size);
  const data       = img.data;

  for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
    const tileId = tileMap[i];
    const def    = TILE_DEF[tileId];
    const colour = def ? def.colour : '#000000';
    const r = parseInt(colour.slice(1,3), 16);
    const g = parseInt(colour.slice(3,5), 16);
    const b = parseInt(colour.slice(5,7), 16);
    data[i*4]   = r;
    data[i*4+1] = g;
    data[i*4+2] = b;
    data[i*4+3] = 255;
  }
  mapCtx.putImageData(img, 0, 0);
  dirty = false;
}

// ---- Draw overlay onto main canvas --------------------------
export function drawMinimap(ctx) {
  if (!visible) return;

  if (dirty) buildTexture();

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Scale to fit screen with padding
  const scale = Math.min((vw - 60) / MAP_SIZE, (vh - 60) / MAP_SIZE);
  const mw = Math.floor(MAP_SIZE * scale);
  const mh = Math.floor(MAP_SIZE * scale);
  const mx = Math.floor((vw - mw) / 2);
  const my = Math.floor((vh - mh) / 2);

  // Dim background
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, vw, vh);

  // Map image
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapCanvas, mx, my, mw, mh);

  // Viewport indicator
  const TILE = 32;
  const MAP_PX = MAP_SIZE * TILE;
  const vx = mx + (camera.x / MAP_PX) * mw;
  const vy = my + (camera.y / MAP_PX) * mh;
  const vrw = (window.innerWidth  / camera.zoom / MAP_PX) * mw;
  const vrh = (window.innerHeight / camera.zoom / MAP_PX) * mh;

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth   = 2;
  ctx.strokeRect(vx, vy, vrw, vrh);

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font      = '13px monospace';
  ctx.fillText('M — close map', mx + 6, my + mh + 18);
}

export function markMinimapDirty() { dirty = true; }
