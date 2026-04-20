// ============================================================
// resources.js — Global resource store + production
// ============================================================
import { events, EV } from '../engine/events.js';

export const resources = {
  food:     50,
  wood:    100,
  stone:    50,
  metal:     0,
  gold:     10,
};

export function canAfford(cost) {
  return Object.entries(cost).every(([k, v]) => (resources[k] ?? 0) >= v);
}

export function spend(cost) {
  if (!canAfford(cost)) return false;
  for (const [k, v] of Object.entries(cost)) {
    const old = resources[k];
    resources[k] -= v;
    events.emit(EV.RESOURCE_CHANGED, { resource: k, oldValue: old, newValue: resources[k] });
  }
  return true;
}

export function earn(gains) {
  for (const [k, v] of Object.entries(gains)) {
    const old = resources[k] ?? 0;
    resources[k] = Math.max(0, old + v);
    events.emit(EV.RESOURCE_CHANGED, { resource: k, oldValue: old, newValue: resources[k] });
  }
}

// Building costs used by placement.js
export const BUILDING_COSTS = {
  // ── Structures ───────────────────────────────────────────
  wall_wood:        { wood: 2   },
  wall_stone:       { stone: 3  },
  wall_metal:       { metal: 2  },
  door_wood:        { wood: 4   },
  door_reinforced:  { wood: 4,   metal: 2 },

  // ── Floors ───────────────────────────────────────────────
  // floor_dirt is free (no entry)
  floor_wood:       { wood: 1   },
  floor_stone:      { stone: 2  },

  // ── Furniture ────────────────────────────────────────────
  bed:              { wood: 8   },
  workbench:        { wood: 10, stone: 4 },
  storage_crate:    { wood: 6   },
  cooking_pot:      { wood: 4,  stone: 6 },
  torch:            { wood: 2   },
  table:            { wood: 6   },

  // ── Production ───────────────────────────────────────────
  farm_plot:        { wood: 15 },
  lumber_camp:      { wood: 20 },
  pit_mine:         { wood: 20, stone: 8 },

  // ── Military ─────────────────────────────────────────────
  turret_ballista:  { wood: 20, stone: 10 },
  turret_cannon:    { stone: 20, metal: 8 },
};

// Per-wave upkeep deducted during AFTERMATH
export const UPKEEP_PER_WAVE = {
  food: 5, // +2 per living citizen
};

// ── Phase 27 — Production on WAVE_ENDED ──────────────────────

// What each building produces per wave when staffed (where required)
const BUILDING_PRODUCTION = {
  lumber_camp:  { requiresStaff: true,  yields: { wood: 15  } },
  pit_mine:     { requiresStaff: true,  yields: { stone: 10 } },
  farm_plot:    { requiresStaff: true,  yields: { food: 10  } },
  cooking_pot:  { requiresStaff: true,  yields: { food: 5   } },
  workbench:    { requiresStaff: true,  yields: { wood: 5   } },
};


// Helper: check if a complete building of given type exists
let _buildingsRef = null; // set via initProduction
export function hasCompleteBuilding(type) {
  if (!_buildingsRef) return false;
  for (const b of _buildingsRef.values()) {
    if (b.type === type && b.state === 'complete') return true;
  }
  return false;
}

// Living citizens count helper
let _citizensRef = null;
function _livingCount() {
  if (!_citizensRef) return 0;
  return _citizensRef.filter(c => !c.dead).length;
}

/**
 * Call once from init.js after buildings/citizens arrays are ready.
 * Wires up WAVE_ENDED production + upkeep listener.
 */
export function initProduction(placedBuildings, citizens) {
  _buildingsRef = placedBuildings;
  _citizensRef  = citizens;

  events.on(EV.WAVE_ENDED, () => {
    // --- Production yields ---
    for (const b of placedBuildings.values()) {
      if (b.state !== 'complete') continue;
      const prod = BUILDING_PRODUCTION[b.type];
      if (!prod) continue;
      if (prod.requiresStaff && (b.staff ?? []).length === 0) continue;
      if (Object.keys(prod.yields).length > 0) earn(prod.yields);
    }



    // --- Upkeep: food ---
    let foodUpkeep = 5 + _livingCount() * 2;
    // Storage crates reduce upkeep slightly (count of storage crates * 5%)
    let crateCount = 0;
    for (const b of placedBuildings.values()) {
      if (b.type === 'storage_crate' && b.state === 'complete') crateCount++;
    }
    if (crateCount > 0) foodUpkeep = Math.floor(foodUpkeep * Math.max(0.7, 1 - crateCount * 0.05));
    // Deduct (allow going to 0, not below)
    const oldFood = resources.food;
    resources.food = Math.max(0, resources.food - foodUpkeep);
    events.emit(EV.RESOURCE_CHANGED, { resource: 'food', oldValue: oldFood, newValue: resources.food });

    console.log(`[Production] Wave ended. Food upkeep: ${foodUpkeep}. Resources:`, { ...resources });
  });
}
