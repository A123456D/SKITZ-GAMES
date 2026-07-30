/**
 * Re-center Nexus theme piece sprites on a transparent 256² canvas
 * WITHOUT upscaling — preserve original content size, only shift to center.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const DIR = join(root, "public", "themes", "nexus", "pieces");
const BACKUP = join(root, "assets", "source", "nexus-pieces-precenter");
const CANVAS = 256;

async function recenterFromBackup(name) {
  const backup = join(BACKUP, name);
  const dest = join(DIR, name);
  if (!existsSync(backup)) {
    console.warn("missing backup", name);
    return;
  }

  const { data, info } = await sharp(backup).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) {
    console.warn("empty", name);
    return;
  }

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const left = Math.round((CANVAS - cw) / 2);
  const top = Math.round((CANVAS - ch) / 2);

  const out = Buffer.alloc(CANVAS * CANVAS * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = minX + x;
      const sy = minY + y;
      const si = (sy * width + sx) * channels;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      const a = data[si + 3];
      const lum = (r + g + b) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (a < 8 || (lum < 18 && chroma < 12)) continue;
      const dx = left + x;
      const dy = top + y;
      if (dx < 0 || dy < 0 || dx >= CANVAS || dy >= CANVAS) continue;
      const oi = (dy * CANVAS + dx) * 4;
      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = a;
    }
  }

  await sharp(out, { raw: { width: CANVAS, height: CANVAS, channels: 4 } })
    .png()
    .toFile(dest);

  console.log(
    `${name}: content ${cw}x${ch} pad was T=${minY} B=${height - 1 - maxY} → @ (${left},${top})`,
  );
}

const files = readdirSync(BACKUP).filter((f) => f.endsWith(".png"));
for (const f of files) await recenterFromBackup(f);
console.log("done →", DIR);
