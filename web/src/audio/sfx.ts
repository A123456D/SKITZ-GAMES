/** Procedural SFX via Web Audio — no asset files required. */

import { getThemeId } from "../view/palette";

let ctx: AudioContext | null = null;
let unlocked = false;
let sfxVol = 0.85;
let master: GainNode | null = null;

/**
 * Effects were mixed far under the music bed. The trim scales the bus above
 * unity so a mid slider is audible; individual voices peak near 0.09, so even
 * overlapping stings stay well clear of clipping.
 */
const SFX_TRIM = 3.2;

function busLevel(): number {
  return sfxVol * SFX_TRIM;
}

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
    master.gain.value = busLevel();
    master.connect(c.destination);
  }
  return master;
}

export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v));
  const g = bus();
  if (g) g.gain.value = busLevel();
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

function isRetro(): boolean {
  return getThemeId() === "retro";
}

function isPunk(): boolean {
  return getThemeId() === "punk";
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

/** Short noise burst for arcade grit (retro only). */
function noiseBurst(dur: number, gain: number, when = 0, hp = 800): void {
  const c = ac();
  const out = bus();
  if (!c || !out || !unlocked || sfxVol <= 0.001) return;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hp;
  filter.Q.value = 0.8;
  const g = c.createGain();
  const t0 = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxTick(): void {
  if (isRetro()) {
    tone(880 + Math.random() * 60, 0.022, "square", 0.035);
    return;
  }
  if (isPunk()) {
    tone(140 + Math.random() * 40, 0.02, "square", 0.04);
    noiseBurst(0.018, 0.03, 0, 2200);
    return;
  }
  tone(190 + Math.random() * 35, 0.028, "triangle", 0.045);
}

/** Soft detent — paper ratchet, or arcade latch for retro. */
export function sfxSnap(): void {
  if (isRetro()) {
    // Crisp synth latch + soft zap.
    tone(180, 0.05, "square", 0.06, 0, 320);
    tone(720, 0.04, "sawtooth", 0.04, 0.01, 420);
    noiseBurst(0.035, 0.045, 0.005, 1400);
    return;
  }
  if (isPunk()) {
    // Distorted sticker slap.
    tone(70, 0.07, "sawtooth", 0.08, 0, 40);
    tone(210, 0.05, "square", 0.05);
    noiseBurst(0.05, 0.06, 0, 900);
    return;
  }
  tone(95, 0.06, "sine", 0.07, 0, 55);
  tone(240, 0.045, "triangle", 0.055);
  tone(480, 0.06, "triangle", 0.03, 0.018);
}

export function sfxPortLink(): void {
  if (isRetro()) {
    // Neon handshake chirp.
    tone(440, 0.07, "square", 0.055, 0, 880);
    tone(880, 0.09, "triangle", 0.04, 0.04);
    noiseBurst(0.03, 0.025, 0.02, 1600);
    return;
  }
  if (isPunk()) {
    // Sticky slap + high zip.
    tone(90, 0.05, "sawtooth", 0.07, 0, 55);
    tone(620, 0.06, "square", 0.05, 0.02);
    noiseBurst(0.04, 0.05, 0, 1100);
    return;
  }
  if (getThemeId() === "mono") {
    // Clean digital confirm blip.
    tone(980, 0.045, "square", 0.045);
    tone(1480, 0.07, "triangle", 0.055, 0.03);
    tone(1960, 0.05, "sine", 0.03, 0.07);
    return;
  }
  // Ink — soft graphite click + pencil chirp.
  tone(380, 0.05, "triangle", 0.055);
  tone(620, 0.07, "sine", 0.045, 0.025, 760);
  tone(240, 0.04, "sine", 0.03, 0.01);
}

export function sfxBeamHit(): void {
  if (isRetro()) {
    tone(220, 0.08, "sawtooth", 0.05, 0, 110);
    noiseBurst(0.05, 0.04, 0, 600);
    return;
  }
  tone(88, 0.1, "sine", 0.06, 0, 42);
}

export function sfxReceiverOn(): void {
  if (isRetro()) {
    tone(660, 0.1, "square", 0.07);
    tone(990, 0.12, "triangle", 0.05, 0.05);
    tone(1320, 0.1, "sine", 0.035, 0.1);
    return;
  }
  tone(660, 0.12, "sine", 0.09);
  tone(880, 0.14, "triangle", 0.06, 0.05);
}

/** Soft rubber thud / arcade dud when a check finds open ends. */
export function sfxFail(): void {
  if (isRetro()) {
    tone(140, 0.12, "sawtooth", 0.07, 0, 55);
    tone(70, 0.16, "square", 0.05, 0.04, 40);
    noiseBurst(0.1, 0.05, 0.02, 300);
    return;
  }
  tone(70, 0.14, "sine", 0.08, 0, 36);
  tone(140, 0.09, "triangle", 0.04, 0.03);
}

/** Victory / result sheet popup. */
export function sfxPopup(): void {
  if (isRetro()) {
    // Bright arcade panel sting — chunk + rising chirp.
    noiseBurst(0.06, 0.055, 0, 900);
    tone(220, 0.08, "square", 0.06, 0.01, 440);
    tone(660, 0.1, "triangle", 0.05, 0.06);
    tone(990, 0.14, "sine", 0.04, 0.12);
    return;
  }
  tone(320, 0.08, "sine", 0.05);
  tone(480, 0.1, "triangle", 0.04, 0.05);
}

/** Fire a check — paper soft thud, or a retrowave laser burst. */
export function sfxPulse(): void {
  if (isRetro()) {
    // Satisfying synth laser: down-sweep + bright tip + grit.
    tone(920, 0.1, "sawtooth", 0.07, 0, 180);
    tone(480, 0.12, "square", 0.055, 0.02, 90);
    tone(1400, 0.06, "triangle", 0.04, 0.04, 700);
    noiseBurst(0.07, 0.05, 0.01, 1800);
    return;
  }
  tone(160, 0.09, "sine", 0.07, 0, 70);
  tone(340, 0.07, "triangle", 0.04, 0.02);
}

export function sfxWin(): void {
  if (isRetro()) {
    // Rising arcade clear — square arpeggio with a noise sparkle.
    tone(523, 0.12, "square", 0.07);
    tone(659, 0.12, "square", 0.065, 0.08);
    tone(784, 0.14, "square", 0.07, 0.16);
    tone(1046, 0.22, "triangle", 0.08, 0.26);
    noiseBurst(0.12, 0.04, 0.3, 2000);
    return;
  }
  tone(523, 0.16, "sine", 0.08);
  tone(659, 0.18, "sine", 0.075, 0.1);
  tone(784, 0.28, "triangle", 0.09, 0.2);
}
