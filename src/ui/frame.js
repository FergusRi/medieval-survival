// ============================================================
// frame.js — Game UI frame: top bar + bottom bar + build panel
// Build panel has collapsible tier dropdowns with tooltips
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

// Track which tier sections are expanded
const tierOpen = { special: true, 1: true, 2: false, 3: false };

const TIER_META = {
  special: { label: '⭐  Special',                  colour: '#d4a84b' },
  1:       { label: '🪵  Tier 1 — The Settlement',  colour: '#a8c878' },
  2:       { label: '🏘️  Tier 2 — The Town',         colour: '#78b8d8' },
  3:       { label: '🏰  Tier 3 — The Castle',       colour: '#c878c8' },
};

// ── Styles ───────────────────────────────────────────────────
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
    #frame-top .hint { font-size:11px; color:#7a6040; white-space:nowrap; }

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
    #res-bar { display:flex; align-items:center; gap:16px; flex:1; }
    .res-item {
      display:flex; align-items:center; gap:4px;
      color:#e8d090; font-size:13px; font-weight:600; font-family:sans-serif;
    }
    .res-item .icon { font-size:16px; line-height:1; }
    .res-item .val  { min-width:24px; }

    /* ── Build panel ── */
    #build-panel {
      position:fixed; bottom:${BOTTOM_BAR_H + 8}px; left:14px; z-index:500;
      width:300px; max-height:60vh; overflow-y:auto;
      background:linear-gradient(to bottom,rgba(28,18,8,0.98),rgba(15,9,3,0.99));
      color:#e8d8a8; border:2px solid #8b5e20; border-radius:8px;
      padding:8px 8px 10px; display:none;
      font-family:sans-serif; font-size:13px;
      box-shadow:0 4px 24px rgba(0,0,0,0.8);
    }
    #build-panel h3 {
      margin:0 0 8px; font-size:13px; color:#c8a060; text-align:center;
      border-bottom:1px solid #4a3010; padding-bottom:6px; letter-spacing:1px;
    }

    /* Tier header / dropdown toggle */
    .bp-tier-hdr {
      display:flex; align-items:center; justify-content:space-between;
      width:100%; padding:6px 8px; margin:4px 0 0;
      background:rgba(255,220,130,0.07); border:1px solid rgba(139,94,32,0.5);
      border-radius:5px; cursor:pointer; font-weight:bold; font-size:12px;
      font-family:sans-serif; letter-spacing:0.5px;
      transition:background 0.15s;
    }
    .bp-tier-hdr:hover { background:rgba(255,200,100,0.14); }
    .bp-tier-arrow { font-size:10px; transition:transform 0.2s; }
    .bp-tier-arrow.open { transform:rotate(90deg); }

    /* Buildings list inside a tier */
    .bp-tier-body { overflow:hidden; }

    /* Individual building button */
    .bp-btn {
      display:block; width:100%; text-align:left; margin:2px 0;
      padding:5px 10px 5px 14px;
      background:rgba(255,220,150,0.04); color:#e8d8a8;
      border:1px solid rgba(139,94,32,0.3); border-radius:5px; cursor:pointer;
      font-family:sans-serif; font-size:12px; position:relative;
    }
    .bp-btn:hover { background:rgba(255,200,100,0.14); border-color:#c8903c; }
    .bp-btn .bp-name { display:block; font-weight:600; }
    .bp-btn .bp-cost { color:#a88850; font-size:11px; display:block; margin-top:1px; }

    /* Tooltip */
    .bp-tooltip {
      position:fixed; z-index:600; pointer-events:none;
      background:rgba(10,6,2,0.95); border:1px solid #7a5020;
      border-radius:6px; padding:8px 10px; max-width:220px;
      font-size:11px; line-height:1.5; color:#e8d8a8;
      box-shadow:0 4px 16px rgba(0,0,0,0.8);
      display:none;
    }
    .bp-tooltip .tt-name { font-weight:bold; color:#d4a84b; margin-bottom:4px; display:block; }
    .bp-tooltip .tt-size { color:#a88850; font-size:10px; }

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

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = '⚔ MEDIEVAL SURVIVAL';
  bar.appendChild(title);

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

  const hint = document.createElement('span');
  hint.className = 'hint';
  hint.innerHTML = '[WASD] pan &nbsp;·&nbsp; [Scroll] zoom &nbsp;·&nbsp; [M] map';
  bar.appendChild(hint);

  document.body.appendChild(bar);

  events.on(EV.RESOURCE_CHANGED, ({ resource, newValue }) => {
    if (resourceEls[resource]) resourceEls[resource].textContent = Math.floor(newValue);
  });
}

// ── Bottom bar ───────────────────────────────────────────────
function buildBottomBar() {
  const bar = document.createElement('div');
  bar.id = 'frame-bottom';

  const btn = document.createElement('button');
  btn.id = 'build-toggle';
  btn.innerHTML = '🔨 Build';
  btn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  bar.appendChild(btn);

  document.body.appendChild(bar);
}

// ── Tooltip singleton ─────────────────────────────────────────
let tooltip = null;
function getTooltip() {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'bp-tooltip';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}
function showTooltip(e, def, cost) {
  const tt = getTooltip();
  const costStr = cost
    ? Object.entries(cost).map(([k,v]) => `${v} ${k}`).join(' · ')
    : 'Free';
  tt.innerHTML = `
    <span class="tt-name">${def.name}</span>
    <span>${def.description ?? ''}</span><br>
    <span class="tt-size" style="margin-top:4px;display:block;">
      Size: ${def.w}×${def.h} &nbsp;·&nbsp; Build: ${def.buildTime}s &nbsp;·&nbsp; Cost: ${costStr}
    </span>`;
  tt.style.display = 'block';
  moveTooltip(e);
}
function moveTooltip(e) {
  const tt = getTooltip();
  const pad = 12;
  let x = e.clientX + pad;
  let y = e.clientY - 10;
  if (x + 230 > window.innerWidth)  x = e.clientX - 230 - pad;
  if (y + 160 > window.innerHeight) y = window.innerHeight - 170;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}
function hideTooltip() {
  getTooltip().style.display = 'none';
}

// ── Build panel ───────────────────────────────────────────────
function buildPanel() {
  panel = document.createElement('div');
  panel.id = 'build-panel';

  const title = document.createElement('h3');
  title.textContent = '⚒ CONSTRUCTION';
  panel.appendChild(title);

  // Group buildings by tier
  const groups = { special: [], 1: [], 2: [], 3: [] };
  for (const [key, def] of Object.entries(BUILDINGS)) {
    const t = String(def.tier);
    if (groups[t]) groups[t].push(key);
  }

  for (const [tier, keys] of Object.entries(groups)) {
    if (!keys.length) continue;
    const meta = TIER_META[tier];

    // ── Tier header (clickable) ──
    const hdr = document.createElement('button');
    hdr.className = 'bp-tier-hdr';
    hdr.style.color = meta.colour;
    const arrow = document.createElement('span');
    arrow.className = 'bp-tier-arrow' + (tierOpen[tier] ? ' open' : '');
    arrow.textContent = '▶';
    hdr.innerHTML = `<span>${meta.label}</span>`;
    hdr.appendChild(arrow);

    // ── Tier body (collapsible) ──
    const body = document.createElement('div');
    body.className = 'bp-tier-body';
    body.style.display = tierOpen[tier] ? 'block' : 'none';

    hdr.addEventListener('click', () => {
      tierOpen[tier] = !tierOpen[tier];
      body.style.display = tierOpen[tier] ? 'block' : 'none';
      arrow.classList.toggle('open', tierOpen[tier]);
    });

    // ── Building buttons ──
    for (const key of keys) {
      const def  = BUILDINGS[key];
      const cost = BUILDING_COSTS[key];
      const costStr = cost
        ? Object.entries(cost).map(([k,v]) => `${v} ${k}`).join(' · ')
        : 'Free';

      const btn = document.createElement('button');
      btn.className = 'bp-btn';
      btn.innerHTML = `<span class="bp-name">${def.name}</span><span class="bp-cost">${costStr}</span>`;

      btn.addEventListener('click', () => { startGhost(key); closePanel(); hideTooltip(); });
      btn.addEventListener('mouseenter', e => showTooltip(e, def, cost));
      btn.addEventListener('mousemove',  e => moveTooltip(e));
      btn.addEventListener('mouseleave', hideTooltip);

      body.appendChild(btn);
    }

    panel.appendChild(hdr);
    panel.appendChild(body);
  }

  document.body.appendChild(panel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePanel(); cancelGhost(); hideTooltip(); }
  });
}

function openPanel()  { isOpen = true;  panel.style.display = 'block'; }
function closePanel() { isOpen = false; panel.style.display = 'none';  }

// ── Init ──────────────────────────────────────────────────────
export function initFrame() {
  injectStyles();
  buildTopBar();
  buildBottomBar();
  buildPanel();
}
