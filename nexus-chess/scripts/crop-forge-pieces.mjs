/**
 * Extract Forge pieces using row/column projections + valley splits.
 * Cyan sheet = white, crimson sheet = black.
 * Top order: K Q B R N. Bottom: pawns (pick one clean pawn).
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const OUT = join(root, "public", "themes", "forge", "pieces");
const SOURCE = join(root, "assets", "source");
const CANVAS = 256;
const PAD = 6;
const WHITE_THRESH = 246;

mkdirSync(OUT, { recursive: true });
mkdirSync(join(SOURCE, "forge"), { recursive: true });

function isBg(r, g, b, a) {
  if (a < 8) return true;
  const lum = (r + g + b) / 3;
  return lum >= WHITE_THRESH && Math.max(r, g, b) - Math.min(r, g, b) < 20;
}

function contentMask(data, width, height, channels) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!isBg(data[i], data[i + 1], data[i + 2], data[i + 3])) mask[y * width + x] = 1;
    }
  }
  return mask;
}

function bandCols(mask, width, height, y0, y1) {
  const col = new Float64Array(width);
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) col[x]++;
    }
  }
  return col;
}

function findBands(mask, width, height) {
  const row = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (mask[y * width + x]) row[y]++;
  }
  const thr = width * 0.015;
  const bands = [];
  let s = null;
  for (let y = 0; y < height; y++) {
    if (row[y] > thr) {
      if (s == null) s = y;
    } else if (s != null) {
      bands.push([s, y - 1]);
      s = null;
    }
  }
  if (s != null) bands.push([s, height - 1]);
  bands.sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
  // two largest content bands
  const sorted = bands.slice().sort((a, b) => a[0] - b[0]);
  return { top: sorted[0], bot: sorted[1] || sorted[0] };
}

/** Split a column density profile into n segments via deepest valleys. */
function splitN(col, n, minGap = 6) {
  const width = col.length;
  // smooth
  const s = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    let v = 0,
      c = 0;
    for (let k = -4; k <= 4; k++) {
      const xx = x + k;
      if (xx < 0 || xx >= width) continue;
      v += col[xx];
      c++;
    }
    s[x] = v / c;
  }
  // content span
  let L = 0,
    R = width - 1;
  while (L < width && s[L] < 1) L++;
  while (R > L && s[R] < 1) R--;
  if (R - L < n * 20) {
    // equal split fallback
    const segs = [];
    const span = R - L + 1;
    for (let i = 0; i < n; i++) {
      const a = L + Math.round((span * i) / n);
      const b = L + Math.round((span * (i + 1)) / n) - 1;
      segs.push([a, b]);
    }
    return segs;
  }

  // find valleys between L and R
  const valleys = [];
  for (let x = L + minGap; x <= R - minGap; x++) {
    if (s[x] <= s[x - 1] && s[x] <= s[x + 1]) {
      // local min strength: how deep relative to neighbors
      const leftMax = Math.max(...s.slice(Math.max(L, x - 40), x));
      const rightMax = Math.max(...s.slice(x + 1, Math.min(R, x + 40) + 1));
      const depth = Math.min(leftMax, rightMax) - s[x];
      if (depth > 2 || s[x] < 8) valleys.push({ x, depth: depth + (s[x] < 3 ? 50 : 0), val: s[x] });
    }
  }
  valleys.sort((a, b) => b.depth - a.depth || a.val - b.val);

  // pick n-1 well-spaced valleys
  const picks = [];
  for (const v of valleys) {
    if (picks.every((p) => Math.abs(p - v.x) > (R - L) / (n * 1.6))) {
      picks.push(v.x);
      if (picks.length === n - 1) break;
    }
  }
  picks.sort((a, b) => a - b);

  if (picks.length < n - 1) {
    const segs = [];
    const span = R - L + 1;
    for (let i = 0; i < n; i++) {
      const a = L + Math.round((span * i) / n);
      const b = L + Math.round((span * (i + 1)) / n) - 1;
      segs.push([a, b]);
    }
    return segs;
  }

  const cuts = [L, ...picks, R + 1];
  const segs = [];
  for (let i = 0; i < n; i++) {
    segs.push([cuts[i] + (i === 0 ? 0 : 1), cuts[i + 1] - (i === n - 1 ? 0 : 1)]);
  }
  // tighten each seg to content
  return segs.map(([a, b]) => {
    let la = a,
      rb = b;
    while (la < rb && s[la] < 1) la++;
    while (rb > la && s[rb] < 1) rb--;
    return [la, rb];
  });
}

