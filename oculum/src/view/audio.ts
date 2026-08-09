/** Web-audio SFX + looping beds for OCULUM (ElevenLabs-generated mp3s). */

export type SfxId =
  | "ui-tap"
  | "select"
  | "play"
  | "site"
  | "witness"
  | "gaze"
  | "graft"
  | "stance"
  | "rite"
  | "pass"
  | "resolve"
  | "law"
  | "eclipse"
  | "win"
  | "lose"
  | "enemy"
  | "stain"
  | "strain"
  | "blind"
  | "fall"
  | "draw";

export type MusicBed = "menu" | "match" | "victory" | "defeat";

const SFX_FILES: Record<SfxId, string> = {
  "ui-tap": "ui-tap.mp3",
  select: "select.mp3",
  play: "play.mp3",
  site: "site.mp3",
  witness: "witness.mp3",
  gaze: "gaze.mp3",
  graft: "graft.mp3",
  stance: "stance.mp3",
  rite: "rite.mp3",
  pass: "pass.mp3",
  resolve: "resolve.mp3",
  law: "law.mp3",
  eclipse: "eclipse.mp3",
  win: "win.mp3",
  lose: "lose.mp3",
  enemy: "enemy.mp3",
  fall: "fall.mp3",
  stain: "stain.mp3",
  strain: "strain.mp3",
  blind: "blind.mp3",
  draw: "draw.mp3",
};

const MUSIC_FILES: Record<MusicBed, string> = {
  menu: "music-menu.mp3",
  match: "music-match.mp3",
  victory: "music-victory.mp3",
  defeat: "music-defeat.mp3",
};

const MUTE_KEY = "oculum.muted";
const MUSIC_MUTE_KEY = "oculum.musicMuted";
const SFX_VERSION = 9;
const MUSIC_VOLUME = 0.32;
const END_MUSIC_VOLUME = 0.4;

/** Keep UI dry; only a few combat stingers get light pitch vary. */
const PITCH_VARY: Partial<Record<SfxId, boolean>> = {
  play: true,
  resolve: true,
  fall: true,
  stain: true,
  strain: true,
};

const DEFAULT_VOL: Partial<Record<SfxId, number>> = {
  "ui-tap": 0.28,
  select: 0.32,
  play: 0.42,
  site: 0.48,
  witness: 0.28,
  gaze: 0.5,
  graft: 0.4,
  stance: 0.38,
  rite: 0.5,
  pass: 0.3,
  resolve: 0.55,
  law: 0.5,
  eclipse: 0.52,
  win: 0.58,
  lose: 0.55,
  enemy: 0.3,
  stain: 0.42,
  strain: 0.4,
  blind: 0.38,
  fall: 0.52,
  draw: 0.28,
};

type AudioCtxCtor = typeof AudioContext;

