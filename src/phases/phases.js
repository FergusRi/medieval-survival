// ============================================================
// phases.js — Phase / Wave state machine (Phase 16)
// BUILD → PREVIEW (30s) → COMBAT (until enemies clear) → AFTERMATH (15s) → BUILD
// ============================================================

import { events, EV } from '../engine/events.js';
import { placedBuildings } from '../buildings/placement.js';
import { citizens } from '../citizens/citizen.js';

// ---- Phase constants ----------------------------------------
export const PHASE = {
  BUILD:      'BUILD',
  PREVIEW:    'PREVIEW',
  COMBAT:     'COMBAT',
  AFTERMATH:  'AFTERMATH',
};

// Durations in seconds (COMBAT has no timer — ends when last enemy dies)
export const PHASE_DURATIONS = {
  BUILD:      600,   // 10 minutes
  PREVIEW:    30,
  AFTERMATH:  15,
};

// Surprise attack: 12% chance each wave, warning 60 s before COMBAT
const SURPRISE_ATTACK_CHANCE = 0.12;
const SURPRISE_WARNING_LEAD  = 60; // seconds before COMBAT starts

// ---- Internal state -----------------------------------------
let _currentPhase  = PHASE.BUILD;
let _waveNumber    = 0;
let _enemiesAlive  = 0;      // set by enemy system (Phase 17)
let _surpriseWave  = false;
let _warned        = false;  // has the surprise warning been emitted this cycle?

// ---- Accessors ----------------------------------------------
export function getCurrentPhase() { return _currentPhase; }
export function getWaveNumber()    { return _waveNumber; }
export function isInCombat()       { return _currentPhase === PHASE.COMBAT; }

// Called by the enemy system (Phase 17) to register kills / spawns
export function setEnemiesAlive(n) { _enemiesAlive = n; }
export function enemyDied() {
  _enemiesAlive = Math.max(0, _enemiesAlive - 1);
  if (_enemiesAlive === 0 && _currentPhase === PHASE.COMBAT) {
    transitionTo(PHASE.AFTERMATH);
  }
}

// ---- Loss condition -----------------------------------------
export function checkLoss() {
  // Loss if no citizens remain
  const hasCitizens = citizens.length > 0;

  if (!hasCitizens) {
    events.emit(EV.GAME_OVER, { waveNumber: _waveNumber, reason: 'no_citizens_remaining' });
    return true;
  }
  return false;
}

// ---- State transition ---------------------------------------
export function transitionTo(phase) {
  const prev = _currentPhase;
  _currentPhase = phase;

  console.log(`[Phases] ${prev} → ${phase}  (wave ${_waveNumber})`);

  if (phase === PHASE.PREVIEW) {
    _waveNumber++;
    _surpriseWave = Math.random() < SURPRISE_ATTACK_CHANCE;
    _warned = false;
    events.emit(EV.WAVE_STARTED, { waveNumber: _waveNumber, surprise: _surpriseWave });
  }

  if (phase === PHASE.COMBAT) {
    events.emit(EV.COMBAT_STARTED, { waveNumber: _waveNumber, surprise: _surpriseWave });
  }

  if (phase === PHASE.AFTERMATH) {
    events.emit(EV.COMBAT_ENDED, { waveNumber: _waveNumber });
  }

  if (phase === PHASE.BUILD) {
    events.emit(EV.WAVE_ENDED, { waveNumber: _waveNumber });
  }
}

// ---- Advance phase at timer expiry --------------------------
export function advancePhase() {
  switch (_currentPhase) {
    case PHASE.BUILD:      transitionTo(PHASE.PREVIEW);   break;
    case PHASE.PREVIEW:    transitionTo(PHASE.COMBAT);    break;
    case PHASE.COMBAT:     /* timer-less — driven by enemyDied() */ break;
    case PHASE.AFTERMATH:  transitionTo(PHASE.BUILD);     break;
  }
}

// ---- Surprise warning emit (called by timer) ----------------
// timer.js calls this when PREVIEW time remaining hits SURPRISE_WARNING_LEAD
export function maybeSurpriseWarning(remainingSeconds) {
  if (_surpriseWave && !_warned && remainingSeconds <= SURPRISE_WARNING_LEAD) {
    _warned = true;
    events.emit(EV.SURPRISE_ATTACK_WARNING, { waveNumber: _waveNumber, secondsUntilCombat: remainingSeconds });
  }
}
