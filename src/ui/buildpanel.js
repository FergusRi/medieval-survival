// ============================================================
// buildpanel.js — Build panel UI (reference art style)
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
    width: 300px;
    max-height: 58vh;
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

  // Scrollbar style
  const style = document.createElement('style');
  style.textContent = `
    #build-panel::-webkit-scrollbar { width: 6px; }
    #build-panel::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 3px; }
    #build-panel::-webkit-scrollbar-thumb { background: #7a5020; border-radius: 3px; }
    #build-panel h3 { margin: 0 0 8px; font-size:13px; color:#c8a060; text-align:center;
      border-bottom: 1px solid #4a3010; padding-bottom:6px; letter-spacing:1px; }
    .build-tier-header { font-weight:bold; margin:8px 0 4px;
      color:#c8a060; border-bottom:1px solid #3a2508; padding-bottom:3px; font-size:12px; }
    .build-btn { display:block; width:100%; text-align:left; margin:2px 0;
      padding:6px 10px; background:rgba(255,220,150,0.06); color:#e8d8a8;
      border:1px solid rgba(139,94,32,0.4); border-radius:5px; cursor:pointer;
      font-family:sans-serif; font-size:13px; transition: background 0.1s; }
    .build-btn:hover { background:rgba(255,200,100,0.15); border-color:#c8903c; }
    .build-btn .cost { color:#a88850; font-size:11px; display:block; margin-top:1px; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const title = document.createElement('h3');
  title.textContent = '⚒ CONSTRUCTION';
  panel.appendChild(title);

  // Group by tier
  const tiers = { special: [], 1: [], 2: [], 3: [] };
  for (const [key, def] of Object.entries(BUILDINGS)) {
    const t = String(def.tier);
    if (tiers[t]) tiers[t].push(key);
  }

  const tierLabels = {
    special: '⭐ Special',
    1:       '🪵 Tier 1 — Basic',
    2:       '⚙️ Tier 2 — Advanced',
    3:       '🏰 Tier 3 — Military',
  };

  for (const [tier, keys] of Object.entries(tiers)) {
    if (!keys.length) continue;

    const header = document.createElement('div');
    header.className = 'build-tier-header';
    header.textContent = tierLabels[tier] ?? `Tier ${tier}`;
    panel.appendChild(header);

    for (const key of keys) {
      const def = BUILDINGS[key];
      const btn2 = document.createElement('button');
      btn2.className = 'build-btn';
      btn2.innerHTML = `<span><b>${def.name}</b></span><span class="cost">${costLabel(key)}</span>`;
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
