/**
 * Generate Chain Reactor SFX via ElevenLabs Sound Generation API.
 *
 * Usage:
 *   $env:ELEVENLABS_API_KEY = "xi-..."
 *   node scripts/generate-sfx.mjs
 *
 * Writes MP3s into public/audio/sfx/ (and copies to godot/assets/audio/sfx/).
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "audio", "sfx");
const godotDir = join(root, "godot", "assets", "audio", "sfx");

const API_KEY = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY;
if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY / XI_API_KEY).");
  process.exit(1);
}

/** Cyberpunk card-battler Foley — short, punchy, game-ready. */
const EFFECTS = [
  {
    id: "place",
    duration: 0.55,
    text:
      "Short cyberpunk UI card placement thud: magnetic circuit board snap with a soft electric click, clean and tight, no reverb tail, game UI sound effect, high fidelity",
  },
  {
    id: "select",
    duration: 0.5,
    text:
      "Crisp futuristic UI select blip: soft neon soft-click with a tiny crystalline sparkle, very short, polished mobile game interface sound, high quality",
  },
  {
    id: "beam",
    duration: 0.55,
    text:
      "Energy laser beam zap: bright electric arc whoosh with a sharp plasma sizzle, short sci-fi weapon beam hit, clean and punchy, game SFX, high fidelity",
  },
  {
    id: "beam2",
    duration: 0.6,
    text:
      "Stronger cascading laser beam: rising electric surge zap with harmonic sparkle, sci-fi chain reaction step, short and intense, game sound effect, high quality",
  },
  {
    id: "beam3",
    duration: 0.65,
    text:
      "Powerful overcharged energy beam: deep resonant plasma crack followed by bright electric streak, cascade climax hit, cinematic game SFX, high fidelity",
  },
  {
    id: "capture",
    duration: 0.9,
    text:
      "Dramatic tile overthrow capture: heavy digital shatter impact then rising synth power-steal whoosh with a satisfying magnetic lock, cyberpunk game victory micro-moment, high quality",
  },
  {
    id: "chain",
    duration: 0.75,
    text:
      "Chain reaction crescendo sting: layered electric pulses building into a bright harmonic energy bloom, sci-fi combo multiplier sound, short, high fidelity game SFX",
  },
  {
    id: "win",
    duration: 1.4,
    text:
      "Triumphant cyberpunk victory jingle: ascending neon synth chords with a sparkling electric flourish and warm bass resolve, short game win fanfare, polished and cinematic, high quality",
  },
  {
    id: "lose",
    duration: 1.2,
    text:
      "Defeat sting: descending dark synth drone with a glitchy electric collapse and muted low thump, short game lose sting, dramatic but not harsh, high fidelity",
  },
  {
    id: "unlock",
    duration: 1.0,
    text:
      "Reward unlock chime: bright crystalline unlock with shimmering neon sparkles and a soft power-up swell, short game unlock sound, delightful and clean, high quality",
  },
];

mkdirSync(outDir, { recursive: true });
mkdirSync(godotDir, { recursive: true });

async function generateOne(effect) {
  const url = new URL("https://api.elevenlabs.io/v1/sound-generation");
  url.searchParams.set("output_format", "mp3_44100_128");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: effect.text,
      duration_seconds: effect.duration,
      prompt_influence: 0.65,
      model_id: "eleven_text_to_sound_v2",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${effect.id}: HTTP ${res.status} — ${errText.slice(0, 400)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) {
    throw new Error(`${effect.id}: response too small (${buf.length} bytes)`);
  }

  const file = `${effect.id}.mp3`;
  const dest = join(outDir, file);
  writeFileSync(dest, buf);
  copyFileSync(dest, join(godotDir, file));
  console.log(`✓ ${file} (${buf.length} bytes)`);
}

async function main() {
  console.log(`Generating ${EFFECTS.length} SFX → ${outDir}`);
  for (const effect of EFFECTS) {
    const existing = join(outDir, `${effect.id}.mp3`);
    if (process.env.FORCE !== "1" && existsSync(existing)) {
      console.log(`· skip ${effect.id}.mp3 (exists; FORCE=1 to regenerate)`);
      copyFileSync(existing, join(godotDir, `${effect.id}.mp3`));
      continue;
    }
    await generateOne(effect);
    // Gentle pacing to avoid rate limits.
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
