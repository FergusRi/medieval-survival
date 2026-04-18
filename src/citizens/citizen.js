// ============================================================
// citizen.js — Citizen entity
// ============================================================
import * as names from './names.js';
import { getTile, MAP_SIZE } from '../world/map.js';
import { T, TILE_DEF } from '../world/tiles.js';
import { events, EV } from '../engine/events.js';

const TILE = 32;
const WANDER_RADIUS = 5; // tiles

const WALKABLE = new Set([T.GRASS, T.DIRT, T.SAND, T.SCRUBLAND, T.STONE, T.FOREST]);

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
    this.vx    = 0; this.vy = 0;
    this.speed = 64; // px/s
    this.hp    = 100; this.maxHp = 100;
    this.skills  = { mining: 1, building: 1, farming: 1, combat: 1 };
    this.skillXp = { mining: 0, building: 0, farming: 0, combat: 0 };
    this.weapon  = null;
    this.state   = 'IDLE';
    this.target  = null; // { x, y } world px
    this.actionCount = 0;
    this.sortY   = this.y + 8;
    this._idleTimer = 0;
  }

  update(dt) {
    const dtS = dt / 1000;
    this._idleTimer -= dt;

    // Pick wander target if idle and no target
    if (this.state === 'IDLE' && !this.target && this._idleTimer <= 0) {
      this.target = randomWanderTarget(this.x, this.y);
      this._idleTimer = 1000 + Math.random() * 2000; // 1-3s pause
    }

    // Move toward target
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
      } else {
        const spd = Math.min(this.speed * dtS, dist);
        this.x += (dx / dist) * spd;
        this.y += (dy / dist) * spd;
      }
    }

    this.sortY = this.y + 8;
  }

  draw(ctx) {
    const W = 10, H = 16;
    const px = this.x - W / 2;
    const py = this.y - H;

    // Body
    ctx.fillStyle = '#d4b896';
    ctx.fillRect(px, py, W, H);

    // Head
    ctx.fillStyle = '#e8c8a0';
    ctx.beginPath();
    ctx.arc(this.x, py - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // HP bar if injured
    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#400';
      ctx.fillRect(px - 1, py - 10, W + 2, 3);
      ctx.fillStyle = '#4c4';
      ctx.fillRect(px - 1, py - 10, (W + 2) * (this.hp / this.maxHp), 3);
    }
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
  // Y-sort
  const sorted = [...citizens].sort((a, b) => a.sortY - b.sortY);
  for (const c of sorted) c.draw(ctx);
}
