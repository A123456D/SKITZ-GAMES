/**
 * Light, crisp procedural SFX via Web Audio — no asset fetch/decode.
 */

const VOL_KEY = "riotcube_sfx_vol";
/** Cycle: muted → soft → normal */
const VOL_STEPS = [0, 0.4, 0.75] as const;

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
let sfxVol = readStoredVol();

function readStoredVol(): number {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw == null) return 0.75;
    const n = Number(raw);
    if (VOL_STEPS.includes(n as (typeof VOL_STEPS)[number])) return n;
    if (n <= 0) return 0;
    if (n < 0.55) return 0.4;
    return 0.75;
  } catch {
    return 0.75;
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

/** iOS / Chrome: resume + silent blip so later tones actually play. */
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

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  primeContext(c);
  unlocked = true;
  bus();
}

/** Shared Web Audio context for SFX + music (one context avoids Android ducking). */
export function getSharedAudioContext(): AudioContext | null {
  return ac();
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function getSfxVolume(): number {
  return sfxVol;
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

/** Mute → soft → normal → mute */
export function cycleSfxVolume(): number {
  const i = VOL_STEPS.findIndex((s) => Math.abs(s - sfxVol) < 0.05);
  const next = VOL_STEPS[(i + 1) % VOL_STEPS.length]!;
  setSfxVolume(next);
  if (next > 0) {
    pluck(880, 0.05, 0.045);
    pluck(1180, 0.06, 0.03, 0.04);
  }
  return next;
}

/** Soft sine pluck with a tiny high shimmer — light and crisp. */
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

/** Brief bright air burst — paper tick, not a thud. */
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
  airTick(0.028, 0.045);
  pluck(640 + Math.random() * 40, 0.035, 0.032);
}

export function sfxPaperSlide(): void {
  airTick(0.04, 0.05);
  pluck(520, 0.05, 0.038, 0, 680);
  pluck(780, 0.04, 0.022, 0.02);
}

export function sfxPaperCrumple(): void {
  airTick(0.05, 0.055);
  pluck(660, 0.06, 0.04);
  pluck(880, 0.07, 0.035, 0.035, 1100);
  pluck(1240, 0.08, 0.028, 0.07);
}

export function sfxPaperFlutter(): void {
  pluck(740, 0.045, 0.036);
  pluck(990, 0.055, 0.03, 0.03, 1180);
  airTick(0.025, 0.03, 0.015);
}
