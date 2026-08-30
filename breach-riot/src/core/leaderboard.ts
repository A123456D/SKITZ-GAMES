import { rankBoard, rankOf, sanitizeName, sanitizeRun, type ScoreEntry } from "./board";
import type { Deck, Progress } from "./types";

const PENDING_KEY = "breach-riot-pending-v1";
const API = import.meta.env.VITE_SCORES_URL || "/api/scores";
const PROGRESS_API = import.meta.env.VITE_PROGRESS_URL || "/api/progress";

export type CloudProgress = {
  handle: string;
  unlocked: number;
  district: number;
  scrap: number;
  components: number;
  stars: Record<number, number>;
  deck: Deck;
  bestScore: number;
  games: number;
  updatedAt: number;
};

function pending(): ScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as ScoreEntry[];
  } catch {
    return [];
  }
}

function setPending(list: ScoreEntry[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

async function request(url: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.json();
}

export async function fetchWorld(): Promise<ScoreEntry[]> {
  const data = await request(API, "GET");
  return rankBoard((data.scores || []) as ScoreEntry[]);
}

export async function submitWorld(
  run: Omit<ScoreEntry, "name" | "at">,
  name: string,
): Promise<{ scores: ScoreEntry[]; rank: number | null; queued?: boolean }> {
  const entry = sanitizeRun({ ...run, name });
  if (!entry) return { scores: [], rank: null };
  try {
    const data = await request(API, "POST", entry);
    const scores = rankBoard((data.scores || []) as ScoreEntry[]);
    return { scores, rank: data.rank ?? rankOf(scores, entry) };
  } catch {
    setPending([...pending(), entry]);
    return { scores: [], rank: null, queued: true };
  }
}

export async function flushPending(): Promise<void> {
  const list = pending();
  if (!list.length) return;
  const kept: ScoreEntry[] = [];
  for (const entry of list) {
    try {
      await request(API, "POST", entry);
    } catch {
      kept.push(entry);
    }
  }
  setPending(kept);
}

export function progressSnapshot(p: Progress): CloudProgress {
  return {
    handle: sanitizeName(p.handle),
    unlocked: p.unlocked,
    district: p.district,
    scrap: p.scrap,
    components: p.components,
    stars: p.stars,
    deck: p.deck,
    bestScore: p.bestScore,
    games: p.games,
    updatedAt: Date.now(),
  };
}

export function starSum(stars: Record<number, number>): number {
  return Object.values(stars).reduce((s, n) => s + n, 0);
}

export function cloudRicher(cloud: CloudProgress, local: Progress): boolean {
  if (cloud.unlocked !== local.unlocked) return cloud.unlocked > local.unlocked;
  const cs = starSum(cloud.stars);
  const ls = starSum(local.stars);
  if (cs !== ls) return cs > ls;
  if (cloud.scrap !== local.scrap) return cloud.scrap > local.scrap;
  return cloud.bestScore > local.bestScore;
}

export async function fetchCloudProgress(handle: string): Promise<CloudProgress | null> {
  const data = await request(
    `${PROGRESS_API}?handle=${encodeURIComponent(sanitizeName(handle))}`,
    "GET",
  );
  return (data.progress as CloudProgress | null) ?? null;
}

export async function pushCloudProgress(p: Progress): Promise<void> {
  await request(PROGRESS_API, "POST", progressSnapshot(p));
}
