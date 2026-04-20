// ============================================================
// resource_nodes.js — Harvestable resource node registry
// Flood-fills map tiles into cluster nodes on init.
// FOREST tiles → wood nodes, STONE tiles → stone nodes.
// ============================================================

import { getTile, MAP_SIZE } from './map.js';
import { T } from './tiles.js';

const MIN_CLUSTER_SIZE   = 4;   // ignore tiny noise clusters
const MAX_WORKERS_WOOD   = 2;
const MAX_WORKERS_STONE  = 1;
const WOOD_POOL          = 500;
const STONE_POOL         = 300;

// ── Node registry ─────────────────────────────────────────────
const _nodes = [];   // { id, type, cx, cy, amount, maxAmount, workersActive }
let   _nextId = 1;

export function getNodes() { return _nodes; }

// ── Init ──────────────────────────────────────────────────────
export function initResourceNodes() {
  _nodes.length = 0;
  _nextId = 1;

  const visited = new Uint8Array(MAP_SIZE * MAP_SIZE);

  for (let ty = 0; ty < MAP_SIZE; ty++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const idx = ty * MAP_SIZE + tx;
      if (visited[idx]) continue;

      const tile = getTile(tx, ty);
      if (tile !== T.FOREST && tile !== T.STONE) continue;

      // Flood-fill this cluster
      const type   = tile === T.FOREST ? 'wood' : 'stone';
      const queue  = [[tx, ty]];
      const cells  = [];
      visited[idx] = 1;

      while (queue.length) {
        const [cx, cy] = queue.pop();
        cells.push([cx, cy]);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) continue;
          const ni = ny * MAP_SIZE + nx;
          if (visited[ni]) continue;
          if (getTile(nx, ny) !== tile) continue;
          visited[ni] = 1;
          queue.push([nx, ny]);
        }
      }

      if (cells.length < MIN_CLUSTER_SIZE) continue;

      // Centroid in world px
      const sumX = cells.reduce((s, [x]) => s + x, 0);
      const sumY = cells.reduce((s, [, y]) => s + y, 0);
      const cx   = (sumX / cells.length + 0.5) * 32;
      const cy   = (sumY / cells.length + 0.5) * 32;

      const maxAmount = type === 'wood' ? WOOD_POOL : STONE_POOL;
      _nodes.push({ id: _nextId++, type, cx, cy, amount: maxAmount, maxAmount, workersActive: 0 });
    }
  }

  console.log(`[ResourceNodes] ${_nodes.filter(n=>n.type==='wood').length} wood clusters, ${_nodes.filter(n=>n.type==='stone').length} stone clusters`);
}

// ── Helpers ───────────────────────────────────────────────────
function _maxWorkers(node) {
  return node.type === 'wood' ? MAX_WORKERS_WOOD : MAX_WORKERS_STONE;
}

/** Returns nearest available (non-full, non-empty) node of given type within maxDist px. */
export function getNearestNode(x, y, type, maxDist = Infinity) {
  let best = null, bestDist = maxDist;
  for (const n of _nodes) {
    if (n.type !== type) continue;
    if (n.amount <= 0) continue;
    if (n.workersActive >= _maxWorkers(n)) continue;
    const d = Math.hypot(n.cx - x, n.cy - y);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

/** Claim a node slot. Returns false if full. */
export function claimNode(node) {
  if (!node) return false;
  if (node.workersActive >= _maxWorkers(node)) return false;
  node.workersActive++;
  return true;
}

/** Release a node slot. */
export function releaseNode(node) {
  if (!node) return;
  node.workersActive = Math.max(0, node.workersActive - 1);
}

/**
 * Synchronously deduct `amount` from node on harvest completion.
 * Returns actual amount harvested (may be less if node nearly empty).
 */
export function checkAndHarvest(node, amount) {
  if (!node || node.amount <= 0) return 0;
  const actual = Math.min(node.amount, amount);
  node.amount -= actual;
  return actual;
}
