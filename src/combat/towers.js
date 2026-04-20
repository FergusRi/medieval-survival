// ============================================================
// towers.js — Tower + turret auto-attack system
// ============================================================

import { spawnProjectile } from './projectiles.js';
import { TILE_SIZE } from '../world/map.js';

// ---- Tower/turret combat definitions -----------------------
// range in px, fireRate in attacks/s
export const TOWER_COMBAT = {
  turret_ballista: {
    projectile: 'bolt',
    range:      280,
    fireRate:   0.5,      // 1 shot per 2s — fast for a tower
  },
  turret_cannon: {
    projectile: 'cannonball',
    range:      200,
    fireRate:   0.25,     // 1 shot per 4s — heavy and slow
  },
};

// Per-building cooldown map: building.id → seconds until next shot
const _cooldowns = new Map();

// ---- Update all towers/turrets ------------------------------
export function updateTowers(dt, placedBuildings, enemies) {
  if (!enemies || enemies.length === 0) {
    // No enemies — clear aim angles so barrels rest forward
    for (const b of placedBuildings.values()) {
      if (b._aimAngle !== null && b._aimAngle !== undefined) {
        // leave angle as-is so barrel doesn't snap on wave end
      }
    }
    return;
  }

  const dtS = dt / 1000;

  for (const b of placedBuildings.values()) {
    if (b.state !== 'complete') continue;
    const def = TOWER_COMBAT[b.type];
    if (!def) continue;

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

    // Update aim angle for turret types (stored on building for renderer)
    if (b._aimAngle !== null && b._aimAngle !== undefined && nearest) {
      b._aimAngle = Math.atan2(nearest.y - cy, nearest.x - cx);
    }

    if (!nearest) continue;

    // Decrement cooldown
    const cd = (_cooldowns.get(b.id) ?? 0) - dtS;
    _cooldowns.set(b.id, cd);
    if (cd > 0) continue;

    // Fire!
    spawnProjectile(def.projectile, cx, cy, nearest);
    _cooldowns.set(b.id, 1 / def.fireRate);
  }
}

// Clean up cooldown state when a building is destroyed
export function removeTowerCooldown(buildingId) {
  _cooldowns.delete(buildingId);
}
