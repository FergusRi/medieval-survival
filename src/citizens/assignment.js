// ============================================================
// assignment.js — Citizen Task Assignment (Phase 12)
// Auto-assigns idle citizens to staffable buildings using a
// scoring system. Also handles drag-assign from UI.
//
// Scoring priority (higher = better):
//   1. Unstaffed production buildings (lumber, quarry, forge…)
//   2. Buildings with open staff slots
//   3. Proximity (closer = better)
//
// Emits: EV.CITIZEN_ASSIGNED { citizen, target, taskType }
// Listens: EV.BUILDING_COMPLETED, EV.CITIZEN_SPAWNED
// ============================================================

import { events, EV } from '../engine/events.js';
import { citizens } from './citizen.js';
import { placedBuildings } from '../buildings/placement.js';
import { spatialGrid } from '../world/spatial.js';

const TILE = 32;

// Buildings that produce resources when staffed
const PRODUCTION_BUILDINGS = new Set([
  'lumber_camp', 'pit_mine', 'forge', 'market', 'herbalist', 'watchtower',
]);

// Max staff slots per building type (mirrors registry)
const STAFF_SLOTS = {
  lumber_camp:  1,
  pit_mine:     1,
  forge:        1,
  market:       1,
  herbalist:    1,
  church:       1,
  barracks:     4,
  watchtower:   1,
  farm_plot:    1,
};

// Buildings that trigger gather tasks instead of staffing
const GATHER_BUILDINGS = new Map([
  ['lumber_camp', 'wood'],
  ['pit_mine',    'stone'],
]);

// ── Assignment state ─────────────────────────────────────────
// Maps building id → Set of assigned citizen ids
const _buildingStaff = new Map();

export function getStaff(buildingId) {
  return _buildingStaff.get(buildingId) || new Set();
}

export function staffCount(buildingId) {
  return getStaff(buildingId).size;
}

export function maxStaff(buildingType) {
  return STAFF_SLOTS[buildingType] ?? 0;
}

function hasOpenSlot(building) {
  return staffCount(building.id) < maxStaff(building.type);
}

// ── Assign a citizen to a building ───────────────────────────
export function assignCitizen(citizen, building, taskType = 'STAFFING') {
  // Remove from previous assignment
  unassignCitizen(citizen);

  if (!_buildingStaff.has(building.id)) {
    _buildingStaff.set(building.id, new Set());
  }
  _buildingStaff.get(building.id).add(citizen.id);
  citizen._assignment = { buildingId: building.id, taskType };

  // Gather buildings emit a specialised task event
  const gatherType = GATHER_BUILDINGS.get(building.type);
  if (gatherType) {
    events.emit(EV.CITIZEN_ASSIGNED, { citizen, target: building, taskType: 'gather', task: 'gather', gatherType });
  } else {
    events.emit(EV.CITIZEN_ASSIGNED, { citizen, target: building, taskType });
  }
}

export function unassignCitizen(citizen) {
  if (!citizen._assignment) return;
  const { buildingId } = citizen._assignment;
  const staff = _buildingStaff.get(buildingId);
  if (staff) staff.delete(citizen.id);
  citizen._assignment = null;
}

// ── Scoring ──────────────────────────────────────────────────
function scoreBuilding(building, citizen) {
  if (building.state !== 'built') return -Infinity;
  if (!hasOpenSlot(building)) return -Infinity;

  let score = 0;

  // Production buildings are higher priority
  if (PRODUCTION_BUILDINGS.has(building.type)) score += 100;

  // Prefer less-staffed buildings
  score += (maxStaff(building.type) - staffCount(building.id)) * 20;

  // Proximity bonus (closer = higher score)
  const bx = building.tx * TILE + (building.w * TILE) / 2;
  const by = building.ty * TILE + (building.h * TILE) / 2;
  const dist = Math.hypot(bx - citizen.x, by - citizen.y);
  score -= dist * 0.01;

  return score;
}

// ── Auto-assign one idle citizen ─────────────────────────────
function tryAutoAssign(citizen) {
  if (citizen.state !== 'IDLE') return;
  if (citizen._assignment) return;

  let bestBuilding = null, bestScore = -Infinity;

  for (const building of placedBuildings.values()) {
    if (!STAFF_SLOTS[building.type]) continue;
    const s = scoreBuilding(building, citizen);
    if (s > bestScore) { bestScore = s; bestBuilding = building; }
  }

  if (bestBuilding) {
    assignCitizen(citizen, bestBuilding, 'STAFFING');
  }
}

// ── Run auto-assignment pass (call periodically, not every frame) ─
let _assignTimer = 0;
const ASSIGN_INTERVAL = 3000; // ms — re-evaluate every 3s

export function updateAssignments(dt) {
  _assignTimer -= dt;
  if (_assignTimer > 0) return;
  _assignTimer = ASSIGN_INTERVAL + Math.random() * 1000;

  for (const citizen of citizens) {
    tryAutoAssign(citizen);
  }

  // Clean up stale assignments (building destroyed / completed)
  for (const [buildingId, staff] of _buildingStaff) {
    if (!placedBuildings.has(buildingId)) {
      // Building gone — free all assigned citizens
      for (const citizenId of staff) {
        const c = citizens.find(c => c.id === citizenId);
        if (c) c._assignment = null;
      }
      _buildingStaff.delete(buildingId);
    }
  }
}

// ── React to new buildings / citizens ────────────────────────
events.on(EV.BUILDING_COMPLETED, ({ building }) => {
  // Immediately try to staff the new building
  if (!STAFF_SLOTS[building.type]) return;
  for (const citizen of citizens) {
    if (citizen.state === 'IDLE' && !citizen._assignment) {
      if (hasOpenSlot(building)) {
        assignCitizen(citizen, building, 'STAFFING');
        break; // one citizen per completion event; re-eval picks up the rest
      }
    }
  }
});

events.on(EV.CITIZEN_SPAWNED, ({ citizen }) => {
  // Slight delay so citizen has a position before assignment
  setTimeout(() => tryAutoAssign(citizen), 500);
});

events.on(EV.BUILDING_DESTROYED, ({ building }) => {
  const staff = _buildingStaff.get(building.id);
  if (!staff) return;
  for (const citizenId of staff) {
    const c = citizens.find(c => c.id === citizenId);
    if (!c) continue;
    // Import releaseNode lazily to avoid circular dep
    import('../world/resource_nodes.js').then(({ releaseNode }) => {
      if (c._gatherNode) { releaseNode(c._gatherNode); c._gatherNode = null; }
      c.state = 'IDLE';
      c._assignment = null;
    });
  }
  _buildingStaff.delete(building.id);
});

// ── Manual drag-assign helper ─────────────────────────────────
/**
 * Call this when the player drags a citizen onto a building.
 * Returns true if assignment succeeded, false if slot full.
 */
export function manualAssign(citizen, building) {
  if (!hasOpenSlot(building)) return false;
  assignCitizen(citizen, building, 'MANUAL');
  return true;
}
