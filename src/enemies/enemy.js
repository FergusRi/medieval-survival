// ============================================================
// enemy.js — Enemy entity class + update loop (Phase 17 / 26)
// Phase 26 adds: warchief, berserker, siege_ram, runner, swarm
// Per-type special abilities: aura buff, enrage, building-only,
// archer retreat, swarm rush.
// ============================================================

import { events, EV } from '../engine/events.js';
import { sampleFlowField } from '../world/flowfield.js';
import { TILE_SIZE, MAP_SIZE } from '../world/map.js';
import { spatialGrid } from '../world/spatial.js';
import { enemyDied } from '../phases/phases.js';
import { drawEnemySprite } from '../sprites/enemy_sprites.js';

// ---- Enemy type definitions ---------------------------------
export const ENEMY_DEFS = {
  raider: {
    name:      'Raider',
    hp:        40,
    speed:     48,
    damage:    8,
    attackRate: 1.2,
    attackRange: 28,
    xpReward:  10,
    colour:    '#c0392b',
    radius:    7,
  },
  brute: {
    name:      'Brute',
    hp:        120,
    speed:     30,
    damage:    20,
    attackRate: 0.6,
    attackRange: 32,
    xpReward:  25,
    colour:    '#8e44ad',
    radius:    10,
  },
  archer: {
    name:      'Archer',
    hp:        25,
    speed:     52,
    damage:    6,
    attackRate: 0.8,
    attackRange: 80,  // ranged — stays at distance
    xpReward:  15,
    colour:    '#e67e22',
    radius:    6,
  },
  shaman: {
    name:      'Shaman',
    hp:        60,
    speed:     36,
    damage:    12,
    attackRate: 0.5,
    attackRange: 64,
    xpReward:  30,
    colour:    '#27ae60',
    radius:    8,
  },

  // ---- Phase 26 new types ------------------------------------
  warchief: {
    name:       'Warchief',
    hp:         180,
    speed:      38,
    damage:     18,
    attackRate: 0.7,
    attackRange: 36,
    xpReward:   60,
    colour:     '#d4ac0d',  // gold
    radius:     11,
    // Aura: buffs enemies within 96 px — speed×1.2, damage×1.2
    auraRadius: 96,
  },
  berserker: {
    name:       'Berserker',
    hp:         90,
    speed:      44,
    damage:     14,
    attackRate: 1.0,
    attackRange: 30,
    xpReward:   40,
    colour:     '#922b21',  // deep red
    radius:     9,
    // Enrage at < 30% HP: speed×2, damage×2 (one-shot)
  },
  siege_ram: {
    name:       'Siege Ram',
    hp:         300,
    speed:      22,
    damage:     40,
    attackRate: 0.3,
    attackRange: 40,
    xpReward:   80,
    colour:     '#5d6d7e',  // grey
    radius:     13,
    // Only attacks buildings — ignores citizens
    buildingsOnly: true,
  },
  runner: {
    name:       'Runner',
    hp:         20,
    speed:      90,       // very fast
    damage:     5,
    attackRate: 2.0,
    attackRange: 22,
    xpReward:   12,
    colour:     '#1abc9c',
    radius:     5,
    // Spawns far from main cluster; targets furthest building from Capital
  },
  swarm: {
    name:       'Swarm',
    hp:         12,
    speed:      64,
    damage:     4,
    attackRate: 1.5,
    attackRange: 20,
    xpReward:   5,
    colour:     '#7f8c8d',
    radius:     4,
    // Spawns in groups of 15+; rushes straight to nearest target
  },
};

// ---- Active enemy list (exported for renderer + combat) ----
export const enemies = [];

let _nextId = 1;

