// ============================================================
// building_sprites.js — Procedural Canvas 2D building sprites
// Phase 28: All 22 buildings drawn procedurally, no images.
// Each draw fn receives (ctx, x, y, w, h, state) where
//   x,y = top-left of the VISUAL draw area (includes extra rows above)
//   w,h = pixel dimensions of the full visual area
//   state = 'complete' | 'blueprint' | 'damaged' | 'critical' | 'rubble'
// ============================================================

// Extra tile-rows the sprite extends ABOVE the tile footprint (for 2.5D look)
export const SPRITE_EXTRA_ROWS_ABOVE = 1.0;

// preloadBuildingSprites is now a no-op (kept for API compatibility)
export async function preloadBuildingSprites() {}

// getBuildingSprite returns null — placement.js falls through to drawBuildingSprite
export function getBuildingSprite() { return null; }

// ── Shared drawing helpers ────────────────────────────────────

function _roof(ctx, x, y, w, peakH, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y - peakH);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function _wall(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function _door(ctx, x, y, dw, dh, colour = '#5c3a1e') {
  ctx.fillStyle = colour;
  ctx.fillRect(x - dw / 2, y - dh, dw, dh);
  ctx.strokeStyle = '#3a1e00';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - dw / 2, y - dh, dw, dh);
}

function _window(ctx, x, y, size = 5) {
  ctx.fillStyle = '#c8e8ff';
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.strokeStyle = '#5c3a1e';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
}

function _chimney(ctx, x, y, w = 5, h = 10, colour = '#7a6a5a') {
  ctx.fillStyle = colour;
  ctx.fillRect(x - w / 2, y - h, w, h);
}

