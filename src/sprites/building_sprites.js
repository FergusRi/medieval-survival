// ============================================================
// building_sprites.js — Procedural Canvas 2D building sprites
// Redesigned for Middle Path: 1×1 and 2×2 footprints
// draw fn receives (ctx, x, y, w, h, state)
//   x,y = top-left of VISUAL area (includes SPRITE_EXTRA_ROWS_ABOVE)
//   w,h = pixel dimensions of full visual area
//   state = 'complete' | 'blueprint' | 'damaged' | 'critical' | 'rubble'
// ============================================================

export const SPRITE_EXTRA_ROWS_ABOVE = 0.8;

export async function preloadBuildingSprites() {}
export function getBuildingSprite() { return null; }

// ── Shared helpers ────────────────────────────────────────

function _roof(ctx, x, y, w, peakH, colour, shadow = 'rgba(0,0,0,0.3)') {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.5, y - peakH);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  // Left face (lighter)
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.5, y - peakH);
  ctx.lineTo(x + w * 0.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shadow;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w * 0.5, y - peakH); ctx.lineTo(x + w, y);
  ctx.stroke();
}

function _wall(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
  // Right-side shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x + w * 0.75, y, w * 0.25, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function _door(ctx, cx, y, dw, dh, colour = '#4a2a0e') {
  ctx.fillStyle = colour;
  ctx.fillRect(cx - dw * 0.5, y - dh, dw, dh);
  // Arch
  ctx.beginPath();
  ctx.arc(cx, y - dh, dw * 0.5, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#2a1008';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - dw * 0.5, y - dh, dw, dh);
}

function _window(ctx, cx, cy, size = 4) {
  ctx.fillStyle = '#b8d8f0';
  ctx.fillRect(cx - size * 0.5, cy - size * 0.5, size, size);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(cx - size * 0.5, cy - size * 0.5, size * 0.5, size * 0.5);
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(cx - size * 0.5, cy - size * 0.5, size, size);
  // Cross panes
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.5); ctx.lineTo(cx, cy + size * 0.5);
  ctx.moveTo(cx - size * 0.5, cy); ctx.lineTo(cx + size * 0.5, cy);
  ctx.stroke();
}

function _chimney(ctx, cx, y, w = 4, h = 9, colour = '#7a6a5a') {
  ctx.fillStyle = colour;
  ctx.fillRect(cx - w * 0.5, y - h, w, h);
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(cx - w * 0.5 - 1, y - h, w + 2, 2);
}

