// ============================================================
// start.js — Start screen overlay (Phase 24)
// ============================================================
// Shown immediately on page load. Clicking "Begin" hides it
// and calls the provided onStart callback (which runs game init).
// ============================================================

export function initStartScreen(onStart) {
  _injectStyles();
  const overlay = _createOverlay();

  document.getElementById('btn-begin').addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      onStart();
    }, 400);
  });
}

function _injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #start-screen {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(ellipse at center, #1a0e04 0%, #0a0502 100%);
      color: #e8d8a8;
      font-family: sans-serif;
      text-align: center;
      transition: opacity 0.4s ease;
    }
    #start-screen h1 {
      font-size: 48px;
      color: #f0c060;
      letter-spacing: 3px;
      text-shadow: 0 0 30px rgba(240,192,96,0.4), 0 2px 8px rgba(0,0,0,0.8);
      margin: 0 0 12px;
    }
    #start-screen .start-sub {
      font-size: 16px;
      color: #a07840;
      margin: 0 0 48px;
      letter-spacing: 0.5px;
    }
    #start-screen .start-divider {
      width: 200px;
      height: 1px;
      background: linear-gradient(to right, transparent, #8b5e20, transparent);
      margin: 0 auto 32px;
    }
    #btn-begin {
      padding: 14px 48px;
      font-size: 18px;
      font-family: sans-serif;
      letter-spacing: 1px;
      background: linear-gradient(to bottom, #a06828, #6b4010);
      color: #f5e4b8;
      border: 2px solid #c8903c;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 20px rgba(200,144,60,0.2);
      transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    }
    #btn-begin:hover {
      background: linear-gradient(to bottom, #c07830, #8b5010);
      box-shadow: 0 4px 28px rgba(0,0,0,0.7), 0 0 28px rgba(200,144,60,0.35);
      transform: translateY(-1px);
    }
    #btn-begin:active {
      transform: translateY(1px);
    }
    #start-screen .start-hint {
      margin-top: 24px;
      font-size: 11px;
      color: #604830;
      letter-spacing: 0.4px;
    }
  `;
  document.head.appendChild(s);
}

function _createOverlay() {
  const div = document.createElement('div');
  div.id = 'start-screen';
  div.innerHTML = `
    <h1>⚔️ MEDIEVAL SURVIVAL</h1>
    <p class="start-sub">Build your city. Defend against the waves.</p>
    <div class="start-divider"></div>
    <button id="btn-begin">▶ Begin</button>
    <p class="start-hint">WASD / Arrow keys to pan &nbsp;·&nbsp; R to rotate &nbsp;·&nbsp; Esc to cancel</p>
  `;
  document.body.appendChild(div);
  return div;
}
