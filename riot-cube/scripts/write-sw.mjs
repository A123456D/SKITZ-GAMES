import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGameSw } from "../../scripts/skitz-game-sw.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "sw.js");

writeFileSync(
  out,
  buildGameSw({
    cacheName: "riot-cube-v57",
    label: "Riot Cube",
    binaryPathIncludes: ["/themes/"],
  }),
);

console.log(`Wrote ${out}`);
