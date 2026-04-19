// ============================================================
// hud.js — Phase 21: Wave counter, phase label, timer, alerts
// Resources are handled by frame.js top bar.
// This module adds: wave info strip + alert banner.
// ============================================================
import { events, EV } from '../engine/events.js';
import { getPhaseRemaining } from '../phases/timer.js';
import { getCurrentPhase, getWaveNumber, PHASE } from '../phases/phases.js';

// ---- Phase label colours ------------------------------------
const PHASE_COLOUR = {
  [PHASE.BUILD]:      '#a8c878',   // green
  [PHASE.PREVIEW]:    '#f0c040',   // amber
  [PHASE.COMBAT]:     '#e74c3c',   // red
  [PHASE.AFTERMATH]:  '#9b59b6',   // purple
};

const PHASE_LABEL = {
  [PHASE.BUILD]:      '🔨 BUILD',
  [PHASE.PREVIEW]:    '⚠️ PREVIEW',
  [PHASE.COMBAT]:     '⚔️ COMBAT',
  [PHASE.AFTERMATH]:  '✨ AFTERMATH',
};

// ---- DOM refs -----------------------------------------------
let _strip     = null;
let _waveEl    = null;
let _phaseEl   = null;
let _timerEl   = null;
let _bannerEl  = null;
let _bannerTimeout = null;

// ---- Init ---------------------------------------------------
export function initHUD() {
  _injectStyles();
  _createStrip();
  _createBanner();
  _wireEvents();
}

// ---- Per-frame update (called from init.js render) ----------
export function updateHUDTimer() {
  if (!_timerEl) return;
  const phase = getCurrentPhase();
  if (phase === PHASE.COMBAT) {
    _timerEl.textContent = '⚔️';
    return;
  }
  const secs = Math.ceil(getPhaseRemaining());
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  _timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

// ---- Private ------------------------------------------------
function _createStrip() {
  _strip = document.createElement('div');
  _strip.id = 'hud-strip';

  _waveEl  = document.createElement('span');
  _waveEl.id = 'hud-wave';

  _phaseEl = document.createElement('span');
  _phaseEl.id = 'hud-phase';

  _timerEl = document.createElement('span');
  _timerEl.id = 'hud-timer';

  _strip.appendChild(_waveEl);
  _strip.appendChild(_phaseEl);
  _strip.appendChild(_timerEl);

  document.body.appendChild(_strip);
  _refreshStrip();
}

function _createBanner() {
  _bannerEl = document.createElement('div');
  _bannerEl.id = 'hud-banner';
  _bannerEl.className = 'hud-banner-hidden';
  document.body.appendChild(_bannerEl);
}

function _refreshStrip() {
  const wave  = getWaveNumber();
  const phase = getCurrentPhase();
  if (_waveEl)  _waveEl.textContent  = wave > 0 ? `Wave ${wave}` : 'Wave —';
  if (_phaseEl) {
    _phaseEl.textContent  = PHASE_LABEL[phase] ?? phase;
    _phaseEl.style.color  = PHASE_COLOUR[phase] ?? '#fff';
  }
}

function _showBanner(html, durationMs = 10000) {
  if (!_bannerEl) return;
  _bannerEl.innerHTML = html;
  _bannerEl.className = 'hud-banner-visible';
  if (_bannerTimeout) clearTimeout(_bannerTimeout);
  _bannerTimeout = setTimeout(() => {
    if (_bannerEl) _bannerEl.className = 'hud-banner-hidden';
  }, durationMs);
}

function _wireEvents() {
  events.on(EV.WAVE_STARTED, ({ waveNumber, surprise }) => {
    _refreshStrip();
    if (surprise) {
      _showBanner(`⚠️ <strong>Surprise attack incoming!</strong> Prepare your defences!`, 12000);
    }
  });

  events.on(EV.COMBAT_STARTED, () => _refreshStrip());
  events.on(EV.COMBAT_ENDED,   () => _refreshStrip());
  events.on(EV.WAVE_ENDED,     () => _refreshStrip());

  events.on(EV.SURPRISE_ATTACK_WARNING, ({ secondsUntilCombat }) => {
    const s = Math.ceil(secondsUntilCombat);
    _showBanner(`🚨 <strong>Raiders spotted!</strong> ${s} seconds until attack!`, 10000);
  });

  events.on(EV.GAME_OVER, ({ waveNumber }) => {
    _showBanner(`💀 <strong>Your settlement has fallen</strong> — Survived ${waveNumber} wave${waveNumber !== 1 ? 's' : ''}`, 999999);
  });
}

function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #hud-strip {
      position: fixed;
      top: 36px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 18px;
      background: rgba(10,6,2,0.82);
      border: 1px solid #5a3a10;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 3px 18px 5px;
      z-index: 390;
      font-family: sans-serif;
      pointer-events: none;
    }
    #hud-wave {
      font-size: 12px;
      color: #c8a060;
      font-weight: 600;
      letter-spacing: 1px;
    }
    #hud-phase {
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    #hud-timer {
      font-size: 13px;
      color: #e0d0a0;
      font-weight: 600;
      min-width: 36px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .hud-banner-hidden {
      display: none;
    }
    .hud-banner-visible {
      position: fixed;
      top: 74px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(140,20,10,0.95), rgba(80,10,5,0.95));
      border: 2px solid #e74c3c;
      border-radius: 8px;
      padding: 8px 24px;
      color: #fff;
      font-family: sans-serif;
      font-size: 14px;
      z-index: 500;
      pointer-events: none;
      text-align: center;
      box-shadow: 0 4px 24px rgba(200,0,0,0.5);
      animation: hud-banner-flash 0.6s ease-in-out 3;
    }
    @keyframes hud-banner-flash {
      0%   { opacity: 1; }
      50%  { opacity: 0.55; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}
