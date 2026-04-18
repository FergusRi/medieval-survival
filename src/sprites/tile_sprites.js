// ============================================================
// tile_sprites.js — Procedural draw functions for all tile types
// ============================================================
// Each function: (ctx, size) → draws one tile on an OffscreenCanvas.
// No external image files — pure Canvas 2D primitives.
// ============================================================

import { T } from '../world/tiles.js';

// ---- Helpers ------------------------------------------------

function rng(seed) {
  // Fast deterministic pseudo-random from seed
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function fillBase(ctx, size, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, size, size);
}

// Scatter small rectangles for texture variation
function scatter(ctx, r, colour, count, maxW = 3, maxH = 3, seed = 1) {
  const rand = rng(seed);
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const x = rand() * r;
    const y = rand() * r;
    const w = 1 + rand() * maxW;
    const h = 1 + rand() * maxH;
    ctx.fillRect(x, y, w, h);
  }
}

// ---- Tile draw functions ------------------------------------

function drawGrass(ctx, size) {
  fillBase(ctx, size, '#5a8a4a');
  // Slightly darker variation patches
  scatter(ctx, size, '#4a7a3a', 6, 4, 4, 11);
  // Light highlight flecks
  scatter(ctx, size, '#6a9a5a', 4, 2, 2, 77);
}

function drawPlains(ctx, size) {
  fillBase(ctx, size, '#8aaa44');
  scatter(ctx, size, '#7a9a34', 5, 3, 3, 22);
  scatter(ctx, size, '#9aba54', 3, 2, 2, 88);
}

function drawDirt(ctx, size) {
  fillBase(ctx, size, '#a07840');
  scatter(ctx, size, '#8a6030', 6, 3, 3, 33);
  scatter(ctx, size, '#b08850', 4, 2, 2, 99);
}

function drawSand(ctx, size) {
  fillBase(ctx, size, '#d4b86a');
  scatter(ctx, size, '#c4a85a', 5, 3, 2, 44);
  scatter(ctx, size, '#e4c87a', 4, 2, 2, 111);
  // Ripple lines
  ctx.strokeStyle = 'rgba(180,150,70,0.4)';
  ctx.lineWidth = 0.5;
  for (let y = 4; y < size; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y - 1, size * 0.7, y + 1, size, y);
    ctx.stroke();
  }
}

function drawScrubland(ctx, size) {
  fillBase(ctx, size, '#9aaa55');
  scatter(ctx, size, '#7a8a40', 5, 3, 4, 55);
  // Sparse tufts
  ctx.fillStyle = '#5a7a30';
  const rand = rng(66);
  for (let i = 0; i < 4; i++) {
    const x = rand() * (size - 3);
    const y = rand() * (size - 3);
    ctx.fillRect(x, y, 2, 3);
    ctx.fillRect(x - 1, y + 1, 4, 1);
  }
}

function drawForest(ctx, size) {
  fillBase(ctx, size, '#3a6e30');
  // Dark canopy blobs
  const rand = rng(7);
  for (let i = 0; i < 3; i++) {
    const cx = 4 + rand() * (size - 8);
    const cy = 4 + rand() * (size - 8);
    const r  = 4 + rand() * 4;
    ctx.fillStyle = i % 2 === 0 ? '#2a5a22' : '#4a7e3a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Brown trunk hints
  ctx.fillStyle = '#5a3820';
  const rand2 = rng(13);
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(4 + rand2() * (size - 6), size - 6, 2, 4);
  }
}

function drawJungle(ctx, size) {
  fillBase(ctx, size, '#2a5e25');
  const rand = rng(8);
  for (let i = 0; i < 4; i++) {
    const cx = 3 + rand() * (size - 6);
    const cy = 3 + rand() * (size - 6);
    ctx.fillStyle = i % 2 === 0 ? '#1a4a18' : '#3a6e30';
    ctx.beginPath();
    ctx.arc(cx, cy, 3 + rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Leaf veins
  ctx.strokeStyle = 'rgba(20,60,15,0.5)';
  ctx.lineWidth = 0.5;
  const rand2 = rng(19);
  for (let i = 0; i < 3; i++) {
    const x = rand2() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rand2() - 0.5) * 6, size);
    ctx.stroke();
  }
}

