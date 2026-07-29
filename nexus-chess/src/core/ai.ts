import type { Color, GameState, Move, PieceKind, Square } from "./types";
import { opponent } from "./types";
import { NEXUS_SQUARES, isInNexus, findKing, squareToRC } from "./board";
import { allMoves, applyMove } from "./moves";
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

const SEARCH_DEPTH: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 0, // random / weak — no search
  2: 1, // greedy 1-ply
  3: 2, // 2-ply minimax
  4: 4, // 4-ply expert
};

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

function kingThreatenedInNexus(state: GameState, kingSq: Square, byColor: Color): boolean {
  if (!isInNexus(kingSq)) return false;
  const probe: GameState = {
    ...state,
    activeColor: byColor,
    turnPhase: "move",
    overdriveSquare: null,
    overdriveMovesLeft: 0,
  };
  for (const m of allMoves(probe)) {
    if (m.to === kingSq) return true;
  }
  return false;
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
  score += (myNexusPieces - oppNexusPieces) * 60;

  const myKing = findKing(state.board, perspective);
  const oppKing = findKing(state.board, opp);

  if (myKing) {
    const d = distToNexus(myKing);
    const king = state.board.get(myKing)!;
    if (d === 0) {
      // Holding Nexus — primary win path
      score += 4_500 + king.nexusTurnCount * 3_500;
      if (kingThreatenedInNexus(state, myKing, opp)) score -= 1_200;
    } else {
      // March toward Nexus
      score += (14 - d) * 180;
    }
  } else {
    score -= 50_000; // king gone (shouldn't happen outside assassination win)
  }

  if (oppKing) {
    const d = distToNexus(oppKing);
    const king = state.board.get(oppKing)!;
    if (d === 0) {
      score -= 4_500 + king.nexusTurnCount * 3_500;
      // Bonus if we can assassinate them next
      if (kingThreatenedInNexus(state, oppKing, perspective)) score += 2_500;
    } else {
      score -= (14 - d) * 180;
    }
  }

  // Slight mana edge
  const myMana = state.players[perspective === "w" ? 0 : 1].mana;
  const oppMana = state.players[opp === "w" ? 0 : 1].mana;
  score += (myMana - oppMana) * 8;

  return score;
}

/** One-ply tactical move score (for move ordering + greedy). */
function scoreMove(state: GameState, move: Move, perspective: Color): number {
  let score = 0;
  const piece = state.board.get(move.from)!;
  const target = state.board.get(move.to);

  if (target && target.kind === "K" && isInNexus(move.to)) return 100_000;

  if (piece.kind === "K") {
    const fromDist = distToNexus(move.from);
    const toDist = distToNexus(move.to);
    if (toDist === 0 && fromDist > 0) {
      score += 5_000;
      const after = applyMove(state, move);
      if (kingThreatenedInNexus(after, move.to, opponent(perspective))) score -= 1_500;
    }
    if (fromDist === 0 && toDist === 0) {
      score += 2_000;
      const after = applyMove(state, move);
      if (kingThreatenedInNexus(after, move.to, opponent(perspective))) score -= 800;
    }
    if (fromDist === 0 && toDist > 0) score -= 4_000;
    if (toDist < fromDist) score += (fromDist - toDist) * 400;
    else if (toDist > fromDist) score -= (toDist - fromDist) * 250;
  } else {
    if (isInNexus(move.to) && !isInNexus(move.from)) score += 80;
    if (isInNexus(move.from) && !isInNexus(move.to)) score -= 30;
    if (target && distToNexus(move.to) <= 2) score += 25;
  }

  if (target && target.kind !== "K") score += PIECE_VALUE[target.kind] / 3;

  return score;
}