function _smoke(ctx, cx, y) {
  const t = (Date.now() / 900) % 1;
  for (let i = 0; i < 3; i++) {
    const ph = (t + i * 0.33) % 1;
    const sx = cx + Math.sin(ph * Math.PI * 2) * 2;
    const sy = y - ph * 12;
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + ph * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,180,180,${(1 - ph) * 0.45})`;
    ctx.fill();
  }
}

function _battlements(ctx, x, y, w, mw = 5, gap = 3) {
  ctx.fillStyle = '#8a8a7a';
  let cx = x;
  while (cx < x + w) {
    ctx.fillRect(cx, y - 6, Math.min(mw, x + w - cx), 6);
    cx += mw + gap;
  }
}

function _stoneTex(ctx, x, y, w, h, col1, col2) {
  // simple stone block texture
  ctx.fillStyle = col1;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col2;
  const bw = Math.max(6, w / 5), bh = Math.max(4, h / 6);
  for (let row = 0; row * bh < h; row++) {
    const off = (row % 2) * bw * 0.5;
    for (let col = 0; col * bw < w + bw; col++) {
      const bx = x + col * bw - off;
      const by = y + row * bh;
      ctx.strokeStyle = col2;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, bw - 1, bh - 1);
    }
  }
}

function _rubble(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(80,70,60,0.75)';
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
  for (let i = 0; i < 9; i++) {
    const rx = x + (i / 9) * w + Math.sin(i * 1.9) * 3;
    const ry = y + h * 0.5 + Math.cos(i * 2.5) * 4;
    ctx.fillStyle = i % 2 ? '#8a7a6a' : '#5a4a3a';
    ctx.fillRect(rx, ry, 5 + (i % 3) * 3, 3 + (i % 2) * 3);
  }
}

function _blueprint(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(60,120,220,0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(100,160,255,0.65)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(100,160,255,0.2)';
  const step = 8;
  for (let gx = x; gx < x + w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  for (let gy = y; gy < y + h; gy += step) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
}

function _damageFilter(ctx, x, y, w, h, state) {
  if (state === 'damaged') {
    ctx.fillStyle = 'rgba(200,80,0,0.14)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(80,40,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.2); ctx.lineTo(x + w * 0.45, y + h * 0.7); ctx.stroke();
  } else if (state === 'critical') {
    ctx.fillStyle = 'rgba(220,30,0,0.26)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(180,20,0,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.1); ctx.lineTo(x + w * 0.5, y + h * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.65, y + h * 0.2); ctx.lineTo(x + w * 0.4, y + h * 0.75); ctx.stroke();
  }
}

// ── Individual building draw functions ──────────────────────

function _drawCapital(ctx, x, y, w, h) {
  const base = y + h * 0.5;
  // Stone base
  _stoneTex(ctx, x + w * 0.05, base, w * 0.9, h * 0.5, '#9aaa90', '#7a8a70');
  // Centre keep
  _wall(ctx, x + w * 0.25, base - h * 0.32, w * 0.5, h * 0.32, '#b0c0a8');
  _battlements(ctx, x + w * 0.25, base - h * 0.32, w * 0.5, 5, 3);
  // Left tower
  _wall(ctx, x + w * 0.04, base - h * 0.22, w * 0.18, h * 0.22, '#a8b8a0');
  _battlements(ctx, x + w * 0.04, base - h * 0.22, w * 0.18, 4, 3);
  // Right tower
  _wall(ctx, x + w * 0.78, base - h * 0.22, w * 0.18, h * 0.22, '#a8b8a0');
  _battlements(ctx, x + w * 0.78, base - h * 0.22, w * 0.18, 4, 3);
  // Gate arch
  const gx = x + w * 0.5, gy = y + h;
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath();
  ctx.arc(gx, gy - h * 0.14, w * 0.09, Math.PI, 0);
  ctx.rect(gx - w * 0.09, gy - h * 0.14, w * 0.18, h * 0.14);
  ctx.fill();
  // Banner
  ctx.fillStyle = '#d4a020';
  ctx.fillRect(x + w * 0.48, base - h * 0.3, 2.5, h * 0.16);
  ctx.fillStyle = '#e8b030';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.505, base - h * 0.3);
  ctx.lineTo(x + w * 0.505 + 8, base - h * 0.23);
  ctx.lineTo(x + w * 0.505, base - h * 0.16);
  ctx.fill();
}

function _drawLogCabin(ctx, x, y, w, h) {
  const base = y + h * 0.5;
  // Log walls
  _wall(ctx, x + w * 0.1, base, w * 0.8, h * 0.5, '#a07848');
  // Log lines
  ctx.strokeStyle = '#7a5828';
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 4; i++) {
    const ly = base + (h * 0.5 / 4) * i;
    ctx.beginPath(); ctx.moveTo(x + w * 0.1, ly); ctx.lineTo(x + w * 0.9, ly); ctx.stroke();
  }
  _roof(ctx, x + w * 0.05, base, w * 0.9, h * 0.42, '#7a4e22');
  _chimney(ctx, x + w * 0.72, base, 4, 9);
  _smoke(ctx, x + w * 0.72, base - 9);
  _door(ctx, x + w * 0.5, y + h, w * 0.22, h * 0.28);
  _window(ctx, x + w * 0.3, base + h * 0.22, 5);
}

function _drawFarmPlot(ctx, x, y, w, h) {
  // Soil base
  ctx.fillStyle = '#5e3e1c';
  ctx.fillRect(x, y + h * 0.25, w, h * 0.75);
  // Furrow rows
  ctx.strokeStyle = '#3e2810';
  ctx.lineWidth = 1.2;
  const rows = 5;
  for (let r = 0; r <= rows; r++) {
    const ry = y + h * 0.28 + (r / rows) * h * 0.68;
    ctx.beginPath(); ctx.moveTo(x + 2, ry); ctx.lineTo(x + w - 2, ry); ctx.stroke();
  }
  // Crop sprouts
  ctx.fillStyle = '#4a9438';
  for (let ci = 0; ci < 3; ci++) {
    for (let ri = 0; ri < 3; ri++) {
      const cx2 = x + (ci + 0.5) * (w / 3);
      const cy2 = y + h * 0.42 + ri * (h * 0.2);
      ctx.beginPath(); ctx.arc(cx2, cy2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a6020'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2, cy2 + 4); ctx.stroke();
    }
  }
  // Fence
  ctx.strokeStyle = '#a07040'; ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 1, y + h * 0.26, w - 2, h * 0.72);
}

function _drawLumberCamp(ctx, x, y, w, h) {
  const base = y + h * 0.52;
  _wall(ctx, x + w * 0.12, base, w * 0.76, h * 0.48, '#b8904e');
  _roof(ctx, x + w * 0.06, base, w * 0.88, h * 0.42, '#7a4e24');
  // Log pile at front
  ctx.fillStyle = '#8a6030';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + w * 0.1 + i * (w * 0.24), y + h * 0.84, w * 0.2, h * 0.1);
    ctx.strokeStyle = '#4a2c0e'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x + w * 0.1 + i * (w * 0.24), y + h * 0.84, w * 0.2, h * 0.1);
  }
  // Axe
  ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.8, base - 2); ctx.lineTo(x + w * 0.72, base + h * 0.22); ctx.stroke();
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(x + w * 0.74, base - 6, 7, 5);
  _door(ctx, x + w * 0.5, y + h, w * 0.24, h * 0.28);
}

function _drawPitMine(ctx, x, y, w, h) {
  // Stone surround
  _stoneTex(ctx, x + w * 0.05, y + h * 0.3, w * 0.9, h * 0.7, '#8a8878', '#6a6858');
  // Pit darkness
  ctx.fillStyle = '#14100c';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.72, w * 0.3, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Timber support frame
  ctx.strokeStyle = '#8b6020'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.32, y + h * 0.55); ctx.lineTo(x + w * 0.32, y + h * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.68, y + h * 0.55); ctx.lineTo(x + w * 0.68, y + h * 0.8); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.56); ctx.lineTo(x + w * 0.7, y + h * 0.56); ctx.stroke();
  // Pickaxe icon
  ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x + w * 0.62, y + h * 0.38); ctx.lineTo(x + w * 0.82, y + h * 0.52); ctx.stroke();
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(x + w * 0.6, y + h * 0.35, 5, 4);
}

function _drawStorehouse(ctx, x, y, w, h) {
  const base = y + h * 0.52;
  _wall(ctx, x + w * 0.08, base, w * 0.84, h * 0.48, '#b8a070');
  // Wide barn-style roof
  _roof(ctx, x + w * 0.02, base, w * 0.96, h * 0.5, '#6a5030');
  // Doors (double)
  ctx.fillStyle = '#5a3a14';
  ctx.fillRect(x + w * 0.36, y + h * 0.74, w * 0.12, h * 0.26);
  ctx.fillRect(x + w * 0.52, y + h * 0.74, w * 0.12, h * 0.26);
  ctx.strokeStyle = '#3a1a04'; ctx.lineWidth = 0.7;
  ctx.strokeRect(x + w * 0.36, y + h * 0.74, w * 0.12, h * 0.26);
  ctx.strokeRect(x + w * 0.52, y + h * 0.74, w * 0.12, h * 0.26);
  // Barrels symbol
  ctx.fillStyle = '#8a6030';
  for (let i = 0; i < 2; i++) {
    const bx = x + w * (0.15 + i * 0.58), by = base + h * 0.05;
    ctx.beginPath(); ctx.ellipse(bx, by, w * 0.08, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3a0a'; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

function _drawForge(ctx, x, y, w, h) {
  const base = y + h * 0.48;
  _stoneTex(ctx, x + w * 0.08, base, w * 0.84, h * 0.52, '#8a8070', '#6a6050');
  _roof(ctx, x + w * 0.04, base, w * 0.92, h * 0.38, '#5a4530');
  // Furnace glow
  const gx = x + w * 0.5, gy = base + h * 0.25;
  const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, w * 0.22);
  grad.addColorStop(0, 'rgba(255,160,40,0.9)');
  grad.addColorStop(0.5, 'rgba(220,80,10,0.5)');
  grad.addColorStop(1, 'rgba(180,40,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(gx, gy, w * 0.22, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // Furnace mouth
  ctx.fillStyle = '#1a0e08';
  ctx.beginPath(); ctx.arc(gx, gy, w * 0.14, Math.PI, 0); ctx.rect(gx - w * 0.14, gy, w * 0.28, h * 0.1); ctx.fill();
  // Chimney
  _chimney(ctx, x + w * 0.5, base - 2, 7, 12, '#6a5a4a');
  _smoke(ctx, x + w * 0.5, base - 14);
  // Anvil silhouette
  ctx.fillStyle = '#3a3030';
  ctx.fillRect(x + w * 0.68, base + h * 0.35, w * 0.18, h * 0.06);
  ctx.fillRect(x + w * 0.7, base + h * 0.28, w * 0.14, h * 0.1);
}

function _drawMarket(ctx, x, y, w, h) {
  const base = y + h * 0.45;
  _wall(ctx, x + w * 0.06, base, w * 0.88, h * 0.55, '#c8a84a');
  // Awning / canopy
  ctx.fillStyle = '#c83030';
  ctx.fillRect(x + w * 0.02, base - h * 0.08, w * 0.96, h * 0.1);
  // Awning stripes
  ctx.fillStyle = '#e05050';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x + w * (0.04 + i * 0.155), base - h * 0.08, w * 0.07, h * 0.1);
  }
  // Goods on table
  ctx.fillStyle = '#e8c858';
  ctx.fillRect(x + w * 0.1, base + h * 0.28, w * 0.8, h * 0.08);
  // Pots / produce
  const cols = ['#e87050', '#78b840', '#e8c030'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.ellipse(x + w * (0.22 + i * 0.28), base + h * 0.24, w * 0.07, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Sign
  ctx.fillStyle = '#8a5010';
  ctx.fillRect(x + w * 0.38, base - h * 0.22, w * 0.24, h * 0.15);
  ctx.fillStyle = '#f0d060';
  ctx.font = `bold ${Math.max(6, h * 0.08)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('$', x + w * 0.5, base - h * 0.12);
  ctx.textAlign = 'left';
}

function _drawHerbalist(ctx, x, y, w, h) {
  const base = y + h * 0.52;
  _wall(ctx, x + w * 0.12, base, w * 0.76, h * 0.48, '#8caa60');
  _roof(ctx, x + w * 0.06, base, w * 0.88, h * 0.44, '#4a7228');
  // Herb bundles hanging
  ctx.fillStyle = '#6a9a40';
  for (let i = 0; i < 3; i++) {
    const hx = x + w * (0.2 + i * 0.28);
    ctx.beginPath(); ctx.arc(hx, base + h * 0.12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a6a20'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(hx, base + h * 0.12); ctx.lineTo(hx, base + h * 0.24); ctx.stroke();
  }
  // Cross symbol on door
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h * 0.64); ctx.lineTo(x + w * 0.5, y + h * 0.84); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.42, y + h * 0.71); ctx.lineTo(x + w * 0.58, y + h * 0.71); ctx.stroke();
  _door(ctx, x + w * 0.5, y + h, w * 0.22, h * 0.28, '#3a5a1e');
}

