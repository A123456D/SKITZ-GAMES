/**
 * Replace king crowns with the exact Nexus logo crown.
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
const SOURCE = join(root, "assets", "source");
const CANVAS = 256;
const PAD = 10;

async function extractLogoCrown() {
  const logoPath = join(root, "public", "logo.png");
  // Known crop from inspection: crown sits above the X
  const crop = await sharp(logoPath)
    .extract({ left: 185, top: 8, width: 62, height: 52 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = crop;
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
      const a = data[i + 3];
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (a < 30 || lum < 40) {
        out[oi + 3] = 0;
        continue;
      }
      out[oi] = 255;
      out[oi + 1] = 255;
      out[oi + 2] = 255;
      out[oi + 3] = a;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const left = Math.max(0, minX - 2);
  const top = Math.max(0, minY - 2);
  const cw = Math.min(width - 1, maxX + 2) - left + 1;
  const ch = Math.min(height - 1, maxY + 2) - top + 1;

  const dest = join(SOURCE, "logo-crown-exact.png");
  await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .png()
    .toFile(dest);
  console.log("logo crown", cw, "x", ch);
  return dest;
}

function isGrayBg(r, g, b) {
  const lum = (r + g + b) / 3;
  const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return chroma < 24 && lum > 95 && lum < 200;
}

/** Remove gray bg and strip existing crown (top portion of silhouette). */
async function prepareKingBody(srcPath, stripTopRatio = 0.22) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
      if (isGrayBg(r, g, b)) {
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

  const contentH = maxY - minY + 1;
  const cutY = minY + Math.floor(contentH * stripTopRatio);

  // Clear old crown region
  for (let y = 0; y < cutY; y++) {
    for (let x = 0; x < width; x++) {
      out[(y * width + x) * 4 + 3] = 0;
    }
  }

  // Recompute bounds of remaining body
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

  const left = Math.max(0, minX - PAD);
  const top = Math.max(0, minY - PAD);
  const cw = Math.min(width - 1, maxX + PAD) - left + 1;
  const ch = Math.min(height - 1, maxY + PAD) - top + 1;

  const bodyBuf = await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .png()
    .toBuffer();

  return { bodyBuf, bodyW: cw, bodyH: ch };
}

async function tintCrown(crownPath, mode) {
  const { data, info } = await sharp(crownPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const si = i * channels;
    const oi = i * 4;
    const a = data[si + 3];
    if (a < 20) {
      out[oi + 3] = 0;
      continue;
    }
    if (mode === "white") {
      // White fill crown with navy edge baked via slightly inset look — solid white
      out[oi] = 255;
      out[oi + 1] = 255;
      out[oi + 2] = 255;
      out[oi + 3] = a;
    } else {
      // Cyan crown glyph for black king (matches black piece outline language)
      out[oi] = 168;
      out[oi + 1] = 230;
      out[oi + 2] = 255;
      out[oi + 3] = a;
    }
  }

  // For white king: add navy outline around crown
  if (mode === "white") {
    const outline = Buffer.from(out);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const oi = (y * width + x) * 4;
        if (out[oi + 3] > 20) continue;
        let near = false;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]) {
          if (out[((y + dy) * width + (x + dx)) * 4 + 3] > 40) near = true;
        }
        if (near) {
          outline[oi] = 10;
          outline[oi + 1] = 22;
          outline[oi + 2] = 40;
          outline[oi + 3] = 255;
        }
      }
    }
    // Put white fill on top of navy outline
    for (let i = 0; i < width * height; i++) {
      const oi = i * 4;
      if (out[oi + 3] > 20) {
        outline[oi] = 255;
        outline[oi + 1] = 255;
        outline[oi + 2] = 255;
        outline[oi + 3] = out[oi + 3];
      }
    }
    return sharp(outline, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }

  // Black king: dark fill + cyan outline around logo crown
  const outline = Buffer.alloc(width * height * 4);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const oi = (y * width + x) * 4;
      if (out[oi + 3] > 20) {
        outline[oi] = 13;
        outline[oi + 1] = 15;
        outline[oi + 2] = 20;
        outline[oi + 3] = 255;
        continue;
      }
      let near = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        if (out[((y + dy) * width + (x + dx)) * 4 + 3] > 40) near = true;
      }
      if (near) {
        outline[oi] = 168;
        outline[oi + 1] = 230;
        outline[oi + 2] = 255;
        outline[oi + 3] = 255;
      }
    }
  }
  return sharp(outline, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function buildKing(name, srcPath, mode) {
  const crownPath = await extractLogoCrown();
  const { bodyBuf, bodyW, bodyH } = await prepareKingBody(srcPath, mode === "white" ? 0.2 : 0.24);
  const crownBuf = await tintCrown(crownPath, mode);

  const crownMeta = await sharp(crownBuf).metadata();
  const crownTargetW = Math.round(bodyW * 0.72);
  const crownScaled = await sharp(crownBuf)
    .resize(crownTargetW, null, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const cs = await sharp(crownScaled).metadata();

  const gap = Math.round(bodyH * 0.02);
  const totalH = (cs.height || 1) + gap + bodyH;
  const totalW = Math.max(bodyW, cs.width || 1) + PAD * 2;
  const crownX = Math.round((totalW - (cs.width || 1)) / 2);
  const bodyX = Math.round((totalW - bodyW) / 2);
  const crownY = PAD;
  const bodyY = PAD + (cs.height || 1) + gap;

  const canvasH = totalH + PAD * 2;
  const composed = await sharp({
    create: {
      width: totalW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: crownScaled, left: crownX, top: crownY },
      { input: bodyBuf, left: bodyX, top: bodyY },
    ])
    .png()
    .toBuffer();

  mkdirSync(OUT, { recursive: true });
  await sharp(composed)
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(join(OUT, `${name}.png`));

  copyFileSync(srcPath, join(SOURCE, "pieces-v2", `${name}-pre-crown.png`));
  console.log(`wrote ${name}.png`);
}

mkdirSync(join(SOURCE, "pieces-v2"), { recursive: true });

await buildKing("wK", join(ASSETS, "nexus-wK-logo-crown.png"), "white");
await buildKing("bK", join(ASSETS, "nexus-bK-logo-crown-v2.png"), "black");
console.log("done");
