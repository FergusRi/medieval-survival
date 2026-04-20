// ============================================================
// aftermath.js — Post-wave summary overlay (Phase 23)
// ============================================================
// Shown during AFTERMATH phase (15 s), auto-dismisses on WAVE_ENDED.
// Handles:
//   • Wave loot collection (enemies emit ENEMY_DIED with loot)
//   • Upkeep deduction (food cost based on citizen count + buildings)
//   • Skill XP application (actionCount → skill XP)
//   • Summary display
// ============================================================

import { events, EV }       from '../engine/events.js';
import { citizens, awardXp } from '../citizens/citizen.js';
import { resources, earn }   from '../resources/resources.js';
import { placedBuildings }   from '../buildings/placement.js';
import { getPhaseRemaining } from '../phases/timer.js';

// ── Wave loot per enemy type ─────────────────────────────────
const ENEMY_LOOT = {
  raider: { food: 2, gold: 1 },
  brute:  { stone: 3, gold: 1 },
  archer: { food: 1, gold: 2 },
  shaman: { gold: 3, food: 1 },
};

// ── State accumulated during COMBAT ─────────────────────────
let _waveLoot        = {};   // { resource: amount }
let _enemiesKilled   = 0;
let _citizensLost    = [];   // citizen names
let _combatActive    = false;

// ── DOM refs ─────────────────────────────────────────────────
let _overlay   = null;
let _timerBar  = null;
let _rafId     = null;

// ── Init ────────────────────────────────────────────────────
export function initAftermath() {
  _injectStyles();
  _createOverlay();
  _wireEvents();
}

// ── Event wiring ─────────────────────────────────────────────
function _wireEvents() {
  // Start accumulating on COMBAT start
  events.on(EV.COMBAT_STARTED, () => {
    _waveLoot      = {};
    _enemiesKilled = 0;
    _citizensLost  = [];
    _combatActive  = true;
  });

  // Track enemy deaths for loot
  events.on(EV.ENEMY_DIED, ({ enemy }) => {
    if (!_combatActive) return;
    _enemiesKilled++;
    const loot = ENEMY_LOOT[enemy.type] ?? {};
    for (const [res, amt] of Object.entries(loot)) {
      _waveLoot[res] = (_waveLoot[res] ?? 0) + amt;
    }
  });

  // Track citizen deaths
  events.on(EV.CITIZEN_DIED, ({ citizen }) => {
    _citizensLost.push(citizen.name);
  });

  // AFTERMATH: apply everything and show overlay
  events.on(EV.COMBAT_ENDED, ({ waveNumber }) => {
    _combatActive = false;
    const upkeep  = _applyUpkeep();
    _applyLoot();
    _applySkillXp();
    _showOverlay(waveNumber, upkeep);
  });

  // BUILD phase started — hide overlay
  events.on(EV.WAVE_ENDED, () => {
    _hideOverlay();
  });
}

// ── Upkeep deduction ─────────────────────────────────────────
function _applyUpkeep() {
  const citizenCount = citizens.length;
  let foodCost = 5 + citizenCount * 2;

  // Storage crates: -15% food upkeep if any are built
  const hasStorage = [...placedBuildings.values()].some(b => b.type === 'storage_crate' && b.state === 'complete');
  if (hasStorage) foodCost = Math.floor(foodCost * 0.85);

  // Deduct — clamp at 0
  const actual = Math.min(foodCost, resources.food ?? 0);
  if (actual > 0) {
    const old = resources.food;
    resources.food = Math.max(0, resources.food - foodCost);
    events.emit(EV.RESOURCE_CHANGED, { resource: 'food', oldValue: old, newValue: resources.food });
  }

  return foodCost;
}

// ── Loot award ───────────────────────────────────────────────
function _applyLoot() {
  if (Object.keys(_waveLoot).length > 0) {
    earn(_waveLoot);
  }
}

// ── Skill XP from actionCount ────────────────────────────────
// actionCount tracks generic work actions this wave.
// We award to the most-used skill proxy: builders get building XP,
// combat actors got XP inline — here we top up from actionCount.
function _applySkillXp() {
  for (const c of citizens) {
    if ((c.actionCount ?? 0) > 0) {
      // 1 XP per action for building skill (construction work)
      awardXp(c, 'building', Math.floor(c.actionCount * 0.5));
    }
    c.actionCount = 0; // reset for next wave
  }
}

