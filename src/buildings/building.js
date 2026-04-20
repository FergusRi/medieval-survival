// ============================================================
// building.js — Base building class
// ============================================================
import { BUILDINGS } from './registry.js';
import { createSoilTiles } from '../farming/farm.js';

// Construction progress threshold for frame stage (30% = frame visible)
export const FRAME_THRESHOLD = 0.30;

// Wall/door types that visually connect to neighbours
export const WALL_TYPES = new Set([
  'wall_wood', 'wall_stone', 'wall_metal', 'door_wood', 'door_reinforced',
]);

// Turret types that store an aim angle
export const TURRET_TYPES = new Set(['turret_ballista', 'turret_cannon']);

export class Building {
  constructor(type, tx, ty, rotation = 0) {
    this.id   = crypto.randomUUID();
    this.type = type;
    const def = BUILDINGS[type];
    this.rotation = 0; // rotation reserved for future use
    this.tx = tx; this.ty = ty;
    this.w  = def.w; this.h  = def.h;
    this.hp = def.hp; this.maxHp = def.hp;
    this.staffSlots = def.staffSlots;
    this.staff = [];
    this.buildTime = def.buildTime;
    this.buildProgress = 0;
    this.state = def.buildTime === 0 ? 'complete' : 'blueprint';
    this.sortY = (ty + def.h) * 32;
    // Combat state
    this._flashTimer = 0;
    // Turret aim angle (radians, updated each frame by towers.js)
    this._aimAngle = TURRET_TYPES.has(type) ? 0 : null;
    // Farm Plot: per-tile soil state grid
    if (type === 'farm_plot') {
      this.soilTiles    = createSoilTiles(def.w * def.h);
      this.selectedCrop = 'wheat';
    }
  }

  get footprintTiles() {
    const tiles = [];
    for (let dy = 0; dy < this.h; dy++)
      for (let dx = 0; dx < this.w; dx++)
        tiles.push({ tx: this.tx + dx, ty: this.ty + dy });
    return tiles;
  }
}
