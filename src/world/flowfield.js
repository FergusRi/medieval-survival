import { MAP_SIZE, isWalkable } from '../world/map.js';
import { events, EV } from '../engine/events.js';
import { placedBuildings } from '../buildings/placement.js';

const MAP_W = MAP_SIZE;
const MAP_H = MAP_SIZE;

// Int8Array(MAP_W * MAP_H * 2): [dirX, dirY] per tile
// dirX/dirY values: -1, 0, 1
export const flowField = new Int8Array(MAP_W * MAP_H * 2);

// Rebuild via generator (chunked BFS) to avoid main-thread stall
function* buildFlowField(goals) {
  // goals = array of {tx, ty} for all Settlements + Capital
  const queue = [...goals];
  const visited = new Uint8Array(MAP_W * MAP_H);
  const CHUNK = 500;
  let processed = 0;

  // Mark goals as visited, direction = {0,0}
  for (const g of goals) {
    const gi = g.ty * MAP_W + g.tx;
    visited[gi] = 1;
    flowField[gi * 2]     = 0;
    flowField[gi * 2 + 1] = 0;
  }

  while (queue.length) {
    const { tx, ty } = queue.shift();
    const neighbours = [
      [tx - 1, ty],     [tx + 1, ty],
      [tx,     ty - 1], [tx,     ty + 1],
      [tx - 1, ty - 1], [tx + 1, ty - 1],
      [tx - 1, ty + 1], [tx + 1, ty + 1],
    ];
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const ni = ny * MAP_W + nx;
      if (visited[ni] || !isWalkable(nx, ny)) continue;
      visited[ni] = 1;
      // Direction points FROM this neighbour TOWARD its parent (toward goal)
      flowField[ni * 2]     = Math.sign(tx - nx);
      flowField[ni * 2 + 1] = Math.sign(ty - ny);
      queue.push({ tx: nx, ty: ny });
    }
    if (++processed % CHUNK === 0) yield; // yield control back to main thread
  }
}

// Active generator reference
let _rebuilder = null;

/** Collect all settlement/capital goal tiles and schedule a rebuild. */
function _collectGoals() {
  const goals = [];
  for (const b of placedBuildings.values()) {
    if (b.state !== 'complete') continue;
    if (b.type === 'settlement' || b.type === 'capital') {
      // Use centre tile of the building footprint
      const cx = Math.floor(b.tx + b.w / 2);
      const cy = Math.floor(b.ty + b.h / 2);
      goals.push({ tx: cx, ty: cy });
    }
  }
  return goals;
}

export function scheduleRebuild(goalsOverride) {
  const goals = goalsOverride ?? _collectGoals();
  if (goals.length === 0) return; // nothing to navigate toward yet
  _rebuilder = buildFlowField(goals);
}

/** Advance the in-progress BFS by one chunk. Call once per game-loop tick. */
export function tickFlowField() {
  if (_rebuilder) {
    const { done } = _rebuilder.next();
    if (done) _rebuilder = null;
  }
}

/**
 * Sample the flow field at tile (tx, ty).
 * Returns {dx, dy} unit direction toward nearest settlement, or {dx:0,dy:0}
 * if the tile is unreachable / off-map.
 */
export function sampleFlowField(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return { dx: 0, dy: 0 };
  const i = (ty * MAP_W + tx) * 2;
  return { dx: flowField[i], dy: flowField[i + 1] };
}

// ── Event listeners ──────────────────────────────────────────────────────────

events.on(EV.TILE_PASSABILITY_CHANGED, () => {
  scheduleRebuild();
});

events.on(EV.BUILDING_DESTROYED, () => {
  scheduleRebuild();
});

// When a settlement or capital finishes building, rebuild so enemies can path
events.on(EV.BUILDING_COMPLETED, ({ building }) => {
  if (building.type === 'settlement' || building.type === 'capital') {
    scheduleRebuild();
  }
});
