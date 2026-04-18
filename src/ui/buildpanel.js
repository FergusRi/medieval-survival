// ============================================================
// buildpanel.js — Build panel HTML UI
// ============================================================
import { BUILDINGS } from '../buildings/registry.js';
import { BUILDING_COSTS } from '../resources/resources.js';
import { startGhost, cancelGhost } from '../buildings/placement.js';

let panel = null;
let isOpen = false;

function costLabel(type) {
  const cost = BUILDING_COSTS[type];
  if (!cost) return '';
  return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ');
}

export function initBuildPanel() {
  // Toggle button
  const btn = document.createElement('button');
  btn.id = 'build-toggle';
  btn.textContent = '🔨 Build';
  btn.style.cssText = `
    position:fixed; bottom:48px; left:16px; z-index:200;
    padding:8px 16px; font-size:15px; font-weight:bold;
    background:#8b5e20; color:#fff; border:2px solid #c8a060;
    border-radius:6px; cursor:pointer;
  `;
  document.body.appendChild(btn);

  // Panel
  panel = document.createElement('div');
  panel.id = 'build-panel';
  panel.style.cssText = `
    position:fixed; bottom:100px; left:16px; z-index:200;
    width:320px; max-height:60vh; overflow-y:auto;
    background:rgba(20,15,10,0.93); color:#e8d8b0;
    border:2px solid #8b5e20; border-radius:8px;
    padding:10px; display:none; font-family:sans-serif; font-size:13px;
  `;
  document.body.appendChild(panel);

  // Group buildings by tier
  const tiers = { 1: [], 2: [], 3: [], special: [] };
  for (const [key, def] of Object.entries(BUILDINGS)) {
    const t = String(def.tier);
    if (tiers[t]) tiers[t].push(key);
  }

  const tierLabels = { special: '⭐ Special', 1: '🪵 Tier 1', 2: '⚙️ Tier 2', 3: '🏰 Tier 3' };
  for (const [tier, keys] of Object.entries(tiers)) {
    if (!keys.length) continue;
    const header = document.createElement('div');
    header.textContent = tierLabels[tier] ?? `Tier ${tier}`;
    header.style.cssText = 'font-weight:bold; margin:8px 0 4px; color:#c8a060; border-bottom:1px solid #4a3010; padding-bottom:2px;';
    panel.appendChild(header);

    for (const key of keys) {
      const def = BUILDINGS[key];
      const row = document.createElement('button');
      const cost = costLabel(key);
      row.innerHTML = `<b>${def.name}</b> <span style="color:#aaa;font-size:11px">${cost ? '— ' + cost : ''}</span>`;
      row.style.cssText = `
        display:block; width:100%; text-align:left; margin:2px 0;
        padding:5px 8px; background:rgba(255,255,255,0.06);
        color:#e8d8b0; border:1px solid #4a3010; border-radius:4px; cursor:pointer;
      `;
      row.addEventListener('click', () => {
        startGhost(key);
        closePanel();
      });
      panel.appendChild(row);
    }
  }

  btn.addEventListener('click', () => isOpen ? closePanel() : openPanel());

  // ESC closes panel / cancels ghost
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePanel(); cancelGhost(); }
  });
}

function openPanel()  { isOpen = true;  panel.style.display = 'block'; }
function closePanel() { isOpen = false; panel.style.display = 'none'; }
