/**
 * Re-extract Forge pieces with clean alpha (no white paper fringe).
 * Preserves metallic speculars; only knocks out sheet paper + base shadows.
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
const PAD = 4;

mkdirSync(OUT, { recursive: true });
mkdirSync(join(SOURCE, "forge"), { recursive: true });

function lumChroma(r, g, b) {
  const lum = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return { lum, chroma };
}

/** Pure sheet paper — safe to flood from edges. */
function isHardPaper(r, g, b, a) {
  if (a < 8) return true;
  const { lum, chroma } = lumChroma(r, g, b);
  return (lum >= 250 && chroma < 40) || (lum >= 242 && chroma < 22);
}

/** Soft gray drop-shadow under bases (only used in bottom band). */
function isBaseShadow(r, g, b, a) {
  if (a < 8) return true;
  const { lum, chroma } = lumChroma(r, g, b);
  return lum >= 155 && lum < 250 && chroma < 18;
}

function isContentForSeg(r, g, b, a) {
  if (a < 8) return false;
  return !isHardPaper(r, g, b, a);
}

function contentMask(data, width, height, channels) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isContentForSeg(data[i], data[i + 1], data[i + 2], data[i + 3])) mask[y * width + x] = 1;
    }
  }
  return mask;
}

function bandCols(mask, width, height, y0, y1) {
  const col = new Float64Array(width);
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < width; x++) if (mask[y * width + x]) col[x]++;
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
  const sorted = bands.slice().sort((a, b) => a[0] - b[0]);
  return { top: sorted[0], bot: sorted[1] || sorted[0] };
}

function splitN(col, n, minGap = 6) {
  const width = col.length;
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
  let L = 0,
    R = width - 1;
  while (L < width && s[L] < 1) L++;
  while (R > L && s[R] < 1) R--;

  const valleys = [];
  for (let x = L + minGap; x <= R - minGap; x++) {
    if (s[x] <= s[x - 1] && s[x] <= s[x + 1]) {
      const leftMax = Math.max(...s.slice(Math.max(L, x - 40), x));
      const rightMax = Math.max(...s.slice(x + 1, Math.min(R, x + 40) + 1));
      const depth = Math.min(leftMax, rightMax) - s[x];
      if (depth > 2 || s[x] < 8) valleys.push({ x, depth: depth + (s[x] < 3 ? 50 : 0), val: s[x] });
    }
  }
  valleys.sort((a, b) => b.depth - a.depth || a.val - b.val);
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
      segs.push([L + Math.round((span * i) / n), L + Math.round((span * (i + 1)) / n) - 1]);
    }
    return segs;
  }
  const cuts = [L, ...picks, R + 1];
  const segs = [];
  for (let i = 0; i < n; i++) {
    segs.push([cuts[i] + (i === 0 ? 0 : 1), cuts[i + 1] - (i === n - 1 ? 0 : 1)]);
  }
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

