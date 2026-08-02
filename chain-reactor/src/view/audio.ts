import { getPrefs } from "./prefs";

let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function resumeAudio(): void {
  void ac().resume();
  ensureMusic();
  void preloadSfx();
}

/** Synth fallbacks if ElevenLabs samples aren't loaded yet. */
function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04): void {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

function thud(freq = 90, dur = 0.18, gain = 0.08): void {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, a.currentTime + dur);
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

/** ElevenLabs-generated one-shots (public/audio/sfx). */
export const SFX_SAMPLES = {
  place: "./audio/sfx/place.mp3",
  select: "./audio/sfx/select.mp3",
  beam: "./audio/sfx/beam.mp3",
  beam2: "./audio/sfx/beam2.mp3",
  beam3: "./audio/sfx/beam3.mp3",
  capture: "./audio/sfx/capture.mp3",
  chain: "./audio/sfx/chain.mp3",
  win: "./audio/sfx/win.mp3",
  lose: "./audio/sfx/lose.mp3",
  unlock: "./audio/sfx/unlock.mp3",
} as const;

export type SfxId = keyof typeof SFX_SAMPLES;

const SFX_GAIN: Partial<Record<SfxId, number>> = {
  place: 0.72,
  select: 0.55,
  beam: 0.58,
  beam2: 0.62,
  beam3: 0.68,
  capture: 0.85,
  chain: 0.78,
  win: 0.9,
  lose: 0.82,
  unlock: 0.8,
};

const buffers = new Map<SfxId, AudioBuffer>();
let preloadPromise: Promise<void> | null = null;

async function loadBuffer(id: SfxId): Promise<void> {
  try {
    const res = await fetch(SFX_SAMPLES[id]);
    if (!res.ok) return;
    const raw = await res.arrayBuffer();
    const buf = await ac().decodeAudioData(raw.slice(0));
    buffers.set(id, buf);
  } catch {
    /* keep synth fallback */
  }
}

export function preloadSfx(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all(
      (Object.keys(SFX_SAMPLES) as SfxId[]).map((id) => loadBuffer(id)),
    ).then(() => undefined);
  }
  return preloadPromise;
}

function playSample(id: SfxId, gainMul = 1): boolean {
  const buf = buffers.get(id);
  if (!buf) return false;
  const a = ac();
  const src = a.createBufferSource();
  const g = a.createGain();
  src.buffer = buf;
  g.gain.value = (SFX_GAIN[id] ?? 0.7) * gainMul;
  src.connect(g);
  g.connect(a.destination);
  src.start();
  return true;
}

const synthFallback = {
  place: () => beep(220, 0.08, "square", 0.05),
  beam: () => beep(660, 0.06, "sawtooth", 0.03),
  beamStep: (step: number) => {
    const f = 520 + step * 90;
    beep(f, 0.05 + step * 0.01, "sawtooth", 0.025 + step * 0.005);
  },
  capture: () => {
    thud(85, 0.2, 0.1);
    beep(440, 0.08, "square", 0.05);
    setTimeout(() => beep(720, 0.12, "square", 0.045), 70);
  },
  chain: (step: number) => {
    if (step < 3) return;
    beep(300 + step * 120, 0.1, "triangle", 0.04);
    if (step >= 4) thud(70, 0.15, 0.06);
  },
  select: () => beep(520, 0.04, "triangle", 0.03),
  win: () => {
    beep(523, 0.1, "square", 0.05);
    setTimeout(() => beep(659, 0.1, "square", 0.05), 100);
    setTimeout(() => beep(784, 0.16, "square", 0.05), 200);
  },
  lose: () => beep(140, 0.25, "sawtooth", 0.05),
  unlock: () => {
    beep(660, 0.08, "triangle", 0.04);
    setTimeout(() => beep(880, 0.12, "triangle", 0.05), 80);
  },
};

export const sfx = {
  place: () => {
    if (!playSample("place")) synthFallback.place();
  },
  beam: () => {
    if (!playSample("beam")) synthFallback.beam();
  },
  /** Pitch / intensity rises with cascade step via tiered samples. */
  beamStep: (step: number) => {
    const id: SfxId = step >= 4 ? "beam3" : step >= 2 ? "beam2" : "beam";
    const mul = Math.min(1.15, 0.85 + step * 0.06);
    if (!playSample(id, mul)) synthFallback.beamStep(step);
  },
  capture: () => {
    if (!playSample("capture")) synthFallback.capture();
  },
  chain: (step: number) => {
    if (step < 3) return;
    if (!playSample("chain", Math.min(1.2, 0.9 + (step - 3) * 0.1))) {
      synthFallback.chain(step);
    }
  },
  select: () => {
    if (!playSample("select")) synthFallback.select();
  },
  win: () => {
    if (!playSample("win")) synthFallback.win();
  },
  lose: () => {
    if (!playSample("lose")) synthFallback.lose();
  },
  unlock: () => {
    if (!playSample("unlock")) synthFallback.unlock();
  },
};

/** Glitch Circuit — menu bed vs match bed. */
export const MUSIC_TRACKS = {
  menu: "./audio/glitch-circuit-a.mp3",
  match: "./audio/glitch-circuit-b.mp3",
} as const;

export type MusicBed = keyof typeof MUSIC_TRACKS;

const MUSIC_VOLUME = 0.38;

let musicEl: HTMLAudioElement | null = null;
let currentBed: MusicBed | null = null;
let desiredBed: MusicBed = "menu";
let unlocked = false;

function musicEnabled(): boolean {
  return getPrefs().music !== false;
}

function ensureMusic(): void {
  unlocked = true;
  if (!musicEnabled()) {
    stopMusic();
    return;
  }
  playBed(desiredBed);
}

function playBed(bed: MusicBed): void {
  if (!unlocked || !musicEnabled()) return;

  if (!musicEl) {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.volume = MUSIC_VOLUME;
  }

  if (currentBed !== bed) {
    musicEl.src = MUSIC_TRACKS[bed];
    currentBed = bed;
  }

  if (musicEl.paused) {
    void musicEl.play().catch(() => {
      /* autoplay blocked until gesture — resumeAudio retries */
    });
  }
}

export function stopMusic(): void {
  if (!musicEl) return;
  musicEl.pause();
}

/** Call when entering menu vs match screens. */
export function setMusicBed(bed: MusicBed): void {
  desiredBed = bed;
  if (unlocked) playBed(bed);
}

/** Re-apply after prefs change. */
export function syncMusic(): void {
  if (!musicEnabled()) {
    stopMusic();
    return;
  }
  if (unlocked) playBed(desiredBed);
}

export function musicBedForPhase(phase: string): MusicBed {
  if (phase === "menu" || phase === "faction_pick" || phase === "campaign_map") {
    return "menu";
  }
  return "match";
}
