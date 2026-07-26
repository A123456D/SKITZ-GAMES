import type { TileKind } from "../core/types";
import { getQuality } from "./quality";
import { stickerImage } from "./stickers";

/** Deterministic 0..1 noise from cell seed + grid coords. */
function hash2(seed: number, x: number, y: number): number {
  let n = Math.imul(seed ^ (x * 374761393) ^ (y * 668265263), 1597334677);
  n = (n ^ (n >>> 13)) >>> 0;
  return (n % 10000) / 10000;
}

/**
 * Draw a sticker crumpling like paper: mesh warps inward, rotates, fades.
 * t in [0,1] — 0 intact, 1 fully crumpled away.
 */
export function drawCrumpledSticker(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  x: number,
  y: number,
  s: number,
  t: number,
  seed: number,
): void {
  const img = stickerImage(kind);
  const ease = t * t * (3 - 2 * t);
  const cx = x + s / 2;
  const cy = y + s / 2;
  const rot = (hash2(seed, 3, 7) - 0.5) * 0.9 * ease;
  const scale = 1 - 0.55 * ease;
  const alpha = 1 - ease * ease;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Soft crumple shadow (skip on low-end — canvas shadows are costly)
  if (getQuality().stickerShadows) {
    ctx.shadowColor = `rgba(0,0,0,${0.25 + 0.35 * ease})`;
    ctx.shadowBlur = 8 + 18 * ease;
    ctx.shadowOffsetY = 4 + 10 * ease;
  }

  const grid = getQuality().stickerShadows ? 4 : 2; // 4x4 quads = 5x5 verts
  const verts: { x: number; y: number; u: number; v: number }[] = [];
  for (let gy = 0; gy <= grid; gy++) {
    for (let gx = 0; gx <= grid; gx++) {
      const u = gx / grid;
      const v = gy / grid;
      const px = x + u * s;
      const py = y + v * s;
      // Pull toward center + jitter (paper fold)
      const dx = px - cx;
      const dy = py - cy;
      const pull = ease * (0.35 + 0.45 * hash2(seed, gx, gy));
      const jx = (hash2(seed, gx + 11, gy) - 0.5) * s * 0.22 * ease;
      const jy = (hash2(seed, gx, gy + 19) - 0.5) * s * 0.22 * ease;
      // Extra fold ridges
      const fold = Math.sin(u * Math.PI * 2 + seed) * Math.sin(v * Math.PI * 2) * s * 0.08 * ease;
      verts.push({
        x: px - dx * pull + jx,
        y: py - dy * pull + jy + fold,
        u,
        v,
      });
    }
  }

  const drawQuad = (
    a: (typeof verts)[0],
    b: (typeof verts)[0],
    c: (typeof verts)[0],
    d: (typeof verts)[0],
  ) => {
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.clip();

    // Map image into the quad's AABB with UV approx (good enough crumple look)
    const minX = Math.min(a.x, b.x, c.x, d.x);
    const minY = Math.min(a.y, b.y, c.y, d.y);
    const maxX = Math.max(a.x, b.x, c.x, d.x);
    const maxY = Math.max(a.y, b.y, c.y, d.y);
    const minU = Math.min(a.u, b.u, c.u, d.u);
    const minV = Math.min(a.v, b.v, c.v, d.v);
    const maxU = Math.max(a.u, b.u, c.u, d.u);
    const maxV = Math.max(a.v, b.v, c.v, d.v);

    if (img) {
      const sx = minU * img.width;
      const sy = minV * img.height;
      const sw = Math.max(1, (maxU - minU) * img.width);
      const sh = Math.max(1, (maxV - minV) * img.height);
      ctx.drawImage(img, sx, sy, sw, sh, minX, minY, maxX - minX, maxY - minY);
    } else {
      ctx.fillStyle = "#f3efe6";
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    }

    // Crease lines
    if (ease > 0.15) {
      ctx.strokeStyle = `rgba(40,30,20,${0.15 + 0.35 * ease})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const i = gy * (grid + 1) + gx;
      const a = verts[i]!;
      const b = verts[i + 1]!;
      const d = verts[i + grid + 1]!;
      const c = verts[i + grid + 2]!;
      drawQuad(a, b, c, d);
    }
  }

  // Tiny paper scrap particles near the end
  if (ease > 0.4) {
    ctx.shadowColor = "transparent";
    const pCount = 5;
    for (let i = 0; i < pCount; i++) {
      const ang = hash2(seed, i, 40) * Math.PI * 2;
      const dist = s * (0.2 + 0.55 * ease) * (0.5 + hash2(seed, i, 41));
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist - ease * 20;
      const ps = 3 + hash2(seed, i, 42) * 5;
      ctx.fillStyle = i % 2 === 0 ? "#f3efe6" : "#e8dcc8";
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(hash2(seed, i, 43) * Math.PI);
      ctx.fillRect(-ps / 2, -ps / 2, ps, ps * 0.7);
      ctx.restore();
    }
  }

  ctx.restore();
}
