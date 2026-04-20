// ============================================================
// resource_nodes.js — Harvestable resource node registry
// Driven by the decorations[] array from map.js.
// tree decorations → wood nodes, rock decorations → stone nodes.
// ============================================================

import { decorations, TILE_SIZE } from './map.js';

const MAX_WORKERS_WOOD  = 2;
const MAX_WORKERS_ROCK  = 1;
const WOOD_PER_NODE     = 80;   // wood per individual tree
const STONE_PER_NODE    = 50;   // stone per individual rock

// ── Node registry ─────────────────────────────────────────────
// { id, type, tx, ty, cx, cy, amount, maxAmount, workersActive, depleted }
const _nodes = [];
let   _nextId = 1;

export function getNodes() { return _nodes; }

// ── Init ──────────────────────────────────────────────────────
export function initResourceNodes() {
  _nodes.length = 0;
  _nextId = 1;

  for (const d of decorations) {
    const type = d.type === 'tree' ? 'wood' : 'stone';
    const maxAmount = type === 'wood' ? WOOD_PER_NODE : STONE_PER_NODE;
    _nodes.push({
      id: _nextId++,
      type,
      tx: d.tx,
      ty: d.ty,
      cx: (d.tx + 0.5) * TILE_SIZE,
      cy: (d.ty + 0.5) * TILE_SIZE,
      amount: maxAmount,
      maxAmount,
      workersActive: 0,
      depleted: false,
    });
  }

  const wood  = _nodes.filter(n => n.type === 'wood').length;
  const stone = _nodes.filter(n => n.type === 'stone').length;
  console.log(`[ResourceNodes] ${wood} tree nodes, ${stone} rock nodes`);
}

// ── Helpers ───────────────────────────────────────────────────
function _maxWorkers(node) {
  return node.type === 'wood' ? MAX_WORKERS_WOOD : MAX_WORKERS_ROCK;
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
 * Deduct amount from node on harvest completion.
 * Marks node depleted when empty (decoration disappears from render).
 * Returns actual amount harvested.
 */
export function checkAndHarvest(node, amount) {
  if (!node || node.amount <= 0) return 0;
  const actual = Math.min(node.amount, amount);
  node.amount -= actual;
  if (node.amount <= 0) node.depleted = true;
  return actual;
}

/** Quick lookup: is there a non-depleted node at tile (tx, ty)? */
export function getNodeAt(tx, ty) {
  return _nodes.find(n => n.tx === tx && n.ty === ty && !n.depleted) ?? null;
}
