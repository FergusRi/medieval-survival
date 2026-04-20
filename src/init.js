// ============================================================
// init.js — Game bootstrap entry point (Phase 9)
// ============================================================

import { startLoop } from './engine/loop.js';
import { events, EV } from './engine/events.js';
import { initRenderer, beginFrame, endFrame, getCtx } from './engine/renderer.js';
import { initInput, handleKeyPan } from './engine/input.js';
import { camera } from './engine/camera.js';
import { generateMap, getTile, MAP_SIZE, TILE_SIZE, MAP_PX, MAP_SEED } from './world/map.js';
import { initResourceNodes } from './world/resource_nodes.js';
import { initMinimap, drawMinimap } from './ui/minimap.js';
import { T, TILE_DEF } from './world/tiles.js';
import { preloadSprites, getTileSprite, getTreeSprite, PINE_TILES } from './sprites/tile_sprites.js';
import { preloadBuildingSprites } from './sprites/building_sprites.js';
import { resources, initProduction } from './resources/resources.js';
import { renderBuildings, drawBuilding, buildingSortY, placedBuildings, updateGhostPos, handleBuildClick, cancelGhost, getGhostType, cycleGhostRotation, destroyBuilding, drawBuildingDamageOverlay } from './buildings/placement.js';
import { renderConstruction } from './buildings/construction.js';
import { initFrame, TOP_BAR_H, BOTTOM_BAR_H } from './ui/frame.js';
import { updateCitizens, spawnCitizens, citizens, setCitizenEnemyRef, renderGraves, clearGraves } from './citizens/citizen.js';
import { spatialGrid } from './world/spatial.js';
import { updateAssignments } from './citizens/assignment.js';
import { tickFlowField, scheduleRebuild } from './world/flowfield.js';
import { drawFarmPlot } from './farming/farm.js';
import './farming/farm.js'; // activate WAVE_STARTED / WAVE_ENDED listeners
import { updateTimer, resetTimer } from './phases/timer.js';
import { transitionTo, getCurrentPhase, checkLoss, PHASE } from './phases/phases.js';
import { updateEnemies, enemies } from './enemies/enemy.js';
import './enemies/waves.js'; // activate COMBAT_STARTED → spawnWave listener
import { updateTowers, removeTowerCooldown } from './combat/towers.js';
import { updateProjectiles, drawProjectiles, projectiles } from './combat/projectiles.js';
import { initHUD, updateHUDTimer } from './ui/hud.js';
import { initInfoPanel, refreshInfoPanel } from './ui/panels.js';
import { initAftermath } from './ui/aftermath.js';
import { initStartScreen } from './screens/start.js';
import { initGameOver }    from './screens/gameover.js';
import { updateParticles, drawParticles, spawnHitSparks, spawnDeathPuff, spawnHarvestGlint, spawnLevelUpBurst, spawnCatapultSplash } from './effects/particles.js';
import { updateShake, applyShake, triggerShake } from './effects/screenshake.js';

