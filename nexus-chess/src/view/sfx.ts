/**
 * Nexus Chess SFX — theme packs.
 * forge → current metallic / combat samples
 * soft  → gentle pack for Nexus + Classic
 */

import { Theme } from "./theme";

const SAMPLE_FILES = {
  "move-lift": "move-lift.mp3",
  "move-land": "move-land.mp3",
  capture: "capture.mp3",
  "ui-tap": "ui-tap.mp3",
  ability: "ability.mp3",
  win: "win.mp3",
  lose: "lose.mp3",
  select: "select.mp3",
} as const;

type SampleId = keyof typeof SAMPLE_FILES;
export type SfxPackId = "forge" | "soft";

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
const VOL_KEY = "nexus-chess-vol";
const VOL_STEPS = [0, 0.35, 0.65, 1] as const;
let sfxVol = readStoredVol();
/** Buffers per pack so theme switches stay instant after first load. */
const packBuffers = new Map<SfxPackId, Map<SampleId, AudioBuffer>>();
const packLoadPromises = new Map<SfxPackId, Promise<void>>();

function readStoredVol(): number {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw == null) return 1;
    const n = Number(raw);
    if (VOL_STEPS.includes(n as (typeof VOL_STEPS)[number])) return n;
    if (n <= 0) return 0;
    if (n < 0.45) return 0.35;
    if (n < 0.8) return 0.65;
    return 1;
  } catch {
    return 1;
  }
}

export function getSfxVolume(): number {
  return sfxVol;
}

export function volLevelLabel(v: number = sfxVol): string {
  if (v <= 0.001) return "Muted";
  if (v < 0.5) return "Low";
  if (v < 0.85) return "Med";
  return "High";
}

export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem(VOL_KEY, String(sfxVol));
  } catch {
    /* ignore */
  }
  const g = bus();
  if (g) g.gain.value = sfxVol * 0.85;
}

export function cycleSfxVolume(): number {
  const i = VOL_STEPS.findIndex((s) => Math.abs(s - sfxVol) < 0.05);
  const next = VOL_STEPS[(i < 0 ? 3 : i + 1) % VOL_STEPS.length]!;
  setSfxVolume(next);
  return next;
}

export function activeSfxPack(): SfxPackId {
  return Theme.id === "forge" ? "forge" : "soft";
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
}

function bus(): GainNode | null {
  const c = ac();
  if (!c) return null;
  if (!master) {
    master = c.createGain();
    master.gain.value = sfxVol * 0.85;
    master.connect(c.destination);
  }
  return master;
}

function softMode(): boolean {
  return activeSfxPack() === "soft";
}

function playSample(
  id: SampleId,
  opts?: { volume?: number; vary?: boolean },
): boolean {
  const c = ac();
  const out = bus();
  const buf = packBuffers.get(activeSfxPack())?.get(id);
  if (!c || !out || !buf || !unlocked) return false;
  if (c.state === "suspended") void c.resume();
  const src = c.createBufferSource();
  src.buffer = buf;
  const vary = opts?.vary !== false;
  const softBoost = softMode() ? 1.04 : 1;
  src.playbackRate.value = vary
    ? softBoost * (0.94 + Math.random() * 0.12)
    : softBoost;
  const g = c.createGain();
  const volScale = softMode() ? 0.82 : 1;
  g.gain.value = (opts?.volume ?? 1) * volScale;
  src.connect(g);
  g.connect(out);
  try {
    src.start(0);
  } catch {
    return false;
  }
  return true;
}

async function decodePack(pack: SfxPackId): Promise<void> {
  const c = ac();
  if (!c) return;
  const map = packBuffers.get(pack) ?? new Map<SampleId, AudioBuffer>();
  await Promise.all(
    (Object.keys(SAMPLE_FILES) as SampleId[]).map(async (id) => {
      if (map.has(id)) return;
      const file = SAMPLE_FILES[id];
      const urls =
        pack === "forge"
          ? [`./sfx/forge/${file}`, `./sfx/${file}`]
          : [`./sfx/${pack}/${file}`];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const raw = await res.arrayBuffer();
          map.set(id, await c.decodeAudioData(raw.slice(0)));
          return;
        } catch {
          /* try next */
        }
      }
    }),
  );
  packBuffers.set(pack, map);
}

function ensurePack(pack: SfxPackId): Promise<void> {
  let p = packLoadPromises.get(pack);
  if (!p) {
    p = decodePack(pack);
    packLoadPromises.set(pack, p);
  }
  return p;
}

