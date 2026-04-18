// ============================================================
// hud.js — Bottom resource bar + top status strip
// ============================================================
import { resources } from '../resources/resources.js';
import { events, EV } from '../engine/events.js';

const ICONS = {
  food:     '🌾',
  wood:     '🪵',
  stone:    '🪨',
  metal:    '⚙️',
  gold:     '💰',
  medicine: '🧪',
};

let hudEl = null;

function createHUD() {
  hudEl = document.createElement('div');
  hudEl.id = 'resource-hud';
  hudEl.style.cssText = `
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 44px;
    background: linear-gradient(to bottom, rgba(30,20,10,0.92), rgba(15,10,5,0.97));
    border-top: 2px solid #7a5020;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 28px;
    z-index: 150;
    pointer-events: none;
    font-family: sans-serif;
  `;
  document.body.appendChild(hudEl);
  renderHUD();

  // Re-render on any resource change
  events.on(EV.RESOURCE_CHANGED, () => renderHUD());
}

function renderHUD() {
  if (!hudEl) return;
  hudEl.innerHTML = Object.entries(ICONS).map(([key, icon]) => {
    const val = Math.floor(resources[key] ?? 0);
    return `
      <div style="display:flex;align-items:center;gap:5px;color:#e8d090;font-size:14px;font-weight:600;">
        <span style="font-size:18px;line-height:1">${icon}</span>
        <span>${val}</span>
      </div>`;
  }).join('');
}

export function initHUD() {
  createHUD();
}
