/**
 * Riot Cube SFX — ElevenLabs samples when present, procedural fallback.
 */

const VOL_KEY = "riotcube_sfx_vol";
/** Cycle: muted → low → med → high */
const VOL_STEPS = [0, 0.35, 0.65, 1] as const;

const SAMPLE_FILES = {
  rustle: "rustle.mp3",
  slide: "slide.mp3",
  flutter: "flutter.mp3",
  crumple: "crumple.mp3",
  win: "win.mp3",
  lose: "lose.mp3",
  scramble: "scramble.mp3",
  hint: "hint.mp3",
  sticker: "sticker.mp3",
} as const;

/** Bump when replacing mp3s so caches skip stale clips. */
const SFX_VERSION = 3;

type SampleId = keyof typeof SAMPLE_FILES;

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
let sfxVol = readStoredVol();
const buffers = new Map<SampleId, AudioBuffer>();
let loadPromise: Promise<void> | null = null;

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

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function bus(): GainNode | null {
  const c = ac();
  if (!c) return null;
  if (!master) {
    master = c.createGain();
    master.gain.value = sfxVol;
    master.connect(c.destination);
  }
  return master;
}

function primeContext(c: AudioContext): void {
  void c.resume();
  try {
    const buf = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

function playSample(
  id: SampleId,
  opts?: { volume?: number; vary?: boolean },
): boolean {
  const c = ac();
  const out = bus();
  const buf = buffers.get(id);
  if (!c || !out || !buf || !unlocked || sfxVol <= 0.001) return false;
  if (c.state === "suspended") void c.resume();
  const src = c.createBufferSource();
  src.buffer = buf;
  const vary = opts?.vary !== false;
  src.playbackRate.value = vary ? 0.94 + Math.random() * 0.12 : 1;
  const g = c.createGain();
  g.gain.value = opts?.volume ?? 1;
  src.connect(g);
  g.connect(out);
  try {
    src.start(0);
  } catch {
    return false;
  }
  return true;
}

export function loadSfx(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const c = ac();
    if (!c) return;
    await Promise.all(
      (Object.keys(SAMPLE_FILES) as SampleId[]).map(async (id) => {
        try {
          const res = await fetch(`./sfx/${SAMPLE_FILES[id]}?v=${SFX_VERSION}`);
          if (!res.ok) return;
          const raw = await res.arrayBuffer();
          buffers.set(id, await c.decodeAudioData(raw.slice(0)));
        } catch {
          /* missing until generated */
        }
      }),
    );
  })();
  return loadPromise;
}

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  primeContext(c);
  unlocked = true;
  bus();
  void loadSfx();
}

export function getSharedAudioContext(): AudioContext | null {
  return ac();
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function getSfxVolume(): number {
  return sfxVol;
}

export function volLevelLabel(v: number): string {
  if (v <= 0.001) return "MUTED";
  if (v < 0.5) return "LOW";
  if (v < 0.85) return "MED";
  return "HIGH";
}

export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem(VOL_KEY, String(sfxVol));
  } catch {
    /* ignore */
  }
  const g = bus();
  if (g) g.gain.value = sfxVol;
}

export function cycleSfxVolume(): number {
  const i = VOL_STEPS.findIndex((s) => Math.abs(s - sfxVol) < 0.05);
  const next = VOL_STEPS[(i + 1) % VOL_STEPS.length]!;
  setSfxVolume(next);
  if (next > 0) {
    if (!playSample("rustle", { volume: 0.7 })) {
      pluck(880, 0.05, 0.045);
      pluck(1180, 0.06, 0.03, 0.04);
    }
  }
  return next;
}

function pluck(freq: number, dur: number, gain: number, when = 0, slideTo?: number): void {
  const c = ac();
  const out = bus();
  if (!c || !out || !unlocked || sfxVol <= 0.001) return;
  if (c.state === "suspended") void c.resume();

  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const shimmer = c.createOscillator();
  const g = c.createGain();
  const sg = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  }

  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(freq * 2.02, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  sg.gain.setValueAtTime(0.0001, t0);
  sg.gain.exponentialRampToValueAtTime(Math.max(0.001, gain * 0.22), t0 + 0.004);
  sg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.55);

  osc.connect(g);
  shimmer.connect(sg);
  g.connect(out);
  sg.connect(out);
  osc.start(t0);
  shimmer.start(t0);
  osc.stop(t0 + dur + 0.02);
  shimmer.stop(t0 + dur + 0.02);
}

function airTick(dur: number, gain: number, when = 0): void {
  const c = ac();
  const out = bus();
  if (!c || !out || !unlocked || sfxVol <= 0.001) return;
  if (c.state === "suspended") void c.resume();

  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const env = 1 - i / n;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }

  const t0 = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = buf;

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400;
  bp.Q.value = 0.9;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxPaperRustle(): void {
  if (playSample("rustle")) return;
  airTick(0.028, 0.045);
  pluck(640 + Math.random() * 40, 0.035, 0.032);
}

export function sfxPaperSlide(): void {
  if (playSample("slide")) return;
  airTick(0.04, 0.05);
  pluck(520, 0.05, 0.038, 0, 680);
  pluck(780, 0.04, 0.022, 0.02);
}

export function sfxPaperCrumple(): void {
  if (playSample("crumple")) return;
  airTick(0.05, 0.055);
  pluck(660, 0.06, 0.04);
  pluck(880, 0.07, 0.035, 0.035, 1100);
  pluck(1240, 0.08, 0.028, 0.07);
}

export function sfxPaperFlutter(): void {
  if (playSample("flutter")) return;
  pluck(740, 0.045, 0.036);
  pluck(990, 0.055, 0.03, 0.03, 1180);
  airTick(0.025, 0.03, 0.015);
}

/** Sticker pick / place for the sticker screen. */
export function sfxSticker(): void {
  if (playSample("sticker", { volume: 2.4, vary: false })) return;
  airTick(0.035, 0.09);
  pluck(620 + Math.random() * 40, 0.055, 0.08);
  pluck(880, 0.04, 0.05, 0.02);
}

export function sfxWin(): void {
  if (playSample("win", { vary: false })) return;
  sfxPaperFlutter();
  pluck(880, 0.12, 0.05, 0.05);
  pluck(1320, 0.14, 0.04, 0.12);
}

export function sfxLose(): void {
  if (playSample("lose", { vary: false })) return;
  sfxPaperCrumple();
}

export function sfxScramble(): void {
  if (playSample("scramble")) return;
  sfxPaperRustle();
  sfxPaperSlide();
}

export function sfxHint(): void {
  if (playSample("hint")) return;
  sfxPaperFlutter();
}
