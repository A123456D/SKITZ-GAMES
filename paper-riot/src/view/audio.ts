/** Web-audio SFX player for Paper Riot (static mp3s from ElevenLabs). */

export type SfxId =
  | "ui-tap"
  | "select"
  | "swap"
  | "swap-fail"
  | "match"
  | "cascade"
  | "drop"
  | "peel"
  | "crack"
  | "power-bomb"
  | "power-plane"
  | "power-rocket"
  | "power-magnet"
  | "power-stapler"
  | "power-disco"
  | "win"
  | "lose"
  | "mute-on"
  | "oops"
  | "hell-yeah";

const FILES: Record<SfxId, string> = {
  "ui-tap": "ui-tap.mp3",
  select: "select.mp3",
  swap: "swap.mp3",
  "swap-fail": "swap-fail.mp3",
  match: "match.mp3",
  cascade: "cascade.mp3",
  drop: "drop.mp3",
  peel: "peel.mp3",
  crack: "crack.mp3",
  "power-bomb": "power-bomb.mp3",
  "power-plane": "power-plane.mp3",
  "power-rocket": "power-rocket.mp3",
  "power-magnet": "power-magnet.mp3",
  "power-stapler": "power-stapler.mp3",
  "power-disco": "power-disco.mp3",
  win: "win.mp3",
  lose: "lose.mp3",
  "mute-on": "mute-on.mp3",
  oops: "oops.mp3",
  "hell-yeah": "hell-yeah.mp3",
};

const MUTE_KEY = "paper-riot-muted";
/** Bump when regenerating mp3s so clients skip stale cache. */
const SFX_VERSION = 8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SfxId, AudioBuffer>();
let muted = false;
/** 0..1 master scale (volume button). Applied with mute. */
let masterVol = 1;
let unlocked = false;
let loadPromise: Promise<void> | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(v: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : masterVol;
    master.connect(ctx.destination);
  }
  return ctx;
}

async function decodeOne(id: SfxId, audio: AudioContext): Promise<boolean> {
  try {
    const res = await fetch(`./sfx/${FILES[id]}?v=${SFX_VERSION}`);
    if (!res.ok) return false;
    const raw = await res.arrayBuffer();
    const buf = await audio.decodeAudioData(raw.slice(0));
    buffers.set(id, buf);
    return true;
  } catch {
    return false;
  }
}

/** Preload all SFX (no-op if already loading / loaded). */
export function loadSfx(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const audio = ensureCtx();
    await Promise.all(
      (Object.keys(FILES) as SfxId[]).map((id) => decodeOne(id, audio)),
    );
  })();
  return loadPromise;
}

/** Ensure a single clip is decoded (retries if the first preload missed it). */
export async function ensureSfx(id: SfxId): Promise<boolean> {
  if (buffers.has(id)) return true;
  await loadSfx();
  if (buffers.has(id)) return true;
  return decodeOne(id, ensureCtx());
}

/** Call from first user gesture so mobile browsers allow playback. */
export async function unlockAudio(): Promise<void> {
  const audio = ensureCtx();
  if (audio.state === "suspended") {
    try {
      await audio.resume();
    } catch {
      /* ignore */
    }
  }
  unlocked = true;
  void loadSfx();
}

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  return ensureCtx();
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeMuted(next);
  if (master) master.gain.value = muted ? 0 : masterVol;
}

/** Set master SFX volume 0..1 (volume button). Does not force unmute. */
export function setSfxMasterVolume(v: number): void {
  masterVol = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = muted ? 0 : masterVol;
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

/**
 * Play a one-shot SFX. Safe to call before unlock (no-ops until gesture).
 * `rate` defaults to a tiny random pitch for less ear fatigue.
 */
export function playSfx(
  id: SfxId,
  opts?: { volume?: number; rate?: number; vary?: boolean },
): void {
  if (!unlocked || muted) return;
  const audio = ensureCtx();
  const buf = buffers.get(id);
  if (!buf || !master) {
    // Fallback if WebAudio decode missed this clip (cache / race).
    void playHtmlFallback(id, opts?.volume ?? 1);
    return;
  }
  if (audio.state === "suspended") void audio.resume();

  const src = audio.createBufferSource();
  src.buffer = buf;
  const vary = opts?.vary !== false;
  const base = opts?.rate ?? 1;
  src.playbackRate.value = vary
    ? base * (0.94 + Math.random() * 0.12)
    : base;

  const gain = audio.createGain();
  gain.gain.value = opts?.volume ?? 1;
  src.connect(gain);
  gain.connect(master);
  try {
    src.start(0);
  } catch {
    void playHtmlFallback(id, opts?.volume ?? 1);
  }
}

function playHtmlFallback(id: SfxId, volume: number): void {
  try {
    const el = new Audio(`./sfx/${FILES[id]}?v=${SFX_VERSION}`);
    el.volume = Math.max(0, Math.min(1, volume));
    void el.play();
  } catch {
    /* ignore */
  }
}

export function powerSfx(kind: string): SfxId {
  switch (kind) {
    case "bomb":
      return "power-bomb";
    case "plane":
      return "power-plane";
    case "rocket":
      return "power-rocket";
    case "magnet":
      return "power-magnet";
    case "stapler":
      return "power-stapler";
    case "disco":
      return "power-disco";
    default:
      return "match";
  }
}
