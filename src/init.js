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
import {
  preloadSprites, getTileSprite, getTreeSprite, PINE_TILES
} from './sprites/tile_sprites.js';

// ---- Deterministic per-tile RNG ------------------------------
function tileHash(tx, ty) {
  let h = (MAP_SEED ^ (tx * 2246822519) ^ (ty * 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function tileFrac(tx, ty)    { return tileHash(tx, ty)               / 0xFFFFFFFF; }
function overlayFrac(tx, ty) { return tileHash(tx + 9999, ty + 7777) / 0xFFFFFFFF; }

// Tuft spawn rates — sparse, like rocks
const GRASS_TUFT_RATE  = 0.08;
const SAND_TUFT_RATE   = 0.05;

// Tree density
const PINE_DENSITY = 0.35;

// Mountain tile IDs (interior + edge)
const MOUNTAIN_TILES = new Set([T.MOUNTAIN, T.MOUNTAIN_STONE]);

// Returns true if this tile is a mountain edge:
// it is a MOUNTAIN tile AND has at least one non-mountain neighbour
function isMountainEdge(tx, ty) {
  if (!MOUNTAIN_TILES.has(getTile(tx, ty))) return false;
  const neighbours = [
    getTile(tx - 1, ty),
    getTile(tx + 1, ty),
    getTile(tx,     ty - 1),
    getTile(tx,     ty + 1),
  ];
  return neighbours.some(id => !MOUNTAIN_TILES.has(id));
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

  const topLeft     = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(window.innerWidth, window.innerHeight);

  const tx0 = Math.max(0,        Math.floor(topLeft.x     / TILE_SIZE));
  const ty0 = Math.max(0,        Math.floor(topLeft.y     / TILE_SIZE));
  const tx1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.x / TILE_SIZE));
  const ty1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.y / TILE_SIZE));

  // Pre-fetch sprites used in the loop
  const grassSprite        = getTileSprite(T.GRASS);
  const stoneSprite        = getTileSprite(T.STONE);
  const mountainStoneSprite = getTileSprite(T.MOUNTAIN_STONE);

  // ── Pass 1: Ground tiles ─────────────────────────────────
  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id  = getTile(tx, ty);
      const def = TILE_DEF[id];
      const px  = tx * TILE_SIZE;
      const py  = ty * TILE_SIZE;

      // STONE scatter: grass base + stone sprite on top
      if (id === T.STONE) {
        if (grassSprite) {
          ctx.drawImage(grassSprite, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = TILE_DEF[T.GRASS].colour;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        if (stoneSprite) ctx.drawImage(stoneSprite, px, py, TILE_SIZE, TILE_SIZE);
        continue;
      }

      // MOUNTAIN tiles — edge gets stone sprite, interior gets flat grey
      if (MOUNTAIN_TILES.has(id)) {
        if (isMountainEdge(tx, ty)) {
          // Edge: draw stone sprite (solid, no transparency issues)
          if (mountainStoneSprite) {
            ctx.drawImage(mountainStoneSprite, px, py, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.fillStyle = TILE_DEF[T.MOUNTAIN_STONE].colour;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else {
          // Interior: flat grey fill
          ctx.fillStyle = TILE_DEF[T.MOUNTAIN].colour;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      // Grass / plains / sand: flat colour base, sparse tuft on top
      if (id === T.GRASS || id === T.SAND) {
        ctx.fillStyle = def.colour;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        const rate = id === T.GRASS ? GRASS_TUFT_RATE : SAND_TUFT_RATE;
        if (overlayFrac(tx, ty) < rate) {
          const tuft = getTileSprite(id);
          if (tuft) ctx.drawImage(tuft, px, py, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      // All other tiles
      const sprite = getTileSprite(id);
      if (sprite) {
        ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = def ? def.colour : '#000';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Grid lines at zoom >= 0.8
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
  const pineSprite = getTreeSprite('pine');
  const treeStartY = Math.max(0, ty0 - 1);

  for (let ty = treeStartY; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id = getTile(tx, ty);
      if (!PINE_TILES.has(id)) continue;
      if (tileFrac(tx, ty) >= PINE_DENSITY) continue;

      const px = tx * TILE_SIZE;
      const py = (ty - 1) * TILE_SIZE;

      if (pineSprite) {
        ctx.drawImage(pineSprite, px, py, TILE_SIZE, TILE_SIZE * 2);
      } else {
        ctx.fillStyle = '#2d5a1b';
        ctx.fillRect(px, py + 4, TILE_SIZE, TILE_SIZE * 2 - 4);
      }
    }
  }

  endFrame();
  drawMinimap(getCtx());
}

// ---- Start ---------------------------------------------------
async function start() {
  initRenderer();
  initInput();
  generateMap();
  await preloadSprites();
  startLoop(update, render);
  console.log('[Medieval Survival] Phase 5 — solid tiles + mountain edge logic online');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export { events, EV, camera };
