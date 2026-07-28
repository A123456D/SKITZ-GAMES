/**
 * Shuffled playlist with soft crossfades.
 *
 * Mobile (Android Chrome / iOS Safari) stuttered because the old player:
 *  1. Touched HTMLAudioElement.volume every animation frame (iOS ignores it;
 *     Android often glitches when both players decode + volume-ramp).
 *  2. Created a fresh Audio() at crossfade time with no preload (5–7 MB MP3s).
 *  3. Ran two cold decodes overlapping while the game loop also ducked volume.
 *
 * Fix: two persistent elements ping-pong, volume via Web Audio GainNodes on
 * one shared AudioContext with SFX, next track preloaded into the idle slot,
 * and crossfade starts near track end once the next file is already buffering.
 *
 * Dual AudioContexts duck each other on Android. Splitting music onto the
 * HTML media stream (element.volume) while SFX stay in Web Audio also lets
 * the OS duck the bed under every tick — so installed PWAs use the same
 * shared GainNode path as the browser tab.
 */

import { getSharedAudioContext, resumeSharedAudioContext } from "./sharedContext";

type PlaylistManifest = {
  tracks?: string[];
  ambient?: string[];
  cyber?: string[];
  retro?: string[];
  punk?: string[];
  /** Per-bed opener pool — the first track after a bed starts comes from here. */
  leads?: Record<string, string[]>;
  crossfadeMs?: number;
};

export type MusicBed = "ambient" | "cyber" | "retro" | "punk";

let musicVol = 0.7;
let unlocked = false;
let started = false;
let ambientTracks: string[] = [];
let cyberTracks: string[] = [];
let retroTracks: string[] = [];
let punkTracks: string[] = [];
let leadsByBed: Partial<Record<MusicBed, string[]>> = {};
let tracks: string[] = [];
let bed: MusicBed = "ambient";
let crossfadeMs = 2800;
let bag: string[] = [];
let lastTrack: string | null = null;
/** Recently finished/skipped tracks — used for skip-previous. */
let history: string[] = [];
/** When set, the next takeNext() returns this instead of shuffling. */
let forcedNext: string | null = null;
let screenToken = "";
let manifestPromise: Promise<void> | null = null;

let a: HTMLAudioElement | null = null;
let b: HTMLAudioElement | null = null;
let usingA = true;
let ctx: AudioContext | null = null;
let gainA: GainNode | null = null;
let gainB: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicComp: DynamicsCompressorNode | null = null;
let graphReady = false;
let transitioning = false;
let fadeRaf = 0;
let crossfadePoll = 0;
let resumeChain: Promise<void> = Promise.resolve();
/** Bumped to cancel in-flight crossfades (theme bed swaps). */
let playEpoch = 0;

function trackUrl(file: string): string {
  // Bust HTTP caches so phones pick up re-leveled cyber beds.
  return `./music/${file}?v=11`;
}

function artworkUrl(file: string): string {
  try {
    return new URL(file, document.baseURI).href;
  } catch {
    return file;
  }
}

function prettyTrackTitle(file: string): string {
  return file
    .replace(/\.mp3$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Brand the Android/iOS now-playing chip so it isn't Chrome's icon. */
function updateMediaSession(file: string | null): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    if (!file) {
      navigator.mediaSession.playbackState = "none";
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Pulse Link",
      artist: prettyTrackTitle(file),
      album: "Pulse Link",
      artwork: [
        { src: artworkUrl("./icons/icon-192-v7.png"), sizes: "192x192", type: "image/png" },
        { src: artworkUrl("./icons/icon-512-v7.png"), sizes: "512x512", type: "image/png" },
      ],
    });
    navigator.mediaSession.playbackState = "playing";
  } catch {
    /* Media Session is best-effort on older WebViews */
  }
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
  // Avoid opening on the same track we just left when possible.
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
  if (forcedNext) {
    const pick = forcedNext;
    forcedNext = null;
    lastTrack = pick;
    return pick;
  }
  if (!bag.length) refillBag();
  const pick = bag.shift() ?? null;
  if (pick) {
    if (lastTrack) {
      history.push(lastTrack);
      if (history.length > 24) history.shift();
    }
    lastTrack = pick;
  }
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

  ctx = getSharedAudioContext();
  if (!ctx) return;
  gainA = ctx.createGain();
  gainB = ctx.createGain();
  musicBus = ctx.createGain();
  musicComp = ctx.createDynamicsCompressor();
  // Gentle leveling so cyber beds with big drops stay closer to a steady bed.
  musicComp.threshold.value = -22;
  musicComp.knee.value = 18;
  musicComp.ratio.value = 3.5;
  musicComp.attack.value = 0.015;
  musicComp.release.value = 0.28;
  musicBus.gain.value = 1.15;
  gainA.gain.value = 0;
  gainB.gain.value = 0;
  gainA.connect(musicBus);
  gainB.connect(musicBus);
  musicBus.connect(musicComp);
  musicComp.connect(ctx.destination);
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

/** Attenuates in a GainNode (element stays at 1) — same path for web + Android PWA. */
const MUSIC_TRIM = 0.04;

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
  const epoch = playEpoch;
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
    if (epoch !== playEpoch) return;
    transitioning = false;
    watchCrossfade();
    return;
  }
  if (epoch !== playEpoch) return;

  const ms = hard ? 700 : crossfadeMs;
  const fromStart = Math.max(getGain(from), targetLevel() * 0.001);
  const target = targetLevel();
  const t0 = performance.now();

  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (epoch !== playEpoch) {
        fadeRaf = 0;
        resolve();
        return;
      }
      const p = Math.min(1, (now - t0) / Math.max(1, ms));
      // Equal-power crossfade — constant perceived level through the blend.
      const angle = p * Math.PI * 0.5;
      setGain(from, fromStart * Math.cos(angle));
      setGain(to, target * Math.sin(angle));
      if (p < 1) fadeRaf = requestAnimationFrame(step);
      else {
        fadeRaf = 0;
        resolve();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  });

  if (epoch !== playEpoch) return;

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
  updateMediaSession(next);
}

