// ============================================================
// assignment.js — Citizen building assignment
// Handles manual assignment of citizens to staffable buildings.
// Auto-assign scoring removed — citizen AI _pickNextTask() drives
// work decisions instead.
// ============================================================

import { events, EV } from '../engine/events.js';
import { citizens } from './citizen.js';
import { placedBuildings } from '../buildings/placement.js';

// Buildings that accept staff (mirrors registry staffSlots > 0)
const STAFF_SLOTS = {
  farm_plot:    1,
  lumber_camp:  1,
  pit_mine:     1,
  workbench:    1,
  cooking_pot:  1,
};

// Buildings that trigger gather tasks when assigned
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
  unassignCitizen(citizen);

  if (!_buildingStaff.has(building.id)) {
    _buildingStaff.set(building.id, new Set());
  }
  _buildingStaff.get(building.id).add(citizen.id);
  citizen._assignedBuildingId = building.id;

  const gatherType = GATHER_BUILDINGS.get(building.type);
  if (gatherType) {
    events.emit(EV.CITIZEN_ASSIGNED, { citizen, target: building, taskType: 'gather', task: 'gather', gatherType });
  } else {
    events.emit(EV.CITIZEN_ASSIGNED, { citizen, target: building, taskType });
  }
}

export function unassignCitizen(citizen) {
  if (!citizen._assignedBuildingId) return;
  const staff = _buildingStaff.get(citizen._assignedBuildingId);
  if (staff) staff.delete(citizen.id);
  citizen._assignedBuildingId = null;
}

// ── Manual drag-assign helper ─────────────────────────────────
export function manualAssign(citizen, building) {
  if (!hasOpenSlot(building)) return false;
  assignCitizen(citizen, building, 'MANUAL');
  return true;
}

// ── Cleanup on building destroyed ────────────────────────────
events.on(EV.BUILDING_DESTROYED, ({ building }) => {
  const staff = _buildingStaff.get(building.id);
  if (!staff) return;
  for (const citizenId of staff) {
    const c = citizens.find(c => c.id === citizenId);
    if (!c) continue;
    import('../world/resource_nodes.js').then(({ releaseNode }) => {
      if (c._gatherNode) { releaseNode(c._gatherNode); c._gatherNode = null; }
      c._assignedBuildingId = null;
      c.state = 'IDLE';
    });
  }
  _buildingStaff.delete(building.id);
});
