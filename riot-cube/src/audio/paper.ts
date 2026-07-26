/** Soft Mixkit page-paper samples + master volume. */

type SfxId = "rustle" | "slide" | "crumple" | "flutter";

const FILES: Record<SfxId, string> = {
  rustle: "./sfx/paper_rustle.wav",
  slide: "./sfx/paper_slide.wav",
  crumple: "./sfx/paper_crumple.wav",
  flutter: "./sfx/paper_flutter.wav",
};

const VOL_KEY = "riotcube_sfx_vol";
/** Cycle: muted → soft → normal */
const VOL_STEPS = [0, 0.4, 0.75] as const;

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
let sfxVol = readStoredVol();
const buffers = new Map<SfxId, AudioBuffer>();
let loadPromise: Promise<void> | null = null;

function readStoredVol(): number {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw == null) return 0.4;
    const n = Number(raw);
    if (VOL_STEPS.includes(n as (typeof VOL_STEPS)[number])) return n;
    if (n <= 0) return 0;
    if (n < 0.55) return 0.4;
    return 0.75;
  } catch {
    return 0.4;
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

async function loadAll(): Promise<void> {
  const c = ac();
  if (!c) return;
  await Promise.all(
    (Object.keys(FILES) as SfxId[]).map(async (id) => {
      try {
        const res = await fetch(FILES[id]);
        if (!res.ok) return;
        const raw = await res.arrayBuffer();
        const buf = await c.decodeAudioData(raw.slice(0));
        buffers.set(id, buf);
      } catch {
        /* ignore */
      }
    }),
  );
}

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  void c.resume();
  unlocked = true;
  bus();
  if (!loadPromise) loadPromise = loadAll();
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
  return next;
}

function play(id: SfxId, opts?: { gain?: number; rate?: number }): void {
  const c = ac();
  const out = bus();
  const buf = buffers.get(id);
  if (!c || !out || !buf || !unlocked || sfxVol <= 0.001) return;

  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (opts?.rate ?? 1) * (0.98 + Math.random() * 0.04);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1700;
  filter.Q.value = 0.5;

  const g = c.createGain();
  const gain = (opts?.gain ?? 1) * 0.45;
  const t0 = c.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.02);
  g.gain.setValueAtTime(Math.max(0.001, gain), t0 + Math.max(0.03, buf.duration - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + buf.duration + 0.03);

  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t0);
}

export function sfxPaperRustle(): void {
  play("rustle", { gain: 0.55, rate: 1.02 });
}

export function sfxPaperSlide(): void {
  play("slide", { gain: 0.6, rate: 0.98 });
}

export function sfxPaperCrumple(): void {
  // Soft page flutter — not a harsh crumple scratch
  play("crumple", { gain: 0.65, rate: 0.94 });
}

export function sfxPaperFlutter(): void {
  play("flutter", { gain: 0.5, rate: 1.04 });
}
