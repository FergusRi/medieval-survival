// ============================================================
// citizen.js — Citizen entity with procedural pawn animation
// RimWorld-inspired: top-down oval body, swinging limbs,
// unique colour per citizen, hat, name tag on hover.
// ============================================================
import * as names from './names.js';
import { getTile, MAP_SIZE } from '../world/map.js';
import { T } from '../world/tiles.js';
import { events, EV } from '../engine/events.js';
import { placedBuildings } from '../buildings/placement.js';
import { applyBuildWork } from '../buildings/construction.js';
import { findPath } from '../world/pathfinder.js';
import { isInCombat } from '../phases/phases.js';
import { craftedWeapons, takeWeapon, WEAPONS } from '../items/weapons.js';
import { GUARDHOUSE_PATROL_RADIUS } from '../resources/resources.js';
import { drawGrave } from '../sprites/effect_sprites.js';
import { getTunicColour, drawWeaponOverlay } from '../sprites/citizen_sprites.js';
// enemies imported lazily to avoid circular dep — accessed via getter below
let _enemiesRef = null;
export function setCitizenEnemyRef(arr) { _enemiesRef = arr; }

const TILE = 32;
const WANDER_RADIUS = 5; // tiles

// ── Combat constants ─────────────────────────────────────────
const CITIZEN_ATTACK_RANGE  = 32;  // px — melee
const CITIZEN_ATTACK_RATE   = 1.0; // attacks/s base
const CITIZEN_BASE_DAMAGE   = 6;
const CITIZEN_ENGAGE_RADIUS = 120; // px — how far citizen will scan for enemies
const CITIZEN_COMBAT_XP_PER_KILL = 20;

// ── Skill XP & levelling ────────────────────────────────────
/**
 * Recalculate skill level after an XP gain.
 * Level = floor(xp / 100), capped at 100.
 */
export function recalcSkill(citizen, skill) {
  const newLevel = Math.min(100, Math.floor(citizen.skillXp[skill] / 100));
  if (newLevel !== citizen.skills[skill]) {
    citizen.skills[skill] = newLevel;
    // Phase 29: level-up particle burst here
  }
}

/** Award XP for a skill and immediately recalc level. */
export function awardXp(citizen, skill, amount) {
  citizen.skillXp[skill] += amount;
  recalcSkill(citizen, skill);
}

const WALKABLE = new Set([T.GRASS, T.DIRT, T.SAND, T.SCRUBLAND, T.STONE, T.FOREST]);

// Palette of distinct shirt colours for citizens
const SHIRT_COLOURS = [
  '#c0392b', '#2980b9', '#27ae60', '#8e44ad',
  '#e67e22', '#16a085', '#d35400', '#2c3e50',
  '#f39c12', '#1abc9c', '#7f8c8d', '#e74c3c',
];
// Hat colours
const HAT_COLOURS = [
  '#5d4037', '#37474f', '#4a148c', '#1b5e20',
  '#bf360c', '#0d47a1', '#827717', '#880e4f',
];

let _citizenIndex = 0;

function findNearestBlueprint(cx, cy) {
  let best = null, bestDist = Infinity;
  for (const b of placedBuildings.values()) {
    if (b.state !== 'blueprint') continue;
    const bx = b.tx * TILE + (b.w * TILE) / 2;
    const by = b.ty * TILE + (b.h * TILE) / 2;
    const dist = Math.hypot(bx - cx, by - cy);
    if (dist < bestDist) { bestDist = dist; best = b; }
  }
  return best;
}

// Pick a random walkable tile nearby and return its tile coords (or null)
function randomWanderTile(cx, cy) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const dx = Math.floor((Math.random() * 2 - 1) * WANDER_RADIUS);
    const dy = Math.floor((Math.random() * 2 - 1) * WANDER_RADIUS);
    const tx = Math.floor(cx / TILE) + dx;
    const ty = Math.floor(cy / TILE) + dy;
    if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
    const id = getTile(tx, ty);
    if (WALKABLE.has(id)) return { tx, ty };
  }
  return null;
}

// Convert a tile-coord waypoint array into world-px targets
function waypointsToWorldPx(waypoints) {
  return waypoints.map(wp => ({ x: wp.tx * TILE + 16, y: wp.ty * TILE + 16 }));
}

