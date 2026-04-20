// ============================================================
// colonist_bar.js — Persistent bottom bar showing all citizens
// Each card: colour dot, name, state badge, tiny HP bar
// Click a card → opens citizen detail panel
// ============================================================
import { citizens }  from '../citizens/citizen.js';
import { events, EV } from '../engine/events.js';

// Human-readable state labels
const STATE_LABEL = {
  IDLE:       '💤 Idle',
  GATHERING:  '🪓 Harvesting',
  BUILDING:   '🔨 Building',
  COMBAT:     '⚔️ Fighting',
  FARMING:    '🌾 Farming',
  GUARDING:   '🛡️ Guarding',
  WANDERING:  '🚶 Wandering',
};
function stateLabel(s) { return STATE_LABEL[s] ?? s; }

const STATE_COLOUR = {
  IDLE:      '#aaaaaa',
  GATHERING: '#c8a030',
  BUILDING:  '#4a90d9',
  COMBAT:    '#e74c3c',
  FARMING:   '#5cb85c',
  GUARDING:  '#9b59b6',
};
function stateDot(s) { return STATE_COLOUR[s] ?? '#888'; }

let _bar       = null;
let _onSelect  = null;   // callback(citizen) → open panel

export function initColonistBar(onSelectCitizen) {
  _onSelect = onSelectCitizen;
  _injectStyles();
  _bar = document.createElement('div');
  _bar.id = 'colonist-bar';
  document.body.appendChild(_bar);

  // Refresh when citizens spawn or die
  events.on(EV.CITIZEN_SPAWNED ?? 'CITIZEN_SPAWNED', () => _rebuild());
  events.on(EV.CITIZEN_DIED,   () => _rebuild());

  _rebuild();
}

export function updateColonistBar() {
  if (!_bar) return;
  // Update each card in-place (no full rebuild to avoid flicker)
  for (const c of citizens) {
    const card = _bar.querySelector(`[data-cid="${c.id}"]`);
    if (!card) { _rebuild(); return; }

    const badge = card.querySelector('.cb-state');
    if (badge) badge.textContent = stateLabel(c.state);

    const dot = card.querySelector('.cb-dot');
    if (dot) dot.style.background = stateDot(c.state);

    const fill = card.querySelector('.cb-hp-fill');
    if (fill) {
      const pct = Math.max(0, (c.hp / c.maxHp) * 100);
      fill.style.width = pct + '%';
      fill.style.background = pct > 50 ? '#5cb85c' : pct > 25 ? '#f0ad4e' : '#e74c3c';
    }
  }
}

// ---- Private ------------------------------------------------

function _rebuild() {
  if (!_bar) return;
  _bar.innerHTML = '';
  for (const c of citizens) {
    if (c.isDead) continue;
    const card = document.createElement('div');
    card.className = 'cb-card';
    card.dataset.cid = c.id;

    // Colour dot (reflects current state)
    const dot = document.createElement('div');
    dot.className = 'cb-dot';
    dot.style.background = stateDot(c.state);
    card.appendChild(dot);

    // Name + state
    const info = document.createElement('div');
    info.className = 'cb-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'cb-name';
    nameEl.textContent = c.name;
    const badge = document.createElement('div');
    badge.className = 'cb-state';
    badge.textContent = stateLabel(c.state);
    info.appendChild(nameEl);
    info.appendChild(badge);
    card.appendChild(info);

    // HP bar
    const hpBg = document.createElement('div');
    hpBg.className = 'cb-hp-bg';
    const hpFill = document.createElement('div');
    hpFill.className = 'cb-hp-fill';
    const pct = Math.max(0, (c.hp / c.maxHp) * 100);
    hpFill.style.width = pct + '%';
    hpFill.style.background = pct > 50 ? '#5cb85c' : pct > 25 ? '#f0ad4e' : '#e74c3c';
    hpBg.appendChild(hpFill);
    card.appendChild(hpBg);

    // Click to open panel
    const cRef = c;
    card.addEventListener('click', () => _onSelect?.(cRef));

    _bar.appendChild(card);
  }
}

function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #colonist-bar {
      position: fixed;
      bottom: 52px; left: 0; right: 0;
      height: 64px;
      background: rgba(20,14,8,0.92);
      border-top: 2px solid #5a3a18;
      border-bottom: 1px solid #3a2010;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
      overflow-x: auto;
      overflow-y: hidden;
      z-index: 200;
      box-sizing: border-box;
    }
    #colonist-bar::-webkit-scrollbar { height: 4px; }
    #colonist-bar::-webkit-scrollbar-track { background: transparent; }
    #colonist-bar::-webkit-scrollbar-thumb { background: #5a3a18; border-radius: 2px; }

    .cb-card {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(60,35,10,0.85);
      border: 1px solid #6b4420;
      border-radius: 6px;
      padding: 4px 8px 4px 6px;
      cursor: pointer;
      min-width: 110px;
      max-width: 140px;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
    }
    .cb-card:hover {
      background: rgba(90,55,15,0.95);
      border-color: #f0c060;
    }

    .cb-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 4px currentColor;
    }

    .cb-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .cb-name {
      font-family: 'MedievalSharp', serif;
      font-size: 11px;
      color: #f0e0b0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cb-state {
      font-size: 9px;
      color: #a08060;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cb-hp-bg {
      position: absolute;
      bottom: 3px; left: 6px; right: 6px;
      height: 3px;
      background: rgba(0,0,0,0.5);
      border-radius: 2px;
    }
    .cb-hp-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s;
    }
  `;
  document.head.appendChild(s);
}