function _drawChurch(ctx, x, y, w, h) {
  const base = y + h * 0.52;
  _stoneTex(ctx, x + w * 0.1, base, w * 0.8, h * 0.48, '#c0b898', '#a09878');
  // Bell tower
  _wall(ctx, x + w * 0.38, base - h * 0.3, w * 0.24, h * 0.3, '#c8c0a0');
  // Spire
  ctx.fillStyle = '#8a7858';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.38, base - h * 0.3);
  ctx.lineTo(x + w * 0.5, base - h * 0.58);
  ctx.lineTo(x + w * 0.62, base - h * 0.3);
  ctx.fill();
  // Cross on spire
  ctx.strokeStyle = '#f0d860'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.5, base - h * 0.54); ctx.lineTo(x + w * 0.5, base - h * 0.38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.44, base - h * 0.47); ctx.lineTo(x + w * 0.56, base - h * 0.47); ctx.stroke();
  // Main roof (shallow)
  _roof(ctx, x + w * 0.07, base, w * 0.86, h * 0.28, '#9a8a60');
  // Arch window
  _window(ctx, x + w * 0.5, base + h * 0.2, 7);
  _door(ctx, x + w * 0.5, y + h, w * 0.2, h * 0.26, '#4a3810');
}

function _drawBarracks(ctx, x, y, w, h) {
  const base = y + h * 0.48;
  _stoneTex(ctx, x + w * 0.06, base, w * 0.88, h * 0.52, '#909880', '#6a7860');
  // Flat military roof
  ctx.fillStyle = '#5a5a50';
  ctx.fillRect(x + w * 0.04, base - h * 0.1, w * 0.92, h * 0.12);
  _battlements(ctx, x + w * 0.04, base - h * 0.1, w * 0.92, 6, 4);
  // Windows x3
  for (let i = 0; i < 3; i++) {
    _window(ctx, x + w * (0.2 + i * 0.3), base + h * 0.2, 5);
  }
  // Double door
  ctx.fillStyle = '#4a3820';
  ctx.fillRect(x + w * 0.4, y + h * 0.74, w * 0.1, h * 0.26);
  ctx.fillRect(x + w * 0.5, y + h * 0.74, w * 0.1, h * 0.26);
  ctx.strokeStyle = '#2a1c0a'; ctx.lineWidth = 0.8;
  ctx.strokeRect(x + w * 0.4, y + h * 0.74, w * 0.2, h * 0.26);
  // Spear rack
  ctx.strokeStyle = '#a09060'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const sx = x + w * (0.14 + i * 0.12);
    ctx.beginPath(); ctx.moveTo(sx, base + h * 0.05); ctx.lineTo(sx, base + h * 0.48); ctx.stroke();
    ctx.fillStyle = '#c0c0a0';
    ctx.beginPath(); ctx.moveTo(sx, base + h * 0.05); ctx.lineTo(sx - 2, base + h * 0.12); ctx.lineTo(sx + 2, base + h * 0.12); ctx.fill();
  }
}

