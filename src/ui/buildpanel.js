// ============================================================
// buildpanel.js — Build panel UI (Middle Path redesign)
// Flat list grouped by category, no tier gates
// ============================================================
import { BUILDINGS } from '../buildings/registry.js';
import { BUILDING_COSTS } from '../resources/resources.js';
import { startGhost, cancelGhost } from '../buildings/placement.js';

let panel  = null;
let isOpen = false;

function costLabel(type) {
  const cost = BUILDING_COSTS[type];
  if (!cost) return 'Free';
  return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' · ');
}

// Category grouping for flat display
const CATEGORIES = [
  { label: '🏠 Housing',          keys: ['log_cabin'] },
  { label: '🌾 Food & Resources', keys: ['farm_plot', 'lumber_camp', 'pit_mine', 'storehouse'] },
  { label: '⚒ Crafting',          keys: ['forge', 'market'] },
  { label: '⛪ Civic',             keys: ['herbalist', 'church'] },
  { label: '⚔ Military',          keys: ['barracks', 'watchtower', 'arrow_tower'] },
  { label: '🪵 Walls',             keys: ['palisade', 'stone_wall'] },
];

export function initBuildPanel() {
  // ── Toggle button ─────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'build-toggle';
  btn.innerHTML = '🔨 <b>Build</b>';
  btn.style.cssText = `
    position: fixed;
    bottom: 52px;
    left: 12px;
    z-index: 200;
    padding: 7px 14px;
    font-size: 14px;
    background: linear-gradient(to bottom, #a06828, #6b4010);
    color: #f5e4b8;
    border: 2px solid #c8903c;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
    font-family: sans-serif;
    letter-spacing: 0.3px;
  `;
  document.body.appendChild(btn);

  // ── Panel ─────────────────────────────────────────────────
  panel = document.createElement('div');
  panel.id = 'build-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 12px;
    z-index: 200;
    width: 280px;
    max-height: 60vh;
    overflow-y: auto;
    background: linear-gradient(to bottom, rgba(28,18,8,0.97), rgba(18,11,4,0.99));
    color: #e8d8a8;
    border: 2px solid #8b5e20;
    border-radius: 8px;
    padding: 10px 8px;
    display: none;
    font-family: sans-serif;
    font-size: 13px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.7);
  `;

  const style = document.createElement('style');
  style.textContent = `
    #build-panel::-webkit-scrollbar { width: 6px; }
    #build-panel::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 3px; }
    #build-panel::-webkit-scrollbar-thumb { background: #7a5020; border-radius: 3px; }
    #build-panel h3 {
      margin: 0 0 8px; font-size: 13px; color: #c8a060; text-align: center;
      border-bottom: 1px solid #4a3010; padding-bottom: 6px; letter-spacing: 1px;
    }
    .build-cat-header {
      font-weight: bold; margin: 8px 0 3px;
      color: #c8a060; border-bottom: 1px solid #3a2508;
      padding-bottom: 3px; font-size: 11px; letter-spacing: 0.5px;
    }
    .build-btn {
      display: flex; width: 100%; text-align: left; margin: 2px 0;
      padding: 5px 8px; background: rgba(255,220,150,0.05); color: #e8d8a8;
      border: 1px solid rgba(139,94,32,0.35); border-radius: 5px; cursor: pointer;
      font-family: sans-serif; font-size: 13px; transition: background 0.1s;
      justify-content: space-between; align-items: center; gap: 6px;
      box-sizing: border-box;
    }
    .build-btn:hover { background: rgba(255,200,100,0.14); border-color: #c8903c; }
    .build-btn .bname { font-weight: bold; white-space: nowrap; }
    .build-btn .cost  { color: #a88850; font-size: 10px; white-space: nowrap; }
    .build-btn .bsize { color: #806840; font-size: 10px; white-space: nowrap; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const title = document.createElement('h3');
  title.textContent = '⚒ CONSTRUCTION';
  panel.appendChild(title);

  for (const { label, keys } of CATEGORIES) {
    const header = document.createElement('div');
    header.className = 'build-cat-header';
    header.textContent = label;
    panel.appendChild(header);

    for (const key of keys) {
      const def = BUILDINGS[key];
      if (!def) continue;
      const sizeLabel = def.w === 1 && def.h === 1 ? '1×1' : `${def.w}×${def.h}`;
      const btn2 = document.createElement('button');
      btn2.className = 'build-btn';
      btn2.innerHTML = `
        <span class="bname">${def.name}</span>
        <span class="bsize">${sizeLabel}</span>
        <span class="cost">${costLabel(key)}</span>
      `;
      btn2.title = def.description;
      btn2.addEventListener('click', () => { startGhost(key); closePanel(); });
      panel.appendChild(btn2);
    }
  }

  btn.addEventListener('click', () => isOpen ? closePanel() : openPanel());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePanel(); cancelGhost(); }
  });
}

function openPanel()  { isOpen = true;  panel.style.display = 'block'; }
function closePanel() { isOpen = false; panel.style.display = 'none';  }