function flood(out, cw, ch, pred, seedBottomOnly = false) {
  const seen = new Uint8Array(cw * ch);
  const stack = [];
  const trySeed = (x, y) => {
    const i = y * cw + x;
    const oi = i * 4;
    if (pred(out[oi], out[oi + 1], out[oi + 2], out[oi + 3], x, y)) {
      seen[i] = 1;
      stack.push(i);
    }
  };
  if (seedBottomOnly) {
    for (let x = 0; x < cw; x++) trySeed(x, ch - 1);
    for (let y = Math.floor(ch * 0.7); y < ch; y++) {
      trySeed(0, y);
      trySeed(cw - 1, y);
    }
  } else {
    for (let x = 0; x < cw; x++) {
      trySeed(x, 0);
      trySeed(x, ch - 1);
    }
    for (let y = 0; y < ch; y++) {
      trySeed(0, y);
      trySeed(cw - 1, y);
    }
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % cw;
    const y = (i / cw) | 0;
    const oi = i * 4;
    out[oi] = 0;
    out[oi + 1] = 0;
    out[oi + 2] = 0;
    out[oi + 3] = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const ni = ny * cw + nx;
      if (seen[ni]) continue;
      const noi = ni * 4;
      if (!pred(out[noi], out[noi + 1], out[noi + 2], out[noi + 3], nx, ny)) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
}

function cleanAlpha(out, cw, ch) {
  // 1) Knock out hard paper from all edges
  flood(out, cw, ch, (r, g, b, a) => isHardPaper(r, g, b, a), false);

  // 2) Knock out soft base shadows from bottom only
  flood(
    out,
    cw,
    ch,
    (r, g, b, a, _x, y) => y >= ch * 0.62 && isBaseShadow(r, g, b, a),
    true,
  );

  // 3) Edge despill — remove whitish rim hugging transparency (keep interior speculars)
  for (let pass = 0; pass < 2; pass++) {
    const next = Buffer.from(out);
    for (let y = 1; y < ch - 1; y++) {
      for (let x = 1; x < cw - 1; x++) {
        const oi = (y * cw + x) * 4;
        if (out[oi + 3] < 8) continue;
        let tN = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (out[((y + dy) * cw + (x + dx)) * 4 + 3] < 8) tN++;
          }
        }
        if (tN === 0) continue;
        const { lum, chroma } = lumChroma(out[oi], out[oi + 1], out[oi + 2]);
        // Whitish fringe against empty
        if (tN >= 3 && lum > 195 && chroma < 45) {
          next[oi + 3] = 0;
        } else if (tN >= 2 && lum > 230 && chroma < 50) {
          next[oi + 3] = 0;
        } else if (tN >= 4 && lum > 170 && chroma < 30) {
          next[oi + 3] = 0;
        } else if (tN >= 1 && lum > 248 && chroma < 35) {
          next[oi + 3] = 0;
        } else if (tN >= 2 && lum > 210 && chroma < 28) {
          // Partial alpha fringe
          next[oi + 3] = Math.min(out[oi + 3], Math.round(((250 - lum) / 40) * 180));
        }
      }
    }
    out.set(next);
  }

  // 4) Zero RGB on transparent; strip soft paper halo on edges (keep solid speculars)
  for (let pass = 0; pass < 3; pass++) {
    const next = Buffer.from(out);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const oi = (y * cw + x) * 4;
        if (out[oi + 3] < 8) {
          next[oi] = next[oi + 1] = next[oi + 2] = next[oi + 3] = 0;
          continue;
        }
        let tN = 0;
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
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || out[(ny * cw + nx) * 4 + 3] < 8) tN++;
        }
        if (!tN) continue;
        const a = out[oi + 3];
        const { lum, chroma } = lumChroma(out[oi], out[oi + 1], out[oi + 2]);
        if (a < 220 && lum > 140 && chroma < 55) {
          next[oi + 3] = 0;
          continue;
        }
        if (a < 180 && lum > 120 && chroma < 45) {
          next[oi + 3] = 0;
          continue;
        }
        if (tN >= 3 && lum > 170 && chroma < 50) {
          next[oi + 3] = 0;
          continue;
        }
        if (tN >= 2 && lum > 200 && chroma < 60) {
          next[oi + 3] = 0;
          continue;
        }
        if (lum > 160 && chroma < 45) {
          const k = Math.min(0.7, (lum - 140) / 100);
          next[oi] = Math.round(out[oi] * (1 - k));
          next[oi + 1] = Math.round(out[oi + 1] * (1 - k));
          next[oi + 2] = Math.round(out[oi + 2] * (1 - k));
          next[oi + 3] = Math.min(a, Math.round(255 * (1 - k * 0.5)));
        }
      }
    }
    out.set(next);
  }

  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 8) out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
  }
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
      out[oi] = data[si];
      out[oi + 1] = data[si + 1];
      out[oi + 2] = data[si + 2];
      out[oi + 3] = data[si + 3];
    }
  }

  cleanAlpha(out, cw, ch);

  let minX = cw,
    minY = ch,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (out[(y * cw + x) * 4 + 3] < 10) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) {
    console.error("empty", destName);
    return;
  }

  const cl = Math.max(0, minX - 1);
  const ct = Math.max(0, minY - 1);
  const cr = Math.min(cw - 1, maxX + 1);
  const cb = Math.min(ch - 1, maxY + 1);
  const fw = cr - cl + 1;
  const fh = cb - ct + 1;
  const final = Buffer.alloc(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const si = ((ct + y) * cw + (cl + x)) * 4;
      const oi = (y * fw + x) * 4;
      final[oi] = out[si];
      final[oi + 1] = out[si + 1];
      final[oi + 2] = out[si + 2];
      final[oi + 3] = out[si + 3];
    }
  }

  const rawPath = join(SOURCE, "forge", `${destName}.png`);
  await sharp(final, { raw: { width: fw, height: fh, channels: 4 } }).png().toFile(rawPath);

  const scale = Math.min((CANVAS - 28) / fw, (CANVAS - 24) / fh);
  const tw = Math.max(1, Math.round(fw * scale));
  const th = Math.max(1, Math.round(fh * scale));
  const resized = await sharp(rawPath)
    .resize(tw, th, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rd = Buffer.from(resized.data);
  cleanAlpha(rd, resized.info.width, resized.info.height);

  const leftPad = Math.round((CANVAS - tw) / 2);
  const topPad = Math.max(0, CANVAS - th - 10);
  const canvas = Buffer.alloc(CANVAS * CANVAS * 4);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const si = (y * tw + x) * 4;
      if (rd[si + 3] < 8) continue;
      const dx = leftPad + x;
      const dy = topPad + y;
      if (dx < 0 || dy < 0 || dx >= CANVAS || dy >= CANVAS) continue;
      const oi = (dy * CANVAS + dx) * 4;
      canvas[oi] = rd[si];
      canvas[oi + 1] = rd[si + 1];
      canvas[oi + 2] = rd[si + 2];
      canvas[oi + 3] = rd[si + 3];
    }
  }

  await sharp(canvas, { raw: { width: CANVAS, height: CANVAS, channels: 4 } })
    .png()
    .toFile(join(OUT, `${destName}.png`));

  console.log("wrote", destName, `${fw}x${fh}`);
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
  const pIdx = Math.floor(pawnSegs.length / 2);
  const [px0, px1] = pawnSegs[pIdx];
  const pbox = tightBox(mask, width, height, px0, px1, bot[0], bot[1]);
  if (pbox) await writePiece(data, width, height, channels, pbox, colorPrefix + "P");
  else console.error("missing pawn", colorPrefix);
}

await extractSheet(join(SOURCE, "sheet-forge-white.png"), "w");
await extractSheet(join(SOURCE, "sheet-forge-black.png"), "b");
console.log("done");
