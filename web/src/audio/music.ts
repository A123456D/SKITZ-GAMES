/** Shuffled playlist with short crossfades. Volume persists via save. */

type PlaylistManifest = {
  tracks: string[];
  crossfadeMs?: number;
};

let musicVol = 0.7;
let unlocked = false;
let started = false;
let tracks: string[] = [];
let crossfadeMs = 1400;
let bag: string[] = [];
let lastTrack: string | null = null;
let current: HTMLAudioElement | null = null;
let fading: HTMLAudioElement | null = null;
let crossfadeRaf = 0;
let duckRaf = 0;
let screenToken = "";
let manifestPromise: Promise<void> | null = null;
let crossfading = false;

function trackUrl(file: string): string {
  return `./music/${file}`;
}

function shuffleInPlace(list: string[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
}

/** Refill the draw bag; avoid starting with the track that just finished. */
function refillBag(): void {
  bag = [...tracks];
  if (bag.length <= 1) return;
  shuffleInPlace(bag);
  if (lastTrack && bag[0] === lastTrack && bag.length > 1) {
    const swap = 1 + Math.floor(Math.random() * (bag.length - 1));
    const tmp = bag[0];
    bag[0] = bag[swap];
    bag[swap] = tmp;
  }
}

function nextTrack(): string | null {
  if (!tracks.length) return null;
  if (!bag.length) refillBag();
  const pick = bag.shift() ?? null;
  if (pick) lastTrack = pick;
  return pick;
}

function makeAudio(file: string): HTMLAudioElement {
  const el = new Audio(trackUrl(file));
  el.preload = "auto";
  el.loop = false;
  el.volume = musicVol;
  return el;
}

function applyVolume(): void {
  if (current && !crossfading && !duckRaf) current.volume = musicVol;
}

function stopCrossfade(): void {
  if (crossfadeRaf) cancelAnimationFrame(crossfadeRaf);
  crossfadeRaf = 0;
  crossfading = false;
}

function stopDuck(): void {
  if (duckRaf) cancelAnimationFrame(duckRaf);
  duckRaf = 0;
}

function advanceFrom(el: HTMLAudioElement): void {
  if (current !== el) return;
  const next = nextTrack();
  if (next) crossfadeTo(next);
}

function crossfadeTo(file: string): void {
  const incoming = makeAudio(file);
  const outgoing = current;
  stopDuck();
  stopCrossfade();
  fading = outgoing;
  current = incoming;
  crossfading = true;

  incoming.volume = 0;
  incoming.onended = () => advanceFrom(incoming);
  const playPromise = incoming.play();
  if (playPromise) void playPromise.catch(() => undefined);

  const start = performance.now();
  const dur = Math.max(200, crossfadeMs);

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = t * t * (3 - 2 * t);
    incoming.volume = musicVol * eased;
    if (outgoing) outgoing.volume = musicVol * (1 - eased);
    if (t < 1) {
      crossfadeRaf = requestAnimationFrame(step);
      return;
    }
    crossfadeRaf = 0;
    crossfading = false;
    if (outgoing) {
      outgoing.onended = null;
      outgoing.pause();
      outgoing.removeAttribute("src");
      outgoing.load();
    }
    fading = null;
    incoming.volume = musicVol;
  };
  crossfadeRaf = requestAnimationFrame(step);
}

function loadManifest(): Promise<void> {
  if (tracks.length) return Promise.resolve();
  if (manifestPromise) return manifestPromise;
  manifestPromise = (async () => {
    try {
      const res = await fetch("./music/playlist.json", { cache: "no-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as PlaylistManifest;
      tracks = (data.tracks ?? []).filter((t) => typeof t === "string" && t.length > 0);
      if (typeof data.crossfadeMs === "number" && data.crossfadeMs > 0) {
        crossfadeMs = data.crossfadeMs;
      }
    } catch {
      tracks = [];
    }
  })();
  return manifestPromise;
}

export function setMusicVolume(v: number): void {
  musicVol = Math.max(0, Math.min(1, v));
  applyVolume();
}

export function getMusicVolume(): number {
  return musicVol;
}

/** Call from the same user gesture as SFX unlock. */
export function unlockMusic(): void {
  unlocked = true;
  void ensureMusicPlaying();
}

export async function ensureMusicPlaying(): Promise<void> {
  if (!unlocked) return;
  await loadManifest();
  if (!tracks.length) return;
  if (started && current && !current.paused) return;
  started = true;
  const first = nextTrack();
  if (!first) {
    started = false;
    return;
  }
  if (!current) {
    current = makeAudio(first);
    current.onended = () => advanceFrom(current!);
    current.volume = musicVol;
    try {
      await current.play();
    } catch {
      started = false;
    }
    return;
  }
  try {
    await current.play();
  } catch {
    /* blocked until gesture */
  }
}

/**
 * Soft continuity when screens change: keep the shuffled bed going.
 * Short duck/restore on change; track-to-track uses crossfade separately.
 */
export function onMusicScreen(screen: string): void {
  if (!unlocked) return;
  if (screen === screenToken) {
    void ensureMusicPlaying();
    return;
  }
  screenToken = screen;
  void ensureMusicPlaying().then(() => {
    if (!current || musicVol <= 0.001 || crossfading) return;
    const el = current;
    const from = el.volume;
    const start = performance.now();
    const duckMs = Math.min(480, crossfadeMs * 0.35);
    const floor = musicVol * 0.35;
    stopDuck();
    const step = (now: number) => {
      if (!el || current !== el || crossfading) {
        duckRaf = 0;
        return;
      }
      const t = Math.min(1, (now - start) / duckMs);
      if (t < 0.5) {
        const u = t / 0.5;
        el.volume = from + (floor - from) * u;
      } else {
        const u = (t - 0.5) / 0.5;
        el.volume = floor + (musicVol - floor) * u;
      }
      if (t < 1) duckRaf = requestAnimationFrame(step);
      else {
        duckRaf = 0;
        el.volume = musicVol;
      }
    };
    duckRaf = requestAnimationFrame(step);
  });
}
