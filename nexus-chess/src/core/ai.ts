import type { Color, GameState, Move, PieceKind, Square } from "./types";
import { opponent } from "./types";
import { NEXUS_SQUARES, isInNexus, findKing, squareToRC } from "./board";
import { allMoves } from "./moves";
import { skipAbility, doMovePhase, endTurn } from "./turn";

/** 0 = off (hotseat), 1–4 = Easy → Expert */
export type AiDifficulty = 0 | 1 | 2 | 3 | 4;

export const AI_DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  0: "AI Off",
  1: "Easy",
  2: "Normal",
  3: "Hard",
  4: "Expert",
};

export function nextAiDifficulty(d: AiDifficulty): AiDifficulty {
  return ((d + 1) % 5) as AiDifficulty;
}

/**
 * Search depths (plies = full turns).
 * Easy is greedy only; Normal+ use real alpha-beta + quiescence.
 * Kept modest — in-browser search shares the UI thread.
 */
const SEARCH_DEPTH: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 1, // greedy / noisy 1-ply
  2: 2, // Normal
  3: 3, // Hard
  4: 4, // Expert
};

/** Cap branching after move ordering to keep deep search responsive in-browser. */
const BRANCH_CAP: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 40,
  2: 22,
  3: 18,
  4: 16,
};

/** Soft wall-clock budget so captures near the Nexus never freeze the tab. */
const SEARCH_BUDGET_MS: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 40,
  2: 90,
  3: 160,
  4: 240,
};

interface SearchClock {
  deadline: number;
  stopped: boolean;
}

function makeClock(budgetMs: number): SearchClock {
  return { deadline: performance.now() + budgetMs, stopped: false };
}

function timeUp(clock: SearchClock): boolean {
  if (clock.stopped) return true;
  if (performance.now() >= clock.deadline) {
    clock.stopped = true;
    return true;
  }
  return false;
}

const PIECE_VALUE: Record<PieceKind, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 0,
};

function manhattan(a: Square, b: Square): number {
  const [r1, f1] = squareToRC(a);
  const [r2, f2] = squareToRC(b);
  return Math.abs(r1 - r2) + Math.abs(f1 - f2);
}

/** Distance from a square to the nearest Nexus tile. */
export function distToNexus(sq: Square): number {
  if (isInNexus(sq)) return 0;
  let best = Infinity;
  for (const n of NEXUS_SQUARES) {
    const d = manhattan(sq, n);
    if (d < best) best = d;
  }
  return best;
}

/** Static evaluation from `perspective`'s point of view (higher = better for them). */
export function evaluatePosition(state: GameState, perspective: Color): number {
  if (state.winner === perspective) return 1_000_000;
  if (state.winner && state.winner !== perspective) return -1_000_000;

  const opp = opponent(perspective);
  let score = 0;

  let myMaterial = 0;
  let oppMaterial = 0;
  let myNexusPieces = 0;
  let oppNexusPieces = 0;

  for (const [sq, p] of state.board) {
    const val = PIECE_VALUE[p.kind];
    if (p.color === perspective) {
      myMaterial += val;
      if (isInNexus(sq) && p.kind !== "K") myNexusPieces++;
    } else {
      oppMaterial += val;
      if (isInNexus(sq) && p.kind !== "K") oppNexusPieces++;
    }
  }
  score += myMaterial - oppMaterial;
  score += (myNexusPieces - oppNexusPieces) * 80;

  const myKing = findKing(state.board, perspective);
  const oppKing = findKing(state.board, opp);

  // Avoid per-node allMoves() threat probes here — they freeze the UI under
  // alpha-beta. Threat urgency is handled in move ordering (scoreMove) instead.
  if (myKing) {
    const d = distToNexus(myKing);
    const king = state.board.get(myKing)!;
    if (d === 0) {
      score += 5_500 + king.nexusTurnCount * 4_000;
    } else {
      score += (14 - d) * 220;
    }
  } else {
    score -= 50_000;
  }

  if (oppKing) {
    const d = distToNexus(oppKing);
    const king = state.board.get(oppKing)!;
    if (d === 0) {
      score -= 5_500 + king.nexusTurnCount * 4_000;
    } else {
      score -= (14 - d) * 220;
    }
  }

  const myMana = state.players[perspective === "w" ? 0 : 1].mana;
  const oppMana = state.players[opp === "w" ? 0 : 1].mana;
  score += (myMana - oppMana) * 12;

  return score;
}

