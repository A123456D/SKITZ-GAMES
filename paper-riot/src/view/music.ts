/**
 * Theme-mapped soundtrack with soft crossfades.
 * Shares the SFX AudioContext so mobile doesn't duck the bed under every SFX.
 */
import { getSharedAudioContext, isAudioUnlocked } from "./audio";
import type { ThemeId } from "./theme";

type PlaylistManifest = {
  tracks?: string[];
  beds?: Partial<Record<ThemeId, string[]>>;
  crossfadeMs?: number;
};

const VOL_KEY = "paper-riot-music-vol";
const VOL_STEPS = [0, 0.35, 0.7] as const;
/** Keep music under SFX so matches stay crisp. */
const MUSIC_TRIM = 0.16;

let musicVol = readStoredVol();
let started = false;
let allTracks: string[] = [];
let beds: Partial<Record<ThemeId, string[]>> = {};
let tracks: string[] = [];
let bed: ThemeId = "scrap";
let crossfadeMs = 2800;
let bag: string[] = [];
let lastTrack: string | null = null;
let manifestPromise: Promise<void> | null = null;

let a: HTMLAudioElement | null = null;
let b: HTMLAudioElement | null = null;
let usingA = true;
let gainA: GainNode | null = null;
let gainB: GainNode | null = null;
let graphReady = false;
let transitioning = false;
let fadeRaf = 0;
let crossfadePoll = 0;
let playEpoch = 0;

function readStoredVol(): number {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw == null) return 0.7;
    const n = Number(raw);
    if (VOL_STEPS.includes(n as (typeof VOL_STEPS)[number])) return n;
    if (n <= 0) return 0;
    if (n < 0.5) return 0.35;
    return 0.7;
  } catch {
    return 0.7;
  }
}

function trackUrl(file: string): string {
  return `./music/${file}?v=1`;
}

function shuffleInPlace(list: string[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i]!;
    list[i] = list[j]!;
    list[j] = tmp;
  }
}

function refillBag(): void {
  bag = [...tracks];
  if (bag.length <= 1) return;
  shuffleInPlace(bag);
  if (lastTrack && bag[0] === lastTrack && bag.length > 1) {
    const swap = 1 + Math.floor(Math.random() * (bag.length - 1));
    const tmp = bag[0]!;
    bag[0] = bag[swap]!;
    bag[swap] = tmp;
  }
}

function peekNext(): string | null {
  if (!tracks.length) return null;
  if (!bag.length) refillBag();
  return bag[0] ?? null;
}

function takeNext(): string | null {
  if (!tracks.length) return null;
  if (!bag.length) refillBag();
  const pick = bag.shift() ?? null;
  if (pick) lastTrack = pick;
  return pick;
}

function makeSlot(): HTMLAudioElement {
  const el = new Audio();
  el.preload = "auto";
  el.loop = false;
  el.volume = 1;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  return el;
}

function ensureSlots(): void {
  if (!a) a = makeSlot();
  if (!b) b = makeSlot();
}

function ensureGraph(): void {
  if (graphReady) return;
  ensureSlots();
  const ctx = getSharedAudioContext();
  if (!ctx || !a || !b) return;
  gainA = ctx.createGain();
  gainB = ctx.createGain();
  gainA.gain.value = 0;
  gainB.gain.value = 0;
  gainA.connect(ctx.destination);
  gainB.connect(ctx.destination);
  ctx.createMediaElementSource(a).connect(gainA);
  ctx.createMediaElementSource(b).connect(gainB);
  a.volume = 1;
  b.volume = 1;
  graphReady = true;
}

function active(): HTMLAudioElement {
  ensureSlots();
  return usingA ? a! : b!;
}

function inactive(): HTMLAudioElement {
  ensureSlots();
  return usingA ? b! : a!;
}

function gainOf(el: HTMLAudioElement): GainNode {
  ensureGraph();
  return el === a ? gainA! : gainB!;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function targetLevel(): number {
  return clamp01(musicVol * MUSIC_TRIM);
}

function setGain(el: HTMLAudioElement, value: number): void {
  if (!graphReady) return;
  gainOf(el).gain.value = clamp01(value);
}

function getGain(el: HTMLAudioElement): number {
  if (!graphReady) return 0;
  return gainOf(el).gain.value;
}

function applyActiveGain(): void {
  if (!graphReady || transitioning) return;
  setGain(active(), targetLevel());
  setGain(inactive(), 0);
}

function cancelFade(): void {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeRaf = 0;
}

function loadInto(el: HTMLAudioElement, file: string): void {
  const url = trackUrl(file);
  if (el.dataset.track === file && el.src) return;
  el.dataset.track = file;
  el.src = url;
  el.load();
}

function preloadNext(): void {
  const next = peekNext();
  if (!next) return;
  loadInto(inactive(), next);
}

function stopCrossfadePoll(): void {
  if (crossfadePoll) window.clearInterval(crossfadePoll);
  crossfadePoll = 0;
}

function watchCrossfade(): void {
  stopCrossfadePoll();
  const check = () => {
    if (transitioning) return;
    const cur = active();
    if (cur.duration && isFinite(cur.duration) && cur.duration > 0) {
      const remain = cur.duration - cur.currentTime;
      const fadeSec = crossfadeMs / 1000;
      const trigger = Math.min(fadeSec, Math.max(0.8, cur.duration * 0.2));
      if (remain <= trigger && remain > 0) {
        stopCrossfadePoll();
        void beginCrossfade(false);
        return;
      }
    }
    if (cur.ended) {
      stopCrossfadePoll();
      void beginCrossfade(true);
    }
  };
  crossfadePoll = window.setInterval(check, 400);
}

function fade(
  el: HTMLAudioElement,
  from: number,
  to: number,
  ms: number,
): Promise<void> {
  cancelFade();
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / Math.max(1, ms));
      const eased = t * t * (3 - 2 * t);
      setGain(el, from + (to - from) * eased);
      if (t < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        fadeRaf = 0;
        resolve();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  });
}

