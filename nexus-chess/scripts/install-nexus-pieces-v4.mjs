/**
 * Install Nexus piece v4 (Q/B/N/R/P only) — gray knockout, role-scaled, centered.
 * Kings are left untouched.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const ASSETS =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Projects-SHIFTR-nexus-chess/assets";
const OUT = join(root, "public", "themes", "nexus", "pieces");
const SOURCE = join(root, "assets", "source", "pieces-v4");
const CANVAS = 256;
const PAD = 10;

/** Relative visual height vs full content box (king = tallest). */
const SCALE = {
  Q: 0.92,
  B: 0.84,
  N: 0.84,
  R: 0.82,
  P: 0.7,
};

const NAMES = [
  "wQ", "wB", "wN", "wR", "wP",
  "bQ", "bB", "bN", "bR", "bP",
];

function isBg(r, g, b) {
  const lum = (r + g + b) / 3;
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return chroma < 28 && lum > 85 && lum < 210;
}

async function processOne(name) {
  const kind = name.slice(1);
  const src = join(ASSETS, `nexus-${name}-v4.png`);
  if (!existsSync(src)) throw new Error(`Missing ${src}`);

  mkdirSync(SOURCE, { recursive: true });
  copyFileSync(src, join(SOURCE, `${name}.png`));

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const cleaned = Buffer.alloc(width * height * 4);

  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const oi = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 8 || isBg(r, g, b)) {
        cleaned[oi + 3] = 0;
        continue;
      }
      cleaned[oi] = r;
      cleaned[oi + 1] = g;
      cleaned[oi + 2] = b;
      cleaned[oi + 3] = 255;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) throw new Error(`No content in ${name}`);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const role = SCALE[kind] ?? 0.85;
  const maxDim = CANVAS - PAD * 2;
  const targetH = Math.round(maxDim * role);
  const scale = Math.min(maxDim / cw, targetH / ch);
  const tw = Math.max(1, Math.round(cw * scale));
  const th = Math.max(1, Math.round(ch * scale));
  const left = Math.round((CANVAS - tw) / 2);
  const top = Math.round((CANVAS - th) / 2);

  const resized = await sharp(cleaned, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize(tw, th, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(CANVAS * CANVAS * 4);
  for (let y = 0; y < resized.info.height; y++) {
    for (let x = 0; x < resized.info.width; x++) {
      const si = (y * resized.info.width + x) * 4;
      const a = resized.data[si + 3];
      if (a < 8) continue;
      const dx = left + x;
      const dy = top + y;
      if (dx < 0 || dy < 0 || dx >= CANVAS || dy >= CANVAS) continue;
      const oi = (dy * CANVAS + dx) * 4;
      out[oi] = resized.data[si];
      out[oi + 1] = resized.data[si + 1];
      out[oi + 2] = resized.data[si + 2];
      out[oi + 3] = a;
    }
  }

  await sharp(out, { raw: { width: CANVAS, height: CANVAS, channels: 4 } })
    .png()
    .toFile(join(OUT, `${name}.png`));

  console.log(`${name}: ${cw}x${ch} → ${tw}x${th} @ (${left},${top}) role=${role}`);
}

for (const name of NAMES) await processOne(name);
console.log("Kings untouched. v4 pieces installed.");
