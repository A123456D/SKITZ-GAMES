/**
 * Knock out black backgrounds on nexus-mark + ability icons,
 * tight-crop, write transparent PNGs for board paint / HUD.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const THRESH = 28;
const PAD = 8;

async function knockOutBlack(srcPath, destPath, { forceWhite = false, pad = PAD } = {}) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const lum = (r + g + b) / 3;
      // Near-black OR already transparent
      if (lum <= THRESH || out[i + 3] < 8) {
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
        out[i + 3] = 0;
        continue;
      }

      if (forceWhite) {
        const a = Math.min(255, Math.round(((lum - THRESH) / (255 - THRESH)) * 255));
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
        out[i + 3] = a;
        if (a <= 8) continue;
      } else {
        // Soften near-black fringe into alpha; keep cyan/white color
        if (lum < THRESH + 40) {
          const a = Math.min(out[i + 3], Math.round(((lum - THRESH) / 40) * 255));
          out[i + 3] = a;
          if (a <= 8) continue;
        }
      }

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX) {
    console.error("No content:", srcPath);
    return;
  }

  // Drop thin 1px center artifact lines (common extraction glitch)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (out[i + 3] < 40) continue;
      const leftA = x > 0 ? out[((y * width + (x - 1)) * channels) + 3] : 0;
      const rightA = x < width - 1 ? out[((y * width + (x + 1)) * channels) + 3] : 0;
      const upA = y > 0 ? out[(((y - 1) * width + x) * channels) + 3] : 0;
      const downA = y < height - 1 ? out[(((y + 1) * width + x) * channels) + 3] : 0;
      // Isolated vertical hairline
      if (leftA < 20 && rightA < 20 && (upA > 40 || downA > 40)) {
        const lum = (out[i] + out[i + 1] + out[i + 2]) / 3;
        if (lum > 180 && out[i + 3] < 200) {
          out[i + 3] = 0;
        }
      }
    }
  }

  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);
  const cropW = right - left + 1;
  const cropH = bottom - top + 1;

  await sharp(out, { raw: { width, height, channels } })
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toFile(destPath);

  console.log(`→ ${destPath} (${cropW}x${cropH})`);
}

const markSrc = join(root, "public", "themes", "nexus", "nexus-mark.png");
await knockOutBlack(markSrc, markSrc, { forceWhite: true, pad: 12 });

for (const id of ["aegis", "overdrive", "swap"]) {
  const p = join(root, "public", "themes", "nexus", "abilities", `${id}.png`);
  await knockOutBlack(p, p, { forceWhite: false, pad: 10 });
}

console.log("done");