function drawWetland(ctx, size) {
  fillBase(ctx, size, '#4a7a5a');
  // Water patches
  scatter(ctx, size, '#3a6a8a', 4, 4, 3, 23);
  // Reeds
  ctx.fillStyle = '#2a4a30';
  const rand = rng(29);
  for (let i = 0; i < 4; i++) {
    const x = rand() * (size - 1);
    ctx.fillRect(x, rand() * (size * 0.5), 1, size * 0.4);
  }
}

function drawTundra(ctx, size) {
  fillBase(ctx, size, '#8aaa88');
  scatter(ctx, size, '#7a9a78', 5, 3, 3, 37);
  // Frost patches
  scatter(ctx, size, '#c8d8c8', 4, 2, 2, 91);
}

function drawSnow(ctx, size) {
  fillBase(ctx, size, '#d8e8e0');
  scatter(ctx, size, '#c0d0c8', 4, 4, 3, 43);
  // Sparkle dots
  ctx.fillStyle = '#ffffff';
  const rand = rng(57);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
}

function drawWater(ctx, size, time = 0) {
  fillBase(ctx, size, '#4a90c4');
  // Shimmer lines
  ctx.strokeStyle = 'rgba(100,180,220,0.5)';
  ctx.lineWidth = 1;
  const offset = (time * 0.03) % (size / 2);
  for (let y = -size + offset; y < size; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y + size * 0.3);
    ctx.bezierCurveTo(size * 0.25, y + size * 0.3 - 1.5,
                      size * 0.75, y + size * 0.3 + 1.5, size, y + size * 0.3);
    ctx.stroke();
  }
  scatter(ctx, size, 'rgba(180,230,255,0.3)', 3, 3, 2, 61);
}

function drawDeepWater(ctx, size) {
  fillBase(ctx, size, '#2a5a9a');
  ctx.strokeStyle = 'rgba(60,120,180,0.4)';
  ctx.lineWidth = 1;
  for (let y = 3; y < size; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y - 1, size * 0.7, y + 1, size, y);
    ctx.stroke();
  }
}

function drawPond(ctx, size) {
  fillBase(ctx, size, '#5aa0d4');
  scatter(ctx, size, 'rgba(180,230,255,0.4)', 3, 3, 2, 73);
}

function drawStonePath(ctx, size) {
  fillBase(ctx, size, '#aaaaaa');
  // Paving joints
  ctx.strokeStyle = 'rgba(80,80,80,0.4)';
  ctx.lineWidth = 0.5;
  const half = size / 2;
  ctx.strokeRect(1, 1, half - 1, half - 1);
  ctx.strokeRect(half, 1, half - 1, half - 1);
  ctx.strokeRect(1, half, half - 1, half - 1);
  ctx.strokeRect(half, half, half - 1, half - 1);
  scatter(ctx, size, 'rgba(150,150,150,0.3)', 4, 2, 2, 79);
}

function drawCobblestone(ctx, size) {
  fillBase(ctx, size, '#b8b8b0');
  const rand = rng(83);
  ctx.strokeStyle = 'rgba(90,90,85,0.45)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    const x = rand() * (size - 4) + 1;
    const y = rand() * (size - 4) + 1;
    const w = 3 + rand() * 4;
    const h = 2 + rand() * 3;
    ctx.strokeRect(x, y, w, h);
  }
}

function drawMountain(ctx, size) {
  fillBase(ctx, size, '#7a7060');
  // Rock face shading — lighter upper, darker lower
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255,255,240,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Crack lines
  ctx.strokeStyle = 'rgba(50,45,35,0.5)';
  ctx.lineWidth = 0.5;
  const rand = rng(97);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size * 0.5);
    ctx.lineTo(rand() * size, size * 0.5 + rand() * size * 0.5);
    ctx.stroke();
  }
}