/** Preload the active theme pack (and warm the other in the background). */
export function loadSfx(): Promise<void> {
  const active = activeSfxPack();
  const primary = ensurePack(active);
  const other: SfxPackId = active === "forge" ? "soft" : "forge";
  void ensurePack(other);
  return primary;
}

/** Call after board theme changes so the matching pack is ready. */
export function reloadSfxForTheme(): void {
  void ensurePack(activeSfxPack());
}

/** Call from first pointer gesture so browsers allow audio. */
export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
  bus();
  void loadSfx();
}

function envGain(
  c: AudioContext,
  start: number,
  attack: number,
  hold: number,
  release: number,
  peak = 0.2,
): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, start + attack + hold);
  g.gain.exponentialRampToValueAtTime(
    0.0001,
    start + attack + hold + release,
  );
  return g;
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  dest: AudioNode,
) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  const g = envGain(c, start, 0.008, dur * 0.25, dur * 0.7, peak);
  o.connect(g);
  g.connect(dest);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function softTone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  peak: number,
  dest: AudioNode,
) {
  tone(c, freq, start, dur, "sine", peak, dest);
  tone(c, freq * 2.01, start, dur * 0.7, "sine", peak * 0.22, dest);
}

function noiseBurst(
  c: AudioContext,
  start: number,
  dur: number,
  peak: number,
  dest: AudioNode,
) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = softMode() ? 900 : 1200;
  filter.Q.value = 0.7;
  const g = envGain(c, start, 0.004, dur * 0.15, dur * 0.8, peak);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function masterDest(): AudioNode | null {
  const c = ac();
  const out = bus();
  if (!c || !out || !unlocked) return null;
  if (c.state === "suspended") void c.resume();
  return out;
}

export function playMoveLift(): void {
  if (playSample("move-lift")) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
  if (softMode()) {
    softTone(c, 320, t, 0.1, 0.045, dest);
    softTone(c, 480, t + 0.02, 0.08, 0.03, dest);
    return;
  }
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(420, t + 0.12);
  const g = envGain(c, t, 0.02, 0.04, 0.12, 0.07);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.2);
}

export function playMoveLand(): void {
  if (playSample("move-land")) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
  if (softMode()) {
    softTone(c, 220, t, 0.08, 0.055, dest);
    softTone(c, 330, t + 0.015, 0.06, 0.03, dest);
    return;
  }
  noiseBurst(c, t, 0.06, 0.12, dest);
  tone(c, 90, t, 0.1, "triangle", 0.14, dest);
  tone(c, 180, t + 0.01, 0.07, "sine", 0.06, dest);
}

export function playCapture(): void {
  if (playSample("capture")) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
  if (softMode()) {
    softTone(c, 260, t, 0.09, 0.06, dest);
    softTone(c, 390, t + 0.03, 0.1, 0.04, dest);
    softTone(c, 520, t + 0.06, 0.08, 0.025, dest);
    return;
  }
  noiseBurst(c, t, 0.1, 0.18, dest);
  tone(c, 140, t, 0.12, "square", 0.08, dest);
  tone(c, 70, t, 0.16, "sawtooth", 0.1, dest);
  tone(c, 520, t + 0.02, 0.08, "sine", 0.05, dest);
}

export function playUiTap(): void {
  if (playSample("ui-tap")) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
  if (softMode()) {
    softTone(c, 720, t, 0.035, 0.035, dest);
    return;
  }
  tone(c, 660, t, 0.04, "sine", 0.05, dest);
}

export function playAbility(): void {
  if (playSample("ability", { vary: false })) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
  if (softMode()) {
    softTone(c, 440, t, 0.1, 0.04, dest);
    softTone(c, 660, t + 0.05, 0.12, 0.035, dest);
    softTone(c, 880, t + 0.1, 0.14, 0.028, dest);
    return;
  }
  tone(c, 440, t, 0.08, "sine", 0.06, dest);
  tone(c, 660, t + 0.04, 0.1, "sine", 0.05, dest);
  tone(c, 880, t + 0.08, 0.12, "triangle", 0.04, dest);
}

export function playSelect(): void {
  if (playSample("select")) return;
  playUiTap();
}

export function playWin(): void {
  if (playSample("win", { vary: false })) return;
  playAbility();
}

export function playLose(): void {
  if (playSample("lose", { vary: false })) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
  if (softMode()) {
    softTone(c, 280, t, 0.22, 0.045, dest);
    softTone(c, 210, t + 0.12, 0.28, 0.035, dest);
    return;
  }
  tone(c, 220, t, 0.2, "sine", 0.08, dest);
  tone(c, 160, t + 0.1, 0.25, "triangle", 0.06, dest);
}
