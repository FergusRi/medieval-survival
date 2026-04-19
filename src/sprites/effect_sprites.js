// ============================================================
// effect_sprites.js — Scaffold, rubble, and grave sprites
// Phase 28: procedural Canvas 2D effects drawn over/under buildings.
// ============================================================

/**
 * Draw scaffold over a blueprint building (construction in progress).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x  world px left
 * @param {number} y  world px top
 * @param {number} w  footprint width px
 * @param {number} h  footprint height px
 * @param {number} progress 0..1
 */
export function drawScaffold(ctx, x, y, w, h, progress) {
  // Grey pole grid
  const cols = Math.max(2, Math.floor(w / 16));
  const rows = Math.max(2, Math.floor(h / 16));
  ctx.strokeStyle = '#8a8888';
  ctx.lineWidth = 1.5;

  // Vertical poles
  for (let c = 0; c <= cols; c++) {
    const px = x + (c / cols) * w;
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke();
  }
  // Horizontal planks
  for (let r = 0; r <= rows; r++) {
    const py = y + (r / rows) * h;
    ctx.strokeStyle = r % 2 === 0 ? '#a09080' : '#8a8888';
    ctx.lineWidth = r % 2 === 0 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
  }

  // Diagonal braces
  ctx.strokeStyle = 'rgba(120,100,80,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (let c = 0; c < cols; c++) {
    const x1 = x + (c / cols) * w;
    const x2 = x + ((c + 1) / cols) * w;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y + h); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Progress bar above
  const barW = w;
  const barH = 4;
  const bx   = x;
  const by   = y - barH - 3;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = progress > 0.6 ? '#2ecc71' : progress > 0.3 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(bx, by, barW * progress, barH);
}

/**
 * Draw rubble chunks at the footprint of a destroyed building.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x  world px left
 * @param {number} y  world px top
 * @param {number} w  footprint width px
 * @param {number} h  footprint height px
 */
export function drawRubble(ctx, x, y, w, h) {
  // Scattered stone chunks
  const chunks = [
    { rx: 0.08, ry: 0.55, rw: 0.22, rh: 0.14, c: '#8a7a6a' },
    { rx: 0.35, ry: 0.48, rw: 0.18, rh: 0.18, c: '#6a5a4a' },
    { rx: 0.6,  ry: 0.58, rw: 0.26, rh: 0.12, c: '#9a8a7a' },
    { rx: 0.15, ry: 0.72, rw: 0.14, rh: 0.18, c: '#7a6a5a' },
    { rx: 0.5,  ry: 0.7,  rw: 0.2,  rh: 0.14, c: '#5a4a3a' },
    { rx: 0.76, ry: 0.65, rw: 0.16, rh: 0.2,  c: '#8a7a6a' },
  ];

  // Dark rubble base
  ctx.fillStyle = 'rgba(60,50,40,0.45)';
  ctx.fillRect(x + w*0.05, y + h*0.45, w*0.9, h*0.55);

  for (const ch of chunks) {
    ctx.fillStyle = ch.c;
    ctx.fillRect(x + w*ch.rx, y + h*ch.ry, w*ch.rw, h*ch.rh);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + w*ch.rx, y + h*ch.ry, w*ch.rw, h*ch.rh);
  }

  // Small debris dots
  ctx.fillStyle = '#6a5a4a';
  for (let i = 0; i < 8; i++) {
    const dx = x + w * (0.1 + (i * 0.11) % 0.8);
    const dy = y + h * (0.5 + (i * 0.07) % 0.45);
    ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Draw a small stone grave marker (16×16px centred at gx, gy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} gx  world centre x
 * @param {number} gy  world centre y
 */
export function drawGrave(ctx, gx, gy) {
  const s = 8; // half-size
  // Stone base
  ctx.fillStyle = '#8a8878';
  ctx.fillRect(gx - s * 0.6, gy + s * 0.2, s * 1.2, s * 0.8);
  // Headstone (rounded top)
  ctx.fillStyle = '#a0a090';
  ctx.beginPath();
  ctx.arc(gx, gy, s * 0.55, Math.PI, 0);
  ctx.rect(gx - s * 0.55, gy, s * 1.1, s * 0.3);
  ctx.fill();
  ctx.strokeStyle = '#6a6a5a'; ctx.lineWidth = 0.5; ctx.stroke();
  // Cross etching
  ctx.strokeStyle = '#6a6a5a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(gx, gy - s*0.38); ctx.lineTo(gx, gy + s*0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx - s*0.25, gy - s*0.18); ctx.lineTo(gx + s*0.25, gy - s*0.18); ctx.stroke();
}
