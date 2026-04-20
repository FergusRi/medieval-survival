// ============================================================
// building.js — Base building class
// ============================================================
import { BUILDINGS } from './registry.js';
import { createSoilTiles } from '../farming/farm.js';

// Wall types that support rotation
export const ROTATABLE_BUILDINGS = new Set(['palisade', 'stone_wall']);

export class Building {
  constructor(type, tx, ty, rotation = 0) {
    this.id   = crypto.randomUUID();
    this.type = type;
    const def = BUILDINGS[type];
    // rotation: 0 = horizontal (E-W), 1 = vertical (N-S)
    this.rotation = ROTATABLE_BUILDINGS.has(type) ? rotation : 0;
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
    this._flashTimer = 0; // seconds remaining of damage flash
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
