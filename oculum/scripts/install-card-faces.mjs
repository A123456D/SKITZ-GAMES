import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const SRC = join(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/c-Users-PC-Projects-SHIFTR-oculum/assets",
);
const OUT = join(process.cwd(), "public/assets/cards");
mkdirSync(OUT, { recursive: true });

/** Match OG faces + UI aspect-ratio 2/3 (not 3:4). */
const TARGET_W = 768;
const TARGET_H = 1152;

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Usage: node scripts/install-card-faces.mjs <id>...");
  process.exit(1);
}

for (const id of ids) {
  const src = [join(SRC, `${id}.png`), join(SRC, `${id}.jpg`)].find((p) => existsSync(p));
  if (!src) {
    console.error("MISSING", id, "in", SRC);
    continue;
  }
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h || w >= h) {
    console.error(
      "REJECT",
      id,
      `${w}x${h}`,
      "— not portrait (width must be < height). Re-generate with aspect_ratio 3:4.",
    );
    process.exitCode = 1;
    continue;
  }
  // Cover into 2:3 — from 3:4 sources this crops sides slightly, keeps full height/frame.
  const buf = await sharp(src)
    .resize({ width: TARGET_W, height: TARGET_H, fit: "cover", position: "centre" })
    .png({ compressionLevel: 8 })
    .toBuffer();
  await sharp(buf).toFile(join(OUT, `${id}.png`));
  await sharp(buf).jpeg({ quality: 88 }).toFile(join(OUT, `${id}.jpg`));
  console.log("OK", id, `${w}x${h} → ${TARGET_W}x${TARGET_H} (2:3)`);
}
