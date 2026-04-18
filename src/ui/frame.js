// ============================================================
// frame.js — Game UI frame: top bar + bottom bar
// ============================================================
import { resources } from '../resources/resources.js';
import { events, EV } from '../engine/events.js';
import { startGhost, cancelGhost } from '../buildings/placement.js';
import { BUILDINGS } from '../buildings/registry.js';
import { BUILDING_COSTS } from '../resources/resources.js';

export const TOP_BAR_H    = 36;
export const BOTTOM_BAR_H = 52;

const ICONS = { food:'🌾', wood:'🪵', stone:'🪨', metal:'⚙️', gold:'💰', medicine:'🧪' };

let resourceEls = {};
let panel = null;
let isOpen = false;

// ── Shared style tag ─────────────────────────────────────────
function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #frame-top {
      position:fixed; top:0; left:0; right:0; height:${TOP_BAR_H}px;
      background:linear-gradient(to bottom,#1e1208,#120b04);
      border-bottom:2px solid #7a5020;
      display:flex; align-items:center; justify-content:space-between;
      padding:0 14px; z-index:400; font-family:sans-serif;
      box-shadow:0 2px 12px rgba(0,0,0,0.7);
    }
    #frame-top .title {
      font-size:13px; font-weight:bold; color:#d4a84b;
      letter-spacing:2px; text-shadow:0 1px 4px #000;
      white-space:nowrap; margin-right:16px; flex-shrink:0;
    }
    #frame-top .hint {
      font-size:11px; color:#7a6040; white-space:nowrap;
    }
    #frame-bottom {
      position:fixed; bottom:0; left:0; right:0; height:${BOTTOM_BAR_H}px;
      background:linear-gradient(to top,#1e1208,#140d05);
      border-top:2px solid #7a5020;
      display:flex; align-items:center;
      padding:0 14px; gap:0; z-index:400;
      box-shadow:0 -2px 12px rgba(0,0,0,0.7);
    }
    #build-toggle {
      padding:6px 14px; font-size:13px; font-weight:bold;
      background:linear-gradient(to bottom,#a06828,#6b4010);
      color:#f5e4b8; border:2px solid #c8903c; border-radius:6px;
      cursor:pointer; font-family:sans-serif; letter-spacing:0.3px;
      box-shadow:0 2px 6px rgba(0,0,0,0.5); white-space:nowrap;
      margin-right:18px; flex-shrink:0;
    }
    #build-toggle:hover { background:linear-gradient(to bottom,#c07830,#8b5010); }
    #res-bar {
      display:flex; align-items:center; gap:16px; flex:1;
    }
    .res-item {
      display:flex; align-items:center; gap:4px;
      color:#e8d090; font-size:13px; font-weight:600; font-family:sans-serif;
    }
    .res-item .icon { font-size:16px; line-height:1; }
    .res-item .val  { min-width:24px; }

    #build-panel {
      position:fixed; bottom:${BOTTOM_BAR_H + 8}px; left:14px; z-index:500;
      width:290px; max-height:56vh; overflow-y:auto;
      background:linear-gradient(to bottom,rgba(28,18,8,0.98),rgba(15,9,3,0.99));
      color:#e8d8a8; border:2px solid #8b5e20; border-radius:8px;
      padding:10px 8px; display:none;
      font-family:sans-serif; font-size:13px;
      box-shadow:0 4px 24px rgba(0,0,0,0.8);
    }
    #build-panel h3 {
      margin:0 0 8px; font-size:13px; color:#c8a060; text-align:center;
      border-bottom:1px solid #4a3010; padding-bottom:6px; letter-spacing:1px;
    }
    .bp-tier { font-weight:bold; margin:8px 0 4px; color:#c8a060;
      border-bottom:1px solid #3a2508; padding-bottom:2px; font-size:11px; }
    .bp-btn {
      display:block; width:100%; text-align:left; margin:2px 0;
      padding:5px 10px; background:rgba(255,220,150,0.05); color:#e8d8a8;
      border:1px solid rgba(139,94,32,0.4); border-radius:5px; cursor:pointer;
      font-family:sans-serif; font-size:13px;
    }
    .bp-btn:hover { background:rgba(255,200,100,0.14); border-color:#c8903c; }
    .bp-btn .bp-cost { color:#a88850; font-size:11px; display:block; margin-top:1px; }
    #build-panel::-webkit-scrollbar { width:5px; }
    #build-panel::-webkit-scrollbar-track { background:rgba(0,0,0,0.3); }
    #build-panel::-webkit-scrollbar-thumb { background:#7a5020; border-radius:3px; }
  `;
  document.head.appendChild(s);
}

// ── Top bar ──────────────────────────────────────────────────
function buildTopBar() {
  const bar = document.createElement('div');
  bar.id = 'frame-top';

  // Title
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = '⚔ MEDIEVAL SURVIVAL';
  bar.appendChild(title);

  // Resources (left of centre)
  const res = document.createElement('div');
  res.id = 'res-bar';
  for (const [key, icon] of Object.entries(ICONS)) {
    const item = document.createElement('div');
    item.className = 'res-item';
    const valEl = document.createElement('span');
    valEl.className = 'val';
    valEl.textContent = Math.floor(resources[key] ?? 0);
    item.innerHTML = `<span class="icon">${icon}</span>`;
    item.appendChild(valEl);
    res.appendChild(item);
    resourceEls[key] = valEl;
  }
  bar.appendChild(res);

  // Hint (right)
  const hint = document.createElement('span');
  hint.className = 'hint';
  hint.innerHTML = '[WASD] pan &nbsp;·&nbsp; [Scroll] zoom &nbsp;·&nbsp; [M] map';
  bar.appendChild(hint);

  document.body.appendChild(bar);

  // Live resource updates
  events.on(EV.RESOURCE_CHANGED, ({ resource, newValue }) => {
    if (resourceEls[resource]) resourceEls[resource].textContent = Math.floor(newValue);
  });
}

// ── Bottom bar ───────────────────────────────────────────────
function buildBottomBar() {
  const bar = document.createElement('div');
  bar.id = 'frame-bottom';

  // Build button only
  const btn = document.createElement('button');
  btn.id = 'build-toggle';
  btn.innerHTML = '🔨 Build';
  btn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  bar.appendChild(btn);

  document.body.appendChild(bar);
}

// ── Build panel popup ─────────────────────────────────────────
function buildPanel() {
  panel = document.createElement('div');
  panel.id = 'build-panel';

  const title = document.createElement('h3');
  title.textContent = '⚒ CONSTRUCTION';
  panel.appendChild(title);

  const tiers = { special:[], 1:[], 2:[], 3:[] };
  for (const [key, def] of Object.entries(BUILDINGS)) {
    const t = String(def.tier);
    if (tiers[t]) tiers[t].push(key);
  }

  const tierLabels = { special:'⭐ Special', 1:'🪵 Tier 1 — Basic', 2:'⚙️ Tier 2 — Advanced', 3:'🏰 Tier 3 — Military' };
  for (const [tier, keys] of Object.entries(tiers)) {
    if (!keys.length) continue;
    const hdr = document.createElement('div');
    hdr.className = 'bp-tier';
    hdr.textContent = tierLabels[tier];
    panel.appendChild(hdr);
    for (const key of keys) {
      const def  = BUILDINGS[key];
      const cost = BUILDING_COSTS[key];
      const costStr = cost ? Object.entries(cost).map(([k,v])=>`${v} ${k}`).join(' · ') : 'Free';
      const btn2 = document.createElement('button');
      btn2.className = 'bp-btn';
      btn2.innerHTML = `<span><b>${def.name}</b></span><span class="bp-cost">${costStr}</span>`;
      btn2.addEventListener('click', () => { startGhost(key); closePanel(); });
      panel.appendChild(btn2);
    }
  }
  document.body.appendChild(panel);
  document.addEventListener('keydown', e => { if (e.key==='Escape') { closePanel(); cancelGhost(); } });
}

function openPanel()  { isOpen=true;  panel.style.display='block'; }
function closePanel() { isOpen=false; panel.style.display='none';  }

// ── Init ──────────────────────────────────────────────────────
export function initFrame() {
  injectStyles();
  buildTopBar();
  buildBottomBar();
  buildPanel();
}
