import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const dest = join(root, "..", "website", "public", "games", "oculum", "web");
/** Fresh path with no prior SW scope — escape hatch when Android pins /web/. */
const destFresh = join(root, "..", "website", "public", "games", "oculum", "b9");
const siteImg = join(root, "..", "website", "public", "images", "oculum-seal.png");
const seal = join(root, "public", "assets", "ui", "seal-eye.png");
/** Bump whenever shipping a critical client fix so phones drop stale SW caches. */
const SW_CACHE = "oculum-beta-v30";
const BUST = "30";

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

const bustScript = `<script>
(function () {
  var KEY = "oculum-bust-v${BUST}";
  try {
    if (sessionStorage.getItem(KEY) === "1") return;
    sessionStorage.setItem(KEY, "1");
  } catch (e) {}
  var done = function () {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get("v") !== "${BUST}") {
        u.searchParams.set("v", "${BUST}");
        location.replace(u.toString());
      }
    } catch (e2) {}
  };
  var run = async function () {
    try {
      if ("serviceWorker" in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) { return r.unregister(); }));
      }
      if (window.caches && caches.keys) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }
    } catch (e3) {}
    done();
  };
  void run();
})();
</script>`;

const killSw = `const CACHE = "${SW_CACHE}";
self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      try {
        const u = new URL(c.url);
        u.searchParams.set("v", "${BUST}");
        await c.navigate(u.toString());
      } catch (_) {
        /* ignore */
      }
    }
  })());
});
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
`;

function patchShell(target) {
  const indexPath = join(target, "index.html");
  const indexHtml = readFileSync(indexPath, "utf8");
  if (!indexHtml.includes(`oculum-bust-v${BUST}`)) {
    writeFileSync(
      indexPath,
      indexHtml.replace(/<head[^>]*>/i, (m) => `${m}\n    ${bustScript}`),
    );
  }
  writeFileSync(join(target, "sw.js"), killSw);
}

patchShell(dest);
patchShell(destFresh);

// Escape hatch under old /web/ scope if a stale SW ever lets network through.
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
