/**
 * Conservative outer-plate punch for seal-eye.png only.
 * Buttons / HUD chrome are CSS type+plate now — do not reintroduce painted plates.
 *
 * Usage: node scripts/punch-ui-alpha.mjs
 * Reads originals from public/assets/ui/_pre_punch/ (created on first run).
 */
import sharp from "sharp";
import { mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("public/assets/ui");
const BACKUP = path.resolve("public/assets/ui/_pre_punch");

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function isKeep(r, g, b) {
  if (b > 50 && g > 40 && b + g > r + 25) return true;
  const L = lum(r, g, b);
  const c = chroma(r, g, b);
  if (L > 70 && c > 16) return true;
  if (r > 95 && r >= g - 5 && r >= b && L > 45) return true;
  if (L > 110) return true;
  return false;
}

function isOuterPlate(r, g, b) {
  if (isKeep(r, g, b)) return false;
  const L = lum(r, g, b);
  const c = chroma(r, g, b);
  if (L < 22 && c < 18) return true;
  if (L < 38 && c < 14) return true;
  return false;
}

const FILES = ["seal-eye.png"];

function punch(data, width, height) {
  const n = width * height;
  const mark = new Uint8Array(n);
  const queue = [];

  const push = (x, y) => {
    const i = y * width + x;
    if (mark[i]) return;
    const o = i * 4;
    if (!isOuterPlate(data[o], data[o + 1], data[o + 2])) return;
    mark[i] = 1;
    queue.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const i = queue.pop();
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  for (let i = 0; i < n; i++) {
    if (mark[i]) data[i * 4 + 3] = 0;
  }
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

await mkdir(BACKUP, { recursive: true });

for (const name of FILES) {
  const src = path.join(ROOT, name);
  const bak = path.join(BACKUP, name);
  if (!(await exists(bak))) await copyFile(src, bak);

  const { data, info } = await sharp(bak).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  punch(pixels, info.width, info.height);

  const punched = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  await sharp(punched).trim({ threshold: 4 }).png().toFile(src);
  const meta = await sharp(src).metadata();
  console.log(`punched ${name} → ${meta.width}x${meta.height}`);
}

console.log("done — source plates in", BACKUP);