// ---- Enemy class --------------------------------------------
export class Enemy {
  constructor(type, wx, wy) {
    const def = ENEMY_DEFS[type] ?? ENEMY_DEFS.raider;
    this.id          = _nextId++;
    this.type        = type;
    this.name        = def.name;
    this.x           = wx;
    this.y           = wy;
    this.hp          = def.hp;
    this.maxHp       = def.hp;
    this.speed       = def.speed;
    this._baseSpeed  = def.speed;   // for buff reset
    this.damage      = def.damage;
    this._baseDamage = def.damage;  // for buff reset
    this.attackRate  = def.attackRate;
    this.attackRange = def.attackRange;
    this.xpReward    = def.xpReward;
    this.colour      = def.colour;
    this.radius      = def.radius;

    this.attackCooldown = 0;
    this.target         = null;
    this.dead           = false;

    // Phase 26 state flags
    this.enraged  = false;   // berserker: set once at < 30% HP
    this.buffed   = false;   // warchief aura recipient (reset each frame)

    // Phase 29: facing direction for sprite (1 = right, -1 = left)
    this._facing  = 1;

    events.emit(EV.ENEMY_SPAWNED, { enemy: this });
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp   = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    drawEnemySprite(ctx, this);
  }
}

// ---- Update all enemies -------------------------------------
export function updateEnemies(dt, placedBuildings, citizens) {
  const dtS = dt / 1000;
  const toRemove = [];

  // --- Phase 26: reset buff flags & apply warchief aura -------
  for (const e of enemies) {
    if (!e.dead) {
      e.buffed  = false;
      e.speed   = e._baseSpeed;
      e.damage  = e._baseDamage;
    }
  }
  _applyWarchiefAuras();

  for (const e of enemies) {
    if (e.dead) { toRemove.push(e); continue; }

    // --- Phase 26: Berserker enrage trigger -------------------
    if (e.type === 'berserker' && !e.enraged && e.hp < e.maxHp * 0.3) {
      e.enraged = true;
      e._baseSpeed  *= 2;
      e._baseDamage *= 2;
      e.speed  = e._baseSpeed;
      e.damage = e._baseDamage;
    }

    const target = _findTarget(e, placedBuildings, citizens);

    if (target) {
      const tx = target.x ?? (target.tx + (target.w ?? 1) / 2) * TILE_SIZE;
      const ty = target.y ?? (target.ty + (target.h ?? 1) / 2) * TILE_SIZE;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // --- Phase 26: Archer retreat ----------------------------
      if (e.type === 'archer') {
        const tooClose = _closestCitizenDist(e, citizens);
        if (tooClose < 64) {
          // Retreat away from nearest citizen
          _retreatFromCitizens(e, citizens, dtS);
          e.attackCooldown -= dtS;
          if (e.attackCooldown <= 0 && dist <= e.attackRange) {
            e.attackCooldown = 1 / e.attackRate;
            _attack(e, target);
          }
          continue;
        }
      }

      if (dist > e.attackRange) {
        const spd = e.speed * dtS;
        e.x += (dx / dist) * spd;
        e.y += (dy / dist) * spd;
        if (dx !== 0) e._facing = dx > 0 ? 1 : -1;
      } else {
        e.attackCooldown -= dtS;
        if (e.attackCooldown <= 0) {
          e.attackCooldown = 1 / e.attackRate;
          _attack(e, target);
        }
      }
    } else {
      _followFlowField(e, dtS);
    }
  }

  // Remove dead enemies
  for (const e of toRemove) {
    const idx = enemies.indexOf(e);
    if (idx !== -1) enemies.splice(idx, 1);
    events.emit(EV.ENEMY_DIED, { enemy: e });
    enemyDied();
  }
}

