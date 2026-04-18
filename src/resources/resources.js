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
  'settlement':      { wood: 60, stone: 20 },
  'house':           { wood: 30 },
  'farm_plot':       { wood: 20 },
  'sprinkler':       { metal: 10, stone: 5 },
  'lumber_mill':     { wood: 40, stone: 10 },
  'quarry':          { wood: 30, stone: 20 },
  'forge':           { stone: 40, metal: 10 },
  'mint':            { stone: 30, metal: 20, gold: 5 },
  'granary':         { wood: 40 },
  'storehouse':      { wood: 50, stone: 10 },
  'market':          { wood: 40, gold: 10 },
  'blacksmith':      { wood: 30, metal: 20 },
  'armory':          { wood: 40, metal: 30 },
  'wall':            { wood: 10 },
  'gate':            { wood: 15 },
  'watchtower':      { wood: 20 },
  'arrow_tower':     { wood: 30, stone: 20 },
  'ballista_tower':  { wood: 50, metal: 20 },
  'catapult_tower':  { stone: 80, metal: 40 },
  'healers_hut':     { wood: 30, medicine: 5 },
  'guardhouse':      { wood: 40, stone: 10 },
};

// Per-wave upkeep deducted during AFTERMATH
export const UPKEEP_PER_WAVE = {
  food: 5, // +2 per living citizen
};
