import { readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const srcDir = join(root, "scripts", "art-raw");
const cardsOut = join(root, "public", "assets", "cards");
const uiOut = join(root, "public", "assets", "ui");

mkdirSync(cardsOut, { recursive: true });
mkdirSync(uiOut, { recursive: true });

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

function removeBackdrop(data, w, h, opts = {}) {
  const hard = opts.hard ?? 38;
  const soft = opts.soft ?? 72;
  const bg = sampleBorder(data, w, h);
  const out = Buffer.from(data);
  const visited = new Uint8Array(w * h);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const d = dist(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
    if (d > soft) return;
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
    const d = dist(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
    let alpha = 255;
    if (d <= hard) alpha = 0;
    else if (d < soft) alpha = Math.round(255 * ((d - hard) / (soft - hard)));
    const L = lum(data[i], data[i + 1], data[i + 2]);
    const chroma =
      Math.max(data[i], data[i + 1], data[i + 2]) -
      Math.min(data[i], data[i + 1], data[i + 2]);
    if (L < 28 && chroma < 18 && d < soft + 20) {
      alpha = Math.min(alpha, Math.round((L / 28) * 80));
    }
    out[i + 3] = Math.min(out[i + 3], alpha);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
  return out;
}

function trimAlpha(data, width, height, pad = 10) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { data, width, height };
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const trimmed = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const si = ((minY + y) * width + (minX + x)) * 4;
      const di = (y * tw + x) * 4;
      trimmed[di] = data[si];
      trimmed[di + 1] = data[si + 1];
      trimmed[di + 2] = data[si + 2];
      trimmed[di + 3] = data[si + 3];
    }
  }
  return { data: trimmed, width: tw, height: th };
}

async function writeSquaredPng(raw, width, height, outPath, size = 512, fit = 0.92) {
  const trimmed = trimAlpha(raw, width, height, 14);
  const scale = Math.min(size / trimmed.width, size / trimmed.height) * fit;
  const nw = Math.max(1, Math.round(trimmed.width * scale));
  const nh = Math.max(1, Math.round(trimmed.height * scale));
  const resized = await sharp(trimmed.data, {
    raw: { width: trimmed.width, height: trimmed.height, channels: 4 },
  })
    .resize(nw, nh, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.floor((size - nw) / 2),
        top: Math.floor((size - nh) / 2),
      },
    ])
    .png()
    .toFile(outPath);
}

async function writeFittedPng(raw, width, height, outPath, tw, th) {
  const trimmed = trimAlpha(raw, width, height, 8);
  await sharp(trimmed.data, {
    raw: { width: trimmed.width, height: trimmed.height, channels: 4 },
  })
    .resize(tw, th, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

async function processFile(file) {
  const input = join(srcDir, file);
  const base = basename(file).replace(/-raw\.png$/i, ".png");
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // Full-bleed backgrounds: keep opaque, just resize
  if (file.startsWith("ui-bg-")) {
    const out = join(uiOut, base);
    await sharp(input).resize(720, 1280, { fit: "cover" }).png().toFile(out);
    console.log(`BG  ${base}`);
    return;
  }

  const isUi = file.startsWith("ui-");
  const keyed = removeBackdrop(data, info.width, info.height, {
    hard: isUi ? 32 : 38,
    soft: isUi ? 64 : 72,
  });

  if (isUi) {
    const out = join(uiOut, base);
    if (file.includes("card-frame")) {
      await writeFittedPng(keyed, info.width, info.height, out, 512, 768);
    } else if (file.includes("btn-")) {
      await writeFittedPng(keyed, info.width, info.height, out, 640, 180);
    } else if (file.includes("hud-panel")) {
      await writeFittedPng(keyed, info.width, info.height, out, 720, 160);
    } else if (file.includes("board-panel")) {
      await writeFittedPng(keyed, info.width, info.height, out, 720, 900);
    } else if (file.includes("energy-bar")) {
      await writeFittedPng(keyed, info.width, info.height, out, 640, 80);
    } else if (file.includes("tile-empty")) {
      await writeSquaredPng(keyed, info.width, info.height, out, 256, 0.95);
    } else if (file.includes("logo-badge") || file.includes("icon-")) {
      await writeSquaredPng(keyed, info.width, info.height, out, 512, 0.9);
    } else {
      await writeFittedPng(keyed, info.width, info.height, out, 512, 512);
    }
    console.log(`UI  ${base}`);
    return;
  }

  // Faction emblems → ui/
  if (file.startsWith("faction-")) {
    const out = join(uiOut, base);
    await writeSquaredPng(keyed, info.width, info.height, out, 512, 0.9);
    console.log(`FAC ${base}`);
    return;
  }

  // Card subject art
  const out = join(cardsOut, base);
  await writeSquaredPng(keyed, info.width, info.height, out, 512, 0.92);
  console.log(`ART ${base}`);
}

const files = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith("-raw.png"));
if (!files.length) {
  console.error("No *-raw.png in scripts/art-raw");
  process.exit(1);
}

for (const f of files) await processFile(f);

// Mirror into Godot
const godotCards = join(root, "godot", "assets", "cards");
const godotUi = join(root, "godot", "assets", "ui");
mkdirSync(godotCards, { recursive: true });
mkdirSync(godotUi, { recursive: true });
for (const f of readdirSync(cardsOut)) copyFileSync(join(cardsOut, f), join(godotCards, f));
for (const f of readdirSync(uiOut)) copyFileSync(join(uiOut, f), join(godotUi, f));

console.log(`Done — processed ${files.length} raw assets`);
