// ============================================================
// towers.js — Tower auto-attack system (Phase 19)
// Each completed combat tower scans for enemies each frame
// and fires projectiles at the nearest one in range.
// ============================================================

import { spawnProjectile } from './projectiles.js';
import { TILE_SIZE } from '../world/map.js';

// ---- Tower combat definitions -------------------------------
// range in px, fireRate in attacks/s
export const TOWER_COMBAT = {
  arrow_tower: {
    projectile: 'arrow',
    range:      200,
    fireRate:   1.2,
  },
  watchtower: {
    projectile: 'arrow',
    range:      160,
    fireRate:   0.8,
  },
};

// Per-building cooldown map: building.id → seconds until next shot
const _cooldowns = new Map();

// ---- Update all towers --------------------------------------
export function updateTowers(dt, placedBuildings, enemies) {
  if (!enemies || enemies.length === 0) return;

  const dtS = dt / 1000;

  for (const b of placedBuildings.values()) {
    if (b.state !== 'complete') continue;
    const def = TOWER_COMBAT[b.type];
    if (!def) continue;

    // Decrement cooldown
    const cd = (_cooldowns.get(b.id) ?? 0) - dtS;
    _cooldowns.set(b.id, cd);
    if (cd > 0) continue;

    // Tower centre in world px
    const cx = (b.tx + b.w / 2) * TILE_SIZE;
    const cy = (b.ty + b.h / 2) * TILE_SIZE;

    // Find nearest living enemy in range
    let nearest = null;
    let nearestDist = def.range;
    for (const en of enemies) {
      if (en.dead) continue;
      const d = Math.hypot(en.x - cx, en.y - cy);
      if (d < nearestDist) { nearestDist = d; nearest = en; }
    }

    if (!nearest) continue;

    // Fire!
    spawnProjectile(def.projectile, cx, cy, nearest);
    _cooldowns.set(b.id, 1 / def.fireRate);
  }
}

// Clean up cooldown state when a building is destroyed
export function removeTowerCooldown(buildingId) {
  _cooldowns.delete(buildingId);
}
