// ============================================================
// building.js — Base building class
// ============================================================
import { BUILDINGS } from './registry.js';

export class Building {
  constructor(type, tx, ty) {
    this.id   = crypto.randomUUID();
    this.type = type;
    const def = BUILDINGS[type];
    this.tx = tx; this.ty = ty;
    this.w  = def.w; this.h  = def.h;
    this.hp = def.hp; this.maxHp = def.hp;
    this.staffSlots = def.staffSlots;
    this.staff = [];
    this.state = 'blueprint'; // 'blueprint' | 'complete'
    this.buildProgress = 0;
    this.buildTime = def.buildTime;
    this.sortY = (ty + def.h) * 32;
  }
  get footprintTiles() {
    const tiles = [];
    for (let dy = 0; dy < this.h; dy++)
      for (let dx = 0; dx < this.w; dx++)
        tiles.push({ tx: this.tx + dx, ty: this.ty + dy });
    return tiles;
  }
}
