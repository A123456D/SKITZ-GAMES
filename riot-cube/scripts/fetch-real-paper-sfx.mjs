import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

/**
 * Soft page-paper SFX from Mixkit (no harsh crumple/scratch samples).
 * Heavy lowpass + low gain so they stay ear-friendly.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const html = await (await fetch("https://mixkit.co/free-sound-effects/paper/")).text();
const cards = [];
const re2 =
  /data-audio-player-preview-url-value="([^"]+)"[\s\S]{0,400}?data-audio-player-item-id-value="(\d+)"[\s\S]{0,1200}?<h2 class="item-grid-card__title">\s*([^<]+?)\s*<\/h2>/g;
for (const m of html.matchAll(re2)) {
  cards.push({ id: m[2], preview: m[1], title: m[3].trim() });
}

function find(...titles) {
  for (const t of titles) {
    const hit = cards.find((c) => c.title.toLowerCase() === t.toLowerCase());
    if (hit) return hit;
  }
  throw new Error(`missing ${titles.join(" / ")}`);
}

const chosen = {
  // Soft page turns only — avoid crumple/scrape samples
  rustle: find("Page turn single", "Single book paging"),
  slide: find("Big paper page turn", "Page turn single"),
  crumple: find("Single book paging", "Page turn single", "Paper magazine paging"),
  flutter: find("Page turn single", "Single book paging"),
};

const outDir = join(__dirname, "../public/sfx");
mkdirSync(outDir, { recursive: true });
const ffmpeg =
  "C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe";

const softEq =
  "highpass=f=180,lowpass=f=1600,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=80:makeup=2,volume=0.32";

async function grab(key, card, trim) {
  const tmp = join(outDir, `_${key}_src.mp3`);
  const out = join(outDir, `paper_${key}.wav`);
  const res = await fetch(card.preview);
  if (!res.ok) throw new Error(`fetch ${card.preview} ${res.status}`);
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  const af = `atrim=${trim},afade=t=in:st=0:d=0.025,afade=t=out:st=${Number(trim.split(":")[1]) - 0.08}:d=0.08,${softEq}`;
  const r = spawnSync(ffmpeg, ["-y", "-i", tmp, "-af", af, "-ac", "1", "-ar", "44100", out], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`ffmpeg ${key}`);
  }
  console.log("wrote", out, "←", card.title);
}

await grab("rustle", chosen.rustle, "0:0.20");
await grab("slide", chosen.slide, "0:0.26");
await grab("crumple", chosen.crumple, "0:0.30");
await grab("flutter", chosen.flutter, "0:0.14");

writeFileSync(
  join(outDir, "SOURCES.txt"),
  Object.entries(chosen)
    .map(([k, c]) => `${k}: Mixkit "${c.title}" (id ${c.id})`)
    .join("\n") + "\nSoftened with lowpass + compressor. Mixkit License.\n",
);