function AudioContextCtor(): AudioCtxCtor {
  const w = window as Window & { webkitAudioContext?: AudioCtxCtor };
  return window.AudioContext || w.webkitAudioContext || AudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SfxId, AudioBuffer>();
let muted = false;
let musicMuted = false;
let masterVol = 1;
let unlocked = false;
let loadPromise: Promise<void> | null = null;
let musicEl: HTMLAudioElement | null = null;
let currentBed: MusicBed | null = null;
let desiredBed: MusicBed = "menu";
let gestureArmed = false;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, v: boolean): void {
  try {
    localStorage.setItem(key, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

muted = readFlag(MUTE_KEY);
musicMuted = readFlag(MUSIC_MUTE_KEY);

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new (AudioContextCtor())();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : masterVol;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** iOS Safari: play a silent buffer inside the user-gesture turn. */
function pokeSilentUnlock(audio: AudioContext): void {
  try {
    const buf = audio.createBuffer(1, 1, audio.sampleRate || 22050);
    const src = audio.createBufferSource();
    src.buffer = buf;
    src.connect(audio.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

async function decodeOne(id: SfxId, audio: AudioContext): Promise<boolean> {
  try {
    const res = await fetch(`./sfx/${SFX_FILES[id]}?v=${SFX_VERSION}`);
    if (!res.ok) return false;
    const raw = await res.arrayBuffer();
    // Safari may detach the buffer — always decode a copy
    const buf = await audio.decodeAudioData(raw.slice(0));
    buffers.set(id, buf);
    return true;
  } catch {
    return false;
  }
}

export function loadSfx(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const audio = ensureCtx();
    await Promise.all((Object.keys(SFX_FILES) as SfxId[]).map((id) => decodeOne(id, audio)));
  })();
  return loadPromise;
}

function ensureMusicEl(): HTMLAudioElement {
  if (!musicEl) {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.volume = MUSIC_VOLUME;
    // Critical for iPhone Safari — without this, HTMLAudio may refuse to play
    musicEl.setAttribute("playsinline", "true");
    musicEl.setAttribute("webkit-playsinline", "true");
    (musicEl as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  }
  return musicEl;
}

export async function unlockAudio(): Promise<void> {
  unlocked = true;
  const audio = ensureCtx();
  pokeSilentUnlock(audio);
  // Start HTML music while still inside the user-gesture turn (before any await).
  syncMusic();
  void loadSfx();
  if (audio.state === "suspended") {
    try {
      await audio.resume();
    } catch {
      /* ignore */
    }
    pokeSilentUnlock(audio);
    syncMusic();
  }
}

/**
 * Browsers block Audio until a gesture.
 * iOS Safari only treats certain events as activation (touchend / pointerup, not touchstart).
 */
export function armUnlockOnGesture(): void {
  if (unlocked) {
    syncMusic();
    return;
  }
  if (gestureArmed) return;
  gestureArmed = true;

  const once = (): void => {
    window.removeEventListener("pointerup", once, true);
    window.removeEventListener("touchend", once, true);
    window.removeEventListener("pointerdown", once, true);
    window.removeEventListener("keydown", once, true);
    void unlockAudio();
  };
  // Prefer Safari-qualifying activation events first
  window.addEventListener("pointerup", once, { capture: true });
  window.addEventListener("touchend", once, { capture: true, passive: true });
  window.addEventListener("pointerdown", once, { capture: true });
  window.addEventListener("keydown", once, { capture: true });
}

export function isMuted(): boolean {
  return muted;
}

export function isMusicMuted(): boolean {
  return musicMuted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeFlag(MUTE_KEY, next);
  if (master) master.gain.value = muted ? 0 : masterVol;
}

export function setMusicMuted(next: boolean): void {
  musicMuted = next;
  writeFlag(MUSIC_MUTE_KEY, next);
  syncMusic();
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

export function playSfx(
  id: SfxId,
  opts?: { volume?: number; rate?: number; vary?: boolean },
): void {
  if (!unlocked || muted) return;
  const audio = ensureCtx();
  if (audio.state === "suspended") void audio.resume();
  const buf = buffers.get(id);
  if (!buf || !master) {
    void playHtmlFallback(id, opts?.volume ?? DEFAULT_VOL[id] ?? 1);
    return;
  }

  const src = audio.createBufferSource();
  src.buffer = buf;
  const vary = opts?.vary ?? PITCH_VARY[id] === true;
  const base = opts?.rate ?? 1;
  src.playbackRate.value = vary ? base * (0.97 + Math.random() * 0.06) : base;

  const gain = audio.createGain();
  gain.gain.value = opts?.volume ?? DEFAULT_VOL[id] ?? 0.45;
  src.connect(gain);
  gain.connect(master);
  try {
    src.start(0);
  } catch {
    void playHtmlFallback(id, opts?.volume ?? DEFAULT_VOL[id] ?? 1);
  }
}

function playHtmlFallback(id: SfxId, volume: number): void {
  try {
    const el = new Audio(`./sfx/${SFX_FILES[id]}?v=${SFX_VERSION}`);
    el.setAttribute("playsinline", "true");
    (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    el.volume = Math.max(0, Math.min(1, volume));
    void el.play();
  } catch {
    /* ignore */
  }
}

function playBed(bed: MusicBed): void {
  if (!unlocked || musicMuted) {
    stopMusic();
    return;
  }
  const el = ensureMusicEl();
  if (currentBed !== bed) {
    el.src = `./sfx/${MUSIC_FILES[bed]}?v=${SFX_VERSION}`;
    currentBed = bed;
  }
  el.loop = true;
  el.volume = bed === "victory" || bed === "defeat" ? END_MUSIC_VOLUME : MUSIC_VOLUME;
  void el.play().catch(() => {
    /* wait for another gesture */
  });
}

export function stopMusic(): void {
  if (!musicEl) return;
  musicEl.pause();
}

export function setMusicBed(bed: MusicBed): void {
  desiredBed = bed;
  if (unlocked) playBed(bed);
}

export function syncMusic(): void {
  if (musicMuted) {
    stopMusic();
    return;
  }
  if (unlocked) playBed(desiredBed);
}
