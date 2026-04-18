// ============================================================
// camera.js — Pan + zoom camera, coordinate transforms
// ============================================================

export const camera = {
  x: 0,        // World CSS-pixel X of viewport top-left
  y: 0,        // World CSS-pixel Y of viewport top-left
  zoom: 1.0,
  minZoom: 0.04,
  maxZoom: 2.5,

  // Screen pixel → world CSS pixel
  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  },

  // World CSS pixel → screen pixel
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  },

  // Screen pixel → tile coordinate
  screenToTile(sx, sy) {
    const w = this.screenToWorld(sx, sy);
    return {
      tx: Math.floor(w.x / 32),
      ty: Math.floor(w.y / 32),
    };
  },

  // Clamp camera — centres map when viewport is larger than world
  clamp(mapPixelW, mapPixelH) {
    const vpW = window.innerWidth  / this.zoom;
    const vpH = window.innerHeight / this.zoom;

    if (vpW >= mapPixelW) {
      // Viewport wider than map — centre horizontally
      this.x = -(vpW - mapPixelW) / 2;
    } else {
      this.x = Math.max(0, Math.min(this.x, mapPixelW - vpW));
    }

    if (vpH >= mapPixelH) {
      // Viewport taller than map — centre vertically
      this.y = -(vpH - mapPixelH) / 2;
    } else {
      this.y = Math.max(0, Math.min(this.y, mapPixelH - vpH));
    }
  },
};
