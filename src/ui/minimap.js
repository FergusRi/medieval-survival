// ============================================================
// minimap.js — Always-on corner minimap + M for fullscreen
// ============================================================
import { tileMap, MAP_SIZE } from '../world/map.js';
import { TILE_DEF } from '../world/tiles.js';
import { camera } from '../engine/camera.js';

let fullscreen = false;
let mapCanvas  = null;
let mapCtx     = null;
let dirty      = true;

const CORNER_SIZE = 160; // px — always-visible minimap
const CORNER_PAD  = 12;

window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') fullscreen = !fullscreen;
});

function buildTexture() {
  mapCanvas = new OffscreenCanvas(MAP_SIZE, MAP_SIZE);
  mapCtx    = mapCanvas.getContext('2d');
  const img  = mapCtx.createImageData(MAP_SIZE, MAP_SIZE);
  const data = img.data;
  for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
    const def    = TILE_DEF[tileMap[i]];
    const colour = def ? def.colour : '#000000';
    data[i*4]   = parseInt(colour.slice(1,3), 16);
    data[i*4+1] = parseInt(colour.slice(3,5), 16);
    data[i*4+2] = parseInt(colour.slice(5,7), 16);
    data[i*4+3] = 255;
  }
  mapCtx.putImageData(img, 0, 0);
  dirty = false;
}

function drawViewportRect(ctx, mx, my, mw, mh) {
  const MAP_PX = MAP_SIZE * 32;
  const vx  = mx + (camera.x / MAP_PX) * mw;
  const vy  = my + (camera.y / MAP_PX) * mh;
  const vrw = (window.innerWidth  / camera.zoom / MAP_PX) * mw;
  const vrh = (window.innerHeight / camera.zoom / MAP_PX) * mh;
  ctx.strokeStyle = 'rgba(255,230,120,0.9)';
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(vx, vy, vrw, vrh);
}

export function drawMinimap(ctx) {
  if (dirty) buildTexture();

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  if (fullscreen) {
    // ── Fullscreen overlay ──────────────────────────────────
    const scale = Math.min((vw - 60) / MAP_SIZE, (vh - 60) / MAP_SIZE);
    const mw = Math.floor(MAP_SIZE * scale);
    const mh = Math.floor(MAP_SIZE * scale);
    const mx = Math.floor((vw - mw) / 2);
    const my = Math.floor((vh - mh) / 2);

    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.drawImage(mapCanvas, mx, my, mw, mh);
    drawViewportRect(ctx, mx, my, mw, mh);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px monospace';
    ctx.fillText('[M] close', mx + 6, my + mh + 16);
  } else {
    // ── Corner minimap ──────────────────────────────────────
    const cs   = CORNER_SIZE;
    const mx   = vw - cs - CORNER_PAD;
    const my   = CORNER_PAD;

    // Parchment background
    ctx.fillStyle = 'rgba(10,8,5,0.82)';
    ctx.beginPath();
    ctx.roundRect(mx - 3, my - 3, cs + 6, cs + 6, 5);
    ctx.fill();
    ctx.strokeStyle = '#7a5020';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(mx - 3, my - 3, cs + 6, cs + 6, 5);
    ctx.stroke();

    ctx.drawImage(mapCanvas, mx, my, cs, cs);
    drawViewportRect(ctx, mx, my, cs, cs);

    // M hint
    ctx.fillStyle = 'rgba(200,180,130,0.6)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[M] map', mx + cs / 2, my + cs + 13);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

export function markMinimapDirty() { dirty = true; }
