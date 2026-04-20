// ============================================================
// placement.js — Ghost preview + click-to-place + 2.5D render
// ============================================================
import { BUILDINGS } from './registry.js';
import { Building, WALL_TYPES } from './building.js';
import { getTile, MAP_SIZE } from '../world/map.js';
import { T } from '../world/tiles.js';
import { canAfford, spend, BUILDING_COSTS } from '../resources/resources.js';
import { events, EV } from '../engine/events.js';
import { camera } from '../engine/camera.js';
import { drawBuildingSprite, SPRITE_EXTRA_ROWS_ABOVE } from '../sprites/building_sprites.js';
import { drawScaffold, drawRubble } from '../sprites/effect_sprites.js';

// All placed buildings: Map<id, Building>
export const placedBuildings = new Map();
// Floor tiles: Map<"tx,ty", { type, state }>  — floors don't block movement
export const floorMap = new Map();
// Occupied tile set: Set<"tx,ty">
const occupiedTiles = new Set();

let ghostType = null; // currently selected building type
let ghostTX = 0, ghostTY = 0;
let ghostRotation = 0; // 0 = horizontal, 1 = vertical

export function cycleGhostRotation() {
  // rotation reserved for future use — no building types currently use it
  ghostRotation = ghostRotation === 0 ? 1 : 0;
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
  const cost = BUILDING_COSTS[type];
  if (cost && !canAfford(cost)) return false;
  return true;
}

export function startGhost(type) { ghostType = type; ghostRotation = 0; }
export function cancelGhost()    { ghostType = null; ghostRotation = 0; }
export function getGhostType()   { return ghostType; }

/** Remove a building from the world (called on destruction). */
export function destroyBuilding(building) {
  if (!placedBuildings.has(building.id)) return;
  placedBuildings.delete(building.id);
  for (const { tx, ty } of building.footprintTiles) occupiedTiles.delete(tileKey(tx, ty));
  events.emit(EV.TILE_PASSABILITY_CHANGED, { tiles: building.footprintTiles });
}

export function updateGhostPos(screenX, screenY) {
  const world = camera.screenToWorld(screenX, screenY);
  ghostTX = Math.floor(world.x / TILE);
  ghostTY = Math.floor(world.y / TILE);
}

export function placeBuilding() {
  if (!ghostType) return false;
  if (!isValidPlacement(ghostType, ghostTX, ghostTY)) return false;
  const def = BUILDINGS[ghostType];
  const cost = BUILDING_COSTS[ghostType];
  if (cost) spend(cost);

  // ── Floor tiles go into floorMap, not placedBuildings ──────
  if (def.isFloor) {
    const key = tileKey(ghostTX, ghostTY);
    floorMap.set(key, { type: ghostType, state: 'complete' });
    ghostType = null;
    return true;
  }

  const b = new Building(ghostType, ghostTX, ghostTY, ghostRotation);
  placedBuildings.set(b.id, b);
  for (const { tx, ty } of b.footprintTiles) occupiedTiles.add(tileKey(tx, ty));
  events.emit(EV.BUILDING_PLACED, { building: b });
  events.emit(EV.TILE_PASSABILITY_CHANGED, { tiles: b.footprintTiles });
  if (b.state === 'complete') events.emit(EV.BUILDING_COMPLETED, { building: b });
  ghostType = null;
  return true;
}

/**
 * Returns a 4-bit NESW adjacency bitmask for wall-connecting buildings.
 * bit 3=N, bit 2=E, bit 1=S, bit 0=W
 */
export function getWallAdjacencyMask(b) {
  const { tx, ty } = b;
  let mask = 0;
  // North
  if (_wallAt(tx, ty - 1)) mask |= 0b1000;
  // East
  if (_wallAt(tx + 1, ty)) mask |= 0b0100;
  // South
  if (_wallAt(tx, ty + 1)) mask |= 0b0010;
  // West
  if (_wallAt(tx - 1, ty)) mask |= 0b0001;
  return mask;
}

function _wallAt(tx, ty) {
  for (const b of placedBuildings.values()) {
    if (b.tx === tx && b.ty === ty && WALL_TYPES.has(b.type)) return true;
  }
  return false;
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
/** Derive sprite state string from a building instance. */
function _spriteState(b) {
  if (b.state === 'rubble')    return 'rubble';
  if (b.state !== 'complete')  return 'blueprint';
  const pct = b.hp / b.maxHp;
  if (pct < 0.2) return 'critical';
  if (pct < 0.5) return 'damaged';
  return 'complete';
}

export function drawBuilding(ctx, b) {
  // 2.5D dimensions — visual area extends SPRITE_EXTRA_ROWS_ABOVE above footprint
  const drawX = b.tx * TILE;
  const drawW = b.w  * TILE;
  const drawY = (b.ty - SPRITE_EXTRA_ROWS_ABOVE) * TILE;
  const drawH = (b.h  + SPRITE_EXTRA_ROWS_ABOVE) * TILE;

  // Footprint pixel coords (for scaffold / rubble overlays)
  const fpX = b.tx * TILE;
  const fpY = b.ty * TILE;
  const fpW = b.w  * TILE;
  const fpH = b.h  * TILE;

  const spriteState = _spriteState(b);

  if (spriteState === 'rubble') {
    drawRubble(ctx, fpX, fpY, fpW, fpH);
    return;
  }

  // Rotate 90° for vertical-orientation buildings
  const isRotated = b.rotation === 1;
  const adjMask = WALL_TYPES.has(b.type) ? getWallAdjacencyMask(b) : null;
  if (isRotated) {
    const cx = drawX + drawW / 2;
    const cy = drawY + drawH / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 2);
    drawBuildingSprite(ctx, b.type, spriteState, -drawW / 2, -drawH / 2, drawW, drawH, b._aimAngle, adjMask);
    ctx.restore();
  } else {
    drawBuildingSprite(ctx, b.type, spriteState, drawX, drawY, drawW, drawH, b._aimAngle, adjMask);
  }

  // Scaffold overlay for blueprint / under-construction buildings
  if (b.state !== 'complete' && b.state !== 'rubble') {
    const progress = b.maxHp > 0 ? Math.max(0, 1 - b.hp / b.maxHp) : 0;
    drawScaffold(ctx, fpX, fpY, fpW, fpH, progress);
  }
}

/**
 * Draw damage flash overlay + HP bar for damaged complete buildings.
 * Called immediately after drawBuilding() in the Y-sorted pass.
 */
export function drawBuildingDamageOverlay(ctx, b, dt) {
  if (b.state !== 'complete') return;
  if (b.hp >= b.maxHp) return; // undamaged — skip

  const px = b.tx * TILE;
  const py = b.ty * TILE;
  const pw = b.w  * TILE;
  const ph = b.h  * TILE;

  // Tick down flash timer
  if (b._flashTimer > 0) {
    b._flashTimer -= dt / 1000;
    if (b._flashTimer > 0) {
      // Red flash overlay fading out
      const alpha = Math.min(0.55, b._flashTimer * 2.5);
      ctx.save();
      ctx.fillStyle = `rgba(255,60,30,${alpha})`;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();
    }
  }

  // HP bar above building
  const pct  = b.hp / b.maxHp;
  const barW = pw;
  const barH = 4;
  const bx   = px;
  const by   = py - barH - 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = pct > 0.6 ? '#2ecc71' : pct > 0.3 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(bx, by, barW * pct, barH);
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