/** One-ply tactical move score (for move ordering + greedy). */
function scoreMove(state: GameState, move: Move, perspective: Color): number {
  let score = 0;
  const piece = state.board.get(move.from)!;
  const target = state.board.get(move.to);

  if (target && target.kind === "K" && isInNexus(move.to)) return 100_000;

  // MVV-LVA style capture ordering
  if (target && target.kind !== "K") {
    score += PIECE_VALUE[target.kind] * 10 - PIECE_VALUE[piece.kind];
  }

  if (piece.kind === "K") {
    const fromDist = distToNexus(move.from);
    const toDist = distToNexus(move.to);
    if (toDist === 0 && fromDist > 0) score += 5_000;
    if (fromDist === 0 && toDist === 0) score += 2_000;
    if (fromDist === 0 && toDist > 0) score -= 4_000;
    if (toDist < fromDist) score += (fromDist - toDist) * 400;
    else if (toDist > fromDist) score -= (toDist - fromDist) * 250;
  } else {
    if (isInNexus(move.to) && !isInNexus(move.from)) score += 120;
    if (isInNexus(move.from) && !isInNexus(move.to)) score -= 40;
    if (target && distToNexus(move.to) <= 2) score += 30;
  }

  return score;
}

function isTacticalMove(state: GameState, move: Move): boolean {
  if (state.board.has(move.to)) return true; // capture
  const piece = state.board.get(move.from);
  if (!piece) return false;
  // King entering or shifting inside Nexus
  if (piece.kind === "K" && isInNexus(move.to)) return true;
  return false;
}

/** Apply a normal move and advance to the opponent's turn (abilities skipped). */
function playFullMove(state: GameState, move: Move): GameState {
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);
  s = doMovePhase(s, move);
  if (s.winner) return s;
  if (s.turnPhase === "overdrive") {
    const follow = orderedMoves(s, 8);
    if (follow.length > 0) {
      s = doMovePhase(s, follow[0]);
      if (s.winner) return s;
    }
  }
  if (s.turnPhase === "resolved") s = endTurn(s);
  return s;
}

function toMovePhase(state: GameState): GameState {
  if (state.turnPhase === "ability") return skipAbility(state);
  return state;
}

