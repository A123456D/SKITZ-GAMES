/**
 * Force transparent backgrounds on all Paper Riot sprites.
 * Flood-fills near-black (and near light-gray) from edges → alpha 0,
 * then cleans leftover black crumbs outside the sticker silhouette.
 */
import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DIRS = [
  "public/stickers",
  "public/obstacles",
  "public/powerups",
  "public/fx",
  "public/particles",
];

function isBlackish(r, g, b, a) {
  if (a < 8) return true;
  // Near-black sheet / leftover fill
  return r <= 28 && g <= 28 && b <= 28;
}

function isLightBg(r, g, b, a) {
  if (a < 8) return true;
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= 185 && spread <= 28;
}

async function scrubFile(path, mode = "dark") {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const buf = Buffer.from(data);
  const n = w * h;
  const seen = new Uint8Array(n);

  const isBg = (i) => {
    const o = i * 4;
    const r = buf[o];
    const g = buf[o + 1];
    const b = buf[o + 2];
    const a = buf[o + 3];
    return mode === "light" ? isLightBg(r, g, b, a) : isBlackish(r, g, b, a);
  };

  const qx = new Int32Array(n);
  const qy = new Int32Array(n);
  let qs = 0;
  let qe = 0;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i]) return;
    if (!isBg(i)) return;
    seen[i] = 1;
    buf[i * 4 + 3] = 0;
    qx[qe] = x;
    qy[qe] = y;
    qe++;
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (qs < qe) {
    const x = qx[qs];
    const y = qy[qs];
    qs++;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Second pass: any remaining near-black fully enclosed islands that are tiny
  // (noise) — skip large islands that might be intentional black art (bomb body
  // is black but won't touch edges after first pass if bordered by white).
  // Also punch through soft anti-aliased black fringe near transparent.
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = buf[o + 3];
    if (a === 0) continue;
    const r = buf[o];
    const g = buf[o + 1];
    const b = buf[o + 2];
    // Soft fringe: mostly black + low alpha
    if (a < 40 && r < 40 && g < 40 && b < 40) {
      buf[o + 3] = 0;
      continue;
    }
  }

  // Trim to opaque bounding box with small pad
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (buf[(y * w + x) * 4 + 3] < 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    console.warn(`  empty after scrub: ${path}`);
    return;
  }
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const side = Math.max(tw, th);
  const out = Buffer.alloc(side * side * 4, 0);
  const ox = Math.floor((side - tw) / 2);
  const oy = Math.floor((side - th) / 2);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const src = ((minY + y) * w + (minX + x)) * 4;
      const dst = ((oy + y) * side + (ox + x)) * 4;
      out[dst] = buf[src];
      out[dst + 1] = buf[src + 1];
      out[dst + 2] = buf[src + 2];
      out[dst + 3] = buf[src + 3];
    }
  }

  const target = Math.min(256, Math.max(side, 128));
  await sharp(out, { raw: { width: side, height: side, channels: 4 } })
    .resize(target, target, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path);
}

async function main() {
  for (const dir of DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    const files = readdirSync(abs).filter((f) => f.endsWith(".png"));
    console.log(`${dir}: ${files.length} pngs`);
    for (const f of files) {
      const mode = dir.includes("fx") && f.startsWith("match-") ? "light" : "dark";
      await scrubFile(join(abs, f), mode);
      console.log(`  scrubbed ${f}`);
    }
  }
  console.log("Done — all sprites should be transparent outside the sticker.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
