import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { buildCardFacePrompt, type ArtCard } from "./cardFacePrompt.mts";

const ROOT = new URL("..", import.meta.url);
const MANIFEST = JSON.parse(
  readFileSync(new URL("./art-manifest.json", import.meta.url), "utf8"),
) as ArtCard[];

const CURSOR_ASSETS = join(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/c-Users-PC-Projects-SHIFTR-oculum/assets",
);
const OUT = join(ROOT.pathname.replace(/^\//, "").replace(/\//g, "\\").includes(":") 
  ? // windows URL path
    decodeURIComponent(new URL("../public/assets/cards", import.meta.url).pathname.replace(/^\//, ""))
  : new URL("../public/assets/cards", import.meta.url).pathname);

function cardsDir(): string {
  return new URL("../public/assets/cards/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}

const ids = process.argv.slice(2);
const want = ids.length ? MANIFEST.filter((c) => ids.includes(c.id)) : MANIFEST;

if (process.argv.includes("--prompts")) {
  for (const c of want) {
    console.log("\n===", c.id, "===\n");
    console.log(buildCardFacePrompt(c));
  }
  process.exit(0);
}

mkdirSync(cardsDir(), { recursive: true });

async function installOne(id: string): Promise<void> {
  const candidates = [
    join(CURSOR_ASSETS, `${id}.png`),
    join(CURSOR_ASSETS, `${id}.jpg`),
    join(cardsDir(), `${id}.png`),
  ];
  const src = candidates.find((p) => existsSync(p));
  if (!src) {
    console.error("MISSING", id);
    return;
  }
  const pngOut = join(cardsDir(), `${id}.png`);
  const jpgOut = join(cardsDir(), `${id}.jpg`);
  const buf = await sharp(src)
    .resize({ width: 768, height: 1024, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();
  await sharp(buf).toFile(pngOut);
  await sharp(buf).jpeg({ quality: 88 }).toFile(jpgOut);
  console.log("OK", id);
}

for (const c of want) {
  await installOne(c.id);
}
