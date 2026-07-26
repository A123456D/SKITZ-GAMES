/** Sample-based paper SFX with light playback variation. */

type SfxId = "rustle" | "slide" | "crumple" | "flutter";

const FILES: Record<SfxId, string> = {
  rustle: "./sfx/paper_rustle.wav",
  slide: "./sfx/paper_slide.wav",
  crumple: "./sfx/paper_crumple.wav",
  flutter: "./sfx/paper_flutter.wav",
};

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
let sfxVol = 0.92;
const buffers = new Map<SfxId, AudioBuffer>();
let loadPromise: Promise<void> | null = null;

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
        /* ignore missing sample */
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

function play(id: SfxId, opts?: { gain?: number; rate?: number }): void {
  const c = ac();
  const out = bus();
  const buf = buffers.get(id);
  if (!c || !out || !buf || !unlocked || sfxVol <= 0.001) return;

  const src = c.createBufferSource();
  src.buffer = buf;
  const baseRate = opts?.rate ?? 1;
  // Slight random pitch so repeats don't feel identical
  src.playbackRate.value = baseRate * (0.94 + Math.random() * 0.12);

  const g = c.createGain();
  const gain = (opts?.gain ?? 1) * 0.85;
  const t0 = c.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.008);
  g.gain.setValueAtTime(Math.max(0.001, gain), t0 + Math.max(0.02, buf.duration - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + buf.duration + 0.02);

  src.connect(g);
  g.connect(out);
  src.start(t0);
}

export function sfxPaperRustle(): void {
  play("rustle", { gain: 0.75, rate: 1.05 });
}

export function sfxPaperSlide(): void {
  play("slide", { gain: 0.9, rate: 1 });
}

export function sfxPaperCrumple(): void {
  play("crumple", { gain: 1, rate: 0.98 });
}

export function sfxPaperFlutter(): void {
  play("flutter", { gain: 0.7, rate: 1.08 });
}