/** Apply a normal move and advance to the opponent's turn (abilities skipped). */
function playFullMove(state: GameState, move: Move): GameState {
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);
  s = doMovePhase(s, move);
  if (s.winner) return s;
  // Overdrive leftover: greedily finish with best follow-up so search stays one-move-per-ply
  if (s.turnPhase === "overdrive") {
    const follow = orderedMoves(s);
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

function orderedMoves(state: GameState): Move[] {
  const s = toMovePhase(state);
  const moves = allMoves(s);
  const color = s.activeColor;
  return moves
    .map((m) => ({ m, sc: scoreMove(s, m, color) }))
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.m);
}

function alphabeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  perspective: Color,
): number {
  if (state.winner || depth === 0) {
    return evaluatePosition(state, perspective);
  }

  const maximizing = state.activeColor === perspective;
  const moves = orderedMoves(state);
  if (moves.length === 0) return evaluatePosition(state, perspective);

  if (maximizing) {
    let value = -Infinity;
    for (const m of moves) {
      const child = playFullMove(state, m);
      value = Math.max(value, alphabeta(child, depth - 1, alpha, beta, perspective));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const m of moves) {
      const child = playFullMove(state, m);
      value = Math.min(value, alphabeta(child, depth - 1, alpha, beta, perspective));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function pickRandom(moves: Move[]): Move {
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Easy: often blunders — pick randomly among weaker moves. */
function pickEasy(state: GameState): Move | null {
  const s = toMovePhase(state);
  const moves = orderedMoves(s);
  if (moves.length === 0) return null;
  // Prefer bottom half of ordered list (worse moves), with some noise
  const weakStart = Math.floor(moves.length * 0.4);
  const pool = moves.slice(weakStart);
  if (pool.length === 0) return pickRandom(moves);
  // 25% chance to accidentally play a decent move
  if (Math.random() < 0.25) return pickRandom(moves.slice(0, Math.max(1, Math.ceil(moves.length * 0.3))));
  return pickRandom(pool);
}

function pickGreedy(state: GameState): Move | null {
  const s = toMovePhase(state);
  const moves = orderedMoves(s);
  if (moves.length === 0) return null;
  const best = scoreMove(s, moves[0], s.activeColor);
  const ties = moves.filter((m) => scoreMove(s, m, s.activeColor) === best);
  return pickRandom(ties);
}

function pickSearch(state: GameState, depth: number): Move | null {
  const s = toMovePhase(state);
  const perspective = s.activeColor;
  const moves = orderedMoves(s);
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const m of moves) {
    const child = playFullMove(s, m);
    const sc = alphabeta(child, depth - 1, -Infinity, Infinity, perspective);
    if (sc > bestScore) {
      bestScore = sc;
      bestMoves = [m];
    } else if (sc === bestScore) {
      bestMoves.push(m);
    }
  }

  return pickRandom(bestMoves);
}

/** Pick the best move for the AI at the given difficulty. */
export function aiPickMove(state: GameState, difficulty: AiDifficulty = 2): Move | null {
  if (difficulty === 0) return null;
  if (difficulty === 1) return pickEasy(state);
  if (difficulty === 2) return pickGreedy(state);
  return pickSearch(state, SEARCH_DEPTH[difficulty]);
}

/** Execute a full AI turn at the given difficulty. */
export function aiTurn(state: GameState, difficulty: AiDifficulty = 2): GameState {
  if (difficulty === 0) return state;
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);

  const move = aiPickMove(s, difficulty);
  if (!move) return s;

  s = doMovePhase(s, move);
  if (s.winner) return s;

  // Finish overdrive if somehow active
  while (s.turnPhase === "overdrive" && !s.winner) {
    const follow = aiPickMove(s, Math.min(difficulty, 2) as AiDifficulty);
    if (!follow) break;
    s = doMovePhase(s, follow);
  }

  if (s.winner) return s;
  if (s.turnPhase === "resolved") return endTurn(s);
  return s;
}

/** Suggested think delay (ms) so harder levels feel deliberate. */
export function aiThinkDelay(difficulty: AiDifficulty): number {
  switch (difficulty) {
    case 1:
      return 200;
    case 2:
      return 350;
    case 3:
      return 450;
    case 4:
      return 150; // search already takes time; short pad
    default:
      return 0;
  }
}
