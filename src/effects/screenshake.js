// ============================================================
// screenshake.js — Camera shake (Phase 30)
// Non-stacking: takes max of current and new magnitude.
// Exponential decay toward zero.
// ============================================================

let shakeMag = 0;
let shakeX   = 0;
let shakeY   = 0;

/**
 * Trigger a shake. Magnitudes stack by taking the max,
 * so simultaneous events don't multiply unpleasantly.
 * @param {number} magnitude  Pixels of maximum offset
 */
export function triggerShake(magnitude) {
  shakeMag = Math.max(shakeMag, magnitude);
}

/**
 * Update shake each frame. Call before applyShake.
 * @param {number} dt  Frame time in ms
 */
export function updateShake(dt) {
  if (shakeMag < 0.5) {
    shakeMag = 0; shakeX = 0; shakeY = 0;
    return;
  }
  shakeX    = (Math.random() - 0.5) * 2 * shakeMag;
  shakeY    = (Math.random() - 0.5) * 2 * shakeMag;
  shakeMag *= Math.pow(0.92, dt / 16); // ~60fps decay
}

/**
 * Apply the current shake offset to ctx via translate.
 * Call immediately after ctx.save() / beginFrame.
 * @param {CanvasRenderingContext2D} ctx
 */
export function applyShake(ctx) {
  ctx.translate(shakeX, shakeY);
}

/** Current shake offset — read by camera if needed. */
export function getShakeOffset() { return { x: shakeX, y: shakeY }; }
