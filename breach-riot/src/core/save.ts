import type { Progress } from "./types";

const KEY = "breach-riot-progress-v1";

const DEFAULT: Progress = {
  unlocked: 1,
  stars: {},
  sound: true,
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, stars: {} };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      unlocked: Math.max(1, Number(parsed.unlocked) || 1),
      stars: parsed.stars && typeof parsed.stars === "object" ? parsed.stars : {},
      sound: parsed.sound !== false,
    };
  } catch {
    return { ...DEFAULT, stars: {} };
  }
}

export function saveProgress(p: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function applyWin(
  progress: Progress,
  levelId: number,
  stars: number,
  levelCount: number,
): Progress {
  const prev = progress.stars[levelId] ?? 0;
  const nextStars = { ...progress.stars, [levelId]: Math.max(prev, stars) };
  const unlocked =
    stars > 0
      ? Math.max(progress.unlocked, Math.min(levelCount, levelId + 1))
      : progress.unlocked;
  return { ...progress, stars: nextStars, unlocked };
}
