// ============================================================
// timer.js — Phase countdown ticker (Phase 16)
// Call updateTimer(dt) each frame from the game loop.
// ============================================================

import {
  PHASE,
  PHASE_DURATIONS,
  getCurrentPhase,
  advancePhase,
  maybeSurpriseWarning,
} from './phases.js';

// Remaining seconds in the current timed phase
let _remaining = PHASE_DURATIONS.BUILD;

// ---- Accessor (for HUD display) -----------------------------
export function getPhaseRemaining() { return Math.max(0, _remaining); }

// Called whenever a phase transition happens — resets the clock
export function resetTimer(phase) {
  _remaining = PHASE_DURATIONS[phase] ?? Infinity;
}

// ---- Per-frame tick -----------------------------------------
// dt is in milliseconds (game loop convention)
export function updateTimer(dt) {
  const phase = getCurrentPhase();

  // COMBAT has no countdown — it ends via enemyDied()
  if (phase === PHASE.COMBAT) return;

  const dtS = dt / 1000;
  _remaining -= dtS;

  // Surprise attack warning during PREVIEW phase
  if (phase === PHASE.PREVIEW) {
    maybeSurpriseWarning(_remaining);
  }

  if (_remaining <= 0) {
    _remaining = 0;
    advancePhase();
    // After transition, start the clock for the new phase
    resetTimer(getCurrentPhase());
  }
}
