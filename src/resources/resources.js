// ============================================================
// resources.js — Global resource store + Phase 27 production
// Phase 27: production buildings generate resources on WAVE_ENDED,
// upkeep deducted, Market trades, Healer's Hut, Guardhouse patrol.
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

// ── Phase 27 — Production on WAVE_ENDED ──────────────────────

// What each building produces per wave when staffed (where required)
const BUILDING_PRODUCTION = {
  lumber_camp: { requiresStaff: true,  yields: { wood: 15 } },
  sawmill:     { requiresStaff: true,  yields: { wood: 20 } },
  pit_mine:    { requiresStaff: true,  yields: { stone: 10 } },
  quarry:      { requiresStaff: true,  yields: { stone: 12 } },
  forge:       { requiresStaff: true,  yields: { metal: 8  } },
  mint:        { requiresStaff: true,  yields: { gold: 5   } },
  granary:     { requiresStaff: false, yields: {} }, // effect: upkeep reduction (handled in upkeep block)
  storehouse:  { requiresStaff: false, yields: {} }, // effect: upkeep reduction (15%)
  root_cellar: { requiresStaff: false, yields: { food: 5 } },
  farm_plot:   { requiresStaff: true,  yields: { food: 10 } },
};

// Market trade definitions (once per wave, requires staffed market)
export const MARKET_TRADES = [
  { label: '20 food → 10 wood',  cost: { food: 20 },  gains: { wood: 10 } },
  { label: '15 wood → 8 stone',  cost: { wood: 15 },  gains: { stone: 8 } },
  { label: '10 stone → 5 metal', cost: { stone: 10 }, gains: { metal: 5 } },
];

// Per-wave trade-used flags (reset each wave); keyed by market building id
const _marketTradesUsed = new Map();

export function canMarketTrade(marketBuilding, tradeIndex) {
  const used = _marketTradesUsed.get(marketBuilding.id) ?? new Set();
  return !used.has(tradeIndex) && marketBuilding.state === 'complete' && marketBuilding.staff.length > 0;
}

export function doMarketTrade(marketBuilding, tradeIndex) {
  if (!canMarketTrade(marketBuilding, tradeIndex)) return false;
  const trade = MARKET_TRADES[tradeIndex];
  if (!trade || !spend(trade.cost)) return false;
  earn(trade.gains);
  const used = _marketTradesUsed.get(marketBuilding.id) ?? new Set();
  used.add(tradeIndex);
  _marketTradesUsed.set(marketBuilding.id, used);
  events.emit(EV.RESOURCE_CHANGED, { resource: 'market_trade', oldValue: null, newValue: tradeIndex });
  return true;
}

// Healer's Hut: heal citizens within 5 tiles (160px) on WAVE_ENDED
const HEALER_RANGE  = 160; // 5 tiles in px
const HEALER_HEAL   = 20;
const HEALER_MEDICINE_COST = 2;

// Guardhouse patrol radius (exported for citizen.js assignment logic)
export const GUARDHOUSE_PATROL_RADIUS = 192; // 6 tiles in px

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
    // Reset market trades for next wave
    _marketTradesUsed.clear();

    // --- Production yields ---
    for (const b of placedBuildings.values()) {
      if (b.state !== 'complete') continue;
      const prod = BUILDING_PRODUCTION[b.type];
      if (!prod) continue;
      if (prod.requiresStaff && b.staff.length === 0) continue;
      if (Object.keys(prod.yields).length > 0) earn(prod.yields);
    }

    // --- Healer's Hut: heal nearby citizens ---
    for (const b of placedBuildings.values()) {
      if (b.type !== 'herbalist' || b.state !== 'complete') continue;
      if (b.staff.length === 0) continue;
      if ((resources.medicine ?? 0) < HEALER_MEDICINE_COST) continue;
      // Find citizens within range
      const bx = (b.tx + b.w / 2) * 32;
      const by = (b.ty + b.h / 2) * 32;
      let healed = 0;
      for (const c of citizens) {
        if (c.dead) continue;
        const dist = Math.hypot(c.x - bx, c.y - by);
        if (dist <= HEALER_RANGE) {
          c.hp = Math.min(c.maxHp ?? 100, (c.hp ?? 100) + HEALER_HEAL);
          healed++;
        }
      }
      if (healed > 0) {
        // Deduct medicine
        const old = resources.medicine;
        resources.medicine = Math.max(0, resources.medicine - HEALER_MEDICINE_COST);
        events.emit(EV.RESOURCE_CHANGED, { resource: 'medicine', oldValue: old, newValue: resources.medicine });
      }
    }

    // --- Upkeep: food ---
    let foodUpkeep = 5 + _livingCount() * 2;
    // Granary discount: -20%
    if (hasCompleteBuilding('granary')) foodUpkeep = Math.floor(foodUpkeep * 0.8);
    // Storehouse discount: -15% (applies after granary)
    if (hasCompleteBuilding('storehouse')) foodUpkeep = Math.floor(foodUpkeep * 0.85);
    // Deduct (allow going to 0, not below)
    const oldFood = resources.food;
    resources.food = Math.max(0, resources.food - foodUpkeep);
    events.emit(EV.RESOURCE_CHANGED, { resource: 'food', oldValue: oldFood, newValue: resources.food });

    console.log(`[Production] Wave ended. Food upkeep: ${foodUpkeep}. Resources:`, { ...resources });
  });
}