function _smoke(ctx, x, y) {
  const t = (Date.now() / 800) % 1;
  for (let i = 0; i < 3; i++) {
    const phase = (t + i * 0.33) % 1;
    const sx = x + Math.sin(phase * Math.PI * 2) * 3;
    const sy = y - phase * 14;
    const alpha = 1 - phase;
    ctx.beginPath();
    ctx.arc(sx, sy, 3 + phase * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,180,180,${alpha * 0.5})`;
    ctx.fill();
  }
}

function _battlements(ctx, x, y, w, merlon = 6, gap = 4) {
  const total = merlon + gap;
  let cx = x;
  ctx.fillStyle = '#888';
  while (cx < x + w) {
    ctx.fillRect(cx, y - 7, Math.min(merlon, x + w - cx), 7);
    cx += total;
  }
}

function _rubble(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(90,80,70,0.7)';
  ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
  for (let i = 0; i < 8; i++) {
    const rx = x + (i / 8) * w + Math.sin(i * 1.7) * 4;
    const ry = y + h * 0.55 + Math.cos(i * 2.3) * 4;
    ctx.fillStyle = i % 2 === 0 ? '#8a7a6a' : '#5a4a3a';
    ctx.fillRect(rx, ry, 6 + (i % 3) * 4, 4 + (i % 2) * 3);
  }
}

function _blueprint(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(60,120,220,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(100,160,255,0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);
  // Grid lines
  ctx.strokeStyle = 'rgba(100,160,255,0.25)';
  const step = 8;
  for (let gx = x; gx < x + w; gx += step) ctx.beginPath(), ctx.moveTo(gx, y), ctx.lineTo(gx, y + h), ctx.stroke();
  for (let gy = y; gy < y + h; gy += step) ctx.beginPath(), ctx.moveTo(x, gy), ctx.lineTo(x + w, gy), ctx.stroke();
}

function _damageFilter(ctx, x, y, w, h, state) {
  if (state === 'damaged') {
    ctx.fillStyle = 'rgba(200,80,0,0.15)';
    ctx.fillRect(x, y, w, h);
    // Crack lines
    ctx.strokeStyle = 'rgba(80,40,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.2); ctx.lineTo(x + w * 0.45, y + h * 0.6); ctx.stroke();
  } else if (state === 'critical') {
    ctx.fillStyle = 'rgba(220,30,0,0.28)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(180,20,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.1); ctx.lineTo(x + w * 0.5, y + h * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + h * 0.2); ctx.lineTo(x + w * 0.4, y + h * 0.7); ctx.stroke();
  }
}


// ── Individual building draw functions ───────────────────────
// All receive (ctx, x, y, w, h) — top-left of full visual area

function _drawCapital(ctx, x, y, w, h) {
  const base = y + h * 0.45;
  // Stone base
  _wall(ctx, x + w*0.05, base, w*0.9, h*0.55, '#8a9a8a');
  // Tower left
  _wall(ctx, x + w*0.05, base - h*0.25, w*0.18, h*0.25, '#9aaa9a');
  _battlements(ctx, x + w*0.05, base - h*0.25, w*0.18, 5, 4);
  // Tower right
  _wall(ctx, x + w*0.77, base - h*0.25, w*0.18, h*0.25, '#9aaa9a');
  _battlements(ctx, x + w*0.77, base - h*0.25, w*0.18, 5, 4);
  // Main keep
  _wall(ctx, x + w*0.25, base - h*0.4, w*0.5, h*0.4, '#aabcaa');
  _battlements(ctx, x + w*0.25, base - h*0.4, w*0.5, 6, 5);
  // Gate arch
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  const gx = x + w*0.5, gy = y + h - 4, gr = w*0.1;
  ctx.arc(gx, gy - gr, gr, Math.PI, 0);
  ctx.rect(gx - gr, gy - gr, gr*2, gr);
  ctx.fill();
  // Gold banner
  ctx.fillStyle = '#f0c060';
  ctx.fillRect(x + w*0.47, base - h*0.38, 3, h*0.18);
  ctx.fillStyle = '#e8a020';
  ctx.beginPath();
  ctx.moveTo(x + w*0.5, base - h*0.38);
  ctx.lineTo(x + w*0.5 + 10, base - h*0.3);
  ctx.lineTo(x + w*0.5, base - h*0.22);
  ctx.fill();
}

function _drawSettlementHall(ctx, x, y, w, h) {
  const base = y + h * 0.5;
  _wall(ctx, x + w*0.08, base, w*0.84, h*0.5, '#c8a878');
  _roof(ctx, x + w*0.05, base, w*0.9, h*0.45, '#8b6a40');
  _door(ctx, x + w*0.5, y + h, w*0.15, h*0.25);
  _window(ctx, x + w*0.28, base + h*0.18, 6);
  _window(ctx, x + w*0.72, base + h*0.18, 6);
}

function _drawLogCabin(ctx, x, y, w, h) {
  const base = y + h * 0.52;
  _wall(ctx, x + w*0.1, base, w*0.8, h*0.48, '#a07848');
  // Log lines
  ctx.strokeStyle = '#7a5828';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    const ly = base + (h*0.48/4)*i;
    ctx.beginPath(); ctx.moveTo(x + w*0.1, ly); ctx.lineTo(x + w*0.9, ly); ctx.stroke();
  }
  _roof(ctx, x + w*0.06, base, w*0.88, h*0.48, '#6a4820');
  _chimney(ctx, x + w*0.72, base - 2, 6, 12);
  _door(ctx, x + w*0.5, y + h, w*0.18, h*0.26);
  _window(ctx, x + w*0.3, base + h*0.22, 5);
}

function _drawFarmPlot(ctx, x, y, w, h) {
  // Tilled earth
  ctx.fillStyle = '#6b4a28';
  ctx.fillRect(x, y + h*0.3, w, h*0.7);
  // Furrow rows
  ctx.strokeStyle = '#4a3018';
  ctx.lineWidth = 1.5;
  const rows = 4;
  for (let r = 0; r <= rows; r++) {
    const ry = y + h*0.3 + (r/rows)*h*0.65;
    ctx.beginPath(); ctx.moveTo(x+2, ry); ctx.lineTo(x+w-2, ry); ctx.stroke();
  }
  // Crop sprouts (simple)
  ctx.fillStyle = '#5a9a40';
  for (let ci = 0; ci < 4; ci++) {
    for (let ri = 0; ri < 3; ri++) {
      const cx2 = x + (ci+0.5)*(w/4);
      const cy2 = y + h*0.45 + ri*(h*0.18);
      ctx.beginPath(); ctx.arc(cx2, cy2, 2, 0, Math.PI*2); ctx.fill();
    }
  }
  // Ground line
  ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 1;
  ctx.strokeRect(x, y + h*0.3, w, h*0.7);
}

function _drawLumberCamp(ctx, x, y, w, h) {
  const base = y + h*0.55;
  _wall(ctx, x + w*0.1, base, w*0.8, h*0.45, '#c8a060');
  _roof(ctx, x + w*0.05, base, w*0.9, h*0.4, '#7a5030');
  // Log pile
  ctx.fillStyle = '#a07040';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + w*0.12 + i*8, y + h*0.82, 18, 6);
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x + w*0.12 + i*8, y + h*0.82, 18, 6);
  }
  // Axe handle
  ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x+w*0.78, base-2); ctx.lineTo(x+w*0.68, base+h*0.25); ctx.stroke();
  ctx.fillStyle = '#888';
  ctx.fillRect(x+w*0.72, base-6, 8, 5);
}

function _drawSawmill(ctx, x, y, w, h) {
  const base = y + h*0.5;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.5, '#c8a060');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.45, '#7a5030');
  // Circular saw blade
  const bx = x+w*0.68, by = base+h*0.2, br = h*0.14;
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2);
  ctx.fillStyle = '#c0c0c0'; ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();
  // Teeth
  ctx.strokeStyle = '#666'; ctx.lineWidth = 0.5;
  for (let t = 0; t < 12; t++) {
    const a = (t/12)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(bx+Math.cos(a)*br, by+Math.sin(a)*br);
    ctx.lineTo(bx+Math.cos(a)*(br+3), by+Math.sin(a)*(br+3));
    ctx.stroke();
  }
  _door(ctx, x+w*0.35, y+h, w*0.18, h*0.28);
}

function _drawPitMine(ctx, x, y, w, h) {
  // Stone pit wall
  _wall(ctx, x+w*0.05, y+h*0.35, w*0.9, h*0.65, '#8a8a7a');
  // Dark entrance
  ctx.fillStyle = '#1a1410';
  ctx.beginPath();
  ctx.arc(x+w*0.5, y+h*0.85, w*0.28, Math.PI, 0);
  ctx.rect(x+w*0.22, y+h*0.68, w*0.56, h*0.18);
  ctx.fill();
  // Timber supports
  ctx.strokeStyle = '#8b6020'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x+w*0.25, y+h*0.62); ctx.lineTo(x+w*0.25, y+h*0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w*0.75, y+h*0.62); ctx.lineTo(x+w*0.75, y+h*0.85); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x+w*0.22, y+h*0.64); ctx.lineTo(x+w*0.78, y+h*0.64); ctx.stroke();
}

function _drawQuarry(ctx, x, y, w, h) {
  _wall(ctx, x+w*0.05, y+h*0.3, w*0.9, h*0.7, '#9a9080');
  // Rock texture
  ctx.fillStyle = '#b0a898';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x+w*(0.1+i*0.17), y+h*0.35, w*0.12, h*0.15);
  }
  // Dark pit
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(x+w*0.2, y+h*0.5, w*0.6, h*0.35);
  // Rough-hewn ledge lines
  ctx.strokeStyle = '#6a6058'; ctx.lineWidth = 1;
  for (let r = 0; r < 3; r++) {
    const ry = y+h*0.5 + r*(h*0.12);
    ctx.beginPath(); ctx.moveTo(x+w*0.2, ry); ctx.lineTo(x+w*0.8, ry); ctx.stroke();
  }
}

function _drawRootCellar(ctx, x, y, w, h) {
  // Earthen mound
  ctx.fillStyle = '#7a6040';
  ctx.beginPath();
  ctx.ellipse(x+w*0.5, y+h*0.65, w*0.45, h*0.3, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x+w*0.05, y+h*0.65, w*0.9, h*0.35);
  // Door
  ctx.fillStyle = '#4a3010';
  ctx.fillRect(x+w*0.38, y+h*0.65, w*0.24, h*0.28);
  ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 0.5;
  ctx.strokeRect(x+w*0.38, y+h*0.65, w*0.24, h*0.28);
  // Grass on top
  ctx.fillStyle = '#6a9a40';
  ctx.beginPath();
  ctx.ellipse(x+w*0.5, y+h*0.55, w*0.42, h*0.12, 0, Math.PI, 0, true);
  ctx.fill();
}

function _drawHerbalist(ctx, x, y, w, h) {
  const base = y+h*0.52;
  _wall(ctx, x+w*0.1, base, w*0.8, h*0.48, '#b8c888');
  _roof(ctx, x+w*0.06, base, w*0.88, h*0.46, '#6a8840');
  // Red cross on roof
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(x+w*0.46, base-h*0.35, w*0.08, h*0.22);
  ctx.fillRect(x+w*0.38, base-h*0.24, w*0.24, h*0.08);
  _door(ctx, x+w*0.5, y+h, w*0.18, h*0.26, '#4a6020');
  _window(ctx, x+w*0.28, base+h*0.2, 5);
}


function _drawPalisade(ctx, x, y, w, h) {
  const stakes = Math.max(3, Math.floor(w / 8));
  const sw = w / stakes;
  for (let i = 0; i < stakes; i++) {
    const sx = x + i * sw + sw * 0.15;
    const sw2 = sw * 0.7;
    ctx.fillStyle = i % 2 === 0 ? '#a07840' : '#8a6830';
    ctx.fillRect(sx, y + h * 0.2, sw2, h * 0.8);
    // Pointed top
    ctx.beginPath();
    ctx.moveTo(sx, y + h * 0.2);
    ctx.lineTo(sx + sw2 / 2, y + h * 0.02);
    ctx.lineTo(sx + sw2, y + h * 0.2);
    ctx.fillStyle = i % 2 === 0 ? '#b08850' : '#9a7840';
    ctx.fill();
  }
}

function _drawWoodenGate(ctx, x, y, w, h) {
  _wall(ctx, x + w*0.05, y + h*0.15, w*0.9, h*0.85, '#a07840');
  // Gate opening
  ctx.fillStyle = '#1a0e00';
  ctx.beginPath();
  ctx.arc(x+w*0.5, y+h*0.42, w*0.28, Math.PI, 0);
  ctx.rect(x+w*0.22, y+h*0.28, w*0.56, h*0.2);
  ctx.fill();
  // Portcullis bars
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const bx2 = x+w*0.24+i*(w*0.52/3);
    ctx.beginPath(); ctx.moveTo(bx2, y+h*0.28); ctx.lineTo(bx2, y+h*0.46); ctx.stroke();
  }
  // Battlements
  _battlements(ctx, x+w*0.05, y+h*0.15, w*0.9, 5, 4);
}

function _drawWatchtower(ctx, x, y, w, h) {
  // Thin tower shaft
  _wall(ctx, x+w*0.3, y+h*0.15, w*0.4, h*0.85, '#9a9080');
  // Platform top
  _wall(ctx, x+w*0.1, y+h*0.08, w*0.8, h*0.12, '#8a8070');
  _battlements(ctx, x+w*0.1, y+h*0.08, w*0.8, 4, 3);
  // Ladder
  ctx.strokeStyle = '#7a5020'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x+w*0.42, y+h*0.2); ctx.lineTo(x+w*0.42, y+h*0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w*0.58, y+h*0.2); ctx.lineTo(x+w*0.58, y+h*0.95); ctx.stroke();
  for (let r = 0; r < 5; r++) {
    const ry = y+h*0.25+r*(h*0.14);
    ctx.beginPath(); ctx.moveTo(x+w*0.42, ry); ctx.lineTo(x+w*0.58, ry); ctx.stroke();
  }
}

function _drawArrowTower(ctx, x, y, w, h) {
  _wall(ctx, x+w*0.1, y+h*0.12, w*0.8, h*0.88, '#8a8878');
  _battlements(ctx, x+w*0.1, y+h*0.12, w*0.8, 6, 4);
  // Arrow slits
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x+w*0.43, y+h*0.35, w*0.14, h*0.18);
  ctx.fillRect(x+w*0.43, y+h*0.6, w*0.14, h*0.18);
  // Stone texture lines
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
  for (let r = 0; r < 4; r++) {
    const ry = y+h*(0.2+r*0.18);
    ctx.beginPath(); ctx.moveTo(x+w*0.1, ry); ctx.lineTo(x+w*0.9, ry); ctx.stroke();
  }
}

function _drawBallistaTower(ctx, x, y, w, h) {
  _wall(ctx, x+w*0.08, y+h*0.18, w*0.84, h*0.82, '#7a7868');
  _battlements(ctx, x+w*0.08, y+h*0.18, w*0.84, 7, 5);
  // Ballista frame
  ctx.strokeStyle = '#7a5020'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x+w*0.25, y+h*0.22); ctx.lineTo(x+w*0.75, y+h*0.22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w*0.5, y+h*0.15); ctx.lineTo(x+w*0.5, y+h*0.28); ctx.stroke();
  // Bolt
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x+w*0.3, y+h*0.22); ctx.lineTo(x+w*0.7, y+h*0.22); ctx.stroke();
  ctx.fillStyle = '#666';
  ctx.beginPath(); ctx.moveTo(x+w*0.7, y+h*0.2); ctx.lineTo(x+w*0.76, y+h*0.22); ctx.lineTo(x+w*0.7, y+h*0.24); ctx.fill();
  // Arrow slits
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x+w*0.43, y+h*0.45, w*0.14, h*0.2);
}

function _drawForge(ctx, x, y, w, h) {
  const base = y+h*0.48;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.52, '#908080');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.4, '#6a5a50');
  _chimney(ctx, x+w*0.7, base-2, 8, 16, '#6a5a4a');
  _smoke(ctx, x+w*0.7, base-18);
  // Glow from door
  ctx.fillStyle = 'rgba(255,120,0,0.35)';
  ctx.fillRect(x+w*0.38, base+h*0.1, w*0.24, h*0.38);
  _door(ctx, x+w*0.5, y+h, w*0.22, h*0.4, '#2a1a00');
  _window(ctx, x+w*0.22, base+h*0.22, 5);
}

function _drawTownHall(ctx, x, y, w, h) {
  const base = y+h*0.42;
  _wall(ctx, x+w*0.06, base, w*0.88, h*0.58, '#c0b0a0');
  _roof(ctx, x+w*0.03, base, w*0.94, h*0.42, '#8a6a50');
  // Bell tower
  _wall(ctx, x+w*0.42, base-h*0.35, w*0.16, h*0.35, '#c8b8a8');
  ctx.fillStyle = '#7a5a40';
  ctx.beginPath();
  ctx.moveTo(x+w*0.42, base-h*0.35);
  ctx.lineTo(x+w*0.5, base-h*0.52);
  ctx.lineTo(x+w*0.58, base-h*0.35);
  ctx.fill();
  _door(ctx, x+w*0.5, y+h, w*0.16, h*0.28);
  _window(ctx, x+w*0.28, base+h*0.2, 6);
  _window(ctx, x+w*0.72, base+h*0.2, 6);
}

function _drawTownhouse(ctx, x, y, w, h) {
  const base = y+h*0.5;
  _wall(ctx, x+w*0.1, base, w*0.8, h*0.5, '#c8b890');
  _roof(ctx, x+w*0.06, base, w*0.88, h*0.44, '#7a5a38');
  _chimney(ctx, x+w*0.65, base-2, 5, 10);
  _door(ctx, x+w*0.5, y+h, w*0.18, h*0.28);
  _window(ctx, x+w*0.3, base+h*0.2, 5);
  _window(ctx, x+w*0.7, base+h*0.2, 5);
}

function _drawGranary(ctx, x, y, w, h) {
  const base = y+h*0.45;
  // Round-topped barn
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.55, '#d4b87a');
  // Curved roof
  ctx.fillStyle = '#8a6840';
  ctx.beginPath();
  ctx.ellipse(x+w*0.5, base, w*0.44, h*0.42, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.strokeStyle = '#6a4820'; ctx.lineWidth = 1; ctx.stroke();
  // Hay bales
  ctx.fillStyle = '#d4aa50';
  ctx.fillRect(x+w*0.12, y+h*0.78, w*0.2, h*0.17);
  ctx.fillRect(x+w*0.38, y+h*0.78, w*0.2, h*0.17);
  ctx.strokeStyle = '#a07830'; ctx.lineWidth = 0.5;
  ctx.strokeRect(x+w*0.12, y+h*0.78, w*0.2, h*0.17);
  ctx.strokeRect(x+w*0.38, y+h*0.78, w*0.2, h*0.17);
  _door(ctx, x+w*0.5, y+h, w*0.2, h*0.2);
}


function _drawStorehouse(ctx, x, y, w, h) {
  const base = y+h*0.48;
  _wall(ctx, x+w*0.05, base, w*0.9, h*0.52, '#c0a870');
  // Long warehouse roof (low pitch)
  ctx.fillStyle = '#7a6040';
  ctx.beginPath();
  ctx.moveTo(x+w*0.03, base);
  ctx.lineTo(x+w*0.5, base-h*0.28);
  ctx.lineTo(x+w*0.97, base);
  ctx.fill();
  ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 1; ctx.stroke();
  // Double doors
  ctx.fillStyle = '#6a4820';
  ctx.fillRect(x+w*0.36, base+h*0.1, w*0.12, h*0.38);
  ctx.fillRect(x+w*0.52, base+h*0.1, w*0.12, h*0.38);
  ctx.strokeStyle = '#3a2000'; ctx.lineWidth = 0.5;
  ctx.strokeRect(x+w*0.36, base+h*0.1, w*0.12, h*0.38);
  ctx.strokeRect(x+w*0.52, base+h*0.1, w*0.12, h*0.38);
  _window(ctx, x+w*0.2, base+h*0.25, 5);
  _window(ctx, x+w*0.8, base+h*0.25, 5);
}

function _drawMarket(ctx, x, y, w, h) {
  const base = y+h*0.45;
  // Open-sided stall posts
  ctx.strokeStyle = '#7a5020'; ctx.lineWidth = 3;
  const posts = [0.12, 0.88];
  for (const px2 of posts) {
    ctx.beginPath(); ctx.moveTo(x+w*px2, base); ctx.lineTo(x+w*px2, y+h*0.92); ctx.stroke();
  }
  // Coloured awning
  ctx.fillStyle = '#d04020';
  ctx.beginPath();
  ctx.moveTo(x+w*0.05, base);
  ctx.lineTo(x+w*0.5, base-h*0.32);
  ctx.lineTo(x+w*0.95, base);
  ctx.fill();
  // Awning stripe
  ctx.strokeStyle = '#f0e040'; ctx.lineWidth = 2;
  for (let s = 0; s < 4; s++) {
    const sx2 = x+w*(0.15+s*0.18);
    const sy2 = base-h*(0.06+s*0.04);
    ctx.beginPath(); ctx.moveTo(sx2, base); ctx.lineTo(sx2, sy2); ctx.stroke();
  }
  // Counter
  _wall(ctx, x+w*0.15, base, w*0.7, h*0.12, '#c8a060');
  // Goods
  ctx.fillStyle = '#e04020'; ctx.beginPath(); ctx.arc(x+w*0.3, base+h*0.06, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e0c020'; ctx.beginPath(); ctx.arc(x+w*0.5, base+h*0.06, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#20a040'; ctx.beginPath(); ctx.arc(x+w*0.7, base+h*0.06, 4, 0, Math.PI*2); ctx.fill();
}

function _drawBlacksmith(ctx, x, y, w, h) {
  const base = y+h*0.5;
  _wall(ctx, x+w*0.1, base, w*0.8, h*0.5, '#909088');
  _roof(ctx, x+w*0.06, base, w*0.88, h*0.42, '#5a5050');
  _chimney(ctx, x+w*0.68, base-2, 7, 14, '#5a5048');
  _smoke(ctx, x+w*0.68, base-16);
  // Anvil
  ctx.fillStyle = '#555';
  ctx.fillRect(x+w*0.62, base+h*0.3, w*0.2, h*0.08);
  ctx.fillRect(x+w*0.65, base+h*0.2, w*0.14, h*0.12);
  _door(ctx, x+w*0.36, y+h, w*0.2, h*0.4, '#2a1a00');
  _window(ctx, x+w*0.72, base+h*0.2, 5);
}

function _drawArmory(ctx, x, y, w, h) {
  const base = y+h*0.42;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.58, '#8a8878');
  _battlements(ctx, x+w*0.08, base, w*0.84, 5, 4);
  // Weapon rack on wall
  ctx.strokeStyle = '#8a6040'; ctx.lineWidth = 1.5;
  // Spears
  for (let i = 0; i < 3; i++) {
    const sx2 = x+w*(0.25+i*0.18);
    ctx.beginPath(); ctx.moveTo(sx2, base+h*0.08); ctx.lineTo(sx2, base+h*0.5); ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.moveTo(sx2, base+h*0.06); ctx.lineTo(sx2-3, base+h*0.14); ctx.lineTo(sx2+3, base+h*0.14); ctx.fill();
  }
  _door(ctx, x+w*0.5, y+h, w*0.18, h*0.3, '#2a1a00');
  _window(ctx, x+w*0.22, base+h*0.3, 5);
  _window(ctx, x+w*0.78, base+h*0.3, 5);
}

function _drawMint(ctx, x, y, w, h) {
  const base = y+h*0.48;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.52, '#b0a888');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.38, '#7a6a50');
  // Coin symbol on door
  ctx.fillStyle = '#f0c040';
  ctx.beginPath(); ctx.arc(x+w*0.5, base+h*0.32, w*0.08, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#a08020'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#a08020';
  ctx.font = `bold ${Math.max(6, w*0.1)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', x+w*0.5, base+h*0.32);
  _window(ctx, x+w*0.25, base+h*0.22, 5);
  _window(ctx, x+w*0.75, base+h*0.22, 5);
}

function _drawTavern(ctx, x, y, w, h) {
  const base = y+h*0.48;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.52, '#c89870');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.44, '#8a5030');
  _chimney(ctx, x+w*0.72, base-2, 6, 12);
  _smoke(ctx, x+w*0.72, base-14);
  // Sign
  ctx.fillStyle = '#8b6020';
  ctx.fillRect(x+w*0.55, base-h*0.12, w*0.22, h*0.1);
  ctx.fillStyle = '#f0c040'; ctx.font = `${Math.max(5,w*0.08)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🍺', x+w*0.66, base-h*0.07);
  _door(ctx, x+w*0.36, y+h, w*0.2, h*0.3);
  _window(ctx, x+w*0.72, base+h*0.2, 5);
}

function _drawChurch(ctx, x, y, w, h) {
  const base = y+h*0.45;
  _wall(ctx, x+w*0.1, base, w*0.8, h*0.55, '#c8c0b8');
  _roof(ctx, x+w*0.06, base, w*0.88, h*0.4, '#8a8078');
  // Steeple
  _wall(ctx, x+w*0.43, base-h*0.38, w*0.14, h*0.38, '#c8c0b8');
  ctx.fillStyle = '#8a8078';
  ctx.beginPath();
  ctx.moveTo(x+w*0.43, base-h*0.38);
  ctx.lineTo(x+w*0.5, base-h*0.58);
  ctx.lineTo(x+w*0.57, base-h*0.38);
  ctx.fill();
  // Cross
  ctx.strokeStyle = '#f0e8d8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x+w*0.5, base-h*0.56); ctx.lineTo(x+w*0.5, base-h*0.42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w*0.44, base-h*0.5); ctx.lineTo(x+w*0.56, base-h*0.5); ctx.stroke();
  // Pointed arch window
  ctx.fillStyle = '#c8e8ff';
  ctx.beginPath();
  ctx.arc(x+w*0.5, base+h*0.1, w*0.1, Math.PI, 0);
  ctx.rect(x+w*0.4, base+h*0.1, w*0.2, h*0.15);
  ctx.fill();
  ctx.strokeStyle = '#8a8078'; ctx.lineWidth = 0.5; ctx.stroke();
}

function _drawBarracks(ctx, x, y, w, h) {
  const base = y+h*0.45;
  _wall(ctx, x+w*0.06, base, w*0.88, h*0.55, '#a09880');
  _roof(ctx, x+w*0.03, base, w*0.94, h*0.38, '#6a5840');
  // Spear rack outside
  ctx.strokeStyle = '#8a6040'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const sx2 = x+w*(0.18+i*0.1);
    ctx.beginPath(); ctx.moveTo(sx2, base+h*0.05); ctx.lineTo(sx2, y+h*0.95); ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.moveTo(sx2, base+h*0.03); ctx.lineTo(sx2-2, base+h*0.1); ctx.lineTo(sx2+2, base+h*0.1); ctx.fill();
  }
  _door(ctx, x+w*0.5, y+h, w*0.16, h*0.28);
  _window(ctx, x+w*0.7, base+h*0.2, 5);
  _window(ctx, x+w*0.82, base+h*0.2, 5);
}

function _drawArcheryRange(ctx, x, y, w, h) {
  const base = y+h*0.5;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.5, '#c0a870');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.42, '#7a5830');
  // Target
  const tx2 = x+w*0.78, ty2 = base+h*0.28;
  [['#cc2222',8],['#f0f0f0',5],['#cc2222',2]].forEach(([col,r]) => {
    ctx.beginPath(); ctx.arc(tx2, ty2, r, 0, Math.PI*2);
    ctx.fillStyle = col; ctx.fill();
  });
  _door(ctx, x+w*0.35, y+h, w*0.18, h*0.28);
}

function _drawCastleKeep(ctx, x, y, w, h) {
  const base = y+h*0.38;
  _wall(ctx, x+w*0.05, base, w*0.9, h*0.62, '#8a9080');
  // Corner towers
  for (const cx2 of [0.05, 0.77]) {
    _wall(ctx, x+w*cx2, base-h*0.28, w*0.18, h*0.28, '#9aa090');
    _battlements(ctx, x+w*cx2, base-h*0.28, w*0.18, 5, 4);
  }
  _wall(ctx, x+w*0.25, base-h*0.45, w*0.5, h*0.45, '#aab0a0');
  _battlements(ctx, x+w*0.25, base-h*0.45, w*0.5, 7, 5);
  // Gate
  ctx.fillStyle = '#1a1410';
  ctx.beginPath();
  ctx.arc(x+w*0.5, y+h*0.85, w*0.14, Math.PI, 0);
  ctx.rect(x+w*0.36, y+h*0.75, w*0.28, h*0.12);
  ctx.fill();
  // Gold banner
  ctx.fillStyle = '#f0c060';
  ctx.fillRect(x+w*0.47, base-h*0.42, 3, h*0.22);
  ctx.fillStyle = '#e8a020';
  ctx.beginPath();
  ctx.moveTo(x+w*0.5, base-h*0.42);
  ctx.lineTo(x+w*0.5+12, base-h*0.33);
  ctx.lineTo(x+w*0.5, base-h*0.24);
  ctx.fill();
}

function _drawManor(ctx, x, y, w, h) {
  const base = y+h*0.46;
  _wall(ctx, x+w*0.07, base, w*0.86, h*0.54, '#c8b898');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.4, '#8a6848');
  // Central tower
  _wall(ctx, x+w*0.42, base-h*0.32, w*0.16, h*0.32, '#d0c0a0');
  ctx.fillStyle = '#9a7858';
  ctx.beginPath();
  ctx.moveTo(x+w*0.42, base-h*0.32);
  ctx.lineTo(x+w*0.5, base-h*0.48);
  ctx.lineTo(x+w*0.58, base-h*0.32);
  ctx.fill();
  _door(ctx, x+w*0.5, y+h, w*0.16, h*0.28);
  _window(ctx, x+w*0.24, base+h*0.2, 6);
  _window(ctx, x+w*0.76, base+h*0.2, 6);
}

function _drawTreasury(ctx, x, y, w, h) {
  const base = y+h*0.48;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.52, '#a8a080');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.4, '#6a6048');
  // Coin stacks
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#f0c040';
    ctx.beginPath(); ctx.ellipse(x+w*(0.28+i*0.2), base+h*0.35, 6, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#a08020'; ctx.lineWidth = 0.5; ctx.stroke();
  }
  _door(ctx, x+w*0.5, y+h, w*0.16, h*0.28, '#3a2800');
  _window(ctx, x+w*0.25, base+h*0.2, 5);
  _window(ctx, x+w*0.75, base+h*0.2, 5);
}

function _drawCathedral(ctx, x, y, w, h) {
  const base = y+h*0.4;
  _wall(ctx, x+w*0.08, base, w*0.84, h*0.6, '#d0c8c0');
  _roof(ctx, x+w*0.04, base, w*0.92, h*0.35, '#9a9088');
  // Twin towers
  for (const tx3 of [0.08, 0.74]) {
    _wall(ctx, x+w*tx3, base-h*0.42, w*0.18, h*0.42, '#d0c8c0');
    ctx.fillStyle = '#9a9088';
    ctx.beginPath();
    ctx.moveTo(x+w*tx3, base-h*0.42);
    ctx.lineTo(x+w*(tx3+0.09), base-h*0.6);
    ctx.lineTo(x+w*(tx3+0.18), base-h*0.42);
    ctx.fill();
  }
  // Rose window
  ctx.fillStyle = '#c8d8ff';
  ctx.beginPath(); ctx.arc(x+w*0.5, base+h*0.12, w*0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#8888cc'; ctx.lineWidth = 0.5; ctx.stroke();
  _door(ctx, x+w*0.5, y+h, w*0.14, h*0.3);
}

function _drawFortressWall(ctx, x, y, w, h) {
  _wall(ctx, x+w*0.02, y+h*0.12, w*0.96, h*0.88, '#7a7868');
  _battlements(ctx, x+w*0.02, y+h*0.12, w*0.96, 7, 5);
  // Stone coursing
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
  for (let r = 0; r < 3; r++) {
    const ry = y+h*(0.25+r*0.22);
    ctx.beginPath(); ctx.moveTo(x+w*0.02, ry); ctx.lineTo(x+w*0.98, ry); ctx.stroke();
  }
}

function _drawGatehouse(ctx, x, y, w, h) {
  _wall(ctx, x+w*0.04, y+h*0.15, w*0.92, h*0.85, '#8a8878');
  _battlements(ctx, x+w*0.04, y+h*0.15, w*0.92, 6, 5);
  // Arch
  ctx.fillStyle = '#1a1410';
  ctx.beginPath();
  ctx.arc(x+w*0.5, y+h*0.65, w*0.28, Math.PI, 0);
  ctx.rect(x+w*0.22, y+h*0.5, w*0.56, h*0.22);
  ctx.fill();
  // Portcullis
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const bx2 = x+w*0.24+i*(w*0.52/4);
    ctx.beginPath(); ctx.moveTo(bx2, y+h*0.5); ctx.lineTo(bx2, y+h*0.7); ctx.stroke();
  }
  ctx.lineWidth = 1;
  for (let r = 0; r < 3; r++) {
    const ry = y+h*(0.53+r*0.06);
    ctx.beginPath(); ctx.moveTo(x+w*0.22, ry); ctx.lineTo(x+w*0.78, ry); ctx.stroke();
  }
}

function _drawCannonTower(ctx, x, y, w, h) {
  _wall(ctx, x+w*0.08, y+h*0.12, w*0.84, h*0.88, '#6a6858');
  _battlements(ctx, x+w*0.08, y+h*0.12, w*0.84, 8, 6);
  // Cannon barrel
  ctx.fillStyle = '#444';
  ctx.fillRect(x+w*0.38, y+h*0.22, w*0.35, h*0.1);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(x+w*0.38, y+h*0.22, w*0.35, h*0.1);
  // Muzzle
  ctx.fillStyle = '#333';
  ctx.fillRect(x+w*0.7, y+h*0.2, w*0.06, h*0.14);
  // Arrow slits
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x+w*0.43, y+h*0.45, w*0.14, h*0.2);
  ctx.fillRect(x+w*0.43, y+h*0.72, w*0.14, h*0.16);
}


// ── Sprite cache (offscreen canvas per type+state) ────────────
const _cache = new Map();
const CACHE_MAX = 256;

function _getCacheKey(type, state, w, h) {
  return `${type}:${state}:${w}:${h}`;
}

function _drawRaw(ctx, type, state, x, y, w, h) {
  if (state === 'rubble') { _rubble(ctx, x, y, w, h); return; }
  if (state === 'blueprint') { _blueprint(ctx, x, y, w, h); return; }

  // Draw completed building
  switch (type) {
    case 'capital':       case 'castle_keep':   _drawCapital(ctx, x, y, w, h); break;
    case 'settlement_hall': case 'town_hall':   _drawSettlementHall(ctx, x, y, w, h); break;
    case 'log_cabin':     case 'townhouse':     _drawLogCabin(ctx, x, y, w, h); break;
    case 'farm_plot':                           _drawFarmPlot(ctx, x, y, w, h); break;
    case 'lumber_camp':                         _drawLumberCamp(ctx, x, y, w, h); break;
    case 'sawmill':                             _drawSawmill(ctx, x, y, w, h); break;
    case 'pit_mine':                            _drawPitMine(ctx, x, y, w, h); break;
    case 'quarry':                              _drawQuarry(ctx, x, y, w, h); break;
    case 'root_cellar':                         _drawRootCellar(ctx, x, y, w, h); break;
    case 'herbalist':                           _drawHerbalist(ctx, x, y, w, h); break;
    case 'palisade':                            _drawPalisade(ctx, x, y, w, h); break;
    case 'wooden_gate':                         _drawWoodenGate(ctx, x, y, w, h); break;
    case 'watchtower':                          _drawWatchtower(ctx, x, y, w, h); break;
    case 'arrow_tower':                         _drawArrowTower(ctx, x, y, w, h); break;
    case 'ballista_tower':                      _drawBallistaTower(ctx, x, y, w, h); break;
    case 'forge':                               _drawForge(ctx, x, y, w, h); break;
    case 'granary':                             _drawGranary(ctx, x, y, w, h); break;
    case 'storehouse':                          _drawStorehouse(ctx, x, y, w, h); break;
    case 'market':                              _drawMarket(ctx, x, y, w, h); break;
    case 'blacksmith':                          _drawBlacksmith(ctx, x, y, w, h); break;
    case 'armory':                              _drawArmory(ctx, x, y, w, h); break;
    case 'mint':                                _drawMint(ctx, x, y, w, h); break;
    case 'tavern':                              _drawTavern(ctx, x, y, w, h); break;
    case 'church':                              _drawChurch(ctx, x, y, w, h); break;
    case 'barracks':      case 'archery_range': _drawBarracks(ctx, x, y, w, h); break;
    case 'treasury':                            _drawTreasury(ctx, x, y, w, h); break;
    case 'cathedral':                           _drawCathedral(ctx, x, y, w, h); break;
    case 'fortress_wall': case 'stone_wall':    _drawFortressWall(ctx, x, y, w, h); break;
    case 'gatehouse':                           _drawGatehouse(ctx, x, y, w, h); break;
    case 'cannon_tower':                        _drawCannonTower(ctx, x, y, w, h); break;
    case 'manor':                               _drawManor(ctx, x, y, w, h); break;
    case 'castle_keep':                         _drawCastleKeep(ctx, x, y, w, h); break;
    default:
      // Generic fallback
      _wall(ctx, x, y+h*0.4, w, h*0.6, '#b09070');
      _roof(ctx, x, y+h*0.4, w, h*0.38, '#7a5030');
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(7, w*0.18)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(type, x+w/2, y+h*0.7);
  }

  // Overlay damage tint (animated smoke/forge effects are live — skip caching those)
  if (state === 'damaged' || state === 'critical') {
    _damageFilter(ctx, x, y, w, h, state);
  }
}

/**
 * Main entry point — draw a building sprite directly onto ctx.
 * Called from placement.js drawBuilding() in place of ctx.drawImage(sprite,...).
 * Animated buildings (forge, sawmill, tavern) skip the cache.
 */
const ANIMATED_TYPES = new Set(['forge', 'blacksmith', 'tavern']);

export function drawBuildingSprite(ctx, type, state, x, y, w, h) {
  if (state === 'blueprint') {
    _blueprint(ctx, x, y, w, h);
    return;
  }
  if (state === 'rubble') {
    _rubble(ctx, x, y, w, h);
    return;
  }

  // Animated buildings drawn live (smoke uses Date.now())
  if (ANIMATED_TYPES.has(type)) {
    _drawRaw(ctx, type, state, x, y, w, h);
    return;
  }

  // Cached static sprites
  const key = _getCacheKey(type, state, Math.round(w), Math.round(h));
  if (!_cache.has(key)) {
    if (_cache.size >= CACHE_MAX) {
      // Evict oldest entry
      _cache.delete(_cache.keys().next().value);
    }
    const off = document.createElement('canvas');
    off.width  = Math.ceil(w);
    off.height = Math.ceil(h);
    const octx = off.getContext('2d');
    _drawRaw(octx, type, state, 0, 0, Math.ceil(w), Math.ceil(h));
    _cache.set(key, off);
  }
  ctx.drawImage(_cache.get(key), x, y, w, h);
}
