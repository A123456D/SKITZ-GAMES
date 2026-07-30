import type { Progress } from "./types";
import { LEVELS } from "./levels";

const KEY = "paper-riot-progress-v1";

export function defaultProgress(): Progress {
  return {
    unlocked: 1,
    stars: {},
    lives: 5,
    gems: 350,
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Progress;
    return {
      ...defaultProgress(),
      ...parsed,
      stars: parsed.stars ?? {},
      unlocked: Math.max(1, parsed.unlocked ?? 1),
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** 1–3 stars from leftover moves ratio. */
export function starsForClear(movesLeft: number, movesTotal: number): number {
  const ratio = movesLeft / Math.max(1, movesTotal);
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

export function applyWin(
  p: Progress,
  levelId: number,
  movesLeft: number,
  movesTotal: number,
): Progress {
  const earned = starsForClear(movesLeft, movesTotal);
  const prev = p.stars[levelId] ?? 0;
  const stars = { ...p.stars, [levelId]: Math.max(prev, earned) };
  const unlocked = Math.max(p.unlocked, Math.min(LEVELS.length, levelId + 1));
  const next = {
    ...p,
    stars,
    unlocked,
    gems: p.gems + earned * 10 + 5,
  };
  saveProgress(next);
  return next;
}
