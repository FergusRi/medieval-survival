// ============================================================
// resources.js — Global resource store
// ============================================================
import { events, EV } from '../engine/events.js';

export const resources = {
  food:     50,
  wood:    100,
  stone:    50,
  metal:     0,
  gold:     10,
  medicine:  0,
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
  // ── Tier 1 — Settlement ──────────────────────────────────
  settlement_hall:  { wood: 60,  stone: 20 },
  log_cabin:        { wood: 30 },
  farm_plot:        { wood: 20 },
  lumber_camp:      { wood: 25 },
  pit_mine:         { wood: 30,  stone: 10 },
  root_cellar:      { wood: 20,  stone: 5  },
  herbalist:        { wood: 25,  medicine: 5 },
  palisade:         { wood: 8   },
  wooden_gate:      { wood: 15  },
  watchtower:       { wood: 20  },
  arrow_tower:      { wood: 35,  stone: 15 },

  // ── Tier 2 — Town ────────────────────────────────────────
  town_hall:        { wood: 80,  stone: 60 },
  townhouse:        { wood: 30,  stone: 20 },
  forge:            { stone: 40, metal: 10 },
  sawmill:          { wood: 40,  stone: 15 },
  quarry:           { wood: 30,  stone: 25 },
  granary:          { wood: 50,  stone: 10 },
  market:           { wood: 40,  gold: 10  },
  blacksmith:       { wood: 30,  metal: 20 },
  tavern:           { wood: 50,  gold: 5   },
  church:           { wood: 40,  stone: 40 },
  barracks:         { wood: 50,  stone: 30, metal: 10 },
  archery_range:    { wood: 45,  stone: 20, metal: 10 },
  storehouse:       { wood: 50,  stone: 10 },
  stone_wall:       { stone: 20 },
  ballista_tower:   { wood: 40,  stone: 40, metal: 20 },

  // ── Tier 3 — Castle ──────────────────────────────────────
  castle_keep:      { stone: 150, metal: 80, gold: 30 },
  manor:            { stone: 80,  metal: 20, gold: 10 },
  mint:             { stone: 40,  metal: 30, gold: 10 },
  cathedral:        { stone: 120, metal: 30, gold: 20 },
  armory:           { stone: 60,  metal: 50 },
  treasury:         { stone: 50,  metal: 30, gold: 20 },
  fortress_wall:    { stone: 40,  metal: 10 },
  gatehouse:        { stone: 80,  metal: 30 },
  cannon_tower:     { stone: 100, metal: 80, gold: 20 },
};

// Per-wave upkeep deducted during AFTERMATH
export const UPKEEP_PER_WAVE = {
  food: 5, // +2 per living citizen
};
