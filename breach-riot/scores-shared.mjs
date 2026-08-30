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

export function rankBoard(scores) {
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

export function rankOf(scores, entry) {
  const i = scores.findIndex(
    (row) =>
      row.at === entry.at &&
      row.name === entry.name &&
      row.score === entry.score,
  );
  return i < 0 ? null : i + 1;
}

export function sanitizeProgress(body) {
  const handle = sanitizeName(body?.handle ?? body?.name);
  if (!isValidHandle(handle)) return null;
  const unlocked = Math.max(1, Math.min(16, Math.floor(Number(body?.unlocked) || 1)));
  const district = Math.max(0, Math.min(3, Math.floor(Number(body?.district) || 0)));
  const scrap = Math.max(0, Math.min(1_000_000, Math.floor(Number(body?.scrap) || 0)));
  const components = Math.max(0, Math.min(10_000, Math.floor(Number(body?.components) || 0)));
  const stars = {};
  if (body?.stars && typeof body.stars === "object") {
    for (const [k, v] of Object.entries(body.stars)) {
      const id = Math.floor(Number(k));
      const n = Math.floor(Number(v));
      if (id >= 1 && id <= 16 && n >= 0 && n <= 3) stars[id] = n;
    }
  }
  const deckIn = body?.deck && typeof body.deck === "object" ? body.deck : {};
  const deck = {
    bufferBonus: Math.max(0, Math.min(4, Math.floor(Number(deckIn.bufferBonus) || 0))),
    timeBonus: Math.max(0, Math.min(12, Math.floor(Number(deckIn.timeBonus) || 0))),
    almostIn: deckIn.almostIn === true,
    compTime: Math.max(0, Math.min(60, Math.floor(Number(deckIn.compTime) || 0))),
  };
  return {
    handle,
    unlocked,
    district,
    scrap,
    components,
    stars,
    deck,
    bestScore: Math.max(0, Math.floor(Number(body?.bestScore) || 0)),
    games: Math.max(0, Math.floor(Number(body?.games) || 0)),
    updatedAt: Date.now(),
  };
}
