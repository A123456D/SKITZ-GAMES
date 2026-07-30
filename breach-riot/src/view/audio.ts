let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function unlockAudio(): void {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04): void {
  if (!enabled) return;
  if (!ctx) ctx = new AudioContext();
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

export function playPick(): void {
  beep(520, 0.06, "square", 0.035);
}

export function playIllegal(): void {
  beep(140, 0.1, "sawtooth", 0.03);
}

export function playComplete(): void {
  beep(660, 0.08, "square", 0.04);
  setTimeout(() => beep(880, 0.1, "square", 0.035), 60);
}

export function playWin(): void {
  beep(440, 0.08, "triangle", 0.04);
  setTimeout(() => beep(660, 0.1, "triangle", 0.04), 70);
  setTimeout(() => beep(880, 0.14, "triangle", 0.045), 140);
}

export function playFail(): void {
  beep(180, 0.18, "sawtooth", 0.04);
}
