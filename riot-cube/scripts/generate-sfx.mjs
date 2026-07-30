/**
 * Generate game SFX via ElevenLabs. Reads ELEVENLABS_API_KEY from .env,
 * then ../paper-riot/.env as fallback.
 *
 *   npm run sfx:generate
 *   npm run sfx:generate -- --force
 *   npm run sfx:generate -- win lose
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

const force = process.argv.includes("--force");
const only = process.argv
  .slice(2)
  .filter((a) => a !== "--force" && !a.startsWith("-"));

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY (.env or ../paper-riot/.env)");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const jobs = only.length
  ? SFX_CATALOG.filter((s) => only.includes(s.id))
  : SFX_CATALOG;

async function generateOne(entry) {
  const dest = join(outDir, entry.file);
  if (!force && existsSync(dest)) {
    console.log(`skip  ${entry.id} (exists)`);
    return;
  }
  console.log(`gen   ${entry.id} …`);
  const res = await fetch(`${API}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: entry.text,
      duration_seconds: Math.max(0.5, entry.duration),
      prompt_influence: 0.45,
      model_id: "eleven_text_to_sound_v2",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${entry.id}: ${res.status} ${body.slice(0, 400)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`${entry.id}: too small`);
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
  await new Promise((r) => setTimeout(r, 400));
}
console.log(`Done → ${outDir}`);
