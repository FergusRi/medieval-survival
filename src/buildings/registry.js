// ============================================================
// registry.js — Simplified building roster (Middle Path)
// ~15 buildings, no tier gates, smaller footprints
// ============================================================

export const BUILDINGS = {

  // ── Special ──────────────────────────────────────────────
  capital: {
    name: 'Capital',
    tier: 'special',
    w: 3, h: 3,
    buildTime: 0,
    hp: 800,
    staffSlots: 0,
    description: 'Your seat of power. Placed at game start. Spawns your first citizens.',
  },

  // ── Housing ───────────────────────────────────────────────
  log_cabin: {
    name: 'Log Cabin',
    tier: 1,
    w: 1, h: 1,
    buildTime: 20,
    hp: 80,
    staffSlots: 0,
    description: 'Simple timber housing. Increases max population capacity.',
  },

  // ── Food ──────────────────────────────────────────────────
  farm_plot: {
    name: 'Farm Plot',
    tier: 1,
    w: 2, h: 2,
    buildTime: 15,
    hp: 60,
    staffSlots: 1,
    description: 'Tilled earth for growing crops. Produces food when staffed.',
  },

  // ── Resources ─────────────────────────────────────────────
  lumber_camp: {
    name: 'Lumber Camp',
    tier: 1,
    w: 1, h: 1,
    buildTime: 20,
    hp: 80,
    staffSlots: 1,
    description: 'Workers fell nearby trees for timber.',
  },

  pit_mine: {
    name: 'Pit Mine',
    tier: 1,
    w: 1, h: 1,
    buildTime: 30,
    hp: 100,
    staffSlots: 1,
    description: 'Digs earth for stone and ore.',
  },

  storehouse: {
    name: 'Storehouse',
    tier: 1,
    w: 1, h: 1,
    buildTime: 20,
    hp: 80,
    staffSlots: 0,
    description: 'Increases overall resource storage capacity.',
  },

  // ── Crafting / Economy ────────────────────────────────────
  forge: {
    name: 'Forge',
    tier: 1,
    w: 2, h: 2,
    buildTime: 40,
    hp: 130,
    staffSlots: 1,
    description: 'Smelts ore into metal. Required for military buildings.',
  },

  market: {
    name: 'Market',
    tier: 1,
    w: 2, h: 2,
    buildTime: 35,
    hp: 90,
    staffSlots: 1,
    description: 'A trading hub. Generates gold income.',
  },

  // ── Civic ─────────────────────────────────────────────────
  herbalist: {
    name: 'Herbalist',
    tier: 1,
    w: 1, h: 1,
    buildTime: 25,
    hp: 70,
    staffSlots: 1,
    description: 'Healer who slowly restores citizen HP.',
  },

  church: {
    name: 'Church',
    tier: 1,
    w: 2, h: 2,
    buildTime: 50,
    hp: 120,
    staffSlots: 1,
    description: 'Boosts citizen morale and reduces unrest.',
  },

  // ── Military ──────────────────────────────────────────────
  barracks: {
    name: 'Barracks',
    tier: 1,
    w: 2, h: 2,
    buildTime: 50,
    hp: 160,
    staffSlots: 4,
    description: 'Trains citizens as soldiers. Requires a Forge.',
  },

  watchtower: {
    name: 'Watchtower',
    tier: 1,
    w: 1, h: 1,
    buildTime: 15,
    hp: 80,
    staffSlots: 1,
    description: 'Extends visible map radius. Staffed unit shoots arrows.',
  },

  arrow_tower: {
    name: 'Arrow Tower',
    tier: 1,
    w: 1, h: 1,
    buildTime: 30,
    hp: 100,
    staffSlots: 0,
    description: 'Auto-attacks nearby enemies.',
  },

  // ── Walls (tile-by-tile) ───────────────────────────────────
  palisade: {
    name: 'Palisade',
    tier: 1,
    w: 1, h: 1,
    buildTime: 6,
    hp: 60,
    staffSlots: 0,
    description: 'Wooden stake wall. Cheap and quick.',
  },

  stone_wall: {
    name: 'Stone Wall',
    tier: 1,
    w: 1, h: 1,
    buildTime: 18,
    hp: 220,
    staffSlots: 0,
    description: 'Mortared stone wall. Much stronger than palisade.',
  },
};
