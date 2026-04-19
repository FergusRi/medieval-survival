// ============================================================
// placement.js — Ghost preview + click-to-place + 2.5D render
// ============================================================
import { BUILDINGS } from './registry.js';
import { Building } from './building.js';
import { getTile, MAP_SIZE } from '../world/map.js';
import { T } from '../world/tiles.js';
import { canAfford, spend, BUILDING_COSTS } from '../resources/resources.js';
import { events, EV } from '../engine/events.js';
import { camera } from '../engine/camera.js';
import { getBuildingSprite, SPRITE_EXTRA_ROWS_ABOVE } from '../sprites/building_sprites.js';
import { ROTATABLE_BUILDINGS } from './building.js';

// All placed buildings: Map<id, Building>
export const placedBuildings = new Map();
// Occupied tile set: Set<"tx,ty">
const occupiedTiles = new Set();

let ghostType = null; // currently selected building type
let ghostTX = 0, ghostTY = 0;
let ghostRotation = 0; // 0 = horizontal, 1 = vertical

export function cycleGhostRotation() {
  if (ghostType && ROTATABLE_BUILDINGS.has(ghostType)) {
    ghostRotation = ghostRotation === 0 ? 1 : 0;
  }
}
export function getGhostRotation() { return ghostRotation; }

const PLACEABLE = new Set([T.GRASS, T.DIRT, T.SCRUBLAND]);
const TILE = 32;

function tileKey(tx, ty) { return `${tx},${ty}`; }

function isValidPlacement(type, tx, ty) {
  const def = BUILDINGS[type];
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) {
      const fx = tx + dx, fy = ty + dy;
      if (fx < 0 || fy < 0 || fx >= MAP_SIZE || fy >= MAP_SIZE) return false;
      const id = getTile(fx, fy);
      if (!PLACEABLE.has(id)) return false;
      if (occupiedTiles.has(tileKey(fx, fy))) return false;
    }
  }
  // Tier gates
  const def2 = BUILDINGS[type];
  const completed = (t) => [...placedBuildings.values()].some(b => b.type === t && b.state === 'complete');
  if (def2.tier === 2) {
    if (!completed('settlement_hall') || !completed('forge')) return false;
  }
  if (def2.tier === 3) {
    if (!completed('town_hall') || !completed('mint')) return false;
  }
  const cost = BUILDING_COSTS[type];
  if (cost && !canAfford(cost)) return false;
  return true;
}

export function startGhost(type) { ghostType = type; ghostRotation = 0; }
export function cancelGhost()    { ghostType = null; ghostRotation = 0; }
export function getGhostType()   { return ghostType; }

export function updateGhostPos(screenX, screenY) {
  const world = camera.screenToWorld(screenX, screenY);
  ghostTX = Math.floor(world.x / TILE);
  ghostTY = Math.floor(world.y / TILE);
}

export function placeBuilding() {
  if (!ghostType) return false;
  if (!isValidPlacement(ghostType, ghostTX, ghostTY)) return false;
  const cost = BUILDING_COSTS[ghostType];
  if (cost) spend(cost);
  const b = new Building(ghostType, ghostTX, ghostTY, ghostRotation);
  placedBuildings.set(b.id, b);
  for (const { tx, ty } of b.footprintTiles) occupiedTiles.add(tileKey(tx, ty));
  events.emit(EV.BUILDING_PLACED, { building: b });
  events.emit(EV.TILE_PASSABILITY_CHANGED, { tiles: b.footprintTiles });
  if (b.state === 'complete') events.emit(EV.BUILDING_COMPLETED, { building: b });
  ghostType = null;
  return true;
}

export function handleBuildClick(screenX, screenY) {
  updateGhostPos(screenX, screenY);
  return placeBuilding();
}

/**
 * Draw a single building in 2.5D style.
 * The sprite is drawn taller than the tile footprint:
 *   - Bottom edge = (ty + h) * TILE  (front-face baseline, used for Y-sort)
 *   - Top edge    = ty * TILE - SPRITE_EXTRA_ROWS_ABOVE * TILE
 *   - Width       = w * TILE
 * This makes the roof appear to rise above the footprint naturally.
 */
export function drawBuilding(ctx, b) {
  const sprite = b.state === 'complete' ? getBuildingSprite(b.type) : null;
  const isRotated = b.rotation === 1; // vertical orientation

  // 2.5D dimensions (anchor at front-face baseline)
  const drawX = b.tx * TILE;
  const drawW = b.w  * TILE;
  const drawY = (b.ty - SPRITE_EXTRA_ROWS_ABOVE) * TILE;
  const drawH = (b.h  + SPRITE_EXTRA_ROWS_ABOVE) * TILE;

  if (sprite) {
    ctx.imageSmoothingEnabled = false;
    if (isRotated) {
      // Rotate 90° around the centre of the draw area
      const cx = drawX + drawW / 2;
      const cy = drawY + drawH / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    }
  } else {
    // Fallback: coloured rectangle for footprint
    const px = b.tx * TILE;
    const py = b.ty * TILE;
    const pw = b.w  * TILE;
    const ph = b.h  * TILE;
    ctx.fillStyle = b.state === 'complete' ? 'rgba(160,100,40,0.85)' : 'rgba(100,140,200,0.7)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = b.state === 'complete' ? '#8b5e20' : '#4a80c0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(8, TILE * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(BUILDINGS[b.type]?.name ?? b.type, px + pw / 2, py + ph / 2);
  }
}

/**
 * Get the Y-sort baseline for a building.
 * = world Y of the front-face bottom edge.
 */
export function buildingSortY(b) {
  return (b.ty + b.h) * TILE;
}

// renderBuildings is now only used for the ghost preview.
// Actual building sprites are rendered via the Y-sorted pass in init.js.
export function renderBuildings(ctx) {
  // Ghost preview only
  if (ghostType) {
    const def = BUILDINGS[ghostType];
    const valid = isValidPlacement(ghostType, ghostTX, ghostTY);
    ctx.fillStyle = valid ? 'rgba(0,220,80,0.35)' : 'rgba(220,40,40,0.35)';
    ctx.fillRect(ghostTX * TILE, ghostTY * TILE, def.w * TILE, def.h * TILE);
    ctx.strokeStyle = valid ? '#00cc44' : '#cc2020';
    ctx.lineWidth = 2;
    ctx.strokeRect(ghostTX * TILE, ghostTY * TILE, def.w * TILE, def.h * TILE);
  }
}
