// ============================================================
// building_sprites.js — Load and cache building sprite images
// Converts JPEG sprites to transparent canvas by removing
// near-white backgrounds (colour-key compositing).
// ============================================================

// Processed sprites stored as HTMLCanvasElement (transparent)
const sprites = new Map();

// How many extra tile-rows the sprite extends ABOVE the tile footprint.
// A value of 1.5 means the visual sprite is 2.5× the tile height:
//   top 1.5 rows = roof/upper facade (above footprint)
//   bottom 1.0 rows = front wall / door (sits on the footprint)
export const SPRITE_EXTRA_ROWS_ABOVE = 1.5;

const SPRITE_DEFS = {
  settlement:    'assets/buildings/settlement.jpg',
  settlement_hall: 'assets/buildings/settlement.jpg',
  capital:       'assets/buildings/capital.jpg',
  // wall sprites removed — fallback coloured rectangles used until new sprites are ready
};

/**
 * Remove near-white background from an HTMLImageElement.
 * Returns an HTMLCanvasElement with transparent pixels where
 * the original image was near-white (r>230, g>230, b>230).
 * Uses a two-pass edge-softening approach for cleaner results.
 */
function removeWhiteBackground(img) {
  const w = img.naturalWidth  || img.width;
  const h = img.naturalHeight || img.height;

  const offscreen = document.createElement('canvas');
  offscreen.width  = w;
  offscreen.height = h;
  const octx = offscreen.getContext('2d');

  // Draw original image
  octx.drawImage(img, 0, 0, w, h);

  const imageData = octx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Brightness (simple average)
    const brightness = (r + g + b) / 3;

    // Near-white: all channels high, low saturation
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

    if (brightness > 230 && saturation < 0.15) {
      // Fully transparent
      data[i + 3] = 0;
    } else if (brightness > 200 && saturation < 0.2) {
      // Soft edge — partial transparency
      const fade = (brightness - 200) / 30; // 0..1
      data[i + 3] = Math.round(data[i + 3] * (1 - fade));
    }
    // else keep original alpha
  }

  octx.putImageData(imageData, 0, 0);
  return offscreen;
}

export async function preloadBuildingSprites() {
  const promises = Object.entries(SPRITE_DEFS).map(([key, src]) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = removeWhiteBackground(img);
          sprites.set(key, canvas);
        } catch (e) {
          console.warn(`[BuildingSprites] BG removal failed for ${src}:`, e);
          // Fallback: store raw image
          sprites.set(key, img);
        }
        resolve();
      };
      img.onerror = () => {
        console.warn(`[BuildingSprites] Failed to load: ${src}`);
        resolve();
      };
      img.src = src;
    });
  });
  await Promise.all(promises);
  console.log(`[BuildingSprites] Loaded ${sprites.size} sprite(s)`);
}

export function getBuildingSprite(type) {
  return sprites.get(type) ?? null;
}
