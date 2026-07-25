/**
 * Shuffled playlist with soft crossfades.
 *
 * Mobile (Android Chrome / iOS Safari) stuttered because the old player:
 *  1. Touched HTMLAudioElement.volume every animation frame (iOS ignores it;
 *     Android often glitches when both players decode + volume-rampa).
 *  2. Created a fresh Audio() at crossfade time with no preload (5–7 MB MP3s).
 *  3. Ran two cold decodes overlapping while the game loop also ducked volume.
 *
 * Fix: two persistent elements ping-pong, volume via Web Audio GainNodes,
 * next track preloaded into the idle slot, and crossfade starts near track end
 * once the next file is already buffering.
 */

type PlaylistManifest = {
  tracks: string[];
  crossfadeMs?: number;
};

let musicVol = 0.7;
let unlocked = false;
let started = false;
let tracks: string[] = [];
let crossfadeMs = 2800;
let bag: string[] = [];
let lastTrack: string | null = null;
let screenToken = "";
let manifestPromise: Promise<void> | null = null;

let a: HTMLAudioElement | null = null;
let b: HTMLAudioElement | null = null;
let usingA = true;
let ctx: AudioContext | null = null;
let gainA: GainNode | null = null;
let gainB: GainNode | null = null;
let graphReady = false;
let transitioning = false;
let fadeRaf = 0;
let crossfadePoll = 0;
let duckGain = 1;
let duckClear: number | null = null;
let resumeChain: Promise<void> = Promise.resolve();

function trackUrl(file: string): string {
  return `./music/${file}`;
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
  el.volume = 1; // level is GainNode-only — element volume stays max
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
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  gainA = ctx.createGain();
  gainB = ctx.createGain();
  gainA.gain.value = 0;
  gainB.gain.value = 0;
  gainA.connect(ctx.destination);
  gainB.connect(ctx.destination);
  // createMediaElementSource may only be called once per element.
  ctx.createMediaElementSource(a!).connect(gainA);
  ctx.createMediaElementSource(b!).connect(gainB);
  a!.volume = 1;
  b!.volume = 1;
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
  return clamp01(musicVol * duckGain);
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
  // Audio timing does not need a 60fps main-thread poll (that also stuttered).
  crossfadePoll = window.setInterval(check, 400);
  check();
}

function fadeGain(el: HTMLAudioElement, to: number, ms: number, from?: number): Promise<void> {
  cancelFade();
  const start = from ?? getGain(el);
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / Math.max(1, ms));
      const eased = p * p * (3 - 2 * p);
      setGain(el, start + (to - start) * eased);
      if (p < 1) fadeRaf = requestAnimationFrame(step);
      else {
        fadeRaf = 0;
        setGain(el, to);
        resolve();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  });
}

async function beginCrossfade(hard: boolean): Promise<void> {
  if (transitioning) return;
  transitioning = true;
  cancelFade();

  const from = active();
  const to = inactive();
  const next = takeNext();
  if (!next) {
    transitioning = false;
    watchCrossfade();
    return;
  }

  loadInto(to, next);
  try {
    to.currentTime = 0;
  } catch {
    /* some mobile browsers throw if not ready */
  }
  setGain(to, 0);
  try {
    await to.play();
  } catch {
    transitioning = false;
    watchCrossfade();
    return;
  }

  const ms = hard ? 700 : crossfadeMs;
  const fromStart = getGain(from);
  const target = targetLevel();
  const t0 = performance.now();

  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / Math.max(1, ms));
      const eased = p * p * (3 - 2 * p);
      setGain(from, fromStart * (1 - eased));
      setGain(to, target * eased);
      if (p < 1) fadeRaf = requestAnimationFrame(step);
      else {
        fadeRaf = 0;
        resolve();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  });

  from.pause();
  try {
    from.currentTime = 0;
  } catch {
    /* ignore */
  }
  setGain(from, 0);
  usingA = !usingA;
  setGain(active(), targetLevel());
  preloadNext();
  transitioning = false;
  watchCrossfade();
}

function loadManifest(): Promise<void> {
  if (tracks.length) return Promise.resolve();
  if (manifestPromise) return manifestPromise;
  manifestPromise = (async () => {
    try {
      const res = await fetch("./music/playlist.json", { cache: "force-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as PlaylistManifest;
      tracks = (data.tracks ?? []).filter((t) => typeof t === "string" && t.length > 0);
      if (typeof data.crossfadeMs === "number" && data.crossfadeMs > 0) {
        // Floor at 2s — short fades amplify mobile decode pops.
        crossfadeMs = Math.max(2000, data.crossfadeMs);
      }
    } catch {
      tracks = [];
    }
  })();
  return manifestPromise;
}

export function setMusicVolume(v: number): void {
  musicVol = clamp01(v);
  applyActiveGain();
}

export function getMusicVolume(): number {
  return musicVol;
}

/** Call from the same user gesture as SFX unlock. */
export function unlockMusic(): void {
  unlocked = true;
  ensureGraph();
  if (ctx?.state === "suspended") {
    resumeChain = ctx.resume().then(() => undefined).catch(() => undefined);
  }
  void ensureMusicPlaying();
}

export async function ensureMusicPlaying(): Promise<void> {
  if (!unlocked) return;
  await loadManifest();
  if (!tracks.length) return;
  ensureGraph();
  await resumeChain;

  if (started) {
    const el = active();
    if (el.paused) {
      try {
        await el.play();
      } catch {
        /* still blocked */
      }
    }
    if (!transitioning) applyActiveGain();
    return;
  }

  started = true;
  const first = takeNext();
  if (!first) {
    started = false;
    return;
  }

  const el = active();
  loadInto(el, first);
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  setGain(el, 0);
  try {
    await el.play();
  } catch {
    started = false;
    return;
  }
  void fadeGain(el, targetLevel(), 1200, 0);
  preloadNext();
  watchCrossfade();
}

/**
 * Keep the bed going across screens. Soft duck via GainNode (no element.volume
 * RAF), and never re-enter if the screen hasn't changed — the game loop calls
 * this every frame.
 */
export function onMusicScreen(screen: string): void {
  if (!unlocked) return;
  if (screen === screenToken) return;
  screenToken = screen;
  void ensureMusicPlaying().then(() => {
    if (!started || musicVol <= 0.001 || transitioning) return;
    duckGain = 0.45;
    applyActiveGain();
    if (duckClear !== null) window.clearTimeout(duckClear);
    duckClear = window.setTimeout(() => {
      duckGain = 1;
      applyActiveGain();
      duckClear = null;
    }, 420);
  });
}
