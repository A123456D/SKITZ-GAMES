/**
 * Combined volume control: MUTED → LOW → MED → HIGH.
 * Home + in-play + menu share the same cycle.
 */
import { setMuted, setSfxMasterVolume } from "./audio";
import {
  getMusicVolume,
  setMusicMuted,
  setMusicVolume,
  unlockMusic,
} from "./music";

export type VolLevel = "muted" | "low" | "med" | "high";

const MODE_KEY = "paper-riot-vol-level";
const LEGACY_MODE_KEY = "paper-riot-audio-mode";

/** Master volumes for SFX / music at each level. */
const LEVEL_GAIN: Record<VolLevel, number> = {
  muted: 0,
  low: 0.35,
  med: 0.65,
  high: 1,
};

const ORDER: VolLevel[] = ["muted", "low", "med", "high"];

function nearestLevel(v: number): VolLevel {
  if (v <= 0.001) return "muted";
  if (v < 0.5) return "low";
  if (v < 0.85) return "med";
  return "high";
}

function readLevel(): VolLevel {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "muted" || raw === "low" || raw === "med" || raw === "high") {
      return raw;
    }
    // Migrate legacy OFF / SFX / FULL modes.
    const legacy = localStorage.getItem(LEGACY_MODE_KEY);
    if (legacy === "off") return "muted";
    if (legacy === "sfx") return "med";
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
  const gain = LEVEL_GAIN[m];
  setSfxMasterVolume(gain);
  setMuted(gain <= 0.001);
  setMusicVolume(gain <= 0.001 ? 0 : Math.min(1, gain * 0.7));
  setMusicMuted(gain <= 0.001);
  if (gain > 0.001 && startMusic) unlockMusic();
}

/** Cycle MUTED → LOW → MED → HIGH → MUTED. */
export function cycleAudioMode(): VolLevel {
  const i = ORDER.indexOf(level);
  const next = ORDER[(i + 1) % ORDER.length]!;
  applyLevel(next, true);
  return next;
}
