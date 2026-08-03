/**
 * Process premium card art layers → public/assets/cards/layers/{id}/
 * - bg.jpg
 * - subject.png (passthrough / light cleanup)
 * - fx.png (magenta chroma key)
 * Also refreshes flat {id}.jpg composite for board/WebGL.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const RAW = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-PC-Projects-SHIFTR-oculum/assets",
);
const OUT_CARDS = path.join(ROOT, "public/assets/cards");

const IDS = ["iris_heliograph", "verdant_cataract", "split_gaze_seraph"];
const W = 680;
const H = 1020;

async function chromaMagentaToAlpha(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize(W, H, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const magenta = r > 160 && b > 140 && g < 140 && r + b > g * 2.2;
    const nearWhiteMagenta = r > 200 && b > 180 && g > 100 && g < 200 && r > g + 30;
    if (magenta || nearWhiteMagenta) {
      const chrom = (r + b) / 2 - g;
      const a = Math.max(0, Math.min(255, 255 - (chrom - 40) * 3));
      out[i + 3] = magenta ? 0 : a;
      if (magenta) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
      }
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function processId(id) {
  const dir = path.join(OUT_CARDS, "layers", id);
  fs.mkdirSync(dir, { recursive: true });

  const bgRaw = path.join(RAW, `${id}-bg.png`);
  const subRaw = path.join(RAW, `${id}-subject.png`);
  const fxRaw = path.join(RAW, `${id}-fx.png`);

  await sharp(bgRaw).resize(W, H, { fit: "cover" }).jpeg({ quality: 88 }).toFile(path.join(dir, "bg.jpg"));

  // Subject: keep as PNG cover (may include its own ground plane — still parallaxes vs bg)
  await sharp(subRaw).resize(W, H, { fit: "cover" }).png().toFile(path.join(dir, "subject.png"));

  const fxBuf = await chromaMagentaToAlpha(await fs.promises.readFile(fxRaw));
  await fs.promises.writeFile(path.join(dir, "fx.png"), fxBuf);

  // Flat composite for board
  const flat = await sharp(path.join(dir, "bg.jpg"))
    .composite([
      { input: path.join(dir, "subject.png"), blend: "over" },
      { input: path.join(dir, "fx.png"), blend: "screen" },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
  await fs.promises.writeFile(path.join(OUT_CARDS, `${id}.jpg`), flat);
  // Keep png in sync lightly
  await sharp(flat).png().toFile(path.join(OUT_CARDS, `${id}.png`));

  console.log("ok", id);
}

for (const id of IDS) await processId(id);
console.log("done");
