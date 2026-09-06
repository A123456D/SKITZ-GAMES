// Gravity Drift — NEXT queue preview (3 mini canvases, polar wedge style).
import { CELL, HOLE, PIECES } from "./constants.js";

export function drawNext(canvases, pieceIdxs) {
  canvases.forEach((cvs, i) => {
    const def = PIECES[pieceIdxs[i]];
    if (!def) { cvs.width && cvs.getContext("2d").clearRect(0, 0, cvs.width, cvs.height); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.max(40, cvs.clientWidth || 62);
    if (cvs.width !== size * dpr) { cvs.width = size * dpr; cvs.height = size * dpr; }
    const ctx = cvs.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2 + size * 0.06;
    const ppu = (size * 0.40) / (HOLE + 2 * CELL);
    const seg = (Math.PI * 2) / 10;
    const maxR = Math.max(...def.cells.map(c => c[0]));
    for (const [dr, ds] of def.cells) {
      // normalize so the piece is vertically centered
      const ring = dr - maxR;
      const r0 = (HOLE + (ring + 1) * CELL) * ppu;
      const r1 = (HOLE + (ring + 2) * CELL) * ppu;
      const rot = -Math.PI / 2 + (ds - 1) * seg;
      const a0 = rot + 0.02, a1 = rot + seg - 0.04;
      const [r, g, b] = def.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, a0, a1);
      ctx.arc(cx, cy, r0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0.95)`;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,255,255,0.22)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}