export class Citizen {
  constructor(homeBuilding) {
    this.id    = crypto.randomUUID();
    this.name  = names.assign();
    this.home  = homeBuilding;
    this.x     = homeBuilding.tx * TILE + homeBuilding.w * TILE / 2;
    this.y     = homeBuilding.ty * TILE + homeBuilding.h * TILE / 2;
    this.speed = 48 + Math.random() * 24; // px/s, slight variation
    this.hp    = 100; this.maxHp = 100;
    this.skills  = { mining: 1, building: 1, farming: 1, combat: 1 };
    this.skillXp = { mining: 0, building: 0, farming: 0, combat: 0 };
    this.weapon  = null;
    this.state   = 'IDLE';
    this.target  = null;     // current waypoint { x, y } world px
    this._waypoints = [];    // remaining waypoint queue [ {x,y}, … ]

    // Facing: 1 = right, -1 = left
    this.facing  = 1;
    // Walk cycle timer (ms)
    this._walkTime = Math.random() * 1000; // stagger so not all in sync
    this._moving   = false;

    // Visual identity — assigned by index for variety
    const idx = _citizenIndex++;
    this.shirtColour = SHIRT_COLOURS[idx % SHIRT_COLOURS.length];
    this.hatColour   = HAT_COLOURS[idx % HAT_COLOURS.length];
    // Skin tone — slight variation
    const skinBase = [220, 180, 140];
    const skinVar  = (idx * 17) % 40 - 20;
    this.skinColour = `rgb(${skinBase[0]+skinVar},${skinBase[1]+skinVar},${skinBase[2]+skinVar})`;

    this.sortY       = this.y + 4;
    this._idleTimer  = Math.random() * 1500; // staggered start
    this.actionCount = 0;

    // Combat
    this.attackCooldown = 0;
    this.combatTarget   = null;
  }

