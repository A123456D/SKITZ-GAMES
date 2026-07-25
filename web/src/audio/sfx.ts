/** Procedural SFX via Web Audio — no asset files required. */

let ctx: AudioContext | null = null;
let unlocked = false;
let sfxVol = 0.85;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (
    typeof AudioContext === "undefined" &&
    typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ===
      "undefined"
  ) {
    return null;
  }
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
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

export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v));
  const g = bus();
  if (g) g.gain.value = sfxVol;
}

export function getSfxVolume(): number {
  return sfxVol;
}

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
  bus();
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
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfxTick(): void {
  tone(180 + Math.random() * 40, 0.03, "triangle", 0.03);
}

export function sfxSnap(): void {
  tone(220, 0.05, "square", 0.06);
  tone(440, 0.08, "triangle", 0.04, 0.02);
}

export function sfxPortLink(): void {
  tone(520, 0.07, "sine", 0.05, 0, 680);
}

export function sfxBeamHit(): void {
  tone(90, 0.09, "sawtooth", 0.04, 0, 40);
}

export function sfxReceiverOn(): void {
  tone(660, 0.12, "sine", 0.07);
  tone(880, 0.14, "triangle", 0.05, 0.05);
}

export function sfxWin(): void {
  tone(523, 0.15, "sine", 0.06);
  tone(659, 0.18, "sine", 0.06, 0.1);
  tone(784, 0.25, "triangle", 0.07, 0.2);
}
