import type { GameState, Move, PieceKind } from "./types";
import { cloneState } from "./types";
import { isInNexus, findKing } from "./board";
import { allMoves, applyMove } from "./moves";
import { skipAbility, doMovePhase, endTurn } from "./turn";

const PIECE_VALUE: Record<PieceKind, number> = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 100,
};

function scoreMove(state: GameState, move: Move): number {
  let score = 0;
  const piece = state.board.get(move.from)!;
  const target = state.board.get(move.to);

  // Instant win: capture enemy king in Nexus
  if (target && target.kind === "K" && isInNexus(move.to)) return 10000;

  // Move king into Nexus
  if (piece.kind === "K" && isInNexus(move.to)) score += 100;

  // Move any piece into Nexus
  if (isInNexus(move.to)) score += 50;

  // Capture bonus (weighted by piece value)
  if (target) score += 30 * PIECE_VALUE[target.kind];

  // Penalize leaving king exposed in Nexus
  if (piece.kind === "K" && isInNexus(move.from) && !isInNexus(move.to)) {
    // Moving king out of Nexus — slight penalty (losing hold progress)
    score -= 20;
  }

  // Slight center-control bonus
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = move.to.charCodeAt(1) - 49;
  const centerDist = Math.abs(toFile - 3.5) + Math.abs(toRank - 3.5);
  score += (7 - centerDist) * 2;

  return score;
}

/** Pick the best move for the AI (active player). Skips ability phase. */
export function aiPickMove(state: GameState): Move | null {
  // Skip to move phase
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);

  const moves = allMoves(s);
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const m of moves) {
    const sc = scoreMove(s, m);
    if (sc > bestScore) {
      bestScore = sc;
      bestMoves = [m];
    } else if (sc === bestScore) {
      bestMoves.push(m);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/** Execute a full AI turn: skip ability, pick and execute move, end turn. */
export function aiTurn(state: GameState): GameState {
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);

  const move = aiPickMove(state);
  if (!move) return s; // no legal moves — stalemate-like

  s = doMovePhase(s, move);
  if (s.winner) return s;
  if (s.turnPhase === "resolved") return endTurn(s);
  return s;
}
