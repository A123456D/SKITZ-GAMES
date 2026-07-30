/**
 * Nexus Chess SFX — ElevenLabs samples when present, procedural fallback.
 */

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

let ctx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;
const buffers = new Map<SampleId, AudioBuffer>();
let loadPromise: Promise<void> | null = null;

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
    master.gain.value = 0.85;
    master.connect(c.destination);
  }
  return master;
}

function playSample(
  id: SampleId,
  opts?: { volume?: number; vary?: boolean },
): boolean {
  const c = ac();
  const out = bus();
  const buf = buffers.get(id);
  if (!c || !out || !buf || !unlocked) return false;
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
          const res = await fetch(`./sfx/${SAMPLE_FILES[id]}`);
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
  filter.frequency.value = 1200;
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
  tone(c, 660, t, 0.04, "sine", 0.05, dest);
}

export function playAbility(): void {
  if (playSample("ability", { vary: false })) return;
  const c = ac();
  const dest = masterDest();
  if (!c || !dest) return;
  const t = c.currentTime;
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
  tone(c, 220, t, 0.2, "sine", 0.08, dest);
  tone(c, 160, t + 0.1, 0.25, "triangle", 0.06, dest);
}
