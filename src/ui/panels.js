// ============================================================
// panels.js — Info panel for buildings and citizens (Phase 22)
// ============================================================
// Click a building footprint  → building info panel (right side)
// Click a citizen bounding box → citizen info panel (right side)
// Click open ground           → close panel
// ============================================================

import { events, EV }          from '../engine/events.js';
import { camera }               from '../engine/camera.js';
import { placedBuildings }      from '../buildings/placement.js';
import { citizens }             from '../citizens/citizen.js';
import { BUILDINGS }            from '../buildings/registry.js';
import { TOWER_COMBAT }         from '../combat/towers.js';
import { SOIL }                 from '../farming/farm.js';
import { TILE_SIZE }            from '../world/map.js';
import { getGhostType }         from '../buildings/placement.js';
import { WEAPONS, WEAPON_COSTS, craftedWeapons, craftWeapon } from '../items/weapons.js';
import { resources }            from '../resources/resources.js';

// ── Constants ────────────────────────────────────────────────
const PANEL_W = 260;

const SOIL_ICONS = {
  [0]: '⬜', // UNTILLED  — use numeric keys resolved after import
};
const SOIL_LABELS = {};   // filled in _initSoilMaps()

const SKILL_LABELS = {
  mining:   '⛏ Mining',
  building: '🔨 Building',
  farming:  '🌾 Farming',
  combat:   '⚔️ Combat',
};

// ── State ────────────────────────────────────────────────────
let _panel      = null;
let _visible    = false;
let _targetBuilding = null;
let _targetCitizen  = null;

// ── Init ────────────────────────────────────────────────────
export function initInfoPanel() {
  _injectStyles();
  _createPanel();
  _setupClickHandler();
  // Refresh panel whenever relevant state changes
  events.on(EV.BUILDING_DAMAGED,    _refreshIfBuilding);
  events.on(EV.BUILDING_DESTROYED,  ({ building }) => {
    if (_targetBuilding?.id === building.id) closePanel();
  });
  events.on(EV.CITIZEN_DIED, ({ citizen }) => {
    if (_targetCitizen?.id === citizen.id) closePanel();
  });
}