// ── Overlay DOM ──────────────────────────────────────────────
function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #aftermath-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 500;
      width: 380px;
      background: linear-gradient(to bottom, rgba(12,7,2,0.97), rgba(22,14,6,0.97));
      color: #e8d8a8;
      border: 2px solid #8b5e20;
      border-radius: 10px;
      padding: 20px 24px 16px;
      font-family: sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.85);
      display: none;
      pointer-events: none;
    }
    #aftermath-overlay h2 {
      margin: 0 0 14px;
      font-size: 20px;
      color: #f0c060;
      text-align: center;
      letter-spacing: 1px;
    }
    #aftermath-overlay p {
      margin: 6px 0;
      line-height: 1.5;
    }
    #aftermath-overlay .am-label {
      color: #a07840;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 12px 0 4px;
      border-bottom: 1px solid #3a2508;
      padding-bottom: 3px;
    }
    #aftermath-overlay .am-killed  { color: #e74c3c; }
    #aftermath-overlay .am-loot    { color: #4caf50; }
    #aftermath-overlay .am-upkeep  { color: #ff9800; }
    #aftermath-overlay .am-lost    { color: #e74c3c; font-size: 12px; }
    #aftermath-overlay .am-next    {
      text-align: center;
      color: #a07840;
      font-size: 12px;
      margin-top: 14px;
    }
    #aftermath-timer-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(0,0,0,0.4);
      border-radius: 3px;
      margin-top: 8px;
      overflow: hidden;
    }
    #aftermath-timer-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(to right, #c8903c, #f0c060);
      border-radius: 3px;
      transition: width 0.2s linear;
    }
  `;
  document.head.appendChild(s);
}

function _createOverlay() {
  _overlay = document.createElement('div');
  _overlay.id = 'aftermath-overlay';
  _overlay.innerHTML = `
    <h2 id="am-title">Wave Complete</h2>
    <div class="am-label">Combat</div>
    <p id="am-enemies"></p>
    <p id="am-citizens-lost"></p>
    <div class="am-label">Resources Earned</div>
    <p id="am-loot" class="am-loot"></p>
    <div class="am-label">Upkeep</div>
    <p id="am-upkeep" class="am-upkeep"></p>
    <p class="am-next">Next wave in <span id="am-countdown">15</span>s...</p>
    <div id="aftermath-timer-bar-bg">
      <div id="aftermath-timer-bar"></div>
    </div>
  `;
  document.body.appendChild(_overlay);
  _timerBar = document.getElementById('aftermath-timer-bar');
}

// ── Show / hide ───────────────────────────────────────────────
function _showOverlay(waveNumber, upkeepFood) {
  document.getElementById('am-title').textContent   = `⚔️ Wave ${waveNumber} Complete`;
  document.getElementById('am-enemies').textContent =
    `Enemies defeated: ${_enemiesKilled}`;

  const lostEl = document.getElementById('am-citizens-lost');
  if (_citizensLost.length > 0) {
    lostEl.className = 'am-lost';
    lostEl.textContent = `Citizens lost: ${_citizensLost.length} — ${_citizensLost.join(', ')}`;
  } else {
    lostEl.className = '';
    lostEl.textContent = 'No citizens lost ✓';
  }

  const lootEl = document.getElementById('am-loot');
  if (Object.keys(_waveLoot).length > 0) {
    lootEl.textContent = Object.entries(_waveLoot)
      .map(([r, v]) => `+${v} ${r}`).join('  ·  ');
  } else {
    lootEl.textContent = 'None';
  }

  document.getElementById('am-upkeep').textContent =
    `-${upkeepFood} food`;

  _overlay.style.display = 'block';
  _animateTimer();
}

function _hideOverlay() {
  _overlay.style.display = 'none';
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
}

// ── Timer bar animation ───────────────────────────────────────
function _animateTimer() {
  if (_rafId) cancelAnimationFrame(_rafId);

  const DURATION = 15; // seconds — matches AFTERMATH phase duration

  function tick() {
    const remaining = getPhaseRemaining();
    const pct = Math.max(0, Math.min(1, remaining / DURATION));
    if (_timerBar) _timerBar.style.width = `${(pct * 100).toFixed(1)}%`;

    const cdEl = document.getElementById('am-countdown');
    if (cdEl) cdEl.textContent = Math.ceil(remaining);

    if (pct > 0) _rafId = requestAnimationFrame(tick);
  }

  _rafId = requestAnimationFrame(tick);
}
