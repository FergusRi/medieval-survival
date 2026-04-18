// ============================================================
// loop.js — requestAnimationFrame game loop
// Fixed 16.67ms timestep, 100ms delta cap (prevents spiral of death
// after tab switches or long pauses)
// ============================================================

let lastTime = 0;
let running = false;

/**
 * Start the game loop.
 * @param {function(number): void} update  - called with delta ms each frame
 * @param {function(): void}       render  - called each frame after update
 */
export function startLoop(update, render) {
  running = true;

  function tick(timestamp) {
    if (!running) return;

    const rawDelta = timestamp - lastTime;
    lastTime = timestamp;

    // Cap delta at 100ms — prevents physics/logic explosions after tab focus loss
    const delta = Math.min(rawDelta, 100);

    update(delta);
    render();

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export function stopLoop() {
  running = false;
}