function drawMountainStone(ctx, size) {
  fillBase(ctx, size, '#7a7060');
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(255,255,240,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(50,45,35,0.4)';
  ctx.lineWidth = 0.5;
  const rand = rng(103);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }
}

function drawMountainDeep(ctx, size) {
  fillBase(ctx, size, '#5a5040');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(0,0,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(30,25,20,0.6)';
  ctx.lineWidth = 0.5;
  const rand = rng(109);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }
}

function drawOreCoal(ctx, size) {
  drawMountainStone(ctx, size);
  // Dark coal specks
  ctx.fillStyle = '#1a1a1a';
  const rand = rng(113);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(rand() * (size - 2), rand() * (size - 2), 2 + rand() * 2, 2);
  }
  ctx.fillStyle = 'rgba(40,40,40,0.6)';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawOreIron(ctx, size) {
  drawMountainStone(ctx, size);
  // Orange-brown iron veins
  ctx.fillStyle = '#8a4a20';
  const rand = rng(127);
  for (let i = 0; i < 4; i++) {
    const x = rand() * (size - 3);
    const y = rand() * (size - 2);
    ctx.fillRect(x, y, 3 + rand() * 3, 1);
  }
  ctx.strokeStyle = '#c06030';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size * 0.2, size * 0.3);
  ctx.lineTo(size * 0.8, size * 0.7);
  ctx.stroke();
}

function drawOreGold(ctx, size) {
  drawMountainStone(ctx, size);
  // Gold specks
  ctx.fillStyle = '#c8a820';
  const rand = rng(131);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 1 + rand() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f0d040';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(rand() * (size - 2), rand() * (size - 2), 2, 1);
  }
}

function drawTunnel(ctx, size) {
  fillBase(ctx, size, '#2a2420');
  // Dark void with faint rock walls
  ctx.fillStyle = 'rgba(80,70,55,0.3)';
  ctx.fillRect(0, 0, size, 3);
  ctx.fillRect(0, size - 3, size, 3);
  ctx.fillRect(0, 0, 3, size);
  ctx.fillRect(size - 3, 0, 3, size);
}

// ---- Time-based animated water ------------------------------
// Call this each frame for water tiles to get per-frame sprite key
export function getWaterTime() {
  return Math.floor(Date.now() / 120); // new frame every 120ms
}

// ---- Master draw function map --------------------------------
export const TILE_DRAW_FNS = {
  [T.VOID]:           (ctx, size) => fillBase(ctx, size, '#0a0a0a'),
  [T.GRASS]:          drawGrass,
  [T.PLAINS]:         drawPlains,
  [T.DIRT]:           drawDirt,
  [T.SAND]:           drawSand,
  [T.SCRUBLAND]:      drawScrubland,
  [T.FOREST]:         drawForest,
  [T.JUNGLE]:         drawJungle,
  [T.WETLAND]:        drawWetland,
  [T.TUNDRA]:         drawTundra,
  [T.SNOW]:           drawSnow,
  [T.WATER]:          (ctx, size) => drawWater(ctx, size, Date.now()),
  [T.DEEP_WATER]:     drawDeepWater,
  [T.POND]:           drawPond,
  [T.STONE_PATH]:     drawStonePath,
  [T.COBBLESTONE]:    drawCobblestone,
  [T.MOUNTAIN]:       drawMountain,
  [T.MOUNTAIN_STONE]: drawMountainStone,
  [T.MOUNTAIN_DEEP]:  drawMountainDeep,
  [T.ORE_COAL]:       drawOreCoal,
  [T.ORE_IRON]:       drawOreIron,
  [T.ORE_GOLD]:       drawOreGold,
  [T.TUNNEL]:         drawTunnel,
};