function abortMusicTransition(): void {
  playEpoch += 1;
  transitioning = false;
  cancelFade();
  stopCrossfadePoll();
  if (a) {
    try {
      a.pause();
    } catch {
      /* ignore */
    }
    if (graphReady) setGain(a, 0);
  }
  if (b) {
    try {
      b.pause();
    } catch {
      /* ignore */
    }
    if (graphReady) setGain(b, 0);
  }
}

function poolFor(next: MusicBed): string[] {
  if (next === "retro") return retroTracks;
  if (next === "punk") return punkTracks;
  if (next === "cyber") return cyberTracks;
  return ambientTracks;
}

function loadManifest(): Promise<void> {
  if (ambientTracks.length || cyberTracks.length || retroTracks.length || punkTracks.length) {
    return Promise.resolve();
  }
  if (manifestPromise) return manifestPromise;
  manifestPromise = (async () => {
    try {
      const res = await fetch("./music/playlist.json?v=10", { cache: "no-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as PlaylistManifest;
      const clean = (list: unknown): string[] =>
        Array.isArray(list)
          ? list.filter((t): t is string => typeof t === "string" && t.length > 0)
          : [];
      ambientTracks = clean(data.ambient);
      cyberTracks = clean(data.cyber);
      retroTracks = clean(data.retro);
      punkTracks = clean(data.punk);
      leadsByBed = {};
      if (data.leads && typeof data.leads === "object") {
        for (const [key, list] of Object.entries(data.leads)) {
          leadsByBed[key as MusicBed] = clean(list);
        }
      }
      // Older single-list manifests fall back as the ambient bed.
      if (!ambientTracks.length) ambientTracks = clean(data.tracks);
      tracks = poolFor(bed);
      if (!tracks.length) tracks = ambientTracks;
      if (typeof data.crossfadeMs === "number" && data.crossfadeMs > 0) {
        // Floor at 2s — short fades amplify mobile decode pops.
        crossfadeMs = Math.max(2000, data.crossfadeMs);
      }
    } catch {
      ambientTracks = [];
      cyberTracks = [];
      retroTracks = [];
      punkTracks = [];
      tracks = [];
    }
  })();
  return manifestPromise;
}

/**
 * Swap the music bed when the visual theme changes.
 * Always reshuffles and starts a random track for that theme's playlist.
 */
export function setMusicThemeBed(next: MusicBed): void {
  const bedChanged = bed !== next;
  bed = next;
  const pool = poolFor(next);
  if (
    !pool.length &&
    !ambientTracks.length &&
    !cyberTracks.length &&
    !retroTracks.length &&
    !punkTracks.length
  ) {
    // Manifest not loaded yet — applyTheme may race ahead of unlock.
    tracks = [];
    bag = [];
    return;
  }
  tracks = pool.length ? pool : ambientTracks;
  // Keep lastTrack briefly so refillBag can avoid an instant repeat, then clear history.
  const avoid = lastTrack;
  bag = [];
  history = [];
  forcedNext = null;
  lastTrack = avoid;
  refillBag();
  lastTrack = null;

  // Theme beds must switch immediately — don't wait for the current track to end,
  // and don't let an in-flight crossfade swallow the bed change.
  if (started && unlocked && tracks.length && bedChanged) {
    abortMusicTransition();
    void beginCrossfade(true);
  }
}

/** Skip forward (or back) in the current theme bed. */
export function skipMusicTrack(dir: 1 | -1 = 1): void {
  if (!unlocked || !started || transitioning || tracks.length < 2) return;
  if (dir < 0) {
    const prev = history.pop();
    if (!prev) return;
    // Put the current track back so it can come around again.
    if (lastTrack) bag.unshift(lastTrack);
    forcedNext = prev;
  }
  void beginCrossfade(true);
}

export function canSkipMusicPrev(): boolean {
  return unlocked && started && !transitioning && history.length > 0 && tracks.length > 1;
}

export function canSkipMusicNext(): boolean {
  return unlocked && started && !transitioning && tracks.length > 1;
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
  resumeChain = resumeSharedAudioContext();
  void ensureMusicPlaying();
}

export async function ensureMusicPlaying(): Promise<void> {
  if (!unlocked) return;
  await loadManifest();
  // Theme may have been set before the manifest arrived.
  const pool = poolFor(bed);
  tracks = pool.length ? pool : ambientTracks;
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
  updateMediaSession(first);
}

/**
 * Keep the bed going across screens — no ducking, so the level stays constant
 * through menus and gameplay. Never re-enters if the screen hasn't changed
 * (the game loop calls this every frame).
 */
export function onMusicScreen(screen: string): void {
  if (!unlocked) return;
  if (screen === screenToken) return;
  screenToken = screen;
  void ensureMusicPlaying();
}

/** Android standalone PWAs suspend Web Audio / media when backgrounded. */
function resumeMusicAfterForeground(): void {
  if (!unlocked || !graphReady) return;
  resumeChain = resumeSharedAudioContext();
  void resumeChain.then(() => {
    if (!transitioning) applyActiveGain();
    void ensureMusicPlaying();
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeMusicAfterForeground();
  });
}