function _drawWatchtower(ctx, x, y, w, h) {
  // Stone base
  _stoneTex(ctx, x + w * 0.2, y + h * 0.35, w * 0.6, h * 0.65, '#9a9080', '#7a7060');
  // Upper platform
  _wall(ctx, x + w * 0.1, y + h * 0.22, w * 0.8, h * 0.15, '#a8a090');
  _battlements(ctx, x + w * 0.1, y + h * 0.22, w * 0.8, 5, 3);
  // Roof cap
  ctx.fillStyle = '#6a5838';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.22);
  ctx.lineTo(x + w * 0.5, y + h * 0.06);
  ctx.lineTo(x + w * 0.9, y + h * 0.22);
  ctx.fill();
  // Ladder lines
  ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + w * 0.38, y + h * 0.38); ctx.lineTo(x + w * 0.38, y + h * 0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.62, y + h * 0.38); ctx.lineTo(x + w * 0.62, y + h * 0.95); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const ry = y + h * (0.45 + i * 0.13);
    ctx.beginPath(); ctx.moveTo(x + w * 0.38, ry); ctx.lineTo(x + w * 0.62, ry); ctx.stroke();
  }
}

function _drawArrowTower(ctx, x, y, w, h) {
  // Solid stone cylinder-ish tower
  _stoneTex(ctx, x + w * 0.15, y + h * 0.3, w * 0.7, h * 0.7, '#8a8878', '#6a6858');
  // Battlemented top
  _wall(ctx, x + w * 0.08, y + h * 0.18, w * 0.84, h * 0.14, '#9a9888');
  _battlements(ctx, x + w * 0.08, y + h * 0.18, w * 0.84, 5, 3);
  // Arrow slits x2
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x + w * 0.3, y + h * 0.48, w * 0.06, h * 0.16);
  ctx.fillRect(x + w * 0.64, y + h * 0.48, w * 0.06, h * 0.16);
  // Crossbow bolt sticking out
  ctx.strokeStyle = '#c0a060'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h * 0.38); ctx.lineTo(x + w * 0.7, y + h * 0.34); ctx.stroke();
  ctx.fillStyle = '#909090';
  ctx.fillRect(x + w * 0.68, y + h * 0.32, 4, 3);
}

