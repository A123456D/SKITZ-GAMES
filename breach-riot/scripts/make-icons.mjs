import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

function iconSvg(size) {
  const pad = Math.round(size * 0.08);
  const inner = size - pad * 2;
  const cx = size / 2;
  const fontMain = Math.round(size * 0.16);
  const fontSub = Math.round(size * 0.18);
  const fontHex = Math.round(size * 0.07);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.12)}" fill="#0d1110"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${Math.round(size * 0.08)}" fill="#151c19" stroke="#9dffb0" stroke-width="${Math.max(4, Math.round(size * 0.02))}"/>
  <text x="${cx}" y="${Math.round(size * 0.42)}" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="${fontMain}" font-weight="800" fill="#e8f0ea">BREACH</text>
  <text x="${cx}" y="${Math.round(size * 0.58)}" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="${fontSub}" font-weight="800" fill="#9dffb0">RIOT</text>
  <text x="${cx}" y="${Math.round(size * 0.78)}" text-anchor="middle" font-family="monospace" font-size="${fontHex}" font-weight="700" fill="#ff6b4a">1C 55 7A</text>
</svg>`;
}

async function writeIcon(size, name) {
  const png = await sharp(Buffer.from(iconSvg(size))).png().toBuffer();
  const dest = join(outDir, name);
  writeFileSync(dest, png);
  console.log(`Wrote ${dest} (${png.length} bytes)`);
}

await writeIcon(192, "icon-192.png");
await writeIcon(512, "icon-512.png");
