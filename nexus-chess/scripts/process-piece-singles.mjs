/**
 * Process individually generated Nexus piece PNGs:
 * remove flat gray background, tight-crop, normalize to 256² transparent PNGs.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const ASSETS =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Projects-SHIFTR-riot-cube/assets";
const OUT = join(root, "public", "themes", "nexus", "pieces");
const SOURCE = join(root, "assets", "source", "pieces-v2");
const CANVAS = 256;
const PAD = 8;

const FILES = [
  "wK", "wQ", "wB", "wN", "wR", "wP",
  "bK", "bQ", "bB", "bN", "bR", "bP",
];

function isBg(r, g, b) {
  // Flat gray studio background (~#7a7a7a) with tolerance
  const lum = (r + g + b) / 3;
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return chroma < 22 && lum > 95 && lum < 200;
}

async function processOne(name) {
  const src = join(ASSETS, `nexus-${name}.png`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

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

      if (isBg(r, g, b)) {
        out[oi + 3] = 0;
        continue;
      }

      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = 255;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  // Soften fringe: any near-bg pixel next to transparent → partial alpha
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const oi = (y * width + x) * 4;
      if (out[oi + 3] === 0) continue;
      const r = out[oi];
      const g = out[oi + 1];
      const b = out[oi + 2];
      if (!isBg(r, g, b) && (r + g + b) / 3 < 210) continue;
      let touchT = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (out[((y + dy) * width + (x + dx)) * 4 + 3] === 0) touchT = true;
      }
      if (touchT && isBg(r, g, b)) out[oi + 3] = 0;
    }
  }

  // Recompute bounds after fringe clean
  minX = width;
  minY = height;
  maxX = 0;
  maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (out[(y * width + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX) throw new Error(`No content in ${name}`);

  const left = Math.max(0, minX - PAD);
  const top = Math.max(0, minY - PAD);
  const cw = Math.min(width - 1, maxX + PAD) - left + 1;
  const ch = Math.min(height - 1, maxY + PAD) - top + 1;

  mkdirSync(SOURCE, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  copyFileSync(src, join(SOURCE, `${name}.png`));

  await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(join(OUT, `${name}.png`));

  console.log(`${name}: ${cw}x${ch} → ${CANVAS}`);
}

for (const name of FILES) {
  await processOne(name);
}
console.log("All pieces written to", OUT);
