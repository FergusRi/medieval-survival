// ============================================================
// particles.js — Object-pool particle system (Phase 30)
// Pre-allocates 200 slots; reuses on expiry. No GC pressure.
// ============================================================

const pool = Array.from({ length: 200 }, () => ({
  active: false, x: 0, y: 0, vx: 0, vy: 0,
  life: 0, maxLife: 0, size: 3, color: '#fff'
}));

/**
 * Spawn count particles at (x, y).
 * @param {number} x
 * @param {number} y
 * @param {number} count
 * @param {{ color?:string, speed?:number, size?:number, life?:number }} config
 */
export function spawn(x, y, count, config = {}) {
  let spawned = 0;
  for (const p of pool) {
    if (p.active) continue;
    const angle = Math.random() * Math.PI * 2;
    const spd   = (config.speed ?? 60) * (0.5 + Math.random());
    p.active  = true;
    p.x       = x;
    p.y       = y;
    p.vx      = Math.cos(angle) * spd;
    p.vy      = Math.sin(angle) * spd;
    p.life    = config.life    ?? 0.5;
    p.maxLife = p.life;
    p.size    = config.size    ?? 3;
    p.color   = config.color   ?? '#fff';
    if (++spawned >= count) break;
  }
}

/** Update all active particles. Call each frame with dt in ms. */
export function updateParticles(dt) {
  const dtS = dt / 1000;
  for (const p of pool) {
    if (!p.active) continue;
    p.x   += p.vx * dtS;
    p.y   += p.vy * dtS;
    p.vy  += 60 * dtS;   // gravity
    p.life -= dtS;
    if (p.life <= 0) p.active = false;
  }
}

/** Draw all active particles. */
export function drawParticles(ctx) {
  for (const p of pool) {
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle   = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ── Preset helpers ────────────────────────────────────────────

/** Orange sparks on hit. */
export function spawnHitSparks(x, y) {
  spawn(x, y, 5, { color: '#ffaa00', speed: 80, size: 2, life: 0.3 });
}

/** Red puff on citizen/enemy death. */
export function spawnDeathPuff(x, y) {
  spawn(x, y, 10, { color: '#cc4444', speed: 60, size: 3, life: 0.5 });
}

/** Golden glint on resource harvest. */
export function spawnHarvestGlint(x, y) {
  spawn(x, y, 6, { color: '#ffe060', speed: 40, size: 2, life: 0.6 });
}

/** Teal stars on citizen level-up. */
export function spawnLevelUpBurst(x, y) {
  spawn(x, y, 12, { color: '#88ffcc', speed: 100, size: 3, life: 0.8 });
}

/** Brown debris on catapult/ballista impact. */
export function spawnCatapultSplash(x, y) {
  spawn(x, y, 20, { color: '#886644', speed: 120, size: 4, life: 0.7 });
}
