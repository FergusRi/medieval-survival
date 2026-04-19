// ============================================================
// enemy_sprites.js — Per-type procedural enemy bodies
// Phase 29: Replaces plain circle with distinct shapes per type.
// All draw fns receive (ctx, x, y, radius, facing, hp, maxHp)
// facing: 1 = right, -1 = left
// ============================================================

const TILE = 32;

// ── Shared helpers ────────────────────────────────────────────

function _body(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function _head(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function _eyes(ctx, x, y, r, facing) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const eo = r * 0.35;
  ctx.beginPath(); ctx.arc(x + eo * facing - 1 * facing, y - 0.5, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + eo * facing + 1 * facing, y - 0.5, 1, 0, Math.PI * 2); ctx.fill();
}

function _hpBar(ctx, x, y, r, hp, maxHp) {
  if (hp >= maxHp) return;
  const bw = r * 2.8;
  const bh = 3;
  const bx = x - bw / 2;
  const by = y - r - 7;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, by, bw, bh);
  const pct = hp / maxHp;
  ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(bx, by, bw * pct, bh);
}

// ── Per-type draw functions ───────────────────────────────────

function _drawRaider(ctx, x, y, r, facing, hp, maxHp) {
  // Dark red tunic body, small head, jagged sword
  const bw = r * 1.6, bh = r * 1.1;
  const headY = y - bh / 2 - r * 0.7;

  // Legs
  ctx.strokeStyle = '#7a3020';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  const walk = Math.sin(Date.now() / 150) * 2;
  ctx.beginPath(); ctx.moveTo(x - 2, y + bh * 0.4); ctx.lineTo(x - 3, y + bh * 0.4 + 5 + walk); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y + bh * 0.4); ctx.lineTo(x + 3, y + bh * 0.4 + 5 - walk); ctx.stroke();

  _body(ctx, x, y, bw, bh, '#c0392b');
  _head(ctx, x, headY, r * 0.6, '#d4a574');
  _eyes(ctx, x, headY, r * 0.6, facing);

  // Jagged sword
  ctx.strokeStyle = '#c0c8d0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 6 * facing, headY - 2);
  ctx.lineTo(x + 8 * facing, y + 4);
  ctx.stroke();
  // Notch
  ctx.beginPath();
  ctx.moveTo(x + 7 * facing, y - 1);
  ctx.lineTo(x + 9 * facing, y + 1);
  ctx.stroke();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawBrute(ctx, x, y, r, facing, hp, maxHp) {
  // Wide dark grey body, large club
  const bw = r * 2.2, bh = r * 1.4;
  const headY = y - bh / 2 - r * 0.8;

  ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const walk = Math.sin(Date.now() / 200) * 2;
  ctx.beginPath(); ctx.moveTo(x - 3, y + bh * 0.35); ctx.lineTo(x - 4, y + bh * 0.35 + 6 + walk); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 3, y + bh * 0.35); ctx.lineTo(x + 4, y + bh * 0.35 + 6 - walk); ctx.stroke();

  _body(ctx, x, y, bw, bh, '#5d6d7e');
  _head(ctx, x, headY, r * 0.75, '#a08060');
  _eyes(ctx, x, headY, r * 0.75, facing);

  // Large club
  ctx.strokeStyle = '#8b5e20'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 7 * facing, y + 4);
  ctx.lineTo(x + 9 * facing, headY - 4);
  ctx.stroke();
  ctx.fillStyle = '#6b4010';
  ctx.beginPath();
  ctx.ellipse(x + 9 * facing, headY - 5, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawArcher(ctx, x, y, r, facing, hp, maxHp) {
  // Brown tunic, bow visible
  const bw = r * 1.4, bh = r * 1.0;
  const headY = y - bh / 2 - r * 0.65;

  ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  const walk = Math.sin(Date.now() / 160) * 2;
  ctx.beginPath(); ctx.moveTo(x - 2, y + bh * 0.4); ctx.lineTo(x - 2, y + bh * 0.4 + 5 + walk); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y + bh * 0.4); ctx.lineTo(x + 2, y + bh * 0.4 + 5 - walk); ctx.stroke();

  _body(ctx, x, y, bw, bh, '#e67e22');
  _head(ctx, x, headY, r * 0.6, '#d4a574');
  _eyes(ctx, x, headY, r * 0.6, facing);

  // Bow
  ctx.strokeStyle = '#8b5e20'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + 7 * facing, y, 6, -Math.PI * 0.65, Math.PI * 0.65, facing < 0);
  ctx.stroke();
  ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + 7 * facing, y - 6);
  ctx.lineTo(x + 7 * facing, y + 6);
  ctx.stroke();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawShaman(ctx, x, y, r, facing, hp, maxHp) {
  // Green robes, staff with orb
  const bw = r * 1.5, bh = r * 1.2;
  const headY = y - bh / 2 - r * 0.7;

  ctx.strokeStyle = '#2d7a3a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  const walk = Math.sin(Date.now() / 180) * 1.5;
  ctx.beginPath(); ctx.moveTo(x - 2, y + bh * 0.4); ctx.lineTo(x - 2, y + bh * 0.4 + 5 + walk); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y + bh * 0.4); ctx.lineTo(x + 2, y + bh * 0.4 + 5 - walk); ctx.stroke();

  _body(ctx, x, y, bw, bh, '#27ae60');
  _head(ctx, x, headY, r * 0.65, '#c4a060');
  _eyes(ctx, x, headY, r * 0.65, facing);

  // Staff
  ctx.strokeStyle = '#7b5e30'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 8 * facing, y + 5);
  ctx.lineTo(x + 8 * facing, headY - 7);
  ctx.stroke();
  // Magic orb
  ctx.fillStyle = 'rgba(80,200,120,0.85)';
  ctx.beginPath();
  ctx.arc(x + 8 * facing, headY - 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 0.8;
  ctx.stroke();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawWarchief(ctx, x, y, r, facing, hp, maxHp) {
  // Gold/purple cape, horned helmet
  const bw = r * 2.0, bh = r * 1.3;
  const headY = y - bh / 2 - r * 0.8;

  // Cape
  ctx.fillStyle = 'rgba(128,0,128,0.7)';
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y - bh * 0.3);
  ctx.lineTo(x - bw * 0.8, y + bh * 0.8);
  ctx.lineTo(x + bw * 0.8, y + bh * 0.8);
  ctx.lineTo(x + bw / 2, y - bh * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 3, y + bh * 0.4); ctx.lineTo(x - 4, y + bh * 0.4 + 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 3, y + bh * 0.4); ctx.lineTo(x + 4, y + bh * 0.4 + 6); ctx.stroke();

  _body(ctx, x, y, bw, bh, '#d4ac0d');
  _head(ctx, x, headY, r * 0.75, '#c49a5a');

  // Horned helmet
  ctx.fillStyle = '#8b8040';
  ctx.fillRect(x - r * 0.7, headY - r * 0.6, r * 1.4, r * 0.6);
  // Horns
  ctx.fillStyle = '#c8a050';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, headY - r * 0.6);
  ctx.lineTo(x - r * 1.1, headY - r * 1.5);
  ctx.lineTo(x - r * 0.3, headY - r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.6, headY - r * 0.6);
  ctx.lineTo(x + r * 1.1, headY - r * 1.5);
  ctx.lineTo(x + r * 0.3, headY - r * 0.6);
  ctx.closePath();
  ctx.fill();

  _eyes(ctx, x, headY, r * 0.75, facing);

  // Large axe
  ctx.strokeStyle = '#b8a030'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 9 * facing, y + 5);
  ctx.lineTo(x + 9 * facing, headY - 5);
  ctx.stroke();
  ctx.fillStyle = '#d4ac0d';
  ctx.beginPath();
  ctx.moveTo(x + 9 * facing, headY - 5);
  ctx.lineTo(x + (9 + 5) * facing, headY - 9);
  ctx.lineTo(x + (9 + 5) * facing, headY - 1);
  ctx.closePath();
  ctx.fill();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawBerserker(ctx, x, y, r, facing, hp, maxHp, enraged) {
  // Orange tunic, dual axes; enraged = red-orange glow
  const bw = r * 1.8, bh = r * 1.2;
  const headY = y - bh / 2 - r * 0.75;
  const tunic = enraged ? '#ff4500' : '#e8701a';

  ctx.strokeStyle = enraged ? '#cc3300' : '#a04010';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  const walk = Math.sin(Date.now() / 120) * 2.5;
  ctx.beginPath(); ctx.moveTo(x - 3, y + bh * 0.4); ctx.lineTo(x - 3, y + bh * 0.4 + 6 + walk); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 3, y + bh * 0.4); ctx.lineTo(x + 3, y + bh * 0.4 + 6 - walk); ctx.stroke();

  _body(ctx, x, y, bw, bh, tunic);
  _head(ctx, x, headY, r * 0.7, '#c49a5a');
  _eyes(ctx, x, headY, r * 0.7, facing);

  // Left axe
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.moveTo(x - 8 * facing, headY);
  ctx.lineTo(x - 12 * facing, headY - 4);
  ctx.lineTo(x - 12 * facing, headY + 4);
  ctx.closePath();
  ctx.fill();
  // Right axe
  ctx.beginPath();
  ctx.moveTo(x + 8 * facing, headY);
  ctx.lineTo(x + 12 * facing, headY - 4);
  ctx.lineTo(x + 12 * facing, headY + 4);
  ctx.closePath();
  ctx.fill();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawSiegeRam(ctx, x, y, r, facing, hp, maxHp) {
  // Very wide dark body, ram-head silhouette on front
  const bw = r * 3.0, bh = r * 1.8;
  const headY = y - bh / 2 - r * 0.5;

  // Wheels
  ctx.fillStyle = '#4a3820';
  for (const wx of [-r * 0.9, r * 0.9]) {
    ctx.beginPath();
    ctx.arc(x + wx, y + bh * 0.4, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b6030'; ctx.lineWidth = 1;
    ctx.stroke();
  }

  _body(ctx, x, y, bw, bh, '#5d6d7e');

  // Ram head silhouette on the front
  const frontX = x + r * 1.0 * facing;
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.ellipse(frontX, y, r * 0.9, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ram horns
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(frontX, y - r * 0.3, r * 0.7, -Math.PI * 0.4, -Math.PI * 0.9, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(frontX, y + r * 0.3, r * 0.7, Math.PI * 0.4, Math.PI * 0.9);
  ctx.stroke();

  // Log/beam
  ctx.fillStyle = '#8b5e20';
  ctx.fillRect(x - bw * 0.4, y - r * 0.2, bw * 0.8, r * 0.4);

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawRunner(ctx, x, y, r, facing, hp, maxHp) {
  // Lean forward, green cloak, fast legs
  const bw = r * 1.3, bh = r * 0.9;
  const headY = y - bh / 2 - r * 0.6;

  // Fast leg animation
  ctx.strokeStyle = '#1a7a6a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  const walk = Math.sin(Date.now() / 80) * 4; // faster oscillation
  ctx.beginPath(); ctx.moveTo(x - 2, y + bh * 0.4); ctx.lineTo(x - 4 + walk, y + bh * 0.4 + 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y + bh * 0.4); ctx.lineTo(x + 4 - walk, y + bh * 0.4 + 7); ctx.stroke();

  // Cloak (slightly tilted for lean)
  ctx.fillStyle = 'rgba(26,188,156,0.75)';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.15 * facing);
  ctx.fillRect(-bw / 2, -bh / 2 - 1, bw, bh + 2);
  ctx.restore();

  _body(ctx, x, y, bw, bh, '#1abc9c');
  _head(ctx, x + 1 * facing, headY, r * 0.55, '#a0d8b0');
  _eyes(ctx, x + 1 * facing, headY, r * 0.55, facing);

  // Short dagger
  ctx.strokeStyle = '#c0c8d0'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 5 * facing, headY);
  ctx.lineTo(x + 8 * facing, y + 3);
  ctx.stroke();

  _hpBar(ctx, x, y, r, hp, maxHp);
}

function _drawSwarm(ctx, x, y, r, facing, hp, maxHp) {
  // Small dark purple, slightly translucent insect-like
  const bw = r * 1.4, bh = r * 1.0;
  const headY = y - bh / 2 - r * 0.5;

  _body(ctx, x, y, bw, bh, 'rgba(100,80,120,0.82)');
  _head(ctx, x, headY, r * 0.5, 'rgba(80,60,100,0.9)');

  // Antennae
  ctx.strokeStyle = '#a080c0'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x - 1, headY - r * 0.5); ctx.lineTo(x - 4, headY - r * 1.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 1, headY - r * 0.5); ctx.lineTo(x + 4, headY - r * 1.2); ctx.stroke();

  _eyes(ctx, x, headY, r * 0.5, facing);

  _hpBar(ctx, x, y, r, hp, maxHp);
}

// ── Main export ───────────────────────────────────────────────

/**
 * Draw a procedural enemy sprite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} enemy  Enemy instance
 */
export function drawEnemySprite(ctx, enemy) {
  const { x, y, radius: r, type, hp, maxHp, enraged, buffed } = enemy;

  // Derive facing from movement direction (use last dx if available)
  const facing = enemy._facing ?? 1;

  ctx.save();

  // Warchief aura glow ring
  if (buffed) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212,172,13,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Enraged pulse ring
  if (enraged) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 80);
    ctx.beginPath();
    ctx.arc(x, y, r + 3 + pulse * 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,50,50,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  switch (type) {
    case 'raider':    _drawRaider(ctx, x, y, r, facing, hp, maxHp);           break;
    case 'brute':     _drawBrute(ctx, x, y, r, facing, hp, maxHp);            break;
    case 'archer':    _drawArcher(ctx, x, y, r, facing, hp, maxHp);           break;
    case 'shaman':    _drawShaman(ctx, x, y, r, facing, hp, maxHp);           break;
    case 'warchief':  _drawWarchief(ctx, x, y, r, facing, hp, maxHp);         break;
    case 'berserker': _drawBerserker(ctx, x, y, r, facing, hp, maxHp, enraged); break;
    case 'siege_ram': _drawSiegeRam(ctx, x, y, r, facing, hp, maxHp);         break;
    case 'runner':    _drawRunner(ctx, x, y, r, facing, hp, maxHp);           break;
    case 'swarm':     _drawSwarm(ctx, x, y, r, facing, hp, maxHp);            break;
    default:          _drawRaider(ctx, x, y, r, facing, hp, maxHp);           break;
  }

  ctx.restore();
}