async function safePlay(el: HTMLAudioElement): Promise<void> {
  try {
    await el.play();
  } catch {
    /* autoplay / gesture — next unlock retries */
  }
}

async function beginCrossfade(hard: boolean): Promise<void> {
  if (transitioning || musicVol <= 0.001) return;
  const nextFile = takeNext();
  if (!nextFile) return;
  const epoch = playEpoch;
  transitioning = true;
  ensureGraph();
  const from = active();
  const to = inactive();
  loadInto(to, nextFile);
  setGain(to, 0);
  await safePlay(to);
  if (epoch !== playEpoch) {
    transitioning = false;
    return;
  }
  const ms = hard ? Math.min(900, crossfadeMs) : crossfadeMs;
  await Promise.all([
    fade(from, getGain(from), 0, ms),
    fade(to, 0, targetLevel(), ms),
  ]);
  if (epoch !== playEpoch) {
    transitioning = false;
    return;
  }
  try {
    from.pause();
  } catch {
    /* ignore */
  }
  usingA = !usingA;
  transitioning = false;
  preloadNext();
  watchCrossfade();
}

async function ensureManifest(): Promise<void> {
  if (manifestPromise) return manifestPromise;
  manifestPromise = (async () => {
    try {
      const res = await fetch("./music/playlist.json?v=2");
      if (!res.ok) return;
      const data = (await res.json()) as PlaylistManifest;
      allTracks = (data.tracks ?? []).filter(Boolean);
      beds = data.beds ?? {};
      crossfadeMs = data.crossfadeMs ?? 2800;
      if (!tracks.length) {
        tracks = beds[bed]?.length ? [...beds[bed]!] : [...allTracks];
      }
    } catch {
      /* ignore */
    }
  })();
  return manifestPromise;
}

function applyBed(theme: ThemeId): void {
  bed = theme;
  const pool = beds[theme];
  tracks = pool?.length ? [...pool] : [...allTracks];
  bag = [];
  lastTrack = null;
}

function hardStop(): void {
  stopCrossfadePoll();
  cancelFade();
  playEpoch++;
  transitioning = false;
  if (a) {
    try {
      a.pause();
    } catch {
      /* ignore */
    }
    setGain(a, 0);
  }
  if (b) {
    try {
      b.pause();
    } catch {
      /* ignore */
    }
    setGain(b, 0);
  }
}

async function startPlayback(): Promise<void> {
  if (!isAudioUnlocked() || musicVol <= 0.001) return;
  await ensureManifest();
  if (!tracks.length && allTracks.length) tracks = [...allTracks];
  if (!tracks.length) return;
  ensureGraph();
  const ctx = getSharedAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();

  if (!started) {
    started = true;
    const first = takeNext();
    if (!first) return;
    const el = active();
    loadInto(el, first);
    setGain(el, 0);
    await safePlay(el);
    await fade(el, 0, targetLevel(), 900);
    preloadNext();
    watchCrossfade();
    return;
  }

  applyActiveGain();
  const el = active();
  if (el.paused) await safePlay(el);
  watchCrossfade();
}

export function getMusicVolume(): number {
  return musicVol;
}

export function setMusicVolume(v: number): void {
  musicVol = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem(VOL_KEY, String(musicVol));
  } catch {
    /* ignore */
  }
  if (musicVol <= 0.001) {
    hardStop();
    return;
  }
  applyActiveGain();
  if (isAudioUnlocked()) void startPlayback();
}

export function cycleMusicVolume(): number {
  const i = VOL_STEPS.findIndex((s) => Math.abs(s - musicVol) < 0.05);
  const next = VOL_STEPS[(i + 1) % VOL_STEPS.length]!;
  setMusicVolume(next);
  return next;
}

/** Pause/resume music with the master SOUND toggle. */
export function setMusicMuted(muted: boolean): void {
  if (muted) {
    hardStop();
    started = false;
    return;
  }
  if (musicVol <= 0.001) musicVol = 0.7;
  if (isAudioUnlocked()) void startPlayback();
}

/** Switch the shuffled bed when the visual theme changes. */
export function setMusicThemeBed(theme: ThemeId): void {
  void (async () => {
    await ensureManifest();
    const prev = tracks.slice().sort().join("|");
    applyBed(theme);
    const next = tracks.slice().sort().join("|");
    if (prev === next && started) return;
    hardStop();
    started = false;
    bag = [];
    lastTrack = null;
    if (isAudioUnlocked() && musicVol > 0.001) void startPlayback();
  })();
}

/** Call after unlockAudio() on first gesture. */
export function unlockMusic(): void {
  void startPlayback();
}

export function syncMusicForTheme(theme: ThemeId): void {
  setMusicThemeBed(theme);
}
