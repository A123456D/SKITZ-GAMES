import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const dest = join(root, "..", "website", "public", "games", "oculum", "web");
const siteImg = join(root, "..", "website", "public", "images", "oculum-seal.png");
const seal = join(root, "public", "assets", "ui", "seal-eye.png");
/** Bump whenever shipping a critical client fix so phones drop stale SW caches. */
const SW_CACHE = "oculum-beta-v8";

if (!existsSync(dist)) {
  console.error("Missing dist/ — run npm run build first");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(dist, dest, { recursive: true });

if (existsSync(seal)) {
  mkdirSync(dirname(siteImg), { recursive: true });
  cpSync(seal, siteImg);
}

// Network-first for HTML/JS/CSS so Android Chrome cannot pin an old shell forever.
writeFileSync(
  join(dest, "sw.js"),
  `const CACHE = "${SW_CACHE}";
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isShell =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/sw.js");
  const isScript =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest");
  if (isShell || isScript) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }),
    ),
  );
});
`,
);

console.log(`Copied ${dist} → ${dest} (${SW_CACHE})`);
