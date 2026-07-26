/** Procedural paper SFX via Web Audio — no asset files. */

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let sfxVol = 0.9;

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

function ensureNoise(): AudioBuffer | null {
  const c = ac();
  if (!c) return null;
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate * 1.2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return noiseBuf;
}

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  void c.resume();
  unlocked = true;
  bus();
  ensureNoise();
}

function playNoise(opts: {
  dur: number;
  gain: number;
  freq: number;
  q?: number;
  type?: BiquadFilterType;
  slideTo?: number;
  when?: number;
}): void {
  const c = ac();
  const out = bus();
  const buf = ensureNoise();
  if (!c || !out || !buf || !unlocked || sfxVol <= 0.001) return;

  const t0 = c.currentTime + (opts.when ?? 0);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  filter.frequency.setValueAtTime(opts.freq, t0);
  if (opts.slideTo !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, opts.slideTo),
      t0 + opts.dur,
    );
  }
  filter.Q.value = opts.q ?? 1.2;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.03);
}

/** Soft rustle when a sticker lane lifts / drag starts. */
export function sfxPaperRustle(): void {
  playNoise({
    dur: 0.09,
    gain: 0.055,
    freq: 1800,
    slideTo: 900,
    q: 0.7,
    type: "bandpass",
  });
  playNoise({
    dur: 0.07,
    gain: 0.03,
    freq: 4200,
    slideTo: 2200,
    q: 1.4,
    type: "highpass",
    when: 0.01,
  });
}

/** Sliding a row/column — paper scrape across the cube. */
export function sfxPaperSlide(): void {
  playNoise({
    dur: 0.14,
    gain: 0.07,
    freq: 1200,
    slideTo: 650,
    q: 0.85,
    type: "bandpass",
  });
  playNoise({
    dur: 0.1,
    gain: 0.035,
    freq: 2800,
    slideTo: 1400,
    q: 1.1,
    type: "bandpass",
    when: 0.02,
  });
}

/** Match clear — stickers crumpling like paper. */
export function sfxPaperCrumple(): void {
  playNoise({
    dur: 0.22,
    gain: 0.09,
    freq: 900,
    slideTo: 280,
    q: 0.6,
    type: "bandpass",
  });
  playNoise({
    dur: 0.16,
    gain: 0.05,
    freq: 2400,
    slideTo: 700,
    q: 1.3,
    type: "bandpass",
    when: 0.03,
  });
  playNoise({
    dur: 0.12,
    gain: 0.04,
    freq: 5000,
    slideTo: 1800,
    q: 0.9,
    type: "highpass",
    when: 0.05,
  });
}

/** Light flutter when the cube face snaps / orbit settles. */
export function sfxPaperFlutter(): void {
  playNoise({
    dur: 0.08,
    gain: 0.04,
    freq: 2200,
    slideTo: 1100,
    q: 0.9,
    type: "bandpass",
  });
}
