/**
 * Remove black background from the NEXUS logo and tight-crop to content.
 * Uses sharp from the sibling riot-cube install (no local dep required).
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const src = join(root, "public", "logo-source.png");
const dest = join(root, "public", "logo.png");

const THRESH = 22; // near-black → transparent
const PAD = 16;

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const out = Buffer.from(data);

let minX = width,
  minY = height,
  maxX = 0,
  maxY = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const lum = (out[i] + out[i + 1] + out[i + 2]) / 3;

    if (lum <= THRESH) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 0;
    } else {
      // Pure white glyph with luminance-based soft edge alpha
      const a = Math.min(255, Math.round(((lum - THRESH) / (255 - THRESH)) * 255));
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = a;
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
}

if (maxX < minX) {
  console.error("No logo content found");
  process.exit(1);
}

const left = Math.max(0, minX - PAD);
const top = Math.max(0, minY - PAD);
const right = Math.min(width - 1, maxX + PAD);
const bottom = Math.min(height - 1, maxY + PAD);
const cropW = right - left + 1;
const cropH = bottom - top + 1;

await sharp(out, { raw: { width, height, channels } })
  .extract({ left, top, width: cropW, height: cropH })
  .png()
  .toFile(dest);

console.log(`Cropped logo → ${cropW}x${cropH} (pad ${PAD}), saved ${dest}`);
