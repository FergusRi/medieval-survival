// ============================================================
// events.js — Synchronous pub-sub event bus
// ============================================================

const listeners = {};

export const events = {
  on(type, fn) {
    (listeners[type] ??= []).push(fn);
  },
  off(type, fn) {
    listeners[type] = (listeners[type] || []).filter(f => f !== fn);
  },
  emit(type, data) {
    (listeners[type] || []).forEach(fn => fn(data));
  }
};

// All 22 named event type constants
export const EV = {
  BUILDING_PLACED:            'BUILDING_PLACED',
  BUILDING_COMPLETED:         'BUILDING_COMPLETED',
  BUILDING_DAMAGED:           'BUILDING_DAMAGED',
  BUILDING_DESTROYED:         'BUILDING_DESTROYED',
  CITIZEN_SPAWNED:            'CITIZEN_SPAWNED',
  CITIZEN_DIED:               'CITIZEN_DIED',
  CITIZEN_ASSIGNED:           'CITIZEN_ASSIGNED',
  CITIZEN_ASSIGN_REQUESTED:   'CITIZEN_ASSIGN_REQUESTED',
  RESOURCE_CHANGED:           'RESOURCE_CHANGED',
  WAVE_STARTED:               'WAVE_STARTED',
  WAVE_ENDED:                 'WAVE_ENDED',
  COMBAT_STARTED:             'COMBAT_STARTED',
  COMBAT_ENDED:               'COMBAT_ENDED',
  ENEMY_SPAWNED:              'ENEMY_SPAWNED',
  ENEMY_DIED:                 'ENEMY_DIED',
  TILE_PASSABILITY_CHANGED:   'TILE_PASSABILITY_CHANGED',
  FOG_UPDATED:                'FOG_UPDATED',
  SETTLEMENT_UPGRADED:        'SETTLEMENT_UPGRADED',
  WEAPON_EQUIPPED:            'WEAPON_EQUIPPED',
  WEAPON_CRAFTED:             'WEAPON_CRAFTED',
  CROP_PLANTED:               'CROP_PLANTED',
  CROP_HARVESTED:             'CROP_HARVESTED',
  RESOURCE_HARVESTED:         'RESOURCE_HARVESTED',
  SURPRISE_ATTACK_WARNING:    'SURPRISE_ATTACK_WARNING',
  GAME_OVER:                  'GAME_OVER',
  MAP_LOADED:                 'MAP_LOADED',
};
