// ============================================================
// building_sprites.js — Load and cache building sprite images
// ============================================================

const sprites = new Map();

const SPRITE_DEFS = {
  settlement: 'assets/buildings/settlement.jpg',
  // more added as generated:
  // capital:    'assets/buildings/capital.jpg',
  // house:      'assets/buildings/house.jpg',
};

export async function preloadBuildingSprites() {
  const promises = Object.entries(SPRITE_DEFS).map(([key, src]) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { sprites.set(key, img); resolve(); };
      img.onerror = () => { console.warn(`[BuildingSprites] Failed to load: ${src}`); resolve(); };
      img.src = src;
    });
  });
  await Promise.all(promises);
  console.log(`[BuildingSprites] Loaded ${sprites.size} sprite(s)`);
}

export function getBuildingSprite(type) {
  return sprites.get(type) ?? null;
}
