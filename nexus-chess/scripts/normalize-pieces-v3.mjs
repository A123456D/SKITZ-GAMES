/**
 * Normalize v3 piece sprites: remove gray bg, bottom-align, role-scaled heights.
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
const OUT = join(root, "public", "themes", "nexus", "pieces");
const SOURCE = join(root, "assets", "source", "pieces-v3");
const CANVAS = 256;
const PAD = 10;

/** Relative visual height vs full content box (king = tallest). */
const SCALE = {
  K: 1.0,
  Q: 0.92,
  B: 0.84,
  N: 0.84,
  R: 0.82,
  P: 0.7,
};

function isBg(r, g, b) {
  const lum = (r + g + b) / 3;
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return chroma < 24 && lum > 90 && lum < 205;
}

function resolveSrc(name) {
  const candidates = [
    join(ASSETS, `nexus-${name}-v3b.png`),
    join(ASSETS, `nexus-${name}-v3.png`),
    join(ASSETS, `nexus-${name}-final.png`),
    join(ASSETS, `nexus-${name}.png`),
    join(OUT, `${name}.png`), // keep existing king if no new src
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

async function processOne(name) {
  const src = resolveSrc(name);
  if (!src) {
    console.warn("missing", name);
    return;
  }
  // Don't reprocess kings from old mismatched sheets if we have final/current
  if ((name === "wK" || name === "bK") && src.endsWith(`${name}.png`) && src.includes("pieces")) {
    console.log(`keep ${name} (already set)`);
    return;
  }

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

  if (maxX < minX) throw new Error(`no content ${name}`);

  const left = Math.max(0, minX - 4);
  const top = Math.max(0, minY - 4);
  const cw = Math.min(width - 1, maxX + 4) - left + 1;
  const ch = Math.min(height - 1, maxY + 4) - top + 1;

  const kind = name[1];
  const roleScale = SCALE[kind] ?? 1;
  const maxContentH = CANVAS - PAD * 2;
  const targetH = Math.round(maxContentH * roleScale);
  const targetW = Math.round((cw / ch) * targetH);

  const cropped = await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .resize(targetW, targetH, {
      fit: "fill",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const ox = Math.round((CANVAS - targetW) / 2);
  const oy = CANVAS - PAD - targetH; // bottom-align

  mkdirSync(SOURCE, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  copyFileSync(src, join(SOURCE, `${name}.png`));

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: ox, top: oy }])
    .png()
    .toFile(join(OUT, `${name}.png`));

  console.log(`${name}: ${cw}x${ch} → ${targetW}x${targetH} (scale ${roleScale})`);
}

const names = ["wQ", "wB", "wN", "wR", "wP", "bQ", "bB", "bN", "bR", "bP"];
for (const n of names) await processOne(n);

// Also normalize kings to same canvas bottom-align for consistency
for (const n of ["wK", "bK"]) {
  const src = join(OUT, `${n}.png`);
  if (!existsSync(src)) continue;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const maxContentH = CANVAS - PAD * 2;
  const targetH = Math.round(maxContentH * SCALE.K);
  const targetW = Math.round((cw / ch) * targetH);
  const cropped = await sharp(src)
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize(targetW, targetH, { fit: "fill", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const ox = Math.round((CANVAS - targetW) / 2);
  const oy = CANVAS - PAD - targetH;
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: ox, top: oy }])
    .png()
    .toFile(src);
  console.log(`${n} re-normalized ${targetW}x${targetH}`);
}

console.log("done");
