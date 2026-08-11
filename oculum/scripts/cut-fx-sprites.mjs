/**
 * Chroma-key magenta, tight-crop, resize OCULUM FX sprites.
 */
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.resolve(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-PC-Projects-SHIFTR-oculum/assets",
);
const outDir = path.join(root, "public/assets/ui/fx");

const JOBS = [
  { in: "sprite-toll-bell.png", out: "toll-bell.png", size: 128 },
  { in: "sprite-wager-coin.png", out: "wager-coin.png", size: 128 },
  { in: "sprite-wager-cash.png", out: "wager-cash.png", size: 128 },
  { in: "sprite-wager-bust.png", out: "wager-bust.png", size: 128 },
  { in: "sprite-stain-drip.png", out: "stain-drip.png", size: 112 },
  { in: "sprite-halo-aureole.png", out: "halo-aureole.png", size: 128 },
];

function isMagenta(r, g, b) {
  // Magenta key + near-magenta fringes from gen
  return r > 160 && b > 160 && g < 140 && r + b - 2 * g > 120;
}

function keyAndCrop(png) {
  const { width, height, data } = png;
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) << 2;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 8 || isMagenta(r, g, b)) {
        out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
        continue;
      }
      // Soft fringe: pull alpha down near magenta
      let alpha = a;
      if (r > 140 && b > 140 && g < 160) {
        const mag = Math.min(255, (r + b - 2 * g) / 2);
        alpha = Math.max(0, a - mag);
      }
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = alpha;
      if (alpha > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) throw new Error("empty after key");
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((minY + y) * width + (minX + x)) << 2;
      const di = (y * cw + x) << 2;
      cropped.data[di] = out[si];
      cropped.data[di + 1] = out[si + 1];
      cropped.data[di + 2] = out[si + 2];
      cropped.data[di + 3] = out[si + 3];
    }
  }
  return cropped;
}

/** Nearest-neighbor-ish bilinear resize keeping alpha. */
function resize(png, size) {
  const scale = size / Math.max(png.width, png.height);
  const tw = Math.max(1, Math.round(png.width * scale));
  const th = Math.max(1, Math.round(png.height * scale));
  const out = new PNG({ width: tw, height: th });
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = ((x + 0.5) / tw) * png.width - 0.5;
      const sy = ((y + 0.5) / th) * png.height - 0.5;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(png.width - 1, x0 + 1);
      const y1 = Math.min(png.height - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const sample = (ix, iy) => {
        const i = (iy * png.width + ix) << 2;
        return [
          png.data[i],
          png.data[i + 1],
          png.data[i + 2],
          png.data[i + 3],
        ];
      };
      const p00 = sample(Math.max(0, x0), Math.max(0, y0));
      const p10 = sample(x1, Math.max(0, y0));
      const p01 = sample(Math.max(0, x0), y1);
      const p11 = sample(x1, y1);
      const lerp = (a, b, t) => a + (b - a) * t;
      const di = (y * tw + x) << 2;
      for (let c = 0; c < 4; c++) {
        const v = lerp(
          lerp(p00[c], p10[c], fx),
          lerp(p01[c], p11[c], fx),
          fy,
        );
        out.data[di + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  }
  return out;
}

fs.mkdirSync(outDir, { recursive: true });

for (const job of JOBS) {
  const inPath = path.join(srcDir, job.in);
  const raw = PNG.sync.read(fs.readFileSync(inPath));
  const cropped = keyAndCrop(raw);
  const sized = resize(cropped, job.size);
  const outPath = path.join(outDir, job.out);
  fs.writeFileSync(outPath, PNG.sync.write(sized));
  console.log(
    `${job.out}: ${raw.width}x${raw.height} -> ${sized.width}x${sized.height} (${fs.statSync(outPath).size}b)`,
  );
}
