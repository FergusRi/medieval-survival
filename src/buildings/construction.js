// ============================================================
// construction.js — Construction system (Phase 8)
// Buildings stay in 'blueprint' state until citizens build them (Phase 9).
// This module handles: progress tracking, completion logic, scaffold rendering.
// ============================================================
import { events, EV } from '../engine/events.js';
import { placedBuildings } from './placement.js';

// Called by a citizen worker each tick with seconds of work done
export function applyBuildWork(building, seconds) {
  if (building.state !== 'blueprint') return;
  building.buildProgress += seconds;
  if (building.buildProgress >= building.buildTime) {
    building.buildProgress = building.buildTime;
    completeBuilding(building);
  }
}

export function completeBuilding(building) {
  if (building.state === 'complete') return;
  building.state = 'complete';
  events.emit(EV.BUILDING_COMPLETED, { building });
}

// Draw scaffold/progress bar over blueprint buildings (called in render pass 3)
export function renderConstruction(ctx) {
  const TILE = 32;
  for (const b of placedBuildings.values()) {
    if (b.state !== 'blueprint') continue;

    const px = b.tx * TILE;
    const py = b.ty * TILE;
    const pw = b.w  * TILE;
    const ph = b.h  * TILE;

    // Scaffold hatch pattern over footprint
    ctx.save();
    ctx.strokeStyle = 'rgba(180,140,60,0.6)';
    ctx.lineWidth = 1;
    const step = 8;
    ctx.beginPath();
    for (let i = -ph; i < pw + ph; i += step) {
      ctx.moveTo(px + i,      py);
      ctx.lineTo(px + i + ph, py + ph);
    }
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.stroke();
    ctx.restore();

    // Outline
    ctx.strokeStyle = '#b08030';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Progress bar (bottom of footprint)
    const pct = b.buildTime > 0 ? b.buildProgress / b.buildTime : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px + 2, py + ph - 8, pw - 4, 6);
    ctx.fillStyle = pct > 0.66 ? '#44cc44' : pct > 0.33 ? '#cccc22' : '#cc6622';
    ctx.fillRect(px + 2, py + ph - 8, Math.max(0, (pw - 4) * pct), 6);

    // "Under Construction" label
    ctx.fillStyle = '#ffe080';
    ctx.font = `bold ${Math.max(7, TILE * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔨 Building...', px + pw / 2, py + ph / 2);
  }
}
