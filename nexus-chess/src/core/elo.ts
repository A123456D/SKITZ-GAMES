import type { AiDifficulty } from "./ai";

export const ELO_DEFAULT = 1200;
export const ELO_K = 32;
export const ELO_MIN = 100;
export const ELO_MAX = 3000;
export const ELO_STEP = 100;

/** Chess.com-style self-rating presets. */
export const PLAYER_ELO_PRESETS: { label: string; elo: number; blurb: string }[] = [
  { label: "New to Chess", elo: 400, blurb: "Just learning the rules" },
  { label: "Beginner", elo: 800, blurb: "Know the basics" },
  { label: "Intermediate", elo: 1200, blurb: "Regular player" },
  { label: "Advanced", elo: 1600, blurb: "Strong club level" },
  { label: "Expert", elo: 2000, blurb: "Tournament strength" },
  { label: "Master", elo: 2400, blurb: "Elite" },
];

/** Opponent ratings shown when picking a computer (chess.com style). */
export const OPPONENT_ELO_OPTIONS = [
  400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500,
] as const;

export interface EloProfile {
  rating: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  /** False until the player picks a starting rating. */
  hasSetRating: boolean;
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

export function eloDelta(playerElo: number, opponentElo: number, score: number, k = ELO_K): number {
  return Math.round(k * (score - expectedScore(playerElo, opponentElo)));
}

export function applyElo(playerElo: number, opponentElo: number, score: number, k = ELO_K): number {
  return Math.max(ELO_MIN, Math.min(ELO_MAX, playerElo + eloDelta(playerElo, opponentElo, score, k)));
}

export function clampElo(elo: number): number {
  const stepped = Math.round(elo / ELO_STEP) * ELO_STEP;
  return Math.max(ELO_MIN, Math.min(ELO_MAX, stepped));
}

/** Map a chosen opponent Elo to an AI search difficulty. */
export function eloToDifficulty(opponentElo: number): Exclude<AiDifficulty, 0> {
  if (opponentElo <= 900) return 1;
  if (opponentElo <= 1300) return 2;
  if (opponentElo <= 1700) return 3;
  return 4;
}

export function defaultProfile(): EloProfile {
  return {
    rating: ELO_DEFAULT,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    hasSetRating: false,
  };
}

export function loadProfile(): EloProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<EloProfile>;
    return {
      rating: typeof parsed.rating === "number" ? clampElo(parsed.rating) : ELO_DEFAULT,
      games: typeof parsed.games === "number" ? parsed.games : 0,
      wins: typeof parsed.wins === "number" ? parsed.wins : 0,
      losses: typeof parsed.losses === "number" ? parsed.losses : 0,
      draws: typeof parsed.draws === "number" ? parsed.draws : 0,
      hasSetRating: parsed.hasSetRating === true,
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: EloProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function setPlayerElo(profile: EloProfile, elo: number): EloProfile {
  const next: EloProfile = {
    ...profile,
    rating: clampElo(elo),
    hasSetRating: true,
  };
  saveProfile(next);
  return next;
}

/**
 * Update player Elo after a rated vs-AI game.
 * `opponentElo` is the rating the player selected for the computer.
 * `playerColor` is the side the human played.
 */
export function recordAiGame(
  profile: EloProfile,
  opponentElo: number,
  winner: "w" | "b" | null,
  playerColor: "w" | "b" = "w",
): { profile: EloProfile; result: EloResult | null } {
  if (!winner) return { profile, result: null };

  const opp = clampElo(opponentElo);
  const score = winner === playerColor ? 1 : 0;
  const before = profile.rating;
  const after = applyElo(before, opp, score);
  const delta = after - before;

  const next: EloProfile = {
    ...profile,
    rating: after,
    games: profile.games + 1,
    wins: profile.wins + (score === 1 ? 1 : 0),
    losses: profile.losses + (score === 0 ? 1 : 0),
    hasSetRating: true,
  };
  saveProfile(next);
  return {
    profile: next,
    result: { before, after, delta, opponentElo: opp },
  };
}
