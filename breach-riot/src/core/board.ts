export const MAX_BOARD = 100;
export const MAX_LOCAL_RUNS = 20;

export type ScoreEntry = {
  name: string;
  score: number;
  level: number;
  stars: number;
  time: number;
  at: number;
};

export function sanitizeName(name: string | undefined): string {
  return String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 16);
}

export function isValidHandle(name: string | undefined): boolean {
  return sanitizeName(name).length >= 3;
}

export function sanitizeRun(body: Partial<ScoreEntry> | null | undefined): ScoreEntry | null {
  const score = Math.floor(Number(body?.score));
  const level = Math.floor(Number(body?.level));
  const stars = Math.floor(Number(body?.stars));
  const time = Number(body?.time);
  const name = sanitizeName(body?.name);
  if (!Number.isFinite(score) || score < 0 || score > 99_999_999) return null;
  if (!Number.isFinite(level) || level < 1 || level > 99) return null;
  if (!Number.isFinite(stars) || stars < 0 || stars > 3) return null;
  if (!Number.isFinite(time) || time < 0 || time > 86_400) return null;
  if (!isValidHandle(name)) return null;
  return {
    name,
    score,
    level,
    stars,
    time,
    at: Date.now(),
  };
}

export function rankBoard(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.stars - a.stars ||
        a.time - b.time ||
        a.at - b.at,
    )
    .slice(0, MAX_BOARD);
}

export function rankOf(scores: ScoreEntry[], entry: ScoreEntry): number | null {
  const i = scores.findIndex(
    (row) =>
      row.at === entry.at &&
      row.name === entry.name &&
      row.score === entry.score,
  );
  return i < 0 ? null : i + 1;
}

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
