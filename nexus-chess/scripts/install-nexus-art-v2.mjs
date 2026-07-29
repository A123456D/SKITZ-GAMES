/**
 * Install Nexus board v2 + process piece singles (gray-bg knockouts → 256² PNG).
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
  "C:/Users/PC/.cursor/projects/c-Users-PC-Projects-SHIFTR-riot-cube/assets";
const OUT_PIECES = join(root, "public", "themes", "nexus", "pieces");
const OUT_BOARD = join(root, "public", "themes", "nexus", "board.png");
const SOURCE = join(root, "assets", "source", "pieces-v3");
const CANVAS = 256;
const PAD = 8;

const FILES = [
  "wK", "wQ", "wB", "wN", "wR", "wP",
  "bK", "bQ", "bB", "bN", "bR", "bP",
];

function isBg(r, g, b) {
  const lum = (r + g + b) / 3;
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  // Medium gray studio (#7a7a7a) + nearby neutrals
  return chroma < 28 && lum > 85 && lum < 210;
}

async function processOne(name) {
  const src = join(ASSETS, `nexus-${name}.png`);
  if (!existsSync(src)) throw new Error(`Missing ${src}`);

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

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
    }
  }

  // Soft fringe: near-bg next to transparent → drop
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const oi = (y * width + x) * 4;
      if (out[oi + 3] === 0) continue;
      const r = out[oi];
      const g = out[oi + 1];
      const b = out[oi + 2];
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

  let minX = width,
    minY = height,
    maxX = 0,
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
  mkdirSync(OUT_PIECES, { recursive: true });
  copyFileSync(src, join(SOURCE, `${name}.png`));

  await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(join(OUT_PIECES, `${name}.png`));

  console.log(`${name}: ${cw}x${ch} → ${CANVAS}`);
}

async function installBoard() {
  const src = join(ASSETS, "nexus-board-v2.png");
  if (!existsSync(src)) throw new Error(`Missing board ${src}`);

  // Slight contrast polish + ensure square PNG for board texture
  const meta = await sharp(src).metadata();
  const side = Math.min(meta.width || 1024, meta.height || 1024);
  // Crop centered square, then mild vignette-friendly normalize
  await sharp(src)
    .extract({
      left: Math.floor(((meta.width || side) - side) / 2),
      top: Math.floor(((meta.height || side) - side) / 2),
      width: side,
      height: side,
    })
    .resize(1024, 1024)
    .png()
    .toFile(OUT_BOARD);

  // Keep a source copy
  mkdirSync(join(root, "assets", "source"), { recursive: true });
  copyFileSync(src, join(root, "assets", "source", "board-v2.png"));
  console.log(`board: ${side} → 1024 → ${OUT_BOARD}`);
}

await installBoard();
for (const name of FILES) {
  await processOne(name);
}
console.log("Nexus board + pieces installed.");
