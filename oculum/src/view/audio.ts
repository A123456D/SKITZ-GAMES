/** Web-audio SFX + looping beds for OCULUM (ElevenLabs-generated mp3s). */

export type SfxId =
  | "ui-tap"
  | "select"
  | "play"
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
  | "enemy";

export type MusicBed = "menu" | "match";

const SFX_FILES: Record<SfxId, string> = {
  "ui-tap": "ui-tap.mp3",
  select: "select.mp3",
  play: "play.mp3",
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
};

const MUSIC_FILES: Record<MusicBed, string> = {
  menu: "music-menu.mp3",
  match: "music-match.mp3",
};

const MUTE_KEY = "oculum.muted";
const MUSIC_MUTE_KEY = "oculum.musicMuted";
const SFX_VERSION = 1;
const MUSIC_VOLUME = 0.32;

const DEFAULT_VOL: Partial<Record<SfxId, number>> = {
  "ui-tap": 0.45,
  select: 0.55,
  play: 0.7,
  witness: 0.85,
  gaze: 0.88,
  graft: 0.7,
  stance: 0.65,
  rite: 0.72,
  pass: 0.5,
  resolve: 0.9,
  law: 0.85,
  eclipse: 0.9,
  win: 0.95,
  lose: 0.85,
  enemy: 0.55,
};

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
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : masterVol;
    master.connect(ctx.destination);
  }
  return ctx;
}

async function decodeOne(id: SfxId, audio: AudioContext): Promise<boolean> {
  try {
    const res = await fetch(`./sfx/${SFX_FILES[id]}?v=${SFX_VERSION}`);
    if (!res.ok) return false;
    const raw = await res.arrayBuffer();
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
  syncMusic();
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
  const buf = buffers.get(id);
  if (!buf || !master) {
    void playHtmlFallback(id, opts?.volume ?? DEFAULT_VOL[id] ?? 1);
    return;
  }
  if (audio.state === "suspended") void audio.resume();

  const src = audio.createBufferSource();
  src.buffer = buf;
  const vary = opts?.vary !== false;
  const base = opts?.rate ?? 1;
  src.playbackRate.value = vary ? base * (0.94 + Math.random() * 0.12) : base;

  const gain = audio.createGain();
  gain.gain.value = opts?.volume ?? DEFAULT_VOL[id] ?? 1;
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
  if (!musicEl) {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.volume = MUSIC_VOLUME;
  }
  if (currentBed !== bed) {
    musicEl.src = `./sfx/${MUSIC_FILES[bed]}?v=${SFX_VERSION}`;
    currentBed = bed;
  }
  if (musicEl.paused) {
    void musicEl.play().catch(() => {
      /* wait for gesture */
    });
  }
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