  /** Take damage from an enemy attack. Returns true if citizen died. */
  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp   = 0;
      this.dead = true;
      events.emit(EV.CITIZEN_DIED, { citizen: this });
      return true;
    }
    return false;
  }

  update(dt) {
    const dtS = dt / 1000;
    this._idleTimer -= dt;

    // ── Helper: navigate to a tile coord using A* ─────────────
    const navigateTo = (goalTX, goalTY) => {
      const startTX = Math.floor(this.x / TILE);
      const startTY = Math.floor(this.y / TILE);
      const path = findPath(startTX, startTY, goalTX, goalTY);
      if (path.length > 0) {
        this._waypoints = waypointsToWorldPx(path);
        this.target = this._waypoints.shift();
      } else {
        // A* found no path — fall back to direct line
        this._waypoints = [];
        this.target = { x: goalTX * TILE + 16, y: goalTY * TILE + 16 };
      }
    };

    // ── Combat: engage nearby enemies during COMBAT phase ────
    if (isInCombat() && _enemiesRef && _enemiesRef.length > 0) {
      // Find nearest living enemy within engage radius
      let nearest = null;
      let nearestDist = CITIZEN_ENGAGE_RADIUS;
      for (const en of _enemiesRef) {
        if (en.dead) continue;
        const d = Math.hypot(en.x - this.x, en.y - this.y);
        if (d < nearestDist) { nearestDist = d; nearest = en; }
      }

      if (nearest) {
        this.combatTarget = nearest;
        this.state = 'COMBAT';
      } else if (this.state === 'COMBAT') {
        // No enemies in range — return to IDLE
        this.combatTarget = null;
        this.state = 'IDLE';
      }
    } else if (this.state === 'COMBAT') {
      this.combatTarget = null;
      this.state = 'IDLE';
    }

    if (this.state === 'COMBAT' && this.combatTarget) {
      const en = this.combatTarget;
      if (en.dead) {
        this.combatTarget = null;
        this.state = 'IDLE';
      } else {
        const dx = en.x - this.x;
        const dy = en.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Weapon stats override defaults when armed
        const weaponRange  = this.weapon ? this.weapon.range    : CITIZEN_ATTACK_RANGE;
        const weaponDmg    = this.weapon
          ? this.weapon.damage + Math.floor(this.skills.combat / 10)
          : CITIZEN_BASE_DAMAGE + Math.floor(this.skills.combat / 10);
        const weaponCd     = this.weapon ? this.weapon.cooldown : 1 / CITIZEN_ATTACK_RATE;

        if (dist > weaponRange) {
          // Move toward enemy
          const spd = Math.min(this.speed * dtS, dist - weaponRange + 1);
          this.x += (dx / dist) * spd;
          this.y += (dy / dist) * spd;
          this.facing  = dx >= 0 ? 1 : -1;
          this._moving = true;
          this._walkTime += dt;
        } else {
          // In range — attack
          this._moving = false;
          this.facing  = dx >= 0 ? 1 : -1;
          this.attackCooldown -= dtS;
          if (this.attackCooldown <= 0) {
            this.attackCooldown = weaponCd;
            const dmg = weaponDmg;
            const killed = en.takeDamage(dmg);
            if (killed) {
              awardXp(this, 'combat', CITIZEN_COMBAT_XP_PER_KILL);
              this.combatTarget = null;
              this.state = 'IDLE';
            } else {
              // Award 1 XP per hit
              awardXp(this, 'combat', 1);
            }
          }
        }
        this.sortY = this.y + 4;
        return;
      }
    }

    // ── Armory weapon pickup (unarmed + weapons available) ───
    if (this.state === 'IDLE' && !this.weapon && !this.target &&
        this._waypoints.length === 0 && craftedWeapons.length > 0) {
      // Find nearest complete armory within 3 tiles (96px)
      const ARMORY_SCAN = 96;
      let nearestArmory = null, nearestDist = Infinity;
      for (const b of placedBuildings.values()) {
        if (b.type !== 'armory' || b.state !== 'complete') continue;
        const ax = b.tx * TILE + (b.w * TILE) / 2;
        const ay = b.ty * TILE + (b.h * TILE) / 2;
        const dist = Math.hypot(ax - this.x, ay - this.y);
        if (dist < nearestDist) { nearestDist = dist; nearestArmory = b; }
      }
      if (nearestArmory && nearestDist <= ARMORY_SCAN) {
        const weapon = takeWeapon();
        if (weapon) {
          this.weapon = weapon.def;
          events.emit(EV.WEAPON_EQUIPPED, { citizen: this, weapon });
        }
      } else if (nearestArmory) {
        // Walk toward nearest armory
        const goalTX = Math.floor((nearestArmory.tx * TILE + (nearestArmory.w * TILE) / 2) / TILE);
        const goalTY = Math.floor((nearestArmory.ty * TILE + (nearestArmory.h * TILE) / 2) / TILE);
        navigateTo(goalTX, goalTY);
      }
    }

    // ── Check for nearby blueprints (highest priority) ────────
    if (this.state === 'IDLE' && !this.target && this._waypoints.length === 0 && this._idleTimer <= 0) {
      // Phase 27: Guardhouse patrol — if assigned to a guardhouse, patrol its radius
      const assignedGuardhouse = this.assignedBuilding &&
        this.assignedBuilding.type === 'barracks' || // barracks also act as patrol post
        (this.assignedBuilding && this.assignedBuilding.type === 'guardhouse')
          ? this.assignedBuilding : null;

      if (assignedGuardhouse && assignedGuardhouse.state === 'complete') {
        // Patrol within GUARDHOUSE_PATROL_RADIUS around the guardhouse
        const ghx = (assignedGuardhouse.tx + assignedGuardhouse.w / 2) * TILE;
        const ghy = (assignedGuardhouse.ty + assignedGuardhouse.h / 2) * TILE;
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * GUARDHOUSE_PATROL_RADIUS * 0.8;
        const px    = ghx + Math.cos(angle) * dist;
        const py    = ghy + Math.sin(angle) * dist;
        const ptx   = Math.floor(px / TILE);
        const pty   = Math.floor(py / TILE);
        navigateTo(ptx, pty);
        this._idleTimer = 2000 + Math.random() * 2000;
      } else {
        const bp = findNearestBlueprint(this.x, this.y);
        if (bp) {
          this.state = 'BUILDING';
          this._buildTarget = bp;
          const goalTX = Math.floor((bp.tx * TILE + (bp.w * TILE) / 2) / TILE);
          const goalTY = Math.floor((bp.ty * TILE + (bp.h * TILE) / 2) / TILE);
          navigateTo(goalTX, goalTY);
        } else {
          const wt = randomWanderTile(this.x, this.y);
          if (wt) navigateTo(wt.tx, wt.ty);
          this._idleTimer = 1500 + Math.random() * 2500;
        }
      }
    }

    // ── If BUILDING and arrived, do work ──────────────────────
    if (this.state === 'BUILDING') {
      const bp = this._buildTarget;
      if (!bp || bp.state !== 'blueprint') {
        // Blueprint completed or removed
        this.state = 'IDLE';
        this._buildTarget = null;
        this.target = null;
        this._waypoints = [];
      } else {
        const bx = bp.tx * TILE + (bp.w * TILE) / 2;
        const by = bp.ty * TILE + (bp.h * TILE) / 2;
        const dist = Math.hypot(bx - this.x, by - this.y);
        if (dist < TILE * 1.5) {
          // Arrived — do build work
          this.target = null;
          this._waypoints = [];
          this._moving = false;
          this._buildTime = (this._buildTime || 0) + dt;
          this.facing = Math.sin(this._buildTime * 0.005) >= 0 ? 1 : -1;
          // Skill effect: progress/s = 1 + building_skill/100
          const buildMult = 1 + this.skills.building / 100;
          applyBuildWork(bp, dtS * buildMult);
          // Award 2 XP per second of build work
          awardXp(this, 'building', 2 * dtS);
          this.sortY = this.y + 4;
          return;
        } else if (!this.target && this._waypoints.length === 0) {
          // Lost target — re-path
          const goalTX = Math.floor(bx / TILE);
          const goalTY = Math.floor(by / TILE);
          navigateTo(goalTX, goalTY);
        }
      }
    }

    this._moving = false;

    // ── Advance along waypoint queue ──────────────────────────
    if (!this.target && this._waypoints.length > 0) {
      this.target = this._waypoints.shift();
    }

    // ── Move toward current waypoint ──────────────────────────
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        // If queue empty and not BUILDING, go idle
        if (this._waypoints.length === 0 && this.state !== 'BUILDING') {
          this.state = 'IDLE';
        }
      } else {
        const spd = Math.min(this.speed * dtS, dist);
        this.x += (dx / dist) * spd;
        this.y += (dy / dist) * spd;
        this.facing  = dx >= 0 ? 1 : -1;
        this._moving = true;
        this._walkTime += dt;
      }
    }

    this.sortY = this.y + 4;
  }

  draw(ctx) {
    const cx = Math.round(this.x);
    const cy = Math.round(this.y);
    const f  = this.facing; // 1 = right, -1 = left

    // Walk cycle: leg swing angle (radians)
    const walkSpeed = 0.006; // radians per ms
    const legSwing  = this._moving
      ? Math.sin(this._walkTime * walkSpeed) * 0.45
      : 0;
    const armSwing  = this._moving
      ? Math.sin(this._walkTime * walkSpeed + Math.PI) * 0.35
      : 0;
    // Subtle body bob when moving
    const bob = this._moving
      ? Math.abs(Math.sin(this._walkTime * walkSpeed)) * 1.2
      : 0;

    // ── Dimensions (top-down 2.5D pawn) ──────────────────────
    const bodyW  = 8;   // body oval width
    const bodyH  = 5;   // body oval height (squashed = top-down feel)
    const headR  = 4;   // head radius
    const limbL  = 5;   // leg length
    const armL   = 4;   // arm length
    const legSpread = 2.5; // horizontal offset of legs from centre

    // Vertical layout (y increases downward)
    // Feet at cy, body centre above feet, head above body
    const feetY  = cy + bob;
    const bodyY  = feetY - bodyH * 0.5 - 1;
    const headY  = bodyY - bodyH * 0.5 - headR - 0.5;
    const hatTopY = headY - headR;

    ctx.save();

    // ── Legs (drawn behind body) ─────────────────────────────
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;

    // Left leg
    const llAngle = -legSwing;
    ctx.strokeStyle = this.shirtColour; // trousers match shirt (darker would need extra colour)
    ctx.beginPath();
    ctx.moveTo(cx - legSpread, bodyY + bodyH * 0.4);
    ctx.lineTo(
      cx - legSpread + Math.sin(llAngle) * limbL * f,
      feetY + Math.cos(llAngle) * limbL * 0.4
    );
    ctx.stroke();

    // Right leg
    const rlAngle = legSwing;
    ctx.beginPath();
    ctx.moveTo(cx + legSpread, bodyY + bodyH * 0.4);
    ctx.lineTo(
      cx + legSpread + Math.sin(rlAngle) * limbL * f,
      feetY + Math.cos(rlAngle) * limbL * 0.4
    );
    ctx.stroke();

    // ── Body (oval, top-down foreshortened) ───────────────────
    ctx.fillStyle = getTunicColour(this.state, this.shirtColour);
    ctx.beginPath();
    ctx.ellipse(cx, bodyY, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Arms ──────────────────────────────────────────────────
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.skinColour;

    const isBuilding = this.state === 'BUILDING' && !this._moving;
    const hammerT    = isBuilding ? (this._buildTime || 0) * 0.005 : 0;
    // Hammer arm: right arm swings up/down rapidly
    const hammerSwing = isBuilding ? Math.sin(hammerT * 3) * 0.9 : 0;

    // Left arm
    const laAngle = isBuilding ? 0.2 : armSwing;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW / 2, bodyY);
    ctx.lineTo(
      cx - bodyW / 2 - armL * 0.5 + Math.sin(laAngle) * armL * f,
      bodyY + 1 + Math.cos(laAngle) * armL * 0.5
    );
    ctx.stroke();

    // Right arm (hammer swing when building)
    const raAngle = isBuilding ? -hammerSwing : -armSwing;
    const raEndX = cx + bodyW / 2 + armL * 0.5 + Math.sin(raAngle) * armL * f;
    const raEndY = bodyY + 1 + Math.cos(raAngle) * armL * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + bodyW / 2, bodyY);
    ctx.lineTo(raEndX, raEndY);
    ctx.stroke();

    // Draw tiny hammer head at arm tip when building
    if (isBuilding) {
      ctx.fillStyle = '#888';
      ctx.fillRect(raEndX - 2, raEndY - 1, 4, 2);
      ctx.fillStyle = '#c8a060';
      ctx.fillRect(raEndX - 1, raEndY, 2, 3);
    }

    // ── Weapon / tool overlay (Phase 29) ─────────────────────
    if (!isBuilding) {
      drawWeaponOverlay(ctx, cx, bodyY, f, this.weapon, this.state);
    }

    // ── Head ──────────────────────────────────────────────────
    ctx.fillStyle = this.skinColour;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Face dot eyes (facing direction)
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const eyeOffX = headR * 0.35 * f;
    const eyeOffY = -0.5;
    // Two eyes slightly offset
    ctx.beginPath();
    ctx.arc(cx + eyeOffX - 1 * f, headY + eyeOffY, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffX + 1 * f, headY + eyeOffY, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // ── Hat ───────────────────────────────────────────────────
    ctx.fillStyle = this.hatColour;
    // Brim
    ctx.beginPath();
    ctx.ellipse(cx, hatTopY + 2, headR + 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Crown
    ctx.fillRect(cx - headR * 0.7, hatTopY - 3, headR * 1.4, 5);

    // ── HP bar if injured ─────────────────────────────────────
    if (this.hp < this.maxHp) {
      const bw = 14;
      const bx = cx - bw / 2;
      const by = hatTopY - 7;
      ctx.fillStyle = '#600';
      ctx.fillRect(bx, by, bw, 2);
      ctx.fillStyle = '#4c4';
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 2);
    }

    ctx.restore();
  }
}

// Global citizen list
export const citizens = [];

// Grave markers: { x, y } world-px positions of fallen citizens
const graves = [];
events.on(EV.CITIZEN_DIED, ({ citizen }) => {
  graves.push({ x: citizen.x, y: citizen.y });
});

/** Draw all grave markers on the ground layer (call before Y-sort pass). */
export function renderGraves(ctx) {
  for (const g of graves) drawGrave(ctx, g.x, g.y);
}

/** Clear graves (call on new game / session reset). */
export function clearGraves() { graves.length = 0; }

export function spawnCitizens(building, count = 3) {
  for (let i = 0; i < count; i++) {
    const c = new Citizen(building);
    citizens.push(c);
    events.emit(EV.CITIZEN_SPAWNED, { citizen: c });
  }
}

export function updateCitizens(dt) {
  for (let i = citizens.length - 1; i >= 0; i--) {
    const c = citizens[i];
    c.update(dt);
    if (c.dead) citizens.splice(i, 1);
  }
}

export function renderCitizens(ctx) {
  // Y-sort (legacy — now called via init.js Y-sorted pass)
  const sorted = [...citizens].sort((a, b) => a.sortY - b.sortY);
  for (const c of sorted) c.draw(ctx);
}
