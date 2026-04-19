// ============================================================
// weapons.js — Weapon definitions & global crafted inventory (Phase 25)
// ============================================================

import { events, EV } from '../engine/events.js';
import { resources }  from '../resources/resources.js';

// ── Weapon definitions ───────────────────────────────────────
export const WEAPONS = {
  sword:    { name: 'Sword',    damage: 15, cooldown: 0.8, range: 40,  ranged: false },
  spear:    { name: 'Spear',    damage: 12, cooldown: 1.2, range: 48,  ranged: false },
  bow:      { name: 'Bow',      damage: 10, cooldown: 1.0, range: 192, ranged: true  },
  crossbow: { name: 'Crossbow', damage: 18, cooldown: 2.0, range: 256, ranged: true  },
};

// ── Crafting costs ───────────────────────────────────────────
export const WEAPON_COSTS = {
  sword:    { metal: 10 },
  spear:    { metal: 8  },
  bow:      { metal: 8,  wood: 5 },
  crossbow: { metal: 15, wood: 5 },
};

// ── Global crafted weapon inventory ─────────────────────────
// Each entry: { id, type, def }
export const craftedWeapons = [];

// ── Craft a weapon ───────────────────────────────────────────
export function craftWeapon(type) {
  const cost = WEAPON_COSTS[type];
  const def  = WEAPONS[type];
  if (!cost || !def) return false;

  // Check afford
  for (const [res, amt] of Object.entries(cost)) {
    if ((resources[res] ?? 0) < amt) return false;
  }

  // Deduct cost
  for (const [res, amt] of Object.entries(cost)) {
    const old = resources[res];
    resources[res] -= amt;
    events.emit(EV.RESOURCE_CHANGED, { resource: res, oldValue: old, newValue: resources[res] });
  }

  const weapon = { id: crypto.randomUUID(), type, def };
  craftedWeapons.push(weapon);
  events.emit(EV.WEAPON_CRAFTED, { weapon });
  return true;
}

// ── Take the first available weapon ─────────────────────────
// Returns the weapon object and removes it from the pool.
export function takeWeapon() {
  if (craftedWeapons.length === 0) return null;
  return craftedWeapons.shift();
}