// ── Panel DOM ───────────────────────────────────────────────
function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #info-panel {
      position: fixed;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      width: ${PANEL_W}px;
      max-height: 72vh;
      overflow-y: auto;
      z-index: 300;
      background: linear-gradient(to bottom, rgba(22,14,6,0.97), rgba(12,7,2,0.99));
      color: #e8d8a8;
      border: 2px solid #8b5e20;
      border-radius: 8px;
      padding: 12px 10px 14px;
      font-family: sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 28px rgba(0,0,0,0.75);
      display: none;
    }
    #info-panel::-webkit-scrollbar { width: 5px; }
    #info-panel::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 3px; }
    #info-panel::-webkit-scrollbar-thumb { background: #7a5020; border-radius: 3px; }
    #info-panel h2 {
      margin: 0 0 2px;
      font-size: 15px;
      color: #f0c060;
      letter-spacing: 0.5px;
    }
    #info-panel .panel-sub {
      color: #a07840;
      font-size: 11px;
      margin-bottom: 10px;
    }
    #info-panel .panel-close {
      position: absolute;
      top: 8px; right: 10px;
      background: none;
      border: none;
      color: #a07840;
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    #info-panel .panel-close:hover { color: #f0c060; }
    #info-panel .panel-section {
      margin: 8px 0 4px;
      font-size: 11px;
      color: #c8a060;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 1px solid #3a2508;
      padding-bottom: 3px;
    }
    #info-panel .hp-bar-bg {
      width: 100%;
      height: 8px;
      background: rgba(0,0,0,0.5);
      border-radius: 4px;
      margin: 4px 0 8px;
      overflow: hidden;
    }
    #info-panel .hp-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.2s;
    }
    #info-panel .staff-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 4px 0 8px;
    }
    #info-panel .staff-chip {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      background: rgba(255,200,100,0.12);
      border: 1px solid rgba(139,94,32,0.4);
      color: #e8d8a8;
    }
    #info-panel .staff-chip.empty {
      color: #604830;
      border-style: dashed;
    }
    #info-panel .skill-row {
      margin: 3px 0;
    }
    #info-panel .skill-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #c8a060;
      margin-bottom: 2px;
    }
    #info-panel .skill-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(0,0,0,0.4);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 5px;
    }
    #info-panel .skill-bar-fill {
      height: 100%;
      background: linear-gradient(to right, #3a7a3a, #60c060);
      border-radius: 3px;
    }
    #info-panel .farm-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px;
      margin: 6px 0;
    }
    #info-panel .farm-cell {
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(139,94,32,0.35);
      border-radius: 3px;
      text-align: center;
      padding: 3px 2px;
      font-size: 18px;
      line-height: 1.2;
    }
    #info-panel .farm-cell-label {
      font-size: 9px;
      color: #908060;
      display: block;
    }
    #info-panel .state-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    #info-panel .weapon-row {
      font-size: 12px;
      color: #e8d8a8;
      margin: 4px 0 8px;
    }
    #info-panel .tower-target {
      font-size: 12px;
      color: #e8d8a8;
      margin: 4px 0 8px;
      font-style: italic;
    }
    #info-panel .assign-btn {
      display: block;
      width: 100%;
      margin-top: 8px;
      padding: 6px 0;
      background: linear-gradient(to bottom, #6b4010, #4a2c08);
      color: #f5e4b8;
      border: 1px solid #c8903c;
      border-radius: 5px;
      cursor: pointer;
      font-size: 13px;
      font-family: sans-serif;
    }
    #info-panel .assign-btn:hover {
      background: linear-gradient(to bottom, #8b5a1a, #6b4010);
    }
    #info-panel .craft-grid {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 4px 0 8px;
    }
    #info-panel .craft-btn {
      display: block;
      width: 100%;
      text-align: left;
      padding: 5px 10px;
      background: rgba(255,220,150,0.07);
      color: #e8d8a8;
      border: 1px solid rgba(139,94,32,0.5);
      border-radius: 5px;
      cursor: pointer;
      font-family: sans-serif;
      font-size: 12px;
    }
    #info-panel .craft-btn:hover {
      background: rgba(255,200,100,0.18);
      border-color: #c8903c;
    }
    #info-panel .craft-btn-disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    #info-panel .craft-cost {
      color: #a88850;
      font-size: 11px;
      margin-left: 6px;
    }
  `;
  document.head.appendChild(s);
}

function _createPanel() {
  _panel = document.createElement('div');
  _panel.id = 'info-panel';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closePanel);
  _panel.appendChild(closeBtn);

  document.body.appendChild(_panel);
}

// ── Click routing ────────────────────────────────────────────
function _setupClickHandler() {
  const canvas = document.getElementById('game') ?? document.querySelector('canvas');
  if (!canvas) return;

  canvas.addEventListener('click', e => {
    // Skip if we're in ghost-placement mode (handled by buildInput)
    if (getGhostType()) return;

    const world = camera.screenToWorld(e.clientX, e.clientY);
    const tx    = Math.floor(world.x / TILE_SIZE);
    const ty    = Math.floor(world.y / TILE_SIZE);

    // Check citizens first (smaller target — priority)
    const citizen = _hitTestCitizen(world.x, world.y);
    if (citizen) { openCitizenPanel(citizen); return; }

    // Check buildings by footprint tile
    const building = _hitTestBuilding(tx, ty);
    if (building) { openBuildingPanel(building); return; }

    // Open ground — close panel
    closePanel();
  });
}

function _hitTestCitizen(wx, wy) {
  const HIT = 14;
  for (const c of citizens) {
    if (Math.abs(wx - c.x) < HIT && Math.abs(wy - c.y) < HIT) return c;
  }
  return null;
}

function _hitTestBuilding(tx, ty) {
  for (const b of placedBuildings.values()) {
    if (b.state !== 'complete') continue;
    if (tx >= b.tx && tx < b.tx + b.w && ty >= b.ty && ty < b.ty + b.h) return b;
  }
  return null;
}

// ── Refresh helpers ──────────────────────────────────────────
function _refreshIfBuilding({ building }) {
  if (_targetBuilding?.id === building.id) openBuildingPanel(building);
}

// ── Open / close ─────────────────────────────────────────────
export function closePanel() {
  _visible = false;
  _targetBuilding = null;
  _targetCitizen  = null;
  if (_panel) _panel.style.display = 'none';
}

export function openBuildingPanel(building) {
  _targetBuilding = building;
  _targetCitizen  = null;
  _visible = true;
  _renderBuildingPanel(building);
  _panel.style.display = 'block';
}

export function openCitizenPanel(citizen) {
  _targetCitizen  = citizen;
  _targetBuilding = null;
  _visible = true;
  _renderCitizenPanel(citizen);
  _panel.style.display = 'block';
}

// ── Building panel render ────────────────────────────────────
function _renderBuildingPanel(b) {
  const def      = BUILDINGS[b.type] ?? {};
  const hpPct    = Math.max(0, b.hp / b.maxHp);
  const hpColour = hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ff9800' : '#f44336';
  const stateName = b.state === 'blueprint' ? 'Under Construction' : 'Complete';

  // Staff list
  const totalSlots = b.staffSlots ?? 0;
  const staffChips = [];
  for (let i = 0; i < totalSlots; i++) {
    const cit = b.staff[i];
    staffChips.push(cit
      ? `<div class="staff-chip">${cit.name}</div>`
      : `<div class="staff-chip empty">— empty —</div>`
    );
  }

  // Tower extra
  let towerSection = '';
  if (TOWER_COMBAT[b.type]) {
    const tc = TOWER_COMBAT[b.type];
    towerSection = `
      <div class="panel-section">Tower Stats</div>
      <div class="tower-target">
        Range: ${tc.range}px &nbsp;·&nbsp; Fire rate: ${tc.fireRate}/s<br>
        Projectile: ${tc.projectile}
      </div>
    `;
  }

  // Blacksmith extra
  let blacksmithSection = '';
  if (b.type === 'blacksmith' && b.state === 'complete') {
    const weaponBtns = Object.entries(WEAPONS).map(([key, def]) => {
      const cost = WEAPON_COSTS[key];
      const costStr = Object.entries(cost).map(([r, v]) => `${v} ${r}`).join(' + ');
      const canAfford = Object.entries(cost).every(([r, v]) => (resources[r] ?? 0) >= v);
      return `<button class="craft-btn${canAfford ? '' : ' craft-btn-disabled'}" data-weapon="${key}">
        <b>${def.name}</b> <span class="craft-cost">${costStr}</span>
      </button>`;
    }).join('');
    blacksmithSection = `
      <div class="panel-section">Craft Weapons <span style="color:#606060;font-size:10px;">(${craftedWeapons.length} in stock)</span></div>
      <div class="craft-grid">${weaponBtns}</div>
    `;
  }

  // Armory extra
  let armorySection = '';
  if (b.type === 'armory' && b.state === 'complete') {
    const stock = craftedWeapons.length;
    armorySection = `
      <div class="panel-section">Armory</div>
      <div style="font-size:12px;color:#e8d8a8;margin:4px 0 8px;">
        ${stock > 0 ? `${stock} weapon${stock !== 1 ? 's' : ''} available — citizens will equip automatically.` : 'No weapons in stock. Craft some at the Blacksmith.'}
      </div>
    `;
  }

  // Farm Plot extra
  let farmSection = '';
  if (b.type === 'farm_plot' && b.soilTiles) {
    const cells = b.soilTiles.map(t => {
      const icon  = _soilIcon(t.state);
      const label = _soilLabel(t.state);
      const crop  = t.crop ? ` (${t.crop})` : '';
      return `<div class="farm-cell" title="${label}${crop}">${icon}<span class="farm-cell-label">${label}</span></div>`;
    }).join('');
    farmSection = `
      <div class="panel-section">Soil Tiles</div>
      <div class="farm-grid">${cells}</div>
    `;
  }

  _panel.innerHTML = `
    <button class="panel-close">✕</button>
    <h2>${def.name ?? b.type}</h2>
    <div class="panel-sub">${stateName}</div>

    <div class="panel-section">Health</div>
    <div style="font-size:11px;color:#a07840;margin-bottom:2px;">
      ${Math.ceil(b.hp)} / ${b.maxHp}
    </div>
    <div class="hp-bar-bg">
      <div class="hp-bar-fill" style="width:${(hpPct*100).toFixed(1)}%;background:${hpColour};"></div>
    </div>

    ${totalSlots > 0 ? `
      <div class="panel-section">Staff (${b.staff.length}/${totalSlots})</div>
      <div class="staff-row">${staffChips.join('')}</div>
    ` : ''}

    ${towerSection}
    ${blacksmithSection}
    ${armorySection}
    ${farmSection}
  `;

  // Re-attach close button listener (innerHTML replaced it)
  _panel.querySelector('.panel-close').addEventListener('click', closePanel);

  // Blacksmith craft buttons
  _panel.querySelectorAll('.craft-btn:not(.craft-btn-disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.weapon;
      if (craftWeapon(type)) {
        _renderBuildingPanel(b); // refresh panel to show updated stock & affordability
      }
    });
  });
}

// ── Citizen panel render ─────────────────────────────────────

// ── Rich task description for citizen detail panel ──────────
function _tileCoord(worldX, worldY) {
  const TILE_SIZE = 64;
  const tx = Math.floor(worldX / TILE_SIZE);
  const ty = Math.floor(worldY / TILE_SIZE);
  const col = String.fromCharCode(65 + (tx % 26));
  return `${col}${ty + 1}`;
}

function _describeTask(c) {
  switch (c.state) {
    case 'IDLE':
      return c._idleTimer > 0 ? '💤 Resting' : '💤 Looking for work';
    case 'GATHERING': {
      const node = c._gatherNode;
      const kind = c._gatherType === 'wood' ? '🪵 Chopping wood' : '🪨 Mining stone';
      if (node) {
        const coord = _tileCoord(node.cx, node.cy);
        const pct = Math.round((node.amount / node.maxAmount) * 100);
        return `${kind} at ${coord} (${pct}% remaining)`;
      }
      return c._gatherType === 'wood' ? '🪵 Searching for wood' : '🪨 Searching for stone';
    }
    case 'BUILDING': {
      const bp = c._buildTarget;
      if (bp) {
        const coord = _tileCoord(bp.tx * 64, bp.ty * 64);
        return `🔨 Constructing ${bp.type ?? 'building'} at ${coord}`;
      }
      return '🔨 Building';
    }
    case 'COMBAT': {
      const en = c.combatTarget;
      if (en) {
        const coord = _tileCoord(en.x, en.y);
        return `⚔️ Fighting enemy at ${coord}`;
      }
      return '⚔️ In combat';
    }
    case 'FARMING':
      return '🌾 Farming';
    case 'GUARDING':
      return '🛡️ On guard duty';
    case 'WANDERING':
      return '🚶 Wandering';
    default:
      return c.state;
  }
}

function _renderCitizenPanel(c) {
  const hpMax    = 100;
  const hpPct    = Math.max(0, Math.min(1, c.hp / hpMax));
  const hpColour = hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ff9800' : '#f44336';

  const stateBadgeColour = {
    IDLE:      '#607d8b',
    BUILDING:  '#ff9800',
    GATHERING: '#c8a030',
    FARMING:   '#5cb85c',
    GUARDING:  '#9b59b6',
    COMBAT:    '#f44336',
    WANDERING: '#78909c',
  }[c.state] ?? '#607d8b';

  const skillBars = Object.entries(SKILL_LABELS).map(([key, label]) => {
    const level = c.skills[key] ?? 0;
    const xp    = c.skillXp[key] ?? 0;
    const xpInLevel = xp % 100;
    return `
      <div class="skill-row">
        <div class="skill-label">
          <span>${label}</span>
          <span>Lv ${level} &nbsp;(${xpInLevel}/100 xp)</span>
        </div>
        <div class="skill-bar-bg">
          <div class="skill-bar-fill" style="width:${level}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  const weaponText = c.weapon
    ? `🗡️ ${c.weapon}`
    : '✊ Unarmed';

  _panel.innerHTML = `
    <button class="panel-close">✕</button>
    <h2>${c.name}</h2>
    <div class="panel-sub" style="margin-bottom:6px;">Citizen</div>

    <span class="state-badge" style="background:${stateBadgeColour}22;color:${stateBadgeColour};border:1px solid ${stateBadgeColour}66;">
      ${_describeTask(c)}
    </span>

    <div class="panel-section">Health</div>
    <div style="font-size:11px;color:#a07840;margin-bottom:2px;">
      ${Math.ceil(c.hp)} / ${hpMax}
    </div>
    <div class="hp-bar-bg">
      <div class="hp-bar-fill" style="width:${(hpPct*100).toFixed(1)}%;background:${hpColour};"></div>
    </div>

    <div class="panel-section">Skills</div>
    ${skillBars}

    <div class="panel-section">Equipment</div>
    <div class="weapon-row">${weaponText}</div>

    <button class="assign-btn" id="panel-assign-btn">📌 Assign to Building</button>
  `;

  _panel.querySelector('.panel-close').addEventListener('click', closePanel);
  _panel.querySelector('#panel-assign-btn').addEventListener('click', () => {
    events.emit(EV.CITIZEN_ASSIGN_REQUESTED, { citizen: c });
    closePanel();
  });
}

