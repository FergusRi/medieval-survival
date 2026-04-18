// ============================================================
// init.js — Game bootstrap entry point (Phase 5)
// ============================================================

import { startLoop } from './engine/loop.js';
import { events, EV } from './engine/events.js';
import { initRenderer, beginFrame, endFrame, getCtx } from './engine/renderer.js';
import { initInput, handleKeyPan } from './engine/input.js';
import { camera } from './engine/camera.js';
import { generateMap, getTile, MAP_SIZE, TILE_SIZE, MAP_PX, MAP_SEED } from './world/map.js';
import { drawMinimap } from './ui/minimap.js';
import { T, TILE_DEF } from './world/tiles.js';
import { preloadSprites, getTileSprite, getTreeSprite, PINE_TILES } from './sprites/tile_sprites.js';

// ---- Sparse tree RNG ------------------------------------------
// Deterministic per-tile hash — same seed → same tree pattern
function tileHash(tx, ty) {
  let h = MAP_SEED ^ (tx * 2246822519) ^ (ty * 3266489917);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

// Returns 0.0–1.0 pseudo-random float for this tile
function tileFrac(tx, ty) { return tileHash(tx, ty) / 0xFFFFFFFF; }

// ~35% of FOREST/JUNGLE tiles get a tree
const TREE_DENSITY = 0.35;

function shouldSpawnTree(tx, ty) {
  return tileFrac(tx, ty) < TREE_DENSITY;
}

// ---- Update ---------------------------------------------------
function update(dt) {
  handleKeyPan(dt);
  camera.clamp(MAP_PX, MAP_PX);
}

// ---- Render ---------------------------------------------------
function render() {
  beginFrame();
  const ctx = getCtx();

  // Viewport tile bounds
  const topLeft     = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(window.innerWidth, window.innerHeight);

  const tx0 = Math.max(0,        Math.floor(topLeft.x     / TILE_SIZE));
  const ty0 = Math.max(0,        Math.floor(topLeft.y     / TILE_SIZE));
  const tx1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.x / TILE_SIZE));
  const ty1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.y / TILE_SIZE));

  // ── Pass 1: Ground tiles ──────────────────────────────────
  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id     = getTile(tx, ty);
      const def    = TILE_DEF[id];
      const sprite = getTileSprite(id);
      const px     = tx * TILE_SIZE;
      const py     = ty * TILE_SIZE;

      if (sprite) {
        ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = def ? def.colour : '#000';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Thin grid lines at zoom >= 0.8
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

  // ── Pass 2: Trees — Y-sorted (painter's algorithm) ───────
  // Iterate top→bottom so lower trees overdraw upper trees naturally
  const pineSprite = getTreeSprite('pine');

  // Extend viewport upward by 1 tile so trees rooted 1 row above
  // still draw their canopy into the visible area
  const treeStartY = Math.max(0, ty0 - 1);

  for (let ty = treeStartY; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id = getTile(tx, ty);
      if (!PINE_TILES.has(id)) continue;
      if (!shouldSpawnTree(tx, ty)) continue;

      // Tree base sits at bottom of tile; canopy extends 1 tile upward
      const px = tx * TILE_SIZE;
      const py = (ty - 1) * TILE_SIZE; // top of 32×64 sprite

      if (pineSprite) {
        ctx.drawImage(pineSprite, px, py, TILE_SIZE, TILE_SIZE * 2);
      } else {
        // Fallback: dark green rectangle
        ctx.fillStyle = '#2d5a1b';
        ctx.fillRect(px, py + 4, TILE_SIZE, TILE_SIZE * 2 - 4);
      }
    }
  }

  endFrame();

  // Minimap overlay (screen-space, no camera transform)
  drawMinimap(getCtx());
}

// ---- Start -------------------------------------------------
async function start() {
  initRenderer();
  initInput();
  generateMap();
  await preloadSprites();
  startLoop(update, render);
  console.log('[Medieval Survival] Phase 5 — sparse trees online');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export { events, EV, camera };
