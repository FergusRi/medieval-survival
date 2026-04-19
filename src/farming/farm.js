// ============================================================
// farm.js — Farm Plot soil state management (Phase 14)
// ============================================================

import { events, EV } from '../core/events.js';
import { resources } from '../resources/resources.js';
import { CROPS } from './crops.js';

// ── Soil state enum ──────────────────────────────────────────
export const SOIL = {
  UNTILLED:      0,
  TILLED:        1,
  PLANTED:       2,
  NEEDS_WATER:   3,
  WATERED:       4,
  GROWING_1:     5,
  GROWING_2:     6,
  GROWING_3:     7,
  GROWING_4:     8,
  HARVEST_READY: 9,
};

// Number of soil tiles per farm plot footprint (3×3 = 9)
const PLOT_TILES = 9;

/**
 * Create the soilTiles array for a new Farm Plot building.
 * Called from building.js when a farm_plot building is instantiated.
 */
export function createSoilTiles(count = PLOT_TILES) {
  const tiles = [];
  for (let i = 0; i < count; i++) {
    tiles.push({
      state:              SOIL.UNTILLED,
      crop:               null,
      wavesGrown:         0,
      wasWateredThisWave: false,
    });
  }
  return tiles;
}

// ── Citizen farming actions ───────────────────────────────────

/** Duration (ms) for each action type */
export const ACTION_DURATION = {
  TILL:    2000,
  PLANT:   1000,
  WATER:   1000,
  HARVEST: 1000,
};

/**
 * Find the next soil tile in a farm plot that needs work.
 * Returns { index, action } or null if nothing to do.
 */
export function findNextFarmTask(building) {
  const tiles = building.soilTiles;
  if (!tiles) return null;

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t.state === SOIL.UNTILLED)     return { index: i, action: 'TILL' };
    if (t.state === SOIL.TILLED)       return { index: i, action: 'PLANT' };
    if (t.state === SOIL.NEEDS_WATER)  return { index: i, action: 'WATER' };
    if (t.state === SOIL.HARVEST_READY) return { index: i, action: 'HARVEST' };
  }
  return null;
}

/**
 * Apply a completed farming action to a soil tile.
 * Returns XP earned (for citizen.skillXp.farming).
 */
export function applyFarmAction(building, tileIndex, action, citizenFarmingSkill = 1) {
  const tile = building.soilTiles[tileIndex];
  if (!tile) return 0;

  // How many extra tiles a high-farming citizen can affect simultaneously
  const reach = Math.floor(1 + citizenFarmingSkill / 100);

  const indices = [];
  for (let r = 0; r < reach && tileIndex + r < building.soilTiles.length; r++) {
    indices.push(tileIndex + r);
  }

  for (const idx of indices) {
    const t = building.soilTiles[idx];
    if (!t) continue;

    if (action === 'TILL' && t.state === SOIL.UNTILLED) {
      t.state = SOIL.TILLED;

    } else if (action === 'PLANT' && t.state === SOIL.TILLED) {
      t.state = SOIL.PLANTED;
      // Use building's selected crop, default to wheat
      t.crop = building.selectedCrop ?? 'wheat';
      t.wavesGrown = 0;
      t.wasWateredThisWave = false;

    } else if (action === 'WATER' && t.state === SOIL.NEEDS_WATER) {
      t.state = SOIL.WATERED;
      t.wasWateredThisWave = true;

    } else if (action === 'HARVEST' && t.state === SOIL.HARVEST_READY) {
      // Earn crop yield
      const cropDef = CROPS[t.crop] ?? CROPS.wheat;
      for (const [res, amount] of Object.entries(cropDef.yields)) {
        resources.earn(res, amount);
      }
      events.emit(EV.CROP_HARVESTED, { building, tileIndex: idx, crop: t.crop });
      // Reset to tilled so citizen can replant
      t.state = SOIL.TILLED;
      t.crop = null;
      t.wavesGrown = 0;
      t.wasWateredThisWave = false;
    }
  }

  return 2; // XP per farming action
}

// ── Sprinkler auto-water ──────────────────────────────────────

/**
 * Called on WAVE_STARTED.
 * Finds all sprinkler buildings and auto-waters farm plot tiles within Manhattan radius 3.
 */
