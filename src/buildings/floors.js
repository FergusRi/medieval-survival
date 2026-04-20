// floors.js — Floor tile rendering (Phase 2)
// Floors are stored in floorMap (placement.js) keyed by "tx,ty".
// They render BETWEEN ground tiles and the Y-sorted pass — flat on the ground.
// ============================================================

import { floorMap } from './placement.js';
import { TILE_SIZE } from '../world/map.js';

// Floor visual definitions
const FLOOR_DEFS = {
  floor_dirt: {
    fill:   '#8B6914',
    stroke: '#6B4A0A',
    label:  'Dirt Floor',
  },
  floor_wood: {
    fill:   '#C8963C',
    stroke: '#8B5E1E',
    label:  'Wood Floor',
  },
  floor_stone: {
    fill:   '#9A9888',
    stroke: '#6A6858',
    label:  'Stone Floor',
  },
};

/**
 * Render all placed floor tiles.
 * Call this AFTER drawing ground tiles but BEFORE the Y-sorted draw pass.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} camera  — { x, y } world-space offset
 * @param {number} tx0, ty0, tx1, ty1 — visible tile range (for culling)
 */
export function renderFloors(ctx, _camera, tx0, ty0, tx1, ty1) {
  if (floorMap.size === 0) return;

  // Camera transform already applied by beginFrame — draw in world space directly.
  for (const [key, tile] of floorMap) {
    const [txStr, tyStr] = key.split(',');
    const tx = parseInt(txStr, 10);
    const ty = parseInt(tyStr, 10);

    // Cull tiles outside viewport
    if (tx < tx0 || tx > tx1 || ty < ty0 || ty > ty1) continue;

    const def = FLOOR_DEFS[tile.type];
    if (!def) continue;

    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;

    // Base fill
    ctx.fillStyle = def.fill;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    // Subtle edge lines
    ctx.strokeStyle = def.stroke;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px + 0.25, py + 0.25, TILE_SIZE - 0.5, TILE_SIZE - 0.5);

    // Wood floor: plank lines
    if (tile.type === 'floor_wood') {
      ctx.strokeStyle = '#8B5E1E';
      ctx.lineWidth = 0.4;
      const mid = py + TILE_SIZE / 2;
      ctx.beginPath(); ctx.moveTo(px, mid); ctx.lineTo(px + TILE_SIZE, mid); ctx.stroke();
    }

    // Stone floor: mortar grid
    if (tile.type === 'floor_stone') {
      ctx.strokeStyle = '#6A6858';
      ctx.lineWidth = 0.4;
      const mx = px + TILE_SIZE / 2;
      const my = py + TILE_SIZE / 2;
      ctx.beginPath(); ctx.moveTo(mx, py); ctx.lineTo(mx, py + TILE_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, my); ctx.lineTo(px + TILE_SIZE, my); ctx.stroke();
    }

    // Blueprint tint for under-construction floors
    if (tile.state === 'blueprint') {
      ctx.fillStyle = 'rgba(100, 160, 255, 0.35)';
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  }
}