function orderedMoves(state: GameState, cap = 40): Move[] {
  const s = toMovePhase(state);
  const moves = allMoves(s);
  const color = s.activeColor;
  return moves
    .map((m) => ({ m, sc: scoreMove(s, m, color) }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, cap)
    .map((x) => x.m);
}

/** Quiescence: resolve captures / Nexus king tactics before trusting the eval. */
function quiesce(
  state: GameState,
  alpha: number,
  beta: number,
  perspective: Color,
  qDepth: number,
  clock: SearchClock,
): number {
  if (state.winner) return evaluatePosition(state, perspective);
  if (timeUp(clock)) return evaluatePosition(state, perspective);

  const standPat = evaluatePosition(state, perspective);
  const maximizing = state.activeColor === perspective;

  if (qDepth >= 2) return standPat;

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  const s = toMovePhase(state);
  const moves = orderedMoves(s, 10).filter((m) => isTacticalMove(s, m));
  if (moves.length === 0) return standPat;

  if (maximizing) {
    let value = standPat;
    for (const m of moves) {
      if (timeUp(clock)) break;
      const child = playFullMove(state, m);
      value = Math.max(value, quiesce(child, alpha, beta, perspective, qDepth + 1, clock));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = standPat;
  for (const m of moves) {
    if (timeUp(clock)) break;
    const child = playFullMove(state, m);
    value = Math.min(value, quiesce(child, alpha, beta, perspective, qDepth + 1, clock));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function alphabeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  perspective: Color,
  branchCap: number,
  clock: SearchClock,
): number {
  if (state.winner) return evaluatePosition(state, perspective);
  if (timeUp(clock)) return evaluatePosition(state, perspective);
  if (depth === 0) return quiesce(state, alpha, beta, perspective, 0, clock);

  const maximizing = state.activeColor === perspective;
  const moves = orderedMoves(state, branchCap);
  if (moves.length === 0) return evaluatePosition(state, perspective);

  if (maximizing) {
    let value = -Infinity;
    for (const m of moves) {
      if (timeUp(clock)) break;
      const child = playFullMove(state, m);
      value = Math.max(value, alphabeta(child, depth - 1, alpha, beta, perspective, branchCap, clock));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value === -Infinity ? evaluatePosition(state, perspective) : value;
  }

  let value = Infinity;
  for (const m of moves) {
    if (timeUp(clock)) break;
    const child = playFullMove(state, m);
    value = Math.min(value, alphabeta(child, depth - 1, alpha, beta, perspective, branchCap, clock));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value === Infinity ? evaluatePosition(state, perspective) : value;
}

function pickRandom(moves: Move[]): Move {
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Easy: coherent but soft — mostly greedy with occasional weaker picks. */
function pickEasy(state: GameState): Move | null {
  const s = toMovePhase(state);
  const moves = orderedMoves(s, 40);
  if (moves.length === 0) return null;
  // 60% best move, 30% top-3, 10% weaker
  const roll = Math.random();
  if (roll < 0.6) return moves[0];
  if (roll < 0.9) return pickRandom(moves.slice(0, Math.min(3, moves.length)));
  return pickRandom(moves.slice(0, Math.min(8, moves.length)));
}

function pickSearch(
  state: GameState,
  maxDepth: number,
  branchCap: number,
  budgetMs: number,
): Move | null {
  const s = toMovePhase(state);
  const perspective = s.activeColor;
  const rootMoves = orderedMoves(s, branchCap);
  if (rootMoves.length === 0) return null;

  const clock = makeClock(budgetMs);
  let bestMoves = [rootMoves[0]];
  let bestScore = -Infinity;

  // Iterative deepening — stop early when the soft deadline hits
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (timeUp(clock) && depth > 1) break;
    let iterBest = -Infinity;
    let iterMoves: Move[] = [];
    const ordered = [
      ...bestMoves,
      ...rootMoves.filter(
        (m) => !bestMoves.some((b) => b.from === m.from && b.to === m.to && b.promotion === m.promotion),
      ),
    ];

    for (const m of ordered) {
      if (timeUp(clock) && iterMoves.length > 0) break;
      const child = playFullMove(s, m);
      const sc = alphabeta(child, depth - 1, -Infinity, Infinity, perspective, branchCap, clock);
      if (sc > iterBest) {
        iterBest = sc;
        iterMoves = [m];
      } else if (sc === iterBest) {
        iterMoves.push(m);
      }
    }
    if (iterMoves.length > 0) {
      bestScore = iterBest;
      bestMoves = iterMoves;
    }
    void bestScore;
  }

  return pickRandom(bestMoves);
}

/** Pick the best move for the AI at the given difficulty. */
export function aiPickMove(state: GameState, difficulty: AiDifficulty = 2): Move | null {
  if (difficulty === 0) return null;
  if (difficulty === 1) return pickEasy(state);
  return pickSearch(
    state,
    SEARCH_DEPTH[difficulty],
    BRANCH_CAP[difficulty],
    SEARCH_BUDGET_MS[difficulty],
  );
}

function forceResolve(state: GameState): GameState {
  return {
    ...state,
    turnPhase: "resolved",
    overdriveSquare: null,
    overdriveMovesLeft: 0,
  };
}

/** Execute a full AI turn; also returns the last board move played (for UI highlight). */
export function aiPlay(
  state: GameState,
  difficulty: AiDifficulty = 2,
): { state: GameState; lastMove: Move | null } {
  if (difficulty === 0) return { state, lastMove: null };
  let s = state;
  let lastMove: Move | null = null;
  if (s.turnPhase === "ability") s = skipAbility(s);

  const move = aiPickMove(s, difficulty);
  if (!move) {
    // No legal move — pass rather than soft-lock the UI on the AI side
    return { state: endTurn(forceResolve(s)), lastMove: null };
  }

  lastMove = move;
  s = doMovePhase(s, move);
  if (s.winner) return { state: s, lastMove };

  while (s.turnPhase === "overdrive" && !s.winner) {
    const follow = aiPickMove(s, difficulty === 1 ? 1 : 2);
    if (!follow) {
      s = forceResolve(s);
      break;
    }
    lastMove = follow;
    s = doMovePhase(s, follow);
  }

  if (s.winner) return { state: s, lastMove };
  if (s.turnPhase === "resolved") return { state: endTurn(s), lastMove };
  // Never return mid-overdrive / mid-move — that freezes player input
  return { state: endTurn(forceResolve(s)), lastMove };
}

/** Execute a full AI turn at the given difficulty. */
export function aiTurn(state: GameState, difficulty: AiDifficulty = 2): GameState {
  return aiPlay(state, difficulty).state;
}

/** Suggested think delay (ms). Search already costs time on Hard/Expert. */
export function aiThinkDelay(difficulty: AiDifficulty): number {
  switch (difficulty) {
    case 1:
      return 250;
    case 2:
      return 120;
    case 3:
      return 80;
    case 4:
      return 40;
    default:
      return 0;
  }
}
