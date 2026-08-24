import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGameSw } from "../../scripts/skitz-game-sw.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const dest = join(root, "..", "website", "public", "games", "oculum", "web");
/** Fresh path with no prior SW scope — escape hatch when Android pins /web/. */
const destFresh = join(root, "..", "website", "public", "games", "oculum", "b9");
const siteImg = join(root, "..", "website", "public", "images", "oculum-seal.png");
const seal = join(root, "public", "assets", "ui", "seal-eye.png");
/** Bump on every meaningful ship so activate drops stale shells. */
const SW_CACHE = "oculum-v36";
const BUST = "36";

if (!existsSync(dist)) {
  console.error("Missing dist/ — run npm run build first");
  process.exit(1);
}

function mirrorDist(target) {
  mkdirSync(dirname(target), { recursive: true });
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(dist, target, { recursive: true });
}

/** Drop redundant full-face PNGs when JPG exists — halves OCULUM deploy weight. */
function stripRedundantCardPngs(target) {
  const cards = join(target, "assets", "cards");
  if (!existsSync(cards)) return 0;
  let n = 0;
  for (const name of readdirSync(cards)) {
    if (!name.endsWith(".png")) continue;
    const base = name.slice(0, -4);
    if (!existsSync(join(cards, `${base}.jpg`))) continue;
    unlinkSync(join(cards, name));
    n += 1;
  }
  return n;
}

mirrorDist(dest);
mirrorDist(destFresh);
const stripped = stripRedundantCardPngs(dest) + stripRedundantCardPngs(destFresh);

if (existsSync(seal)) {
  mkdirSync(dirname(siteImg), { recursive: true });
  cpSync(seal, siteImg);
}

const offlineSw = buildGameSw({
  cacheName: SW_CACHE,
  label: "OCULUM",
  skipPathIncludes: ["/music/", "/audio/"],
  binaryPathIncludes: ["/assets/cards/", "/assets/ui/"],
  precache: ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"],
});

function writeSw(target) {
  writeFileSync(join(target, "sw.js"), offlineSw);
}

writeSw(dest);
writeSw(destFresh);

// Escape hatch under old /web/ scope if a stale SW ever misbehaves.
writeFileSync(
  join(dest, "fresh.html"),
  `<!doctype html><meta charset="utf-8"><title>OCULUM</title>
<script>
(async function () {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {}
  location.replace("../b9/?v=${BUST}");
})();
</script>
<p style="font-family:system-ui;color:#eee;background:#111;padding:2rem">Opening OCULUM build ${BUST}…</p>
`,
);

console.log(`Copied ${dist} → ${dest} + ${destFresh} (${SW_CACHE}, stripped ${stripped} pngs)`);
