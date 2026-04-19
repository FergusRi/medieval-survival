// ============================================================
// projectiles.js — Projectile pool for tower combat (Phase 19)
// Arrow, ballista bolt, cannon ball all share this system.
// ============================================================

// ---- Active projectile list ---------------------------------
export const projectiles = [];

let _nextId = 1;

// ---- Projectile types ---------------------------------------
export const PROJ_DEF = {
  arrow: {
    speed:  320,   // px/s
    damage:  12,
    radius:   2,
    colour: '#c8a060',
    length:   7,   // drawn as a line, this long
  },
  bolt: {
    speed:  280,
    damage:  35,
    radius:   3,
    colour: '#8b5e3c',
    length:  10,
  },
  cannonball: {
    speed:  220,
    damage:  80,
    radius:   5,
    colour: '#555',
    length:   0,   // drawn as circle
    splash:  48,   // splash radius px — damages all enemies in radius
  },
};

// ---- Spawn a projectile -------------------------------------
export function spawnProjectile(type, x, y, targetEnemy) {
  const def = PROJ_DEF[type] ?? PROJ_DEF.arrow;
  projectiles.push({
    id:     _nextId++,
    type,
    x, y,
    target: targetEnemy,
    speed:  def.speed,
    damage: def.damage,
    radius: def.radius,
    colour: def.colour,
    length: def.length,
    splash: def.splash ?? 0,
    dead:   false,
    // Direction will be updated each frame toward target
    dx: 0,
    dy: 0,
  });
}

// ---- Update all projectiles ---------------------------------
export function updateProjectiles(dt, enemies) {
  const dtS = dt / 1000;
  const toRemove = [];

  for (const p of projectiles) {
    if (p.dead) { toRemove.push(p); continue; }

    // If target is dead, remove projectile
    if (p.target.dead) { p.dead = true; toRemove.push(p); continue; }

    const tdx  = p.target.x - p.x;
    const tdy  = p.target.y - p.y;
    const dist = Math.hypot(tdx, tdy);

    if (dist < p.speed * dtS + p.radius + p.target.radius) {
      // Hit!
      _onHit(p, enemies);
      p.dead = true;
      toRemove.push(p);
      continue;
    }

    // Advance toward target
    p.dx = tdx / dist;
    p.dy = tdy / dist;
    p.x += p.dx * p.speed * dtS;
    p.y += p.dy * p.speed * dtS;
  }

  for (const p of toRemove) {
    const idx = projectiles.indexOf(p);
    if (idx !== -1) projectiles.splice(idx, 1);
  }
}

function _onHit(p, enemies) {
  if (p.splash > 0) {
    // Area damage
    for (const en of enemies) {
      if (en.dead) continue;
      if (Math.hypot(en.x - p.x, en.y - p.y) <= p.splash) {
        en.takeDamage(p.damage);
      }
    }
  } else {
    p.target.takeDamage(p.damage);
  }
}

// ---- Draw all projectiles -----------------------------------
export function drawProjectiles(ctx) {
  for (const p of projectiles) {
    if (p.dead) continue;
    ctx.save();
    if (p.length > 0) {
      // Drawn as a line in direction of travel
      ctx.strokeStyle = p.colour;
      ctx.lineWidth   = p.radius * 1.2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - p.dx * p.length, p.y - p.dy * p.length);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      // Cannon ball — circle
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
