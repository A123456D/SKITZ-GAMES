import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seal = join(root, "public", "assets", "ui", "seal-eye.png");
const outDir = join(root, "public");
mkdirSync(outDir, { recursive: true });

async function writeIcon(size, name) {
  const png = await sharp(seal)
    .resize(size, size, { fit: "contain", background: { r: 18, g: 14, b: 24, alpha: 1 } })
    .flatten({ background: { r: 18, g: 14, b: 24 } })
    .png()
    .toBuffer();
  const dest = join(outDir, name);
  writeFileSync(dest, png);
  console.log(`Wrote ${dest} (${png.length} bytes)`);
}

await writeIcon(192, "icon-192.png");
await writeIcon(512, "icon-512.png");
