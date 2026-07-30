/**
 * Combined audio control: OFF → SFX only → FULL (sfx + music).
 * Home + in-play share the same cycle.
 */
import { isMuted, setMuted } from "./audio";
import {
  getMusicVolume,
  setMusicMuted,
  setMusicVolume,
  unlockMusic,
} from "./music";

export type AudioMode = "off" | "sfx" | "full";

const MODE_KEY = "paper-riot-audio-mode";

function readMode(): AudioMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "off" || raw === "sfx" || raw === "full") return raw;
  } catch {
    /* ignore */
  }
  // Derive from legacy mute / music prefs.
  if (isMuted() || getMusicVolume() <= 0.001) {
    return isMuted() ? "off" : "sfx";
  }
  return "full";
}

let mode: AudioMode = "full";

export function initAudioMode(): AudioMode {
  mode = readMode();
  applyMode(mode, false);
  return mode;
}

export function getAudioMode(): AudioMode {
  return mode;
}

export function audioModeLabel(m: AudioMode = mode): string {
  switch (m) {
    case "off":
      return "OFF";
    case "sfx":
      return "SFX";
    case "full":
      return "FULL";
  }
}

function persist(m: AudioMode): void {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}

function applyMode(m: AudioMode, startMusic: boolean): void {
  mode = m;
  persist(m);
  if (m === "off") {
    setMuted(true);
    setMusicMuted(true);
    setMusicVolume(0);
    return;
  }
  setMuted(false);
  if (m === "sfx") {
    setMusicMuted(true);
    setMusicVolume(0);
    return;
  }
  // full
  if (getMusicVolume() <= 0.001) setMusicVolume(0.7);
  setMusicMuted(false);
  if (startMusic) unlockMusic();
}

/** Cycle OFF → SFX → FULL → OFF. Returns the new mode. */
export function cycleAudioMode(): AudioMode {
  const order: AudioMode[] = ["off", "sfx", "full"];
  const i = order.indexOf(mode);
  const next = order[(i + 1) % order.length]!;
  applyMode(next, true);
  return next;
}
