import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const srcDir = join(root, "scripts", "art-raw");
const cardsOut = join(root, "public", "assets", "cards");

mkdirSync(cardsOut, { recursive: true });

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function dist(r, g, b, br, bg, bb) {
  const dr = r - br;
  const dg = g - bg;
  const db = b - bb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBorder(data, w, h) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const push = (x, y) => {
    const i = (y * w + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  return { r: r / n, g: g / n, b: b / n };
}

/** Cut solid black (or sampled) backdrops used by Riot-style sticker gens. */
function removeBackdrop(data, w, h) {
  const bg = sampleBorder(data, w, h);
  const darkBg = lum(bg.r, bg.g, bg.b) < 40;
  const out = Buffer.from(data);
  const visited = new Uint8Array(w * h);
  const queue = [];

  const isBg = (i) => {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const L = lum(r, g, b);
    if (darkBg) {
      // Keep bright sticker rim / art; only flood dark plate
      if (L > 70) return false;
      return dist(r, g, b, bg.r, bg.g, bg.b) < 55 || L < 32;
    }
    return dist(r, g, b, bg.r, bg.g, bg.b) < 72;
  };

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!isBg(i)) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    const x = idx % w;
    const y = (idx / w) | 0;
    const i = idx * 4;
    const L = lum(out[i], out[i + 1], out[i + 2]);
    if (darkBg) {
      // Hard kill deep blacks; soft edge for near-black fringe
      if (L < 24) out[i + 3] = 0;
      else if (L < 48) out[i + 3] = Math.min(out[i + 3], Math.round(((L - 24) / 24) * 255));
      else out[i + 3] = Math.min(out[i + 3], 40);
    } else {
      const d = dist(out[i], out[i + 1], out[i + 2], bg.r, bg.g, bg.b);
      const hard = 38;
      const soft = 72;
      const alpha = d <= hard ? 0 : Math.round(255 * ((d - hard) / (soft - hard)));
      out[i + 3] = Math.min(out[i + 3], alpha);
    }
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  // Despill: dark fringe next to opaque pixels → push toward white rim
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const a = out[i + 3];
      if (a === 0 || a === 255) continue;
      const L = lum(out[i], out[i + 1], out[i + 2]);
      if (L < 60) {
        const t = 1 - L / 60;
        out[i] = Math.round(out[i] + (245 - out[i]) * t * 0.85);
        out[i + 1] = Math.round(out[i + 1] + (245 - out[i + 1]) * t * 0.85);
        out[i + 2] = Math.round(out[i + 2] + (245 - out[i + 2]) * t * 0.85);
      }
    }
  }

  return out;
}

function alphaBounds(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { left: 0, top: 0, width: w, height: h };
  const pad = Math.max(4, Math.round(Math.min(w, h) * 0.02));
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(w - 1, maxX + pad);
  const bottom = Math.min(h - 1, maxY + pad);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function cutFile(name) {
  const input = join(srcDir, name);
  const outName = basename(name).replace(/-raw/i, "").replace(/\.png$/i, "") + ".png";
  const output = join(cardsOut, outName);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cut = removeBackdrop(data, info.width, info.height);
  const box = alphaBounds(cut, info.width, info.height);
  await sharp(cut, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(box)
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`cut ${name} → ${outName}`);
}

if (!existsSync(srcDir)) {
  console.log("No scripts/art-raw yet — skip");
  process.exit(0);
}

const files = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".png"));
if (!files.length) {
  console.log("No raw PNGs in scripts/art-raw");
  process.exit(0);
}

for (const f of files) {
  await cutFile(f);
}
