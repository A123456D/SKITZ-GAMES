/**
 * Extract crown + X from the full Nexus logo (full crown tips, no side clip).
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const logoPath = join(root, "public", "logo.png");
const dest = join(root, "public", "themes", "nexus", "nexus-mark.png");

// Crown tips span ~165–265; X letter ~177–254. Pad so tips are never clipped.
const LEFT = 158;
const TOP = 14;
const RIGHT = 272; // exclusive-ish via width
const BOTTOM = 182;
const WIDTH = RIGHT - LEFT;
const HEIGHT = BOTTOM - TOP;

// In the word band, keep only the X columns (drop E / U bleed)
const X_LEFT = 174 - LEFT;
const X_RIGHT = 257 - LEFT;
const WORD_Y0 = 102 - TOP;

const { data, info } = await sharp(logoPath)
  .extract({ left: LEFT, top: TOP, width: WIDTH, height: HEIGHT })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

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

    // Strip neighboring letters under the crown tips
    if (y >= WORD_Y0 && (x < X_LEFT || x > X_RIGHT)) {
      out[oi + 3] = 0;
      continue;
    }

    if (a < 24 || lum < 36) {
      out[oi + 3] = 0;
      continue;
    }

    const alpha = Math.min(255, Math.round(((lum - 36) / (255 - 36)) * a));
    out[oi] = 255;
    out[oi + 1] = 255;
    out[oi + 2] = 255;
    out[oi + 3] = alpha;

    if (alpha > 12) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

const PAD = 6;
const left = Math.max(0, minX - PAD);
const top = Math.max(0, minY - PAD);
const cropW = Math.min(width - 1, maxX + PAD) - left + 1;
const cropH = Math.min(height - 1, maxY + PAD) - top + 1;

await sharp(out, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropW, height: cropH })
  .png()
  .toFile(dest);

console.log(`nexus-mark ${cropW}x${cropH} (crown tips preserved) → ${dest}`);
