/**
 * Extract individual Nexus chess pieces from sheet images.
 * Removes checkerboard background, tight-crops, writes transparent PNGs.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const KINDS = ["K", "Q", "B", "N", "R", "P"];
const PAD = 6;
const CANVAS = 256;

function isDark(r, g, b) {
  return (r + g + b) / 3 < 55;
}

function isNearGray(r, g, b) {
  return Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && Math.abs(r - b) < 18;
}

/** Mark piece pixels: dark ink, or light fill/outline touching dark ink. */
function maskContent(data, width, height, channels) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isDark(data[i], data[i + 1], data[i + 2])) mask[y * width + x] = 1;
    }
  }
  // Expand: light pixels near dark are piece body/outline (not checker alone)
  const next = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx]) continue;
      const i = idx * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      // Skip obvious mid-gray checker cells unless touching ink
      let nearDark = false;
      for (let dy = -2; dy <= 2 && !nearDark; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (mask[ny * width + nx]) nearDark = true;
        }
      }
      if (!nearDark) continue;
      // Keep bright fills and soft anti-aliased edges near ink
      if (lum > 90 || !isNearGray(r, g, b) || lum < 40) next[idx] = 1;
      else if (nearDark && lum > 140) next[idx] = 1;
    }
  }
  // Second pass grow for AA fringe
  const final = new Uint8Array(next);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (next[idx]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (next[(y + dy) * width + (x + dx)]) n++;
        }
      }
      if (n >= 3) {
        const i = idx * channels;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < 210 || !isNearGray(data[i], data[i + 1], data[i + 2])) final[idx] = 1;
      }
    }
  }
  return final;
}

function connectedComponents(mask, width, height) {
  const seen = new Uint8Array(width * height);
  const comps = [];
  const stack = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || seen[start]) continue;
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y,
        area = 0;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const idx = stack.pop();
        const cx = idx % width;
        const cy = (idx / width) | 0;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = ny * width + nx;
          if (!mask[nidx] || seen[nidx]) continue;
          seen[nidx] = 1;
          stack.push(nidx);
        }
      }
      comps.push({ minX, maxX, minY, maxY, area });
    }
  }
  return comps;
}

async function extractSheet(srcPath, colorPrefix, outDir) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const mask = maskContent(data, width, height, channels);

  let comps = connectedComponents(mask, width, height)
    .filter((c) => c.area > 800)
    .sort((a, b) => a.minX - b.minX);

  // Merge overlapping/nearby boxes (fragmented outlines)
  const merged = [];
  for (const c of comps) {
    const last = merged[merged.length - 1];
    if (last && c.minX <= last.maxX + 12) {
      last.maxX = Math.max(last.maxX, c.maxX);
      last.minY = Math.min(last.minY, c.minY);
      last.maxY = Math.max(last.maxY, c.maxY);
      last.area += c.area;
    } else {
      merged.push({ ...c });
    }
  }
  comps = merged.sort((a, b) => b.area - a.area).slice(0, 6).sort((a, b) => a.minX - b.minX);

  if (comps.length !== 6) {
    console.warn(`${colorPrefix}: expected 6 pieces, got ${comps.length}`);
  }

  const outRgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const si = i * channels;
    const oi = i * 4;
    if (!mask[i]) {
      outRgba[oi + 3] = 0;
      continue;
    }
    outRgba[oi] = data[si];
    outRgba[oi + 1] = data[si + 1];
    outRgba[oi + 2] = data[si + 2];
    // Soft alpha for near-checker fringe
    const lum = (data[si] + data[si + 1] + data[si + 2]) / 3;
    if (isNearGray(data[si], data[si + 1], data[si + 2]) && lum > 160 && lum < 230) {
      outRgba[oi + 3] = 0;
    } else {
      outRgba[oi + 3] = 255;
    }
  }

  // Rebuild alpha more carefully inside each bbox: keep non-checker
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue;
    const si = i * channels;
    const oi = i * 4;
    outRgba[oi] = data[si];
    outRgba[oi + 1] = data[si + 1];
    outRgba[oi + 2] = data[si + 2];
    outRgba[oi + 3] = 255;
  }
  // Clear non-mask
  for (let i = 0; i < width * height; i++) {
    if (mask[i]) continue;
    outRgba[i * 4 + 3] = 0;
  }

  mkdirSync(outDir, { recursive: true });

  for (let pi = 0; pi < Math.min(6, comps.length); pi++) {
    const c = comps[pi];
    const left = Math.max(0, c.minX - PAD);
    const top = Math.max(0, c.minY - PAD);
    const right = Math.min(width - 1, c.maxX + PAD);
    const bottom = Math.min(height - 1, c.maxY + PAD);
    const cw = right - left + 1;
    const ch = bottom - top + 1;
    const kind = KINDS[pi];
    const dest = join(outDir, `${colorPrefix}${kind}.png`);

    const cropped = await sharp(outRgba, { raw: { width, height, channels: 4 } })
      .extract({ left, top, width: cw, height: ch })
      .resize(CANVAS, CANVAS, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(dest);

    console.log(`  ${colorPrefix}${kind} → ${cw}x${ch} → ${CANVAS} (${dest})`);
    void cropped;
  }
}

const outDir = join(root, "public", "themes", "nexus", "pieces");
console.log("Extracting black pieces...");
await extractSheet(join(root, "assets", "source", "sheet-black.png"), "b", outDir);
console.log("Extracting white pieces...");
await extractSheet(join(root, "assets", "source", "sheet-white.png"), "w", outDir);
console.log("Done.");