// ---- Warchief aura (Phase 26) --------------------------------
function _applyWarchiefAuras() {
  for (const wc of enemies) {
    if (wc.dead || wc.type !== 'warchief') continue;
    const nearby = spatialGrid.queryRadius(wc.x, wc.y, wc.attackRange /* reuse field */ );
    // queryRadius returns spatial items — we need to match against enemies
    // Use manual distance check since spatialGrid tracks buildings/citizens
    // Warchief buffs OTHER enemies within auraRadius
    const def = ENEMY_DEFS.warchief;
    const aura = def.auraRadius;
    for (const other of enemies) {
      if (other.dead || other === wc) continue;
      const dist = Math.hypot(wc.x - other.x, wc.y - other.y);
      if (dist <= aura) {
        other.buffed  = true;
        other.speed   = other._baseSpeed  * 1.2;
        other.damage  = other._baseDamage * 1.2;
      }
    }
  }
}

// ---- Flow-field movement ------------------------------------
function _followFlowField(e, dtS) {
  const tx = Math.floor(e.x / TILE_SIZE);
  const ty = Math.floor(e.y / TILE_SIZE);
  const { dx, dy } = sampleFlowField(tx, ty);
  if (dx === 0 && dy === 0) return;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  e.x += (dx / len) * e.speed * dtS;
  e.y += (dy / len) * e.speed * dtS;
  if (dx !== 0) e._facing = dx > 0 ? 1 : -1;

  const max = MAP_SIZE * TILE_SIZE;
  e.x = Math.max(0, Math.min(max, e.x));
  e.y = Math.max(0, Math.min(max, e.y));
}

// ---- Target acquisition (Phase 26: siege_ram skips citizens) -
const TARGET_SCAN_RADIUS = 160;

function _findTarget(e, placedBuildings, citizens) {
  const def = ENEMY_DEFS[e.type] ?? {};
  let best = null;
  let bestDist = TARGET_SCAN_RADIUS;

  // Buildings always scanned
  for (const b of placedBuildings.values()) {
    if (b.state !== 'complete') continue;
    const bx = (b.tx + (b.w ?? 1) / 2) * TILE_SIZE;
    const by = (b.ty + (b.h ?? 1) / 2) * TILE_SIZE;
    const dist = Math.hypot(e.x - bx, e.y - by);
    if (dist < bestDist) { bestDist = dist; best = b; }
  }

  // Siege Ram ignores citizens
  if (!def.buildingsOnly) {
    for (const c of citizens) {
      const dist = Math.hypot(e.x - c.x, e.y - c.y);
      if (dist < bestDist) { bestDist = dist; best = c; }
    }
  }

  return best;
}

// ---- Archer helpers (Phase 26) ------------------------------
function _closestCitizenDist(e, citizens) {
  let min = Infinity;
  for (const c of citizens) {
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d < min) min = d;
  }
  return min;
}

function _retreatFromCitizens(e, citizens, dtS) {
  // Average direction toward nearest citizens, move opposite
  let ax = 0, ay = 0, n = 0;
  for (const c of citizens) {
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d < 128) { ax += c.x - e.x; ay += c.y - e.y; n++; }
  }
  if (n === 0) return;
  ax /= n; ay /= n;
  const len = Math.sqrt(ax * ax + ay * ay) || 1;
  e.x -= (ax / len) * e.speed * dtS;
  e.y -= (ay / len) * e.speed * dtS;
  if (ax !== 0) e._facing = ax > 0 ? -1 : 1; // retreating = facing away
  const max = MAP_SIZE * TILE_SIZE;
  e.x = Math.max(0, Math.min(max, e.x));
  e.y = Math.max(0, Math.min(max, e.y));
}

// ---- Attack -------------------------------------------------
function _attack(e, target) {
  if (target.hp !== undefined && target.tx !== undefined) {
    target.hp = (target.hp ?? target.maxHp ?? 100) - e.damage;
    events.emit(EV.BUILDING_DAMAGED, { building: target, damage: e.damage });
    if (target.hp <= 0) {
      target.hp = 0;
      events.emit(EV.BUILDING_DESTROYED, { building: target });
    }
    return;
  }
  if (target.takeDamage) {
    target.takeDamage(e.damage);
  }
}