// ── Soil icon/label helpers ──────────────────────────────────
// SOIL values are numbers; import them after module is ready
let _soilResolved = false;
let _soilIconMap  = {};
let _soilLabelMap = {};

function _ensureSoilMaps() {
  if (_soilResolved) return;
  _soilResolved = true;
  // SOIL is imported at top — values are plain numbers
  _soilIconMap = {
    [SOIL.UNTILLED]:      '⬜',
    [SOIL.TILLED]:        '🟫',
    [SOIL.PLANTED]:       '🌱',
    [SOIL.NEEDS_WATER]:   '🏜️',
    [SOIL.WATERED]:       '💧',
    [SOIL.HARVEST_READY]: '🌾',
  };
  _soilLabelMap = {
    [SOIL.UNTILLED]:      'Untilled',
    [SOIL.TILLED]:        'Tilled',
    [SOIL.PLANTED]:       'Planted',
    [SOIL.NEEDS_WATER]:   'Dry',
    [SOIL.WATERED]:       'Watered',
    [SOIL.HARVEST_READY]: 'Ready',
  };
}

function _soilIcon(state) {
  _ensureSoilMaps();
  return _soilIconMap[state] ?? '❓';
}

function _soilLabel(state) {
  _ensureSoilMaps();
  return _soilLabelMap[state] ?? '?';
}

// ── Public refresh (called from render loop if panel open) ───
export function refreshInfoPanel() {
  if (!_visible) return;
  if (_targetBuilding) _renderBuildingPanel(_targetBuilding);
  else if (_targetCitizen) _renderCitizenPanel(_targetCitizen);
}
