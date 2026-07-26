/**
 * Offline-generate short paper SFX WAVs for RIOT CUBE.
 * Run: node scripts/gen-paper-sfx.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "sfx");
mkdirSync(outDir, { recursive: true });

const SR = 44100;

function clamp(x, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-pole lowpass */
function lowpass(samples, cutoffHz) {
  const out = new Float64Array(samples.length);
  const x = Math.exp((-2 * Math.PI * cutoffHz) / SR);
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y = samples[i] + x * (y - samples[i]);
    out[i] = y;
  }
  return out;
}

/** One-pole highpass */
function highpass(samples, cutoffHz) {
  const lp = lowpass(samples, cutoffHz);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] - lp[i];
  return out;
}

function mixInto(dst, src, gain = 1) {
  const n = Math.min(dst.length, src.length);
  for (let i = 0; i < n; i++) dst[i] += src[i] * gain;
}

function normalize(samples, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < samples.length; i++) m = Math.max(m, Math.abs(samples[i]));
  if (m < 1e-9) return samples;
  const s = peak / m;
  for (let i = 0; i < samples.length; i++) samples[i] *= s;
  return samples;
}

function envADSR(n, a, d, s, r, sustainLevel = 0.55) {
  const env = new Float64Array(n);
  const A = Math.floor(a * SR);
  const D = Math.floor(d * SR);
  const R = Math.floor(r * SR);
  const S = Math.max(0, n - A - D - R);
  let i = 0;
  for (let k = 0; k < A && i < n; k++, i++) env[i] = k / Math.max(1, A);
  for (let k = 0; k < D && i < n; k++, i++) {
    env[i] = 1 - (1 - sustainLevel) * (k / Math.max(1, D));
  }
  for (let k = 0; k < S && i < n; k++, i++) env[i] = sustainLevel;
  const start = i > 0 ? env[i - 1] : sustainLevel;
  for (let k = 0; k < R && i < n; k++, i++) {
    env[i] = start * (1 - k / Math.max(1, R));
  }
  while (i < n) env[i++] = 0;
  return env;
}

function applyEnv(samples, env) {
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * (env[i] ?? 0);
  return out;
}

function whiteNoise(n, rng) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

/** Sparse crackle impulses — the “paper fiber” character. */
function crackles(n, rng, rate, amp) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (rng() < rate) {
      const a = amp * (0.4 + rng() * 0.6) * (rng() < 0.5 ? -1 : 1);
      out[i] += a;
      if (i + 1 < n) out[i + 1] += a * 0.35;
      if (i + 2 < n) out[i + 2] += a * 0.12;
    }
  }
  return highpass(out, 1800);
}

function writeWav(path, samples) {
  const n = samples.length;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const v = clamp(samples[i]);
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

function makeRustle() {
  const rng = mulberry32(0x51a7);
  const dur = 0.16;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  let noise = whiteNoise(n, rng);
  noise = highpass(lowpass(noise, 5200), 700);
  mixInto(out, applyEnv(noise, envADSR(n, 0.008, 0.04, 0.04, 0.07, 0.35)), 0.55);
  mixInto(out, applyEnv(crackles(n, rng, 0.045, 0.9), envADSR(n, 0.002, 0.03, 0.05, 0.07, 0.25)), 0.7);
  // soft body thump
  const body = lowpass(whiteNoise(n, rng), 280);
  mixInto(out, applyEnv(body, envADSR(n, 0.004, 0.05, 0.02, 0.08, 0.2)), 0.25);
  return normalize(out, 0.85);
}

function makeSlide() {
  const rng = mulberry32(0x51a8);
  const dur = 0.22;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  let scrape = whiteNoise(n, rng);
  scrape = highpass(lowpass(scrape, 3800), 450);
  // gentle amplitude flutter like paper dragging
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    scrape[i] *= 0.7 + 0.3 * Math.sin(t * 55 + Math.sin(t * 17) * 2);
  }
  mixInto(out, applyEnv(scrape, envADSR(n, 0.01, 0.05, 0.08, 0.08, 0.45)), 0.6);
  mixInto(out, applyEnv(crackles(n, rng, 0.03, 0.7), envADSR(n, 0.005, 0.04, 0.08, 0.08, 0.3)), 0.55);
  const air = highpass(whiteNoise(n, rng), 3500);
  mixInto(out, applyEnv(air, envADSR(n, 0.02, 0.05, 0.06, 0.08, 0.25)), 0.2);
  return normalize(out, 0.88);
}

function makeCrumple() {
  const rng = mulberry32(0x51a9);
  const dur = 0.38;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  // layered bursts of crackle at irregular times
  for (let b = 0; b < 7; b++) {
    const start = Math.floor((0.02 + b * 0.045 + rng() * 0.02) * SR);
    const len = Math.floor((0.05 + rng() * 0.07) * SR);
    const burst = new Float64Array(n);
    const local = crackles(len, rng, 0.12 + rng() * 0.08, 1.1);
    const soft = highpass(lowpass(whiteNoise(len, rng), 4200), 500);
    for (let i = 0; i < len; i++) {
      const e = Math.sin((Math.PI * i) / Math.max(1, len - 1));
      const v = (local[i] * 0.75 + soft[i] * 0.35) * e;
      if (start + i < n) burst[start + i] = v;
    }
    mixInto(out, burst, 0.55 + rng() * 0.35);
  }
  // low crush body
  const body = lowpass(whiteNoise(n, rng), 220);
  mixInto(out, applyEnv(body, envADSR(n, 0.01, 0.08, 0.15, 0.12, 0.4)), 0.35);
  // bright snap at start
  const snap = highpass(crackles(Math.floor(0.08 * SR), rng, 0.2, 1.2), 2500);
  const snapPad = new Float64Array(n);
  for (let i = 0; i < snap.length; i++) snapPad[i] = snap[i];
  mixInto(out, applyEnv(snapPad, envADSR(n, 0.001, 0.02, 0.02, 0.04, 0.15)), 0.8);
  return normalize(out, 0.9);
}

function makeFlutter() {
  const rng = mulberry32(0x51aa);
  const dur = 0.12;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  let flap = whiteNoise(n, rng);
  flap = highpass(lowpass(flap, 4500), 900);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    flap[i] *= 0.55 + 0.45 * Math.abs(Math.sin(t * 90));
  }
  mixInto(out, applyEnv(flap, envADSR(n, 0.004, 0.025, 0.03, 0.055, 0.3)), 0.65);
  mixInto(out, applyEnv(crackles(n, rng, 0.05, 0.65), envADSR(n, 0.002, 0.02, 0.03, 0.05, 0.2)), 0.45);
  return normalize(out, 0.82);
}

const files = {
  "paper_rustle.wav": makeRustle(),
  "paper_slide.wav": makeSlide(),
  "paper_crumple.wav": makeCrumple(),
  "paper_flutter.wav": makeFlutter(),
};

for (const [name, samples] of Object.entries(files)) {
  const path = join(outDir, name);
  writeWav(path, samples);
  console.log("wrote", path, `(${(samples.length / SR).toFixed(2)}s)`);
}