export function applySprinklers(placedBuildings) {
  for (const b of placedBuildings.values()) {
    if (b.type !== 'sprinkler' || b.state !== 'complete') continue;
    const sCx = b.tx + Math.floor(b.w / 2);
    const sCy = b.ty + Math.floor(b.h / 2);

    for (const fb of placedBuildings.values()) {
      if (!fb.soilTiles) continue;
      for (const t of fb.soilTiles) {
        if (t.state !== SOIL.NEEDS_WATER) continue;
        // Tile world position approximation (per-tile inside plot)
        const manhattan = Math.abs(fb.tx - sCx) + Math.abs(fb.ty - sCy);
        if (manhattan <= 3) {
          t.state = SOIL.WATERED;
          t.wasWateredThisWave = true;
        }
      }
    }
  }
}

// ── Wave advance ─────────────────────────────────────────────

/**
 * Called on WAVE_ENDED.
 * Advances growth stages for all farm plots.
 */
export function advanceFarmGrowth(placedBuildings) {
  for (const b of placedBuildings.values()) {
    if (!b.soilTiles) continue;
    for (const t of b.soilTiles) {
      if (t.state === SOIL.PLANTED) {
        t.state = SOIL.NEEDS_WATER;

      } else if (t.state === SOIL.WATERED) {
        t.state = SOIL.GROWING_1;
        t.wavesGrown = 1;

      } else if (t.state >= SOIL.GROWING_1 && t.state <= SOIL.GROWING_4) {
        if (t.wasWateredThisWave) {
          t.wavesGrown++;
          const cropDef = CROPS[t.crop] ?? CROPS.wheat;
          if (t.wavesGrown >= cropDef.wavesToHarvest) {
            t.state = SOIL.HARVEST_READY;
          } else {
            // Advance through GROWING_1..GROWING_4
            t.state = Math.min(SOIL.GROWING_4, SOIL.GROWING_1 + (t.wavesGrown - 1));
          }
        } else {
          // Not watered this wave — stays at current stage, needs water
          t.state = SOIL.NEEDS_WATER;
        }
      }
      t.wasWateredThisWave = false;
    }
  }
}

// ── Soil rendering colours ────────────────────────────────────

export const SOIL_COLOUR = {
  [SOIL.UNTILLED]:      '#8B6914',
  [SOIL.TILLED]:        '#5C3D0A',
  [SOIL.PLANTED]:       '#4A2F08',
  [SOIL.NEEDS_WATER]:   '#6B4C15',
  [SOIL.WATERED]:       '#3D6B8C',
  [SOIL.GROWING_1]:     '#4A8C3F',
  [SOIL.GROWING_2]:     '#3A7A2E',
  [SOIL.GROWING_3]:     '#2E6B22',
  [SOIL.GROWING_4]:     '#235C18',
  [SOIL.HARVEST_READY]: '#D4A017',
};

/**
 * Draw soil overlay for a farm plot building.
 * Call from the building renderer after drawing the building base.
 */
export function drawFarmPlot(ctx, building, camera) {
  if (!building.soilTiles) return;
  const TILE = 32;
  const cols = building.w;

  building.soilTiles.forEach((tile, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = (building.tx + col) * TILE - camera.x;
    const sy = (building.ty + row) * TILE - camera.y;

    ctx.fillStyle = SOIL_COLOUR[tile.state] ?? '#8B6914';
    ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);

    // Seed dot for PLANTED state
    if (tile.state === SOIL.PLANTED) {
      ctx.fillStyle = '#C8A050';
      ctx.beginPath();
      ctx.arc(sx + TILE / 2, sy + TILE / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Growing: draw a green sprout of increasing height
    if (tile.state >= SOIL.GROWING_1 && tile.state <= SOIL.GROWING_4) {
      const growStage = tile.state - SOIL.GROWING_1 + 1; // 1..4
      const sproutH = growStage * 4;
      ctx.fillStyle = '#6FCF55';
      ctx.fillRect(sx + TILE / 2 - 2, sy + TILE - 4 - sproutH, 4, sproutH);
    }

    // Harvest ready: golden glow outline
    if (tile.state === SOIL.HARVEST_READY) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
    }
  });
}

// ── Event wiring ─────────────────────────────────────────────

import { placedBuildings } from '../buildings/building.js';

events.on(EV.WAVE_STARTED, () => {
  applySprinklers(placedBuildings);
});

events.on(EV.WAVE_ENDED, () => {
  advanceFarmGrowth(placedBuildings);
});
