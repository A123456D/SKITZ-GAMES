import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGameSw } from "../../scripts/skitz-game-sw.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const dest = join(root, "..", "website", "public", "games", "breach-riot", "web");

if (!existsSync(dist)) {
  console.error("Missing dist/ — run npm run build first");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(dist, dest, { recursive: true });

writeFileSync(
  join(dest, "sw.js"),
  buildGameSw({
    cacheName: "breach-riot-v4",
    label: "Breach Riot",
    precache: ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"],
  }),
);

console.log(`Copied ${dist} → ${dest}`);