function _drawPalisade(ctx, x, y, w, h) {
  // Row of wooden stakes
  const stakeW = Math.max(4, w * 0.13);
  const stakeGap = Math.max(2, w * 0.05);
  const totalW = w * 0.9;
  const startX = x + w * 0.05;
  const count = Math.floor(totalW / (stakeW + stakeGap));
  for (let i = 0; i < count; i++) {
    const sx = startX + i * (stakeW + stakeGap);
    const sh = h * (0.62 + (i % 2) * 0.06); // alternating heights
    const sy = y + h - sh;
    ctx.fillStyle = '#a07840';
    ctx.fillRect(sx, sy, stakeW, sh);
    // Point
    ctx.fillStyle = '#c09050';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + stakeW * 0.5, sy - h * 0.1);
    ctx.lineTo(sx + stakeW, sy);
    ctx.fill();
    // Grain lines
    ctx.strokeStyle = '#7a5820'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(sx + stakeW * 0.4, sy + h * 0.1); ctx.lineTo(sx + stakeW * 0.4, y + h); ctx.stroke();
  }
  // Rope binding
  ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.04, y + h * 0.45); ctx.lineTo(x + w * 0.96, y + h * 0.45); ctx.stroke();
}

function _drawStoneWall(ctx, x, y, w, h) {
  _stoneTex(ctx, x, y + h * 0.15, w, h * 0.85, '#9a9888', '#7a7868');
  // Battlements on top
  _battlements(ctx, x, y + h * 0.15, w, 6, 4);
  // Mortar highlights
  ctx.strokeStyle = '#b8b0a0'; ctx.lineWidth = 0.4;
  for (let row = 0; row < 4; row++) {
    const ry = y + h * 0.3 + row * (h * 0.18);
    ctx.beginPath(); ctx.moveTo(x + 2, ry); ctx.lineTo(x + w - 2, ry); ctx.stroke();
  }
}

