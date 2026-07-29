import type { GameState, Move, PieceKind, Square } from "./types";
import { NEXUS_SQUARES, isInNexus, findKing, squareToRC } from "./board";
import { allMoves, applyMove } from "./moves";
import { skipAbility, doMovePhase, endTurn } from "./turn";
import { opponent } from "./types";

const PIECE_VALUE: Record<PieceKind, number> = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 0, // kings scored via Nexus logic, not material
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

/** Can the opponent capture our king on `kingSq` on their next turn? */
function kingThreatenedInNexus(state: GameState, kingSq: Square): boolean {
  if (!isInNexus(kingSq)) return false;
  // Probe: give opponent the turn and see if any move captures kingSq
  const probe: GameState = {
    ...state,
    activeColor: opponent(state.activeColor),
    turnPhase: "move",
    overdriveSquare: null,
    overdriveMovesLeft: 0,
  };
  for (const m of allMoves(probe)) {
    if (m.to === kingSq) return true;
  }
  return false;
}

function scoreMove(state: GameState, move: Move): number {
  let score = 0;
  const piece = state.board.get(move.from)!;
  const target = state.board.get(move.to);

  // ── Instant win: Nexus Assassination ──────────────────────────
  if (target && target.kind === "K" && isInNexus(move.to)) return 100_000;

  // ── Primary win path: get / keep king in the Nexus ────────────
  if (piece.kind === "K") {
    const fromDist = distToNexus(move.from);
    const toDist = distToNexus(move.to);

    // Entering the Nexus is the #1 strategic goal (beats all material)
    if (toDist === 0 && fromDist > 0) {
      score += 5_000;
      // Prefer safer entries
      if (kingThreatenedInNexus(applyMove(state, move), move.to)) {
        score -= 1_500; // still worth entering if no safer option, but prefer safe
      }
    }

    // Already holding: stay put in Nexus (don't wander out)
    if (fromDist === 0 && toDist === 0) {
      score += 2_000;
      const after = applyMove(state, move);
      if (kingThreatenedInNexus(after, move.to)) score -= 800;
    }

    // Leaving the Nexus throws away Hold progress — almost never do this
    if (fromDist === 0 && toDist > 0) {
      score -= 4_000;
    }

    // Progress: reward every step closer to Nexus (king marches center)
    if (toDist < fromDist) {
      score += (fromDist - toDist) * 400;
    } else if (toDist > fromDist) {
      score -= (toDist - fromDist) * 250;
    }
  } else {
    // Non-king: secondary — control Nexus / clear path, but never above king progress
    if (isInNexus(move.to) && !isInNexus(move.from)) score += 80;
    if (isInNexus(move.from) && !isInNexus(move.to)) score -= 30;

    // Slightly prefer moves that open lines toward center for the king
    const kingSq = findKing(state.board, state.activeColor);
    if (kingSq && !isInNexus(kingSq)) {
      // Capturing blockers near the king's path to Nexus
      if (target && distToNexus(move.to) <= 2) score += 25;
    }
  }

  // Material (kept well below Nexus Hold incentives)
  if (target && target.kind !== "K") {
    score += 35 * PIECE_VALUE[target.kind];
  }

  // Tiny center bias for non-king pieces
  if (piece.kind !== "K") {
    const toFile = move.to.charCodeAt(0) - 97;
    const toRank = move.to.charCodeAt(1) - 49;
    const centerDist = Math.abs(toFile - 3.5) + Math.abs(toRank - 3.5);
    score += (7 - centerDist);
  }

  return score;
}

/** Pick the best move for the AI (active player). Skips ability phase. */
export function aiPickMove(state: GameState): Move | null {
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
  if (!move) return s;

  s = doMovePhase(s, move);
  if (s.winner) return s;
  if (s.turnPhase === "resolved") return endTurn(s);
  return s;
}