function tightBox(mask, width, height, x0, x1, y0, y1) {
  let minX = x1,
    maxX = x0,
    minY = y1,
    maxY = y0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  return { minX, maxX, minY, maxY };
}

async function writePiece(data, width, height, channels, box, destName) {
  const left = Math.max(0, box.minX - PAD);
  const top = Math.max(0, box.minY - PAD);
  const right = Math.min(width - 1, box.maxX + PAD);
  const bottom = Math.min(height - 1, box.maxY + PAD);
  const cw = right - left + 1;
  const ch = bottom - top + 1;
  const out = Buffer.alloc(cw * ch * 4);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((top + y) * width + (left + x)) * channels;
      const oi = (y * cw + x) * 4;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      const a = data[si + 3];
      if (isBg(r, g, b, a)) {
        out[oi + 3] = 0;
        continue;
      }
      const lum = (r + g + b) / 3;
      let alpha = a;
      if (lum > 228 && Math.max(r, g, b) - Math.min(r, g, b) < 22) {
        alpha = Math.round(Math.max(0, ((255 - lum) / (255 - 228)) * 200));
      }
      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = alpha;
    }
  }

  const rawPath = join(SOURCE, "forge", `${destName}.png`);
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile(rawPath);

  const scale = Math.min((CANVAS - 20) / cw, (CANVAS - 16) / ch);
  const tw = Math.max(1, Math.round(cw * scale));
  const th = Math.max(1, Math.round(ch * scale));
  const resized = await sharp(rawPath).resize(tw, th, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
  const leftPad = Math.round((CANVAS - tw) / 2);
  const topPad = Math.max(0, CANVAS - th - 6);

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: leftPad, top: topPad }])
    .png()
    .toFile(join(OUT, `${destName}.png`));

  console.log("wrote", destName, `${cw}x${ch}`);
}

async function extractSheet(srcPath, colorPrefix) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const mask = contentMask(data, width, height, channels);
  const { top, bot } = findBands(mask, width, height);
  console.log(colorPrefix, "bands", { top, bot });

  const topCol = bandCols(mask, width, height, top[0], top[1]);
  const topSegs = splitN(topCol, 5);
  const kinds = ["K", "Q", "B", "R", "N"];
  for (let i = 0; i < 5; i++) {
    const [x0, x1] = topSegs[i];
    const box = tightBox(mask, width, height, x0, x1, top[0], top[1]);
    if (!box) {
      console.error("missing", colorPrefix + kinds[i]);
      continue;
    }
    await writePiece(data, width, height, channels, box, colorPrefix + kinds[i]);
  }

  const botCol = bandCols(mask, width, height, bot[0], bot[1]);
  const pawnSegs = splitN(botCol, colorPrefix === "b" ? 9 : 8);
  // pick a middle pawn
  const pIdx = Math.floor(pawnSegs.length / 2);
  const [px0, px1] = pawnSegs[pIdx];
  const pbox = tightBox(mask, width, height, px0, px1, bot[0], bot[1]);
  if (pbox) await writePiece(data, width, height, channels, pbox, colorPrefix + "P");
  else console.error("missing pawn", colorPrefix);
}

await extractSheet(join(SOURCE, "sheet-forge-white.png"), "w");
await extractSheet(join(SOURCE, "sheet-forge-black.png"), "b");
console.log("done");
