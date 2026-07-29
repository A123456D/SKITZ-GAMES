import type { AiDifficulty } from "./ai";

export const ELO_DEFAULT = 1200;
export const ELO_K = 32;

/** Nominal opponent Elo for each AI tier (used for rated vs-AI games). */
export const AI_ELO: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 800,
  2: 1200,
  3: 1600,
  4: 2000,
};

export interface EloProfile {
  rating: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface EloResult {
  before: number;
  after: number;
  delta: number;
  opponentElo: number;
}

const STORAGE_KEY = "nexus-chess-elo";

export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/** score: 1 win, 0.5 draw, 0 loss */
export function eloDelta(playerElo: number, opponentElo: number, score: number, k = ELO_K): number {
  return Math.round(k * (score - expectedScore(playerElo, opponentElo)));
}

export function applyElo(playerElo: number, opponentElo: number, score: number, k = ELO_K): number {
  return Math.max(100, playerElo + eloDelta(playerElo, opponentElo, score, k));
}

export function defaultProfile(): EloProfile {
  return { rating: ELO_DEFAULT, games: 0, wins: 0, losses: 0, draws: 0 };
}

export function loadProfile(): EloProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<EloProfile>;
    return {
      rating: typeof parsed.rating === "number" ? parsed.rating : ELO_DEFAULT,
      games: typeof parsed.games === "number" ? parsed.games : 0,
      wins: typeof parsed.wins === "number" ? parsed.wins : 0,
      losses: typeof parsed.losses === "number" ? parsed.losses : 0,
      draws: typeof parsed.draws === "number" ? parsed.draws : 0,
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: EloProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/**
 * Update player Elo after a rated vs-AI game.
 * Player is always White; AI is Black.
 * result: "w" player win, "b" AI win, null = abandoned (no change)
 */
export function recordAiGame(
  profile: EloProfile,
  difficulty: Exclude<AiDifficulty, 0>,
  winner: "w" | "b" | null,
): { profile: EloProfile; result: EloResult | null } {
  if (!winner) return { profile, result: null };

  const opponentElo = AI_ELO[difficulty];
  const score = winner === "w" ? 1 : 0;
  const before = profile.rating;
  const after = applyElo(before, opponentElo, score);
  const delta = after - before;

  const next: EloProfile = {
    rating: after,
    games: profile.games + 1,
    wins: profile.wins + (score === 1 ? 1 : 0),
    losses: profile.losses + (score === 0 ? 1 : 0),
    draws: profile.draws,
  };
  saveProfile(next);
  return {
    profile: next,
    result: { before, after, delta, opponentElo },
  };
}
