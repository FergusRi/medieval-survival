// ============================================================
// waves.js — Wave spawning system (Phase 17 / 26)
// Phase 26 adds: warchief, berserker, siege_ram, runner, swarm
// Runner spawns far from main cluster (opposite edge cluster).
// Swarm spawns in groups of 15+ from a single edge point.
// ============================================================

import { events, EV } from '../engine/events.js';
import { enemies, Enemy } from './enemy.js';
import { setEnemiesAlive } from '../phases/phases.js';
import { MAP_SIZE, TILE_SIZE } from '../world/map.js';

const MAP_PX = MAP_SIZE * TILE_SIZE;

// ---- Wave composition table ---------------------------------
// Each entry: [type, base, scalePerWave]
// Total per wave = base + floor(waveNumber * scale)
const WAVE_COMPOSITION = [
  { type: 'raider',    base: 4,  scale: 2.0 },
  { type: 'brute',     base: 0,  scale: 0.5 },
  { type: 'archer',    base: 0,  scale: 0.8 },
  { type: 'shaman',    base: 0,  scale: 0.3 },
  // Phase 26 types
  { type: 'warchief',  base: 0,  scale: 0.2 },
  { type: 'berserker', base: 0,  scale: 0.4 },
  { type: 'siege_ram', base: 0,  scale: 0.15 },
  { type: 'runner',    base: 0,  scale: 0.6 },
  { type: 'swarm',     base: 0,  scale: 0.0 }, // handled separately below
];

// Minimum wave before each type appears
const TYPE_MIN_WAVE = {
  raider:    1,
  brute:     3,
  archer:    2,
  shaman:    5,
  // Phase 26
  warchief:  6,
  berserker: 4,
  siege_ram: 7,
  runner:    3,
  swarm:     5,
};

// ---- Spawn point helpers ------------------------------------
const MARGIN = TILE_SIZE * 2;

function _randomEdgePoint() {
  const side = Math.floor(Math.random() * 4);
  switch (side) {
    case 0: return { x: Math.random() * MAP_PX, y: MARGIN };
    case 1: return { x: Math.random() * MAP_PX, y: MAP_PX - MARGIN };
    case 2: return { x: MARGIN,          y: Math.random() * MAP_PX };
    default: return { x: MAP_PX - MARGIN, y: Math.random() * MAP_PX };
  }
}

function _edgeSpawnPoints(count) {
  const pts = [];
  for (let i = 0; i < count; i++) pts.push(_randomEdgePoint());
  return pts;
}

// Runner spawns: pick the edge side that is farthest from the centre
// of the main enemy cluster (or simply opposite corner to map centre).
function _runnerSpawnPoint() {
  // Runners spawn from the corner opposite to the main cluster.
  // Simple heuristic: pick the corner with most distance from
  // the average position of already-spawned enemies (or just a random far corner).
  const corners = [
    { x: MARGIN,          y: MARGIN },
    { x: MAP_PX - MARGIN, y: MARGIN },
    { x: MARGIN,          y: MAP_PX - MARGIN },
    { x: MAP_PX - MARGIN, y: MAP_PX - MARGIN },
  ];

  if (enemies.length === 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // Average enemy position
  let ax = 0, ay = 0;
  for (const e of enemies) { ax += e.x; ay += e.y; }
  ax /= enemies.length; ay /= enemies.length;

  // Pick corner farthest from average
  let best = corners[0];
  let bestDist = 0;
  for (const c of corners) {
    const d = Math.hypot(c.x - ax, c.y - ay);
    if (d > bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// Swarm: all 15+ units from the same edge point (tight cluster rush)
function _swarmSpawnCluster(count) {
  const origin = _randomEdgePoint();
  const pts = [];
  for (let i = 0; i < count; i++) {
    pts.push({
      x: origin.x + (Math.random() - 0.5) * 32,
      y: origin.y + (Math.random() - 0.5) * 32,
    });
  }
  return pts;
}

// ---- Spawn a wave -------------------------------------------
function spawnWave(waveNumber) {
  enemies.length = 0; // clear previous wave remnants

  const normalTypes   = []; // standard spawns
  const runnerTypes   = []; // far-spawn runners
  let   swarmCount    = 0;  // swarm cluster count

  // --- Swarm: appears wave 5+, 15 + wave*1 units -------------
  if (waveNumber >= TYPE_MIN_WAVE.swarm) {
    swarmCount = 15 + waveNumber;
  }

  for (const entry of WAVE_COMPOSITION) {
    if (entry.type === 'swarm') continue; // handled above
    if (waveNumber < TYPE_MIN_WAVE[entry.type]) continue;
    const count = entry.base + Math.floor(waveNumber * entry.scale);
    for (let i = 0; i < count; i++) {
      if (entry.type === 'runner') {
        runnerTypes.push('runner');
      } else {
        normalTypes.push(entry.type);
      }
    }
  }

  // Shuffle normal types for variety
  for (let i = normalTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [normalTypes[i], normalTypes[j]] = [normalTypes[j], normalTypes[i]];
  }

  // Spawn normal enemies
  const normalPts = _edgeSpawnPoints(normalTypes.length);
  for (let i = 0; i < normalTypes.length; i++) {
    const { x, y } = normalPts[i];
    enemies.push(new Enemy(normalTypes[i], x, y));
  }

  // Spawn runners from far edge
  for (let i = 0; i < runnerTypes.length; i++) {
    const { x, y } = _runnerSpawnPoint();
    enemies.push(new Enemy('runner', x, y));
  }

  // Spawn swarm cluster
  if (swarmCount > 0) {
    const swarmPts = _swarmSpawnCluster(swarmCount);
    for (const { x, y } of swarmPts) {
      enemies.push(new Enemy('swarm', x, y));
    }
  }

  setEnemiesAlive(enemies.length);

  const summary = enemies.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1; return acc;
  }, {});
  console.log(`[Waves] Wave ${waveNumber}: ${enemies.length} enemies →`, summary);
}

// ---- Event wiring -------------------------------------------
events.on(EV.COMBAT_STARTED, ({ waveNumber }) => {
  spawnWave(waveNumber);
});

export { spawnWave };
