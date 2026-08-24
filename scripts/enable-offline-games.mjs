/**
 * Write network-first offline SWs into every published game folder and inject
 * a register snippet into index.html when the built JS doesn't register yet.
 *
 * Run from monorepo root: node scripts/enable-offline-games.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGameSw } from "./skitz-game-sw.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gamesRoot = join(__dirname, "..", "website", "public", "games");

const GAMES = [
  {
    id: "oculum",
    paths: ["web", "b9"],
    cacheName: "oculum-v36",
    label: "OCULUM",
    skipPathIncludes: ["/music/", "/audio/"],
    binaryPathIncludes: ["/assets/cards/", "/assets/ui/"],
    precache: ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"],
  },
  {
    id: "shiftr",
    paths: ["web"],
    cacheName: "pulse-link-v20",
    label: "Pulse Link",
    skipPathIncludes: ["/music/"],
  },
  {
    id: "pulsefold",
    paths: ["web"],
    cacheName: "pulsefold-v25",
    label: "PulseFold",
    skipPathIncludes: ["/audio/", "/playlist/"],
  },
  {
    id: "riot-cube",
    paths: ["web"],
    cacheName: "riot-cube-v57",
    label: "Riot Cube",
    binaryPathIncludes: ["/themes/"],
  },
  {
    id: "breach-riot",
    paths: ["web"],
    cacheName: "breach-riot-v3",
    label: "Breach Riot",
    precache: ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"],
  },
  {
    id: "paper-riot",
    paths: ["web"],
    cacheName: "paper-riot-v1",
    label: "Paper Riot",
  },
  {
    id: "chain-reactor",
    paths: ["web"],
    cacheName: "chain-reactor-v1",
    label: "Chain Reactor",
  },
  {
    id: "ronin-core",
    paths: ["web"],
    cacheName: "ronin-core-v1",
    label: "Ronin Core",
  },
  {
    id: "nexus-chess",
    paths: ["web"],
    cacheName: "nexus-chess-v1",
    label: "Nexus Chess",
  },
];

const REGISTER_MARK = "skitz-sw-register";
const REGISTER_SCRIPT = `<script data-${REGISTER_MARK}>
(function () {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then(function (reg) { return reg.update(); })
      .catch(function () {});
  });
})();
</script>`;

let wrote = 0;
let injected = 0;

for (const game of GAMES) {
  const sw = buildGameSw({
    cacheName: game.cacheName,
    label: game.label,
    skipPathIncludes: game.skipPathIncludes,
    binaryPathIncludes: game.binaryPathIncludes,
    precache: game.precache,
  });

  for (const sub of game.paths) {
    const dir = join(gamesRoot, game.id, sub);
    if (!existsSync(dir)) {
      console.warn(`skip missing ${game.id}/${sub}`);
      continue;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "sw.js"), sw);
    wrote += 1;

    const indexPath = join(dir, "index.html");
    if (!existsSync(indexPath)) continue;
    let html = readFileSync(indexPath, "utf8");
    if (html.includes(`data-${REGISTER_MARK}`)) continue;
    // Prefer injecting before </body>; fall back to </head>
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `  ${REGISTER_SCRIPT}\n</body>`);
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `  ${REGISTER_SCRIPT}\n</head>`);
    } else {
      html += `\n${REGISTER_SCRIPT}\n`;
    }
    writeFileSync(indexPath, html);
    injected += 1;
  }
}

console.log(`Wrote ${wrote} sw.js files; injected register into ${injected} index.html shells.`);
