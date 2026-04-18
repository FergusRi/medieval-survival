// ============================================================
// minimap.js — HTML canvas minimap, top-right below top bar
// ============================================================
import { tileMap, MAP_SIZE } from '../world/map.js';
import { TILE_DEF } from '../world/tiles.js';
import { camera } from '../engine/camera.js';

const SIZE    = 150;  // displayed px
const PAD     = 10;
const TOP_BAR = 36;   // must match frame.js TOP_BAR_H

let mmCanvas = null;  // the HTML minimap canvas element
let mmCtx    = null;
let mapTex   = null;  // OffscreenCanvas with tile colours
let dirty    = true;
let fullscreen = false;

// Fullscreen overlay (still drawn on game canvas via drawMinimap)
let fsCanvas = null, fsCtx = null;

window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') {
    fullscreen = !fullscreen;
    mmCanvas.style.display = fullscreen ? 'none' : 'block';
    if (fsCanvas) fsCanvas.style.display = fullscreen ? 'block' : 'none';
  }
});

function buildTexture() {
  mapTex = new OffscreenCanvas(MAP_SIZE, MAP_SIZE);
  const tc   = mapTex.getContext('2d');
  const img  = tc.createImageData(MAP_SIZE, MAP_SIZE);
  const data = img.data;
  for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
    const def = TILE_DEF[tileMap[i]];
    const col = def ? def.colour : '#000000';
    data[i*4]   = parseInt(col.slice(1,3), 16);
    data[i*4+1] = parseInt(col.slice(3,5), 16);
    data[i*4+2] = parseInt(col.slice(5,7), 16);
    data[i*4+3] = 255;
  }
  tc.putImageData(img, 0, 0);
  dirty = false;
}

function drawViewport(ctx, mx, my, mw, mh) {
  const MAP_PX = MAP_SIZE * 32;
  const vx  = mx + (camera.x / MAP_PX) * mw;
  const vy  = my + (camera.y / MAP_PX) * mh;
  const vrw = (window.innerWidth  / camera.zoom / MAP_PX) * mw;
  const vrh = (window.innerHeight / camera.zoom / MAP_PX) * mh;
  ctx.strokeStyle = 'rgba(255,230,120,0.9)';
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(vx, vy, vrw, vrh);
}

function redrawCorner() {
  if (!mmCtx) return;
  mmCtx.imageSmoothingEnabled = false;
  // Border fill
  mmCtx.fillStyle = 'rgba(10,8,5,0.85)';
  mmCtx.fillRect(0, 0, SIZE + 6, SIZE + 6);
  mmCtx.drawImage(mapTex, 3, 3, SIZE, SIZE);
  drawViewport(mmCtx, 3, 3, SIZE, SIZE);
}

export function initMinimap() {
  if (dirty) buildTexture();

  // ── Corner canvas ─────────────────────────────────────────
  mmCanvas = document.createElement('canvas');
  mmCanvas.width  = SIZE + 6;
  mmCanvas.height = SIZE + 6;
  mmCanvas.style.cssText = `
    position: fixed;
    top: ${TOP_BAR + PAD}px;
    right: ${PAD}px;
    width: ${SIZE + 6}px;
    height: ${SIZE + 6}px;
    z-index: 410;
    border: 2px solid #7a5020;
    border-radius: 4px;
    cursor: pointer;
    image-rendering: pixelated;
  `;
  mmCtx = mmCanvas.getContext('2d');
  document.body.appendChild(mmCanvas);

  mmCanvas.title = 'Click or press M for fullscreen map';
  mmCanvas.addEventListener('click', () => {
    fullscreen = true;
    mmCanvas.style.display = 'none';
    if (fsCanvas) fsCanvas.style.display = 'block';
  });

  // ── Fullscreen canvas ─────────────────────────────────────
  fsCanvas = document.createElement('canvas');
  fsCanvas.style.cssText = `
    position: fixed; top:0; left:0; width:100%; height:100%;
    z-index:450; display:none; cursor:pointer;
    background:rgba(0,0,0,0.78);
  `;
  fsCanvas.addEventListener('click', () => {
    fullscreen = false;
    fsCanvas.style.display = 'none';
    mmCanvas.style.display = 'block';
  });
  document.body.appendChild(fsCanvas);
  fsCtx = fsCanvas.getContext('2d');

  redrawCorner();
}

// Called each frame from render loop to keep viewport rect live
export function drawMinimap() {
  if (dirty) { buildTexture(); }

  if (!fullscreen) {
    redrawCorner();
  } else {
    // Fullscreen
    const vw = window.innerWidth, vh = window.innerHeight;
    fsCanvas.width  = vw;
    fsCanvas.height = vh;
    fsCtx.imageSmoothingEnabled = false;
    fsCtx.fillStyle = 'rgba(0,0,0,0.78)';
    fsCtx.fillRect(0, 0, vw, vh);
    const scale = Math.min((vw - 60) / MAP_SIZE, (vh - 60) / MAP_SIZE);
    const mw = Math.floor(MAP_SIZE * scale);
    const mh = Math.floor(MAP_SIZE * scale);
    const mx = Math.floor((vw - mw) / 2);
    const my = Math.floor((vh - mh) / 2);
    fsCtx.drawImage(mapTex, mx, my, mw, mh);
    drawViewport(fsCtx, mx, my, mw, mh);
    fsCtx.fillStyle = 'rgba(255,255,255,0.5)';
    fsCtx.font = '12px monospace';
    fsCtx.fillText('[M] or click to close', mx + 4, my + mh + 16);
  }
}

export function markMinimapDirty() { dirty = true; }