// ── New modular building draw functions ───────────────────

function _drawWallWood(ctx, x, y, w, h) {
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(x, y + h * 0.1, w, h * 0.9);
  ctx.strokeStyle = '#5C3A1E'; ctx.lineWidth = 1;
  // Vertical planks
  const planks = Math.max(2, Math.round(w / 10));
  for (let i = 0; i <= planks; i++) {
    const px = x + (i / planks) * w;
    ctx.beginPath(); ctx.moveTo(px, y + h * 0.1); ctx.lineTo(px, y + h); ctx.stroke();
  }
  // Top cap
  ctx.fillStyle = '#A0724A';
  ctx.fillRect(x, y + h * 0.1, w, h * 0.12);
}

function _drawWallStone(ctx, x, y, w, h) {
  _stoneTex(ctx, x, y + h * 0.1, w, h * 0.9, '#8a8a82', '#6a6a62');
  ctx.fillStyle = '#9a9a92';
  ctx.fillRect(x, y + h * 0.1, w, h * 0.1);
}

function _drawWallMetal(ctx, x, y, w, h) {
  ctx.fillStyle = '#7a8a96';
  ctx.fillRect(x, y + h * 0.1, w, h * 0.9);
  ctx.strokeStyle = '#5a6a76'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const ry = y + h * 0.25 + i * (h * 0.22);
    ctx.beginPath(); ctx.moveTo(x + 2, ry); ctx.lineTo(x + w - 2, ry); ctx.stroke();
  }
  // Rivet dots
  ctx.fillStyle = '#4a5a66';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(x + w * 0.15, y + h * 0.3 + i * h * 0.22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.85, y + h * 0.3 + i * h * 0.22, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function _drawDoorWood(ctx, x, y, w, h) {
  // Frame
  ctx.fillStyle = '#6B4423'; ctx.fillRect(x, y + h * 0.05, w, h * 0.95);
  // Door panel
  ctx.fillStyle = '#A0724A';
  ctx.fillRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.9);
  // Panels
  ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 1;
  ctx.strokeRect(x + w * 0.18, y + h * 0.15, w * 0.64, h * 0.35);
  ctx.strokeRect(x + w * 0.18, y + h * 0.55, w * 0.64, h * 0.35);
  // Handle
  ctx.fillStyle = '#D4A030';
  ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.5, 3, 0, Math.PI * 2); ctx.fill();
}

