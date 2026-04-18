// ============================================================
// placement.js — Ghost preview + click-to-place
// ============================================================
import { BUILDINGS } from './registry.js';
import { Building } from './building.js';
import { getTile, MAP_SIZE } from '../world/map.js';
import { T } from '../world/tiles.js';
import { canAfford, spend, BUILDING_COSTS } from '../resources/resources.js';
import { events, EV } from '../engine/events.js';
import { camera } from '../engine/camera.js';

// All placed buildings: Map<id, Building>
export const placedBuildings = new Map();
// Occupied tile set: Set<"tx,ty">
const occupiedTiles = new Set();

let ghostType = null; // currently selected building type
let ghostTX = 0, ghostTY = 0;

const PLACEABLE = new Set([T.GRASS, T.DIRT, T.SCRUBLAND]);

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
  // Tier gate: tier 2 needs 1 completed settlement; tier 3 needs forge
  const def2 = BUILDINGS[type];
  if (def2.tier === 2) {
    const hasSettlement = [...placedBuildings.values()]
      .some(b => b.type === 'settlement' && b.state === 'complete');
    if (!hasSettlement) return false;
  }
  if (def2.tier === 3) {
    const hasForge = [...placedBuildings.values()]
      .some(b => b.type === 'forge' && b.state === 'complete');
    if (!hasForge) return false;
  }
  const cost = BUILDING_COSTS[type];
  if (cost && !canAfford(cost)) return false;
  return true;
}

export function startGhost(type) { ghostType = type; }
export function cancelGhost()    { ghostType = null; }
export function getGhostType()   { return ghostType; }

export function updateGhostPos(screenX, screenY) {
  const world = camera.screenToWorld(screenX, screenY);
  ghostTX = Math.floor(world.x / 32);
  ghostTY = Math.floor(world.y / 32);
}

export function placeBuilding() {
  if (!ghostType) return false;
  if (!isValidPlacement(ghostType, ghostTX, ghostTY)) return false;
  const cost = BUILDING_COSTS[ghostType];
  if (cost) spend(cost);
  const b = new Building(ghostType, ghostTX, ghostTY);
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

// Draw ghost + placed buildings onto ctx (world-space, already transformed)
export function renderBuildings(ctx) {
  const TILE = 32;

  // Placed buildings
  for (const b of placedBuildings.values()) {
    ctx.fillStyle = b.state === 'complete' ? 'rgba(160,100,40,0.85)' : 'rgba(100,140,200,0.7)';
    ctx.fillRect(b.tx * TILE, b.ty * TILE, b.w * TILE, b.h * TILE);
    ctx.strokeStyle = b.state === 'complete' ? '#8b5e20' : '#4a80c0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.tx * TILE, b.ty * TILE, b.w * TILE, b.h * TILE);
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(8, TILE * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = BUILDINGS[b.type]?.name ?? b.type;
    ctx.fillText(label, (b.tx + b.w / 2) * TILE, (b.ty + b.h / 2) * TILE);
  }

  // Ghost preview
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
