// ============================================================
// gameover.js — Game Over screen with citizen memorial (Phase 24)
// ============================================================
// Hidden until GAME_OVER event fires.
// Accumulates a graveyard (citizens who died, their wave, skills).
// "Play Again" reloads the page.
// ============================================================

import { events, EV } from '../engine/events.js';

// ── Grave registry ───────────────────────────────────────────
// Each entry: { name, wave, skills }
const _graveyard = [];
let   _currentWave = 0;

export function initGameOver() {
  _injectStyles();
  _createOverlay();
  _wireEvents();
}

function _wireEvents() {
  // Track current wave so we know which wave a citizen died in
  events.on(EV.WAVE_STARTED,   ({ waveNumber }) => { _currentWave = waveNumber; });
  events.on(EV.COMBAT_STARTED, ({ waveNumber }) => { _currentWave = waveNumber; });

  // Log each citizen death into the graveyard
  events.on(EV.CITIZEN_DIED, ({ citizen }) => {
    _graveyard.push({
      name:   citizen.name,
      wave:   _currentWave,
      skills: { ...citizen.skills },
    });
  });

  // Show game-over screen
  events.on(EV.GAME_OVER, ({ waveNumber, reason }) => {
    _showScreen(waveNumber, reason);
  });
}

// ── Overlay DOM ──────────────────────────────────────────────
function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #gameover-screen {
      position: fixed;
      inset: 0;
      z-index: 900;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 40px 24px 40px;
      overflow-y: auto;
      background: radial-gradient(ellipse at center, #1a0404 0%, #080202 100%);
      color: #e8d8a8;
      font-family: sans-serif;
      text-align: center;
      animation: go-fadein 0.6s ease forwards;
    }
    @keyframes go-fadein {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    #gameover-screen h1 {
      font-size: 40px;
      color: #e74c3c;
      letter-spacing: 3px;
      text-shadow: 0 0 30px rgba(231,76,60,0.5), 0 2px 8px rgba(0,0,0,0.8);
      margin: 0 0 8px;
    }
    #gameover-screen .go-cause {
      font-size: 14px;
      color: #a07070;
      margin: 0 0 6px;
    }
    #gameover-screen .go-waves {
      font-size: 16px;
      color: #c8a060;
      margin: 0 0 24px;
    }
    #gameover-screen .go-divider {
      width: 280px;
      height: 1px;
      background: linear-gradient(to right, transparent, #6b2020, transparent);
      margin: 0 auto 20px;
    }
    #gameover-screen h2 {
      font-size: 20px;
      color: #e8d8a8;
      letter-spacing: 1px;
      margin: 0 0 16px;
    }
    #memorial-list {
      list-style: none;
      padding: 0;
      margin: 0 0 28px;
      width: 100%;
      max-width: 420px;
    }
    #memorial-list li {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(107,32,32,0.4);
      border-radius: 6px;
      padding: 8px 14px;
      margin: 4px 0;
      text-align: left;
      font-size: 13px;
    }
    #memorial-list li .mem-name {
      font-weight: bold;
      color: #f0c060;
    }
    #memorial-list li .mem-wave {
      color: #a07070;
      font-size: 11px;
      margin-left: 6px;
    }
    #memorial-list li .mem-skills {
      display: block;
      color: #806040;
      font-size: 11px;
      margin-top: 3px;
    }
    #memorial-list .mem-empty {
      color: #604830;
      font-style: italic;
      text-align: center;
      border: none;
      background: none;
    }
    #btn-restart {
      padding: 12px 40px;
      font-size: 16px;
      font-family: sans-serif;
      letter-spacing: 0.5px;
      background: linear-gradient(to bottom, #6b1010, #3a0808);
      color: #f5e4b8;
      border: 2px solid #a03030;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      transition: background 0.15s, transform 0.1s;
    }
    #btn-restart:hover {
      background: linear-gradient(to bottom, #8b1a1a, #5a1010);
      transform: translateY(-1px);
    }
    #btn-restart:active { transform: translateY(1px); }
  `;
  document.head.appendChild(s);
}

function _createOverlay() {
  const div = document.createElement('div');
  div.id = 'gameover-screen';
  div.innerHTML = `
    <h1>YOUR CITY HAS FALLEN</h1>
    <p id="cause-of-death" class="go-cause"></p>
    <p class="go-waves">Waves survived: <span id="wave-count">0</span></p>
    <div class="go-divider"></div>
    <h2>⚰️ In Memory Of</h2>
    <ul id="memorial-list"></ul>
    <button id="btn-restart">↺ Play Again</button>
  `;
  document.body.appendChild(div);

  document.getElementById('btn-restart').addEventListener('click', () => {
    window.location.reload();
  });
}

// ── Show ─────────────────────────────────────────────────────
const REASON_LABELS = {
  no_structures_no_citizens:         'Every building was destroyed and all citizens fell.',
  capital_destroyed_no_citizens:     'The capital was destroyed and no citizens remained to rebuild.',
};

function _showScreen(waveNumber, reason) {
  document.getElementById('cause-of-death').textContent =
    REASON_LABELS[reason] ?? 'Your settlement was overwhelmed.';
  document.getElementById('wave-count').textContent = waveNumber;

  const list = document.getElementById('memorial-list');
  list.innerHTML = '';

  if (_graveyard.length === 0) {
    const li = document.createElement('li');
    li.className = 'mem-empty';
    li.textContent = 'No citizens died. A small mercy.';
    list.appendChild(li);
  } else {
    for (const entry of _graveyard) {
      const li = document.createElement('li');
      const skillStr = Object.entries(entry.skills)
        .map(([k, v]) => `${k} ${v}`)
        .join('  ·  ');
      li.innerHTML = `
        <span class="mem-name">${entry.name}</span>
        <span class="mem-wave">— Wave ${entry.wave}</span>
        <span class="mem-skills">${skillStr}</span>
      `;
      list.appendChild(li);
    }
  }

  const screen = document.getElementById('gameover-screen');
  screen.style.display = 'flex';
}
