export const MAX_BOARD = 100;

export function sanitizeName(name) {
  return String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 16);
}

export function isValidHandle(name) {
  return sanitizeName(name).length >= 3;
}

export function sanitizeRun(body) {
  const score = Math.floor(Number(body?.score));
  const level = Math.floor(Number(body?.level));
  const lines = Math.floor(Number(body?.lines));
  const time = Number(body?.time);
  const name = sanitizeName(body?.name);
  if (!Number.isFinite(score) || score < 0 || score > 99_999_999) return null;
  if (!Number.isFinite(level) || level < 1 || level > 999) return null;
  if (!Number.isFinite(lines) || lines < 0 || lines > 99_999) return null;
  if (!Number.isFinite(time) || time < 0 || time > 86_400) return null;
  if (!isValidHandle(name)) return null;
  return { name, score, level, lines, time, at: Date.now() };
}

export function rankBoard(scores) {
  return [...scores]
    .sort((a, b) => b.score - a.score || b.lines - a.lines || a.at - b.at)
    .slice(0, MAX_BOARD);
}

export function rankOf(scores, entry) {
  const i = scores.findIndex(
    (row) =>
      row.at === entry.at &&
      row.name === entry.name &&
      row.score === entry.score,
  );
  return i < 0 ? null : i + 1;
}
