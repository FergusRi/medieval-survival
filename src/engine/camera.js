// ============================================================
// camera.js — Pan + zoom camera, coordinate transforms
// ============================================================

export const camera = {
  x: 0,        // World CSS-pixel X of viewport top-left
  y: 0,        // World CSS-pixel Y of viewport top-left
  zoom: 1.0,
  minZoom: 0.05,
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

  // Clamp camera so it never scrolls outside the world bounds
  clamp(mapPixelW, mapPixelH) {
    const vpW = window.innerWidth  / this.zoom;
    const vpH = window.innerHeight / this.zoom;
    this.x = Math.max(0, Math.min(this.x, mapPixelW - vpW));
    this.y = Math.max(0, Math.min(this.y, mapPixelH - vpH));
  },
};
