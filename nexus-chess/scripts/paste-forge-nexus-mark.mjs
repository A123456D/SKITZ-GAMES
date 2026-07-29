/**
 * Cover the wrong center etching on Forge board and paste the real Nexus crown+X mark.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const BOARD = join(root, "public", "themes", "forge", "board.png");
const MARK = join(root, "public", "themes", "nexus", "nexus-mark.png");
const BACKUP = join(root, "assets", "source", "forge-v2", "board-before-mark.png");

mkdirSync(join(root, "assets", "source", "forge-v2"), { recursive: true });
copyFileSync(BOARD, BACKUP);

const meta = await sharp(BOARD).metadata();
const W = meta.width;
const H = meta.height;
// Center 2×2 of an 8×8 board ≈ middle 25% with a bit of padding for the mark
const zone = Math.round(Math.min(W, H) * 0.28);
const left = Math.round((W - zone) / 2);
const top = Math.round((H - zone) / 2);

// Sample a dark metal patch from outside the center (upper light-tile area) and soft-cover the old etching
const patchSize = Math.round(zone * 0.55);
const sampleLeft = Math.round(W * 0.18);
const sampleTop = Math.round(H * 0.18);
const cover = await sharp(BOARD)
  .extract({ left: sampleLeft, top: sampleTop, width: patchSize, height: patchSize })
  .resize(zone, zone, { fit: "fill" })
  .blur(2.2)
  .modulate({ brightness: 0.72, saturation: 0.85 })
  .ensureAlpha()
  .png()
  .toBuffer();

// Soft radial alpha so the cover blends into surrounding tiles
const coverRaw = await sharp(cover).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = coverRaw;
const cx = info.width / 2;
const cy = info.height / 2;
const rMax = Math.min(cx, cy) * 0.98;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const d = Math.hypot(x - cx, y - cy) / rMax;
    const a = d >= 1 ? 0 : Math.round(255 * Math.pow(1 - d, 1.35) * 0.92);
    data[i + 3] = Math.min(data[i + 3], a);
  }
}
const coverSoft = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

// Prepare mark: white logo on transparent, sized to ~72% of zone
const markH = Math.round(zone * 0.72);
const markMeta = await sharp(MARK).metadata();
const markAspect = (markMeta.width || 1) / Math.max(1, markMeta.height || 1);
const markW = Math.round(markH * markAspect);
const markBase = await sharp(MARK)
  .resize(markW, markH, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Tint mark: soft cyan-white with a touch of crimson in lower half (forge dual energy)
const md = Buffer.from(markBase.data);
const mw = markBase.info.width;
const mh = markBase.info.height;
for (let y = 0; y < mh; y++) {
  for (let x = 0; x < mw; x++) {
    const i = (y * mw + x) * 4;
    const a = md[i + 3];
    if (a < 8) continue;
    const t = y / mh;
    // Upper: cool cyan, lower: soft rose — stays readable, not neon
    const r = Math.round(180 + 40 * t);
    const g = Math.round(210 - 70 * t);
    const b = Math.round(230 - 40 * t);
    md[i] = r;
    md[i + 1] = g;
    md[i + 2] = b;
    md[i + 3] = Math.round(a * 0.78);
  }
}
const markTinted = await sharp(md, { raw: { width: mw, height: mh, channels: 4 } })
  .png()
  .toBuffer();

const markLeft = Math.round((W - mw) / 2);
const markTop = Math.round((H - mh) / 2) - Math.round(zone * 0.02);

const OUT_TMP = join(root, "assets", "source", "forge-v2", "board-with-mark.png");

await sharp(BOARD)
  .composite([
    { input: coverSoft, left, top, blend: "over" },
    { input: markTinted, left: markLeft, top: markTop, blend: "screen" },
    {
      input: await sharp(markTinted).linear(0.55, 0).png().toBuffer(),
      left: markLeft,
      top: markTop,
      blend: "soft-light",
    },
  ])
  .png()
  .toFile(OUT_TMP);

copyFileSync(OUT_TMP, BOARD);
console.log(`Forge board updated: covered center + pasted Nexus mark (${mw}x${mh})`);
