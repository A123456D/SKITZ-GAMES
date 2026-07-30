/**
 * Combined volume control: MUTED → SFX → LOW → MED → HIGH.
 * Home + in-play + menu share the same cycle.
 * SFX = game sounds only (music off).
 */
import { setMuted, setSfxMasterVolume } from "./audio";
import {
  getMusicVolume,
  setMusicMuted,
  setMusicVolume,
  unlockMusic,
} from "./music";

export type VolLevel = "muted" | "sfx" | "low" | "med" | "high";

const MODE_KEY = "paper-riot-vol-level";
const LEGACY_MODE_KEY = "paper-riot-audio-mode";

/** Master volumes for SFX at each level. */
const SFX_GAIN: Record<VolLevel, number> = {
  muted: 0,
  sfx: 0.85,
  low: 0.35,
  med: 0.65,
  high: 1,
};

/** Music volumes — zero on MUTED and SFX-only. */
const MUSIC_GAIN: Record<VolLevel, number> = {
  muted: 0,
  sfx: 0,
  low: 0.35,
  med: 0.65,
  high: 1,
};

const ORDER: VolLevel[] = ["muted", "sfx", "low", "med", "high"];

function nearestLevel(v: number): VolLevel {
  if (v <= 0.001) return "muted";
  if (v < 0.5) return "low";
  if (v < 0.85) return "med";
  return "high";
}

function readLevel(): VolLevel {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (
      raw === "muted" ||
      raw === "sfx" ||
      raw === "low" ||
      raw === "med" ||
      raw === "high"
    ) {
      return raw;
    }
    // Migrate legacy OFF / SFX / FULL modes.
    const legacy = localStorage.getItem(LEGACY_MODE_KEY);
    if (legacy === "off") return "muted";
    if (legacy === "sfx") return "sfx";
    if (legacy === "full") return "high";
  } catch {
    /* ignore */
  }
  return nearestLevel(getMusicVolume());
}

let level: VolLevel = "high";

export function initAudioMode(): VolLevel {
  level = readLevel();
  applyLevel(level, false);
  return level;
}

export function getAudioMode(): VolLevel {
  return level;
}

/** @deprecated alias — kept so call sites still compile while migrating. */
export type AudioMode = VolLevel;

export function audioModeLabel(m: VolLevel = level): string {
  switch (m) {
    case "muted":
      return "MUTED";
    case "sfx":
      return "SFX";
    case "low":
      return "LOW";
    case "med":
      return "MED";
    case "high":
      return "HIGH";
  }
}

function persist(m: VolLevel): void {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}

function applyLevel(m: VolLevel, startMusic: boolean): void {
  level = m;
  persist(m);
  const sfx = SFX_GAIN[m];
  const music = MUSIC_GAIN[m];
  setSfxMasterVolume(sfx);
  setMuted(sfx <= 0.001);
  setMusicVolume(music);
  setMusicMuted(music <= 0.001);
  if (music > 0.001 && startMusic) unlockMusic();
}

/** Cycle MUTED → SFX → LOW → MED → HIGH → MUTED. */
export function cycleAudioMode(): VolLevel {
  const i = ORDER.indexOf(level);
  const next = ORDER[(i + 1) % ORDER.length]!;
  applyLevel(next, true);
  return next;
}
