/** Lightweight procedural SFX via Web Audio API. */

let ctx: AudioContext | null = null;
let unlocked = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
}

/** Call from first pointer gesture so browsers allow audio. */
export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
}

function envGain(c: AudioContext, start: number, attack: number, hold: number, release: number, peak = 0.2): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, start + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
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

function noiseBurst(c: AudioContext, start: number, dur: number, peak: number, dest: AudioNode) {
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

function master(): AudioNode | null {
  const c = ac();
  if (!c || !unlocked) return null;
  if (c.state === "suspended") void c.resume();
  return c.destination;
}

/** Soft whoosh as a piece lifts into a jump. */
export function playMoveLift(): void {
  const c = ac();
  const dest = master();
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

/** Hard land / crash when a piece hits the board. */
export function playMoveLand(): void {
  const c = ac();
  const dest = master();
  if (!c || !dest) return;
  const t = c.currentTime;
  noiseBurst(c, t, 0.06, 0.12, dest);
  tone(c, 90, t, 0.1, "triangle", 0.14, dest);
  tone(c, 180, t + 0.01, 0.07, "sine", 0.06, dest);
}

/** Capture impact — brighter crunch. */
export function playCapture(): void {
  const c = ac();
  const dest = master();
  if (!c || !dest) return;
  const t = c.currentTime;
  noiseBurst(c, t, 0.1, 0.18, dest);
  tone(c, 140, t, 0.12, "square", 0.08, dest);
  tone(c, 70, t, 0.16, "sawtooth", 0.1, dest);
  tone(c, 520, t + 0.02, 0.08, "sine", 0.05, dest);
}

/** Soft UI click. */
export function playUiTap(): void {
  const c = ac();
  const dest = master();
  if (!c || !dest) return;
  const t = c.currentTime;
  tone(c, 660, t, 0.04, "sine", 0.05, dest);
}

/** Ability cast shimmer. */
export function playAbility(): void {
  const c = ac();
  const dest = master();
  if (!c || !dest) return;
  const t = c.currentTime;
  tone(c, 440, t, 0.08, "sine", 0.06, dest);
  tone(c, 660, t + 0.04, 0.1, "sine", 0.05, dest);
  tone(c, 880, t + 0.08, 0.12, "triangle", 0.04, dest);
}