function _drawDoorReinforced(ctx, x, y, w, h) {
  ctx.fillStyle = '#4a5a66'; ctx.fillRect(x, y + h * 0.05, w, h * 0.95);
  ctx.strokeStyle = '#8a9aaa'; ctx.lineWidth = 1.5;
  // X brace
  ctx.beginPath(); ctx.moveTo(x + 2, y + h * 0.1); ctx.lineTo(x + w - 2, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - 2, y + h * 0.1); ctx.lineTo(x + 2, y + h); ctx.stroke();
  // Handle
  ctx.fillStyle = '#D4A030';
  ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.5, 3, 0, Math.PI * 2); ctx.fill();
}

function _drawBed(ctx, x, y, w, h) {
  // Frame
  ctx.fillStyle = '#8B5E3C'; ctx.fillRect(x + 2, y + h * 0.3, w - 4, h * 0.65);
  // Mattress
  ctx.fillStyle = '#D4C8A0'; ctx.fillRect(x + 3, y + h * 0.35, w - 6, h * 0.55);
  // Pillow
  ctx.fillStyle = '#F0EAD6'; ctx.fillRect(x + 4, y + h * 0.37, w * 0.35, h * 0.2);
  // Headboard
  ctx.fillStyle = '#6B4423'; ctx.fillRect(x + 1, y + h * 0.25, w - 2, h * 0.12);
}

function _drawWorkbench(ctx, x, y, w, h) {
  // Legs
  ctx.fillStyle = '#6B4423';
  ctx.fillRect(x + 3,     y + h * 0.55, 5, h * 0.45);
  ctx.fillRect(x + w - 8, y + h * 0.55, 5, h * 0.45);
  // Top surface
  ctx.fillStyle = '#A0724A'; ctx.fillRect(x, y + h * 0.45, w, h * 0.13);
  // Tools on top
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(x + w * 0.1, y + h * 0.28, 4, h * 0.18);
  ctx.fillStyle = '#C0A030';
  ctx.fillRect(x + w * 0.55, y + h * 0.3, w * 0.3, 5);
}

function _drawStorageCrate(ctx, x, y, w, h) {
  ctx.fillStyle = '#A0844A'; ctx.fillRect(x + 1, y + h * 0.2, w - 2, h * 0.8);
  ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + h * 0.2, w - 2, h * 0.8);
  // Cross braces
  ctx.beginPath(); ctx.moveTo(x + 1, y + h * 0.2); ctx.lineTo(x + w - 1, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - 1, y + h * 0.2); ctx.lineTo(x + 1, y + h); ctx.stroke();
  // Lid line
  ctx.beginPath(); ctx.moveTo(x + 1, y + h * 0.35); ctx.lineTo(x + w - 1, y + h * 0.35); ctx.stroke();
}

function _drawCookingPot(ctx, x, y, w, h) {
  // Fire
  ctx.fillStyle = '#FF6600';
  ctx.beginPath(); ctx.ellipse(x + w/2, y + h * 0.82, w * 0.25, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Pot body
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath(); ctx.ellipse(x + w/2, y + h * 0.65, w * 0.38, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  // Pot rim
  ctx.fillStyle = '#6a6a6a';
  ctx.beginPath(); ctx.ellipse(x + w/2, y + h * 0.45, w * 0.38, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // Handles
  ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + w * 0.18, y + h * 0.48, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w * 0.82, y + h * 0.48, 5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
}

function _drawTorch(ctx, x, y, w, h) {
  // Pole
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(x + w * 0.42, y + h * 0.35, w * 0.16, h * 0.65);
  // Flame
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.05);
  ctx.quadraticCurveTo(x + w * 0.7, y + h * 0.2, x + w * 0.58, y + h * 0.38);
  ctx.lineTo(x + w * 0.42, y + h * 0.38);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.2, x + w * 0.5, y + h * 0.05);
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.12);
  ctx.quadraticCurveTo(x + w * 0.62, y + h * 0.22, x + w * 0.55, y + h * 0.36);
  ctx.lineTo(x + w * 0.45, y + h * 0.36);
  ctx.quadraticCurveTo(x + w * 0.38, y + h * 0.22, x + w * 0.5, y + h * 0.12);
  ctx.fill();
}

