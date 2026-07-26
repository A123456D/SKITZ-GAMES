/**
 * Procedural sticker/cube SFX via Web Audio — no asset fetch/decode.
 * (Sample WAVs were failing silently on mobile + some web hosts.)
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
    // Confirm the new level (also primes delayed unlocks).
    tone(520, 0.06, "sine", 0.06);
    tone(720, 0.07, "triangle", 0.04, 0.04);
  }
  return next;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  slideTo?: number,
): void {
  const c = ac();
  const out = bus();
  if (!c || !out || !unlocked || sfxVol <= 0.001) return;
  if (c.state === "suspended") void c.resume();

  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Soft noise burst (sticker slide / rustle). */
function noiseBurst(dur: number, gain: number, when = 0, hp = 400, lp = 2800): void {
  const c = ac();
  const out = bus();
  if (!c || !out || !unlocked || sfxVol <= 0.001) return;
  if (c.state === "suspended") void c.resume();

  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;

  const t0 = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = buf;

  const hip = c.createBiquadFilter();
  hip.type = "highpass";
  hip.frequency.value = hp;

  const lop = c.createBiquadFilter();
  lop.type = "lowpass";
  lop.frequency.value = lp;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(hip);
  hip.connect(lop);
  lop.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxPaperRustle(): void {
  noiseBurst(0.05, 0.09, 0, 600, 3200);
  tone(220 + Math.random() * 40, 0.04, "triangle", 0.04);
}

export function sfxPaperSlide(): void {
  noiseBurst(0.08, 0.1, 0, 350, 2400);
  tone(160, 0.07, "sine", 0.05, 0, 90);
  tone(340, 0.05, "triangle", 0.035, 0.02);
}

export function sfxPaperCrumple(): void {
  noiseBurst(0.12, 0.12, 0, 200, 1800);
  tone(90, 0.1, "sine", 0.07, 0, 48);
  tone(180, 0.08, "triangle", 0.045, 0.03);
  tone(420, 0.06, "square", 0.02, 0.05);
}

export function sfxPaperFlutter(): void {
  tone(380, 0.05, "triangle", 0.055);
  tone(520, 0.07, "sine", 0.05, 0.03, 640);
  noiseBurst(0.04, 0.05, 0.01, 800, 3600);
}
