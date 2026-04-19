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

const TILE = 32;
const WANDER_RADIUS = 5; // tiles

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

function randomWanderTarget(cx, cy) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const dx = Math.floor((Math.random() * 2 - 1) * WANDER_RADIUS);
    const dy = Math.floor((Math.random() * 2 - 1) * WANDER_RADIUS);
    const tx = Math.floor(cx / TILE) + dx;
    const ty = Math.floor(cy / TILE) + dy;
    if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
    const id = getTile(tx, ty);
    if (WALKABLE.has(id)) return { x: tx * TILE + 16, y: ty * TILE + 16 };
  }
  return null;
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
    this.target  = null; // { x, y } world px

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
  }

  update(dt) {
    const dtS = dt / 1000;
    this._idleTimer -= dt;

    // ── Check for nearby blueprints (highest priority) ────────
    if (this.state === 'IDLE' && !this.target && this._idleTimer <= 0) {
      const bp = findNearestBlueprint(this.x, this.y);
      if (bp) {
        // Walk to building centre
        this.state = 'BUILDING';
        this._buildTarget = bp;
        this.target = {
          x: bp.tx * TILE + (bp.w * TILE) / 2,
          y: bp.ty * TILE + (bp.h * TILE) / 2,
        };
      } else {
        this.target = randomWanderTarget(this.x, this.y);
        this._idleTimer = 1500 + Math.random() * 2500;
      }
    }

    // ── If BUILDING and arrived, do work ──────────────────────
    if (this.state === 'BUILDING') {
      const bp = this._buildTarget;
      // Blueprint was completed by someone else
      if (!bp || bp.state !== 'blueprint') {
        this.state = 'IDLE';
        this._buildTarget = null;
        this.target = null;
      } else {
        // Keep walking toward centre until close enough
        const bx = bp.tx * TILE + (bp.w * TILE) / 2;
        const by = bp.ty * TILE + (bp.h * TILE) / 2;
        const dist = Math.hypot(bx - this.x, by - this.y);
        if (dist < TILE * 1.5) {
          // Arrived — do build work
          this.target = null;
          this._moving = false;
          this._buildTime = (this._buildTime || 0) + dt;
          // Hammer animation: oscillate facing
          this.facing = Math.sin(this._buildTime * 0.005) >= 0 ? 1 : -1;
          applyBuildWork(bp, dtS);
          this.sortY = this.y + 4;
          return; // skip normal movement this tick
        } else if (!this.target) {
          // Re-target if we lost it
          this.target = { x: bx, y: by };
        }
      }
    }

    this._moving = false;

    // Move toward target
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        if (this.state === 'BUILDING') { /* will do work next tick */ }
        else this.state = 'IDLE';
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
    ctx.fillStyle = this.shirtColour;
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

export function spawnCitizens(building, count = 3) {
  for (let i = 0; i < count; i++) {
    const c = new Citizen(building);
    citizens.push(c);
    events.emit(EV.CITIZEN_SPAWNED, { citizen: c });
  }
}

export function updateCitizens(dt) {
  for (const c of citizens) c.update(dt);
}

export function renderCitizens(ctx) {
  // Y-sort (legacy — now called via init.js Y-sorted pass)
  const sorted = [...citizens].sort((a, b) => a.sortY - b.sortY);
  for (const c of sorted) c.draw(ctx);
}
