// ============================================================
// fog.js — Fog of War system
// ============================================================
import { events, EV } from '../engine/events.js';
import { MAP_SIZE } from './map.js';

export const FOG_UNEXPLORED = 0;
export const FOG_SEEN       = 1;
export const FOG_VISIBLE    = 2;

export const fog = new Uint8Array(MAP_SIZE * MAP_SIZE);

// Reveal a circular radius around a point
export function revealCircle(cx, cy, radius) {
  const r2 = radius * radius;
  for (let ty = cy - radius; ty <= cy + radius; ty++) {
    for (let tx = cx - radius; tx <= cx + radius; tx++) {
      if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
      const dx = tx - cx, dy = ty - cy;
      if (dx * dx + dy * dy <= r2) {
        const i = ty * MAP_SIZE + tx;
        if (fog[i] < FOG_VISIBLE) fog[i] = FOG_VISIBLE;
      }
    }
  }
}

// Called each frame: reset VISIBLE→SEEN, then re-reveal from all sources
// visionSources: array of { tx, ty, radius }
export function updateFog(visionSources) {
  for (let i = 0; i < fog.length; i++) {
    if (fog[i] === FOG_VISIBLE) fog[i] = FOG_SEEN;
  }
  for (const src of visionSources) {
    revealCircle(src.tx, src.ty, src.radius);
  }
  events.emit(EV.FOG_UPDATED, {});
}

// Vision source radii (tiles):
// Settlement=5, Turrets=6, Citizen=3
export const VISION_RADII = {
  settlement:       5,
  turret_ballista:  6,
  turret_cannon:    6,
  citizen:          3,
};
