/** Procedural SFX via Web Audio — no asset files required. */

import { getSharedAudioContext, resumeSharedAudioContext } from "./sharedContext";

let unlocked = false;
let sfxVol = 0.85;
let master: GainNode | null = null;

/**
 * Effects were mixed far under the music bed. The trim scales the bus above
 * unity so a mid slider is audible; individual voices peak near 0.09, so even
 * overlapping stings stay well clear of clipping.
 */
const SFX_TRIM = 1.28;

function busLevel(): number {
  return sfxVol * SFX_TRIM;
}

function ac(): AudioContext | null {
  return getSharedAudioContext();
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
  void resumeSharedAudioContext();
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
  tone(190 + Math.random() * 35, 0.028, "triangle", 0.045);
}

/** Soft detent / ratchet. */
export function sfxSnap(): void {
  tone(95, 0.06, "sine", 0.07, 0, 55);
  tone(240, 0.045, "triangle", 0.055);
  tone(480, 0.06, "triangle", 0.03, 0.018);
}

export function sfxPortLink(): void {
  tone(380, 0.05, "triangle", 0.055);
  tone(620, 0.07, "sine", 0.045, 0.025, 760);
  tone(240, 0.04, "sine", 0.03, 0.01);
}

export function sfxBeamHit(): void {
  tone(88, 0.1, "sine", 0.06, 0, 42);
}

export function sfxReceiverOn(): void {
  tone(660, 0.12, "sine", 0.09);
  tone(880, 0.14, "triangle", 0.06, 0.05);
}

/** Soft rubber thud when a check finds open ends. */
export function sfxFail(): void {
  tone(70, 0.14, "sine", 0.08, 0, 36);
  tone(140, 0.09, "triangle", 0.04, 0.03);
}

/** Victory / result sheet popup. */
export function sfxPopup(): void {
  tone(320, 0.08, "sine", 0.05);
  tone(480, 0.1, "triangle", 0.04, 0.05);
}

/** Fire a check — soft thud. */
export function sfxPulse(): void {
  tone(160, 0.09, "sine", 0.07, 0, 70);
  tone(340, 0.07, "triangle", 0.04, 0.02);
}

export function sfxWin(): void {
  tone(523, 0.16, "sine", 0.08);
  tone(659, 0.18, "sine", 0.075, 0.1);
  tone(784, 0.28, "triangle", 0.09, 0.2);
}