function _drawTable(ctx, x, y, w, h) {
  // Legs
  ctx.fillStyle = '#6B4423';
  ctx.fillRect(x + 3,     y + h * 0.5, 4, h * 0.5);
  ctx.fillRect(x + w - 7, y + h * 0.5, 4, h * 0.5);
  // Surface
  ctx.fillStyle = '#C8A060'; ctx.fillRect(x, y + h * 0.38, w, h * 0.14);
  ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y + h * 0.38, w, h * 0.14);
}

function _drawTurretBallista(ctx, x, y, w, h, aimAngle) {
  const cx = x + w / 2, cy = y + h / 2;
  // Base platform
  ctx.fillStyle = '#8B5E3C'; ctx.fillRect(x + 2, y + h * 0.4, w - 4, h * 0.6);
  ctx.strokeStyle = '#5C3A1E'; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + h * 0.4, w - 4, h * 0.6);
  // Swivel ring
  ctx.fillStyle = '#6a6a6a';
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.25, 0, Math.PI * 2); ctx.fill();
  // Barrel (rotates with aimAngle)
  const angle = aimAngle ?? -Math.PI / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#5C3A1E';
  ctx.fillRect(-2, -h * 0.35, 4, h * 0.35);
  // Arms
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(-w * 0.3, -3, w * 0.6, 6);
  ctx.restore();
}

function _drawTurretCannon(ctx, x, y, w, h, aimAngle) {
  const cx = x + w / 2, cy = y + h / 2;
  // Stone base
  _stoneTex(ctx, x, y + h * 0.35, w, h * 0.65, '#8a8a82', '#6a6a62');
  // Swivel ring
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.28, 0, Math.PI * 2); ctx.fill();
  // Barrel (rotates with aimAngle)
  const angle = aimAngle ?? -Math.PI / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-4, -h * 0.38, 8, h * 0.38);
  // Muzzle ring
  ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -h * 0.38, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── Dispatch map ──────────────────────────────────────────

const DRAW_FNS = {
  // Production
  farm_plot:         _drawFarmPlot,
  lumber_camp:       _drawLumberCamp,
  pit_mine:          _drawPitMine,
  // Structure — walls/doors use adjacency variants (see drawBuildingSprite)
  wall_wood:         _drawWallWood,
  wall_stone:        _drawWallStone,
  wall_metal:        _drawWallMetal,
  door_wood:         _drawDoorWood,
  door_reinforced:   _drawDoorReinforced,
  // Furniture
  bed:               _drawBed,
  workbench:         _drawWorkbench,
  storage_crate:     _drawStorageCrate,
  cooking_pot:       _drawCookingPot,
  torch:             _drawTorch,
  table:             _drawTable,
  // Military
  turret_ballista:   _drawTurretBallista,
  turret_cannon:     _drawTurretCannon,
};

export function drawBuildingSprite(ctx, type, state, x, y, w, h, aimAngle) {
  ctx.save();

  if (state === 'rubble') {
    _rubble(ctx, x, y, w, h);
    ctx.restore();
    return;
  }

  if (state === 'blueprint') {
    _blueprint(ctx, x, y, w, h);
    ctx.restore();
    return;
  }

  const fn = DRAW_FNS[type];
  if (fn) {
    fn(ctx, x, y, w, h, aimAngle);
  } else {
    // Fallback: plain box
    _wall(ctx, x + w * 0.1, y + h * 0.4, w * 0.8, h * 0.6, '#a09080');
    _roof(ctx, x + w * 0.05, y + h * 0.4, w * 0.9, h * 0.35, '#7a6050');
  }

  _damageFilter(ctx, x, y, w, h, state);
  ctx.restore();
}
