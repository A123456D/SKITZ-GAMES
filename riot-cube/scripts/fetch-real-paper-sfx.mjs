import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = await (await fetch("https://mixkit.co/free-sound-effects/paper/")).text();

const cards = [];
const re =
  /data-audio-player-item-id-value="(\d+)"[\s\S]*?data-audio-player-preview-url-value="([^"]+)"[\s\S]*?<h2 class="item-grid-card__title">\s*([^<]+?)\s*<\/h2>/g;
// preview url may appear before id - try both orders
const re2 =
  /data-audio-player-preview-url-value="([^"]+)"[\s\S]{0,400}?data-audio-player-item-id-value="(\d+)"[\s\S]{0,1200}?<h2 class="item-grid-card__title">\s*([^<]+?)\s*<\/h2>/g;

for (const m of html.matchAll(re2)) {
  cards.push({ id: m[2], preview: m[1], title: m[3].trim() });
}
console.log(
  cards
    .map((c) => `${c.id}\t${c.title}\t${c.preview}`)
    .join("\n"),
);

const pick = {
  rustle: ["Paper quick movement", "Pages of paper moving", "Paper slide"],
  slide: ["Paper slide", "Paper scroll in an office", "Paper quick movement"],
  crumple: ["Crumpled paper", "Paper crumpled up", "Paper crinkle", "Quick paper crumple sound"],
  flutter: ["Big paper page turn", "Single book paging", "Page turn single"],
};

function find(titles) {
  for (const t of titles) {
    const hit = cards.find((c) => c.title.toLowerCase() === t.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

const chosen = {
  rustle: find(pick.rustle),
  slide: find(pick.slide),
  crumple: find(pick.crumple),
  flutter: find(pick.flutter),
};
console.log("\nCHOSEN", chosen);

const outDir = join(__dirname, "../public/sfx");
mkdirSync(outDir, { recursive: true });

const ffmpeg =
  "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe";

async function grab(key, card, opts) {
  if (!card) throw new Error(`missing ${key}`);
  const tmp = join(outDir, `_${key}_src.mp3`);
  const out = join(outDir, `paper_${key}.wav`);
  const res = await fetch(card.preview);
  if (!res.ok) throw new Error(`fetch ${card.preview} ${res.status}`);
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  const args = [
    "-y",
    "-i",
    tmp,
    "-af",
    opts.af,
    "-ac",
    "1",
    "-ar",
    "44100",
    out,
  ];
  const r = spawnSync(ffmpeg, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`ffmpeg failed for ${key}`);
  }
  console.log("wrote", out, "from", card.title);
}

await grab("rustle", chosen.rustle, {
  af: "atrim=0:0.22,afade=t=in:st=0:d=0.01,afade=t=out:st=0.16:d=0.06,volume=1.15",
});
await grab("slide", chosen.slide, {
  af: "atrim=0:0.28,afade=t=in:st=0:d=0.01,afade=t=out:st=0.2:d=0.08,volume=1.05",
});
await grab("crumple", chosen.crumple, {
  af: "atrim=0:0.45,afade=t=in:st=0:d=0.005,afade=t=out:st=0.32:d=0.12,volume=1.2",
});
await grab("flutter", chosen.flutter, {
  af: "atrim=0:0.16,afade=t=in:st=0:d=0.008,afade=t=out:st=0.11:d=0.05,volume=1.1",
});

writeFileSync(
  join(outDir, "SOURCES.txt"),
  Object.entries(chosen)
    .map(([k, c]) => `${k}: Mixkit "${c.title}" (id ${c.id}) — ${c.preview}`)
    .join("\n") + "\nLicense: Mixkit License (free for commercial use)\n",
);