// ---- Deterministic per-tile RNG ------------------------------
function tileHash(tx, ty) {
  let h = (MAP_SEED ^ (tx * 2246822519) ^ (ty * 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function tileFrac(tx, ty)    { return tileHash(tx, ty)               / 0xFFFFFFFF; }
function overlayFrac(tx, ty) { return tileHash(tx + 9999, ty + 7777) / 0xFFFFFFFF; }

const GRASS_TUFT_RATE = 0.08;
const SAND_TUFT_RATE  = 0.05;
const PINE_DENSITY    = 0.35;
const MOUNTAIN_TILES  = new Set([T.MOUNTAIN, T.MOUNTAIN_STONE]);

function isMountainEdge(tx, ty) {
  if (!MOUNTAIN_TILES.has(getTile(tx, ty))) return false;
  return [getTile(tx-1,ty), getTile(tx+1,ty), getTile(tx,ty-1), getTile(tx,ty+1)]
    .some(id => !MOUNTAIN_TILES.has(id));
}

// ---- Citizen hover name display ------------------------------
let _hoveredCitizen = null;

function getCitizenAtScreen(sx, sy) {
  const world = camera.screenToWorld(sx, sy);
  // Hit radius in world px — generous to account for small citizen size
  const HIT = 12;
  for (const c of citizens) {
    const dx = world.x - c.x;
    const dy = world.y - c.y;
    if (Math.abs(dx) < HIT && Math.abs(dy) < HIT) return c;
  }
  return null;
}

// ---- Input wiring --------------------------------------------
function setupBuildInput() {
  const canvas = document.getElementById('game') ?? document.querySelector('canvas');
  if (!canvas) return;

  canvas.addEventListener('mousemove', e => {
    if (getGhostType()) {
      updateGhostPos(e.clientX, e.clientY);
    } else {
      _hoveredCitizen = getCitizenAtScreen(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('click', e => {
    if (getGhostType()) {
      updateGhostPos(e.clientX, e.clientY);
      handleBuildClick(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    cancelGhost();
  });

  window.addEventListener('keydown', e => {
    if ((e.key === 'r' || e.key === 'R') && getGhostType()) {
      cycleGhostRotation();
    }
  });
}

// ---- Building completed → spawn citizens --------------------
function setupCitizenSpawning() {
  events.on(EV.BUILDING_COMPLETED, ({ building }) => {
    const spawns = {
      capital:        3,
      settlement_hall: 3,
      town_hall:       5,
      castle_keep:     8,
    };
    const count = spawns[building.type];
    if (count) {
      spawnCitizens(building, count);
      console.log(`[Citizens] ${count} citizens spawned from ${building.type}`);
    }
  });
}

// ---- Shared dt for render flash timers (Phase 20) -----------
let _lastDt = 16;

// ---- Update ---------------------------------------------------
function update(dt) {
  _lastDt = dt;
  handleKeyPan(dt);
  camera.clamp(MAP_PX, MAP_PX);
  updateCitizens(dt);
  updateAssignments(dt);
  tickFlowField();
  updateTimer(dt);
  updateTowers(dt, placedBuildings, enemies);
  updateProjectiles(dt, enemies);
  updateEnemies(dt, placedBuildings, citizens);
  if (getCurrentPhase() !== PHASE.BUILD) checkLoss();
  // Rebuild spatial grid after all positions are updated
  spatialGrid.rebuild(citizens, placedBuildings.values());
  updateParticles(dt);
  updateShake(dt);
}

// ---- Render ---------------------------------------------------
function render() {
  beginFrame();
  const ctx = getCtx();
  ctx.save();
  applyShake(ctx);

  const topLeft     = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(window.innerWidth, window.innerHeight);

  const tx0 = Math.max(0,        Math.floor(topLeft.x     / TILE_SIZE));
  const ty0 = Math.max(0,        Math.floor(topLeft.y     / TILE_SIZE));
  const tx1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.x / TILE_SIZE));
  const ty1 = Math.min(MAP_SIZE, Math.ceil (bottomRight.y / TILE_SIZE));

  const grassSprite         = getTileSprite(T.GRASS);
  const stoneSprite         = getTileSprite(T.STONE);
  const mountainStoneSprite = getTileSprite(T.MOUNTAIN_STONE);

  // ── Pass 1: Ground tiles ─────────────────────────────────
  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id  = getTile(tx, ty);
      const def = TILE_DEF[id];
      const px  = tx * TILE_SIZE;
      const py  = ty * TILE_SIZE;

      if (id === T.STONE) {
        if (grassSprite) ctx.drawImage(grassSprite, px, py, TILE_SIZE, TILE_SIZE);
        else { ctx.fillStyle = TILE_DEF[T.GRASS].colour; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
        if (stoneSprite) ctx.drawImage(stoneSprite, px, py, TILE_SIZE, TILE_SIZE);
        continue;
      }

      if (MOUNTAIN_TILES.has(id)) {
        if (isMountainEdge(tx, ty)) {
          if (mountainStoneSprite) ctx.drawImage(mountainStoneSprite, px, py, TILE_SIZE, TILE_SIZE);
          else { ctx.fillStyle = TILE_DEF[T.MOUNTAIN_STONE].colour; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
        } else {
          ctx.fillStyle = TILE_DEF[T.MOUNTAIN].colour;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      if (id === T.GRASS || id === T.SAND) {
        ctx.fillStyle = def.colour;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        const rate = id === T.GRASS ? GRASS_TUFT_RATE : SAND_TUFT_RATE;
        if (overlayFrac(tx, ty) < rate) {
          const tuft = getTileSprite(id);
          if (tuft) ctx.drawImage(tuft, px, py, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      const sprite = getTileSprite(id);
      if (sprite) ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
      else { ctx.fillStyle = def ? def.colour : '#000'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
    }
  }

  // Grid lines at zoom >= 0.8
  if (camera.zoom >= 0.8) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth   = 1 / camera.zoom;
    ctx.beginPath();
    for (let tx = tx0; tx <= tx1; tx++) { ctx.moveTo(tx*TILE_SIZE, ty0*TILE_SIZE); ctx.lineTo(tx*TILE_SIZE, ty1*TILE_SIZE); }
    for (let ty = ty0; ty <= ty1; ty++) { ctx.moveTo(tx0*TILE_SIZE, ty*TILE_SIZE); ctx.lineTo(tx1*TILE_SIZE, ty*TILE_SIZE); }
    ctx.stroke();
  }

  // ── Pass 2+3: Y-sorted trees, buildings, citizens ─────────
  // Collect all drawable entities with a sortY value, then draw
  // in ascending sortY order so "closer" (lower) objects appear in front.

  const pineSprite = getTreeSprite('pine');

  // Build sorted draw list
  const drawList = [];

  // Trees (sortY = bottom of 2-tile-tall sprite = (ty+1)*TILE)
  const treeStartY = Math.max(0, ty0 - 2);
  for (let ty = treeStartY; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const id = getTile(tx, ty);
      if (!PINE_TILES.has(id)) continue;
      if (tileFrac(tx, ty) >= PINE_DENSITY) continue;
      drawList.push({
        sortY: (ty + 1) * TILE_SIZE,
        draw: () => {
          const px = tx * TILE_SIZE, py = (ty - 1) * TILE_SIZE;
          if (pineSprite) ctx.drawImage(pineSprite, px, py, TILE_SIZE, TILE_SIZE * 2);
          else { ctx.fillStyle = '#2d5a1b'; ctx.fillRect(px, py + 4, TILE_SIZE, TILE_SIZE * 2 - 4); }
        }
      });
    }
  }

  // Buildings (sortY = front-face baseline)
  // Farm Plot soil overlays — drawn as ground layer before Y-sort entities
  for (const b of placedBuildings.values()) {
    if (b.type === 'farm_plot' && b.soilTiles) drawFarmPlot(ctx, b, camera);
  }

  // Grave markers — ground layer, flat beneath all entities
  renderGraves(ctx);

  for (const b of placedBuildings.values()) {
    drawList.push({
      sortY: buildingSortY(b),
      draw: () => {
        drawBuilding(ctx, b);
        drawBuildingDamageOverlay(ctx, b, _lastDt);
      }
    });
  }

  // Citizens (sortY = feet position)
  for (const c of citizens) {
    drawList.push({
      sortY: c.y + 4,
      draw: () => c.draw(ctx)
    });
  }

  // Enemies (sortY = centre y + radius)
  for (const e of enemies) {
    drawList.push({
      sortY: e.y + e.radius,
      draw: () => e.draw(ctx)
    });
  }

  // Sort ascending by sortY
  drawList.sort((a, b) => a.sortY - b.sortY);

  // Draw everything
  for (const item of drawList) item.draw();

  // Ghost preview + construction overlays on top
  renderBuildings(ctx);
  renderConstruction(ctx);

  // Projectiles drawn above everything (Phase 19)
  drawProjectiles(ctx);

  // Phase 30: particles drawn above projectiles
  drawParticles(ctx);

  // ── Citizen name tooltip ──────────────────────────────────
  if (_hoveredCitizen) {
    const { x: scx, y: scy } = camera.worldToScreen(_hoveredCitizen.x, _hoveredCitizen.y);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space

    const label = _hoveredCitizen.name;
    ctx.font = 'bold 11px sans-serif';
    const tw = ctx.measureText(label).width;
    const boxW = tw + 10;
    const boxH = 17;
    // Position above head — hat is ~14px above citizen y, push 8px more
    const bx = Math.round(scx - boxW / 2);
    const by = Math.round(scy - 22 * camera.zoom - boxH);

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 4);
    ctx.fill();

    // Name text
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 5, by + boxH / 2);

    ctx.restore();
  }

  // Restore shake translate before UI/HUD draws in screen space
  ctx.restore();

  updateHUDTimer();
  refreshInfoPanel();
  endFrame();
  drawMinimap();
}

// ---- Start ---------------------------------------------------
async function start() {
  initRenderer();
  initInput();
  generateMap();
  initResourceNodes();
  await preloadSprites();
  await preloadBuildingSprites();
  // Centre camera on the middle of the map (account for UI bars)
  const midPx = (MAP_SIZE * TILE_SIZE) / 2;
  const gameH = window.innerHeight - TOP_BAR_H - BOTTOM_BAR_H;
  camera.x = midPx - window.innerWidth / 2;
  camera.y = midPx - gameH / 2;

  initFrame();
  initHUD();
  initInfoPanel();
  initAftermath();
  initMinimap();
  setupBuildInput();
  setupCitizenSpawning();

  // Phase 18: give citizens a reference to the live enemies array
  setCitizenEnemyRef(enemies);

  // Phase 27: wire up production loop (WAVE_ENDED listener)
  initProduction(placedBuildings, citizens);

  // Phase 20: damage flash on hit
  events.on(EV.BUILDING_DAMAGED, ({ building }) => {
    building._flashTimer = 0.25; // 250ms red flash
  });

  // Phase 20: remove destroyed buildings from the world
  events.on(EV.BUILDING_DESTROYED, ({ building }) => {
    destroyBuilding(building);
    removeTowerCooldown(building.id);
    // Phase 30: debris + shake
    const bx = (building.tx + building.w / 2) * 32;
    const by = (building.ty + building.h / 2) * 32;
    spawnCatapultSplash(bx, by);
    triggerShake(5);
    console.log(`[Combat] Building destroyed: ${building.type}`);
  });

  // Phase 30: particle + shake event listeners
  events.on(EV.CITIZEN_DIED, ({ citizen }) => {
    spawnDeathPuff(citizen.x, citizen.y);
    triggerShake(2);
  });
  events.on(EV.ENEMY_DIED ?? 'ENEMY_DIED', ({ enemy }) => {
    spawnDeathPuff(enemy.x, enemy.y);
  });
  events.on(EV.BUILDING_DAMAGED, ({ building }) => {
    const bx = (building.tx + building.w / 2) * 32;
    const by = (building.ty + building.h / 2) * 32;
    spawnHitSparks(bx, by);
  });
  events.on(EV.CITIZEN_LEVELED_UP ?? 'CITIZEN_LEVELED_UP', ({ citizen }) => {
    spawnLevelUpBurst(citizen.x, citizen.y);
  });
  events.on(EV.RESOURCE_HARVESTED ?? 'RESOURCE_HARVESTED', ({ x, y }) => {
    if (x != null && y != null) spawnHarvestGlint(x, y);
  });
  events.on(EV.PROJECTILE_HIT ?? 'PROJECTILE_HIT', ({ x, y, isCatapult }) => {
    if (isCatapult) { spawnCatapultSplash(x, y); triggerShake(8); }
    else spawnHitSparks(x, y);
  });

  // Phase 16: reset timer clock whenever a phase transition fires
  events.on(EV.WAVE_STARTED,  () => resetTimer(PHASE.PREVIEW));
  events.on(EV.COMBAT_STARTED,() => resetTimer(PHASE.COMBAT));
  events.on(EV.COMBAT_ENDED,  () => resetTimer(PHASE.AFTERMATH));
  events.on(EV.WAVE_ENDED,    () => resetTimer(PHASE.BUILD));

  console.log('[Resources] Starting inventory:', JSON.stringify(resources));
  startLoop(update, render);
  console.log('[Medieval Survival] Phase 16 — Phase/Wave state machine online');
}

function boot() {
  initGameOver();          // registers CITIZEN_DIED / GAME_OVER listeners immediately
  initStartScreen(start);  // shows start screen; calls start() on "Begin"
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { events, EV, camera };
