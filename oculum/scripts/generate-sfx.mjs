/**
 * Generate OCULUM SFX + music beds via ElevenLabs Sound Effects API.
 *
 * Usage:
 *   Put ELEVENLABS_API_KEY in oculum/.env or paper-riot/.env
 *   npm run sfx:generate
 *
 *   node scripts/generate-sfx.mjs --force
 *   node scripts/generate-sfx.mjs witness gaze
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SFX_CATALOG } from "./sfx-catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "sfx");
const API = "https://api.elevenlabs.io/v1/sound-generation";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, "..", "paper-riot", ".env"));
loadEnvFile(join(root, "..", "chain-reactor", ".env"));

const force = process.argv.includes("--force");
const only = process.argv
  .slice(2)
  .filter((a) => a !== "--force" && !a.startsWith("-"));

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || process.env.ELEVEN_API_KEY;
if (!apiKey) {
  console.error(
    "Missing ELEVENLABS_API_KEY. Put it in oculum/.env or paper-riot/.env",
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const jobs = only.length
  ? SFX_CATALOG.filter((s) => only.includes(s.id))
  : SFX_CATALOG;

if (!jobs.length) {
  console.error("No matching SFX ids.");
  process.exit(1);
}

async function generateOne(entry) {
  const dest = join(outDir, entry.file);
  if (!force && existsSync(dest)) {
    console.log(`skip  ${entry.id} (exists)`);
    return;
  }

  console.log(`gen   ${entry.id} …`);
  const body = {
    text: entry.text,
    duration_seconds: Math.max(0.5, Math.min(30, entry.duration)),
    prompt_influence: entry.loop ? 0.45 : 0.55,
    model_id: "eleven_text_to_sound_v2",
  };
  if (entry.loop) body.loop = true;

  const res = await fetch(`${API}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`${entry.id}: ${res.status} ${errBody.slice(0, 400)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) {
    throw new Error(`${entry.id}: response too small (${buf.length} bytes)`);
  }
  writeFileSync(dest, buf);
  console.log(`ok    ${entry.id} (${(buf.length / 1024).toFixed(1)} KB)`);
}

for (const entry of jobs) {
  try {
    await generateOne(entry);
  } catch (err) {
    console.error(String(err));
    process.exitCode = 1;
  }
  await new Promise((r) => setTimeout(r, 500));
}

console.log(`Done → ${outDir}`);
