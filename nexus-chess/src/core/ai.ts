import type { AbilityCast, Color, GameState, Move, Square } from "./types";
import { activePlayer, opponent } from "./types";
import { NEXUS_SQUARES, isInNexus, findKing, squareToRC } from "./board";
import { allMoves } from "./moves";
import { skipAbility, doAbilityPhase, doMovePhase, endTurn } from "./turn";
import { ABILITY_COST, abilityTargets } from "./abilities";
import {
  PIECE_VALUE,
  pieceAttacksSquare,
  squareAttackedBy,
  attackCount,
  seeGain,
  classicalPositional,
} from "./chessStrat";

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
 * Full-turn plies for alpha-beta.
 * Easy is noisy greedy; Normal+ search for real.
 */
const SEARCH_DEPTH: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 1,
  2: 3,
  3: 4,
  4: 5,
};

const BRANCH_CAP: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 40,
  2: 28,
  3: 24,
  4: 22,
};

/** Soft budgets — search yields so the UI thread keeps painting. */
const SEARCH_BUDGET_MS: Record<Exclude<AiDifficulty, 0>, number> = {
  1: 30,
  2: 140,
  3: 240,
  4: 360,
};

interface SearchClock {
  deadline: number;
  stopped: boolean;
  nodes: number;
}

function makeClock(budgetMs: number): SearchClock {
  return { deadline: performance.now() + budgetMs, stopped: false, nodes: 0 };
}

function timeUp(clock: SearchClock): boolean {
  if (clock.stopped) return true;
  if (clock.nodes > 100_000) {
    clock.stopped = true;
    return true;
  }
  if ((clock.nodes & 15) === 0 && performance.now() >= clock.deadline) {
    clock.stopped = true;
    return true;
  }
  return false;
}

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

/** Cheap danger proxy — nearby enemy weight, no move generation. */
function proximityDanger(state: GameState, sq: Square, byColor: Color): number {
  let danger = 0;
  for (const [esq, ep] of state.board) {
    if (ep.color !== byColor) continue;
    const md = manhattan(sq, esq);
    if (md > 3) continue;
    const weight = PIECE_VALUE[ep.kind] || 200;
    danger += weight / (md + 0.5);
  }
  return danger;
}

function kingAssassinable(state: GameState, kingColor: Color): boolean {
  const ksq = findKing(state.board, kingColor);
  if (!ksq || !isInNexus(ksq)) return false;
  return squareAttackedBy(state, ksq, opponent(kingColor));
}

/** Friendly non-king pieces contesting the Nexus zone. */
function nexusSupportCount(state: GameState, color: Color): number {
  let n = 0;
  for (const [sq, p] of state.board) {
    if (p.color !== color || p.kind === "K") continue;
    if (isInNexus(sq)) n += 2;
    else if (distToNexus(sq) <= 2) n++;
  }
  return n;
}

/** After king steps onto `to` (vacating `from`), can the opponent capture it? */
function kingWouldBeAssassinable(
  state: GameState,
  to: Square,
  kingColor: Color,
  from: Square,
): boolean {
  if (!isInNexus(to)) return false;
  const board = new Map(state.board);
  const king = board.get(from);
  if (!king || king.kind !== "K") return false;
  if (king.isShielded) return false;
  board.delete(from);
  board.set(to, { ...king });
  return squareAttackedBy({ ...state, board }, to, opponent(kingColor));
}

function isSuicidalKingEntry(state: GameState, move: Move): boolean {
  const p = state.board.get(move.from);
  if (!p || p.kind !== "K") return false;
  if (!isInNexus(move.to) || isInNexus(move.from)) return false;
  return kingWouldBeAssassinable(state, move.to, p.color, move.from);
}

function boardAfterMove(state: GameState, move: Move): GameState["board"] {
  const board = new Map(state.board);
  const p = board.get(move.from);
  if (!p) return board;
  board.delete(move.from);
  board.set(move.to, { ...p });
  return board;
}

/**
 * Static evaluation from `perspective`'s point of view (higher = better for them).
 * Classical chess (PST / mobility / structure / hanging) + Nexus Hold/Assassination as north star.
 */
export function evaluatePosition(state: GameState, perspective: Color): number {
  if (state.winner === perspective) return 1_000_000;
  if (state.winner && state.winner !== perspective) return -1_000_000;

  const opp = opponent(perspective);
  let score = 0;

  let myMaterial = 0;
  let oppMaterial = 0;
  let myNexusPieces = 0;
  let oppNexusPieces = 0;
  let myNearNexus = 0;
  let oppNearNexus = 0;

  for (const [sq, p] of state.board) {
    const val = PIECE_VALUE[p.kind];
    const d = distToNexus(sq);
    if (p.color === perspective) {
      myMaterial += val;
      if (isInNexus(sq) && p.kind !== "K") myNexusPieces++;
      if (p.kind !== "K" && d <= 2) myNearNexus++;
    } else {
      oppMaterial += val;
      if (isInNexus(sq) && p.kind !== "K") oppNexusPieces++;
      if (p.kind !== "K" && d <= 2) oppNearNexus++;
    }
  }
  score += myMaterial - oppMaterial;
  // Classical midgame strategy layer
  score += classicalPositional(state, perspective);

  score += (myNexusPieces - oppNexusPieces) * 80;
  score += (myNearNexus - oppNearNexus) * 55;

  const myKing = findKing(state.board, perspective);
  const oppKing = findKing(state.board, opp);

  if (myKing) {
    const d = distToNexus(myKing);
    const king = state.board.get(myKing)!;
    if (d === 0) {
      const underFire = kingAssassinable(state, perspective);
      if (underFire) {
        score -= 12_000 + king.nexusTurnCount * 800;
      } else {
        const support = myNearNexus + myNexusPieces;
        score += 280 + king.nexusTurnCount * 2_600;
        if (support < 1 && !king.isShielded) score -= 900;
        score -= Math.min(1_200, proximityDanger(state, myKing, opp) * 0.3);
      }
    } else {
      const support = myNearNexus;
      score += (5 - Math.min(5, d)) * (support >= 1 ? 32 : 12);
      if (d <= 2) score += support * 35;
    }
  } else {
    score -= 50_000;
  }

  if (oppKing) {
    const d = distToNexus(oppKing);
    const king = state.board.get(oppKing)!;
    if (d === 0) {
      score -= 200 + king.nexusTurnCount * 2_800;
      if (kingAssassinable(state, opp)) {
        score += 15_000;
      } else {
        const pressure = attackCount(state, oppKing, perspective);
        score += pressure * 420;
        score += Math.min(2_400, proximityDanger(state, oppKing, perspective) * 0.55);
        score += myNearNexus * 40;
      }
    } else {
      score -= (5 - Math.min(5, d)) * 28;
    }
  }

  const myMana = state.players[perspective === "w" ? 0 : 1].mana;
  const oppMana = state.players[opp === "w" ? 0 : 1].mana;
  score += (myMana - oppMana) * 10;

  return score;
}

/** One-ply tactical move score (ordering / Easy greedy). */
function scoreMove(state: GameState, move: Move, perspective: Color): number {
  let score = 0;
  const piece = state.board.get(move.from)!;
  const target = state.board.get(move.to);
  const opp = opponent(perspective);
  const oppKing = findKing(state.board, opp);
  const myKing = findKing(state.board, perspective);

  // Instant win
  if (target && target.kind === "K" && isInNexus(move.to)) return 1_000_000;

  // Classical MVV-LVA + SEE — avoid obviously losing captures
  if (target && target.kind !== "K") {
    const see = seeGain(state, move);
    score += see * 8 + PIECE_VALUE[target.kind] * 4 - PIECE_VALUE[piece.kind];
    if (see < 0) score -= 600; // deprioritize poisoned captures
  } else if (!target) {
    // Quiet move: slight preference for developing / PST-improving squares via nexus pull
  }

  // Deliver or prepare assassination on their Nexus king
  if (oppKing && isInNexus(oppKing)) {
    if (move.to === oppKing) return 1_000_000;
    const after = boardAfterMove(state, move);
    if (pieceAttacksSquare(after, move.to, oppKing, piece.kind, perspective)) {
      score += 6_500; // gun pointed at their king
    }
    if (target && distToNexus(move.to) <= 1) score += 400;
    const before = manhattan(move.from, oppKing);
    const afterDist = manhattan(move.to, oppKing);
    if (afterDist < before) score += (before - afterDist) * 45;
  }

  // Emergency: our king is in the kill zone
  const myKingHot = !!(myKing && isInNexus(myKing) && kingAssassinable(state, perspective));
  if (myKingHot && myKing) {
    if (piece.kind === "K" && !isInNexus(move.to)) {
      score += 8_000; // flee the Nexus
    }
    // Capture a piece that currently attacks our king
    if (target && pieceAttacksSquare(state.board, move.to, myKing, target.kind, opp)) {
      score += 7_500;
    }
    if (piece.kind !== "K" && isInNexus(move.to)) score += 900;
  }

  if (piece.kind === "K") {
    const fromDist = distToNexus(move.from);
    const toDist = distToNexus(move.to);
    if (toDist === 0 && fromDist > 0) {
      if (isSuicidalKingEntry(state, move)) {
        score -= 100_000;
      } else {
        const support = nexusSupportCount(state, perspective);
        const danger = proximityDanger(state, move.to, opp);
        if (support < 1 && !piece.isShielded) {
          score -= 2_200; // naked rush — hunt / develop first
        } else {
          score += 180 + support * 60;
        }
        score -= Math.min(800, danger * 0.4);
      }
    }
    if (fromDist === 0 && toDist === 0) {
      if (myKingHot) {
        const stillHot = kingWouldBeAssassinable(state, move.to, perspective, move.from);
        score += stillHot ? -2_000 : 3_500;
      } else {
        score += 120;
      }
    }
    if (fromDist === 0 && toDist > 0) {
      score += myKingHot ? 8_000 : -550;
    }
    // Their king is already in — hunt with pieces before racing yours in
    if (oppKing && isInNexus(oppKing) && toDist < fromDist) {
      score -= 250;
    }
    if (toDist < fromDist) score += (fromDist - toDist) * (myKingHot ? 10 : 28);
    else if (toDist > fromDist) score -= (toDist - fromDist) * 30;
  } else {
    if (isInNexus(move.to) && !isInNexus(move.from)) score += 140;
    if (isInNexus(move.from) && !isInNexus(move.to)) score -= 15;
    if (target && distToNexus(move.to) <= 2) score += 40;
    if (target) score += (3 - Math.min(3, distToNexus(move.to))) * 20;
    if (!target) {
      const fd = distToNexus(move.from);
      const td = distToNexus(move.to);
      if (td < fd) score += (fd - td) * 28;
    }
  }

  return score;
}

function isTacticalMove(state: GameState, move: Move): boolean {
  if (state.board.has(move.to)) return true;
  const piece = state.board.get(move.from);
  if (!piece) return false;
  if (piece.kind === "K" && isInNexus(move.to)) return true;
  if (piece.kind === "K" && isInNexus(move.from) && !isInNexus(move.to)) return true; // flee
  if (isInNexus(move.to)) return true;
  const opp = opponent(state.activeColor);
  const oppKing = findKing(state.board, opp);
  if (oppKing && isInNexus(oppKing)) {
    const after = boardAfterMove(state, move);
    if (pieceAttacksSquare(after, move.to, oppKing, piece.kind, state.activeColor)) return true;
  }
  return false;
}

function playFullMove(state: GameState, move: Move): GameState {
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);
  s = doMovePhase(s, move);
  if (s.winner) return s;
  if (s.turnPhase === "overdrive") {
    const follow = orderedMoves(s, 10);
    if (follow.length > 0) {
      const prevLeft = s.overdriveMovesLeft;
      const next = doMovePhase(s, follow[0]);
      if (next.turnPhase === "overdrive" && next.overdriveMovesLeft >= prevLeft) {
        s = forceResolve(s);
      } else {
        s = next;
      }
      if (s.winner) return s;
    } else {
      s = forceResolve(s);
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
  let moves = allMoves(s);
  // Filter illegal overdrive second hops (back rank)
  if (s.turnPhase === "overdrive" && s.overdriveMovesLeft === 1) {
    moves = moves.filter((m) => {
      const r = m.to.charCodeAt(1) - 49;
      return r !== 0 && r !== 7;
    });
  }
  // Never walk the king into a free assassination
  const safe = moves.filter((m) => !isSuicidalKingEntry(s, m));
  if (safe.length > 0) moves = safe;

  const color = s.activeColor;
  const opp = opponent(color);
  const oppKing = findKing(s.board, opp);

  // If their king is in the Nexus, force the search to consider kill-shots / setups first.
  // When a direct aim exists, search ONLY those (plus any captures) so the AI doesn't
  // wander its own king instead of taking the fight to theirs.
  if (oppKing && isInNexus(oppKing)) {
    const aim: Move[] = [];
    const approach: Move[] = [];
    for (const m of moves) {
      if (m.to === oppKing) {
        aim.push(m);
        continue;
      }
      const p = s.board.get(m.from);
      if (!p) continue;
      const after = boardAfterMove(s, m);
      if (pieceAttacksSquare(after, m.to, oppKing, p.kind, color)) {
        aim.push(m);
      } else if (
        s.board.has(m.to) ||
        manhattan(m.to, oppKing) < manhattan(m.from, oppKing)
      ) {
        approach.push(m);
      }
    }
    if (aim.length > 0) {
      moves = aim;
    } else if (approach.length > 0) {
      const rest = moves.filter(
        (m) => !approach.some((a) => a.from === m.from && a.to === m.to),
      );
      moves = [...approach, ...rest];
    }
  }

  return moves
    .map((m) => ({ m, sc: scoreMove(s, m, color) }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, cap)
    .map((x) => x.m);
}

function quiesce(
  state: GameState,
  alpha: number,
  beta: number,
  perspective: Color,
  qDepth: number,
  clock: SearchClock,
): number {
  clock.nodes++;
  if (state.winner) return evaluatePosition(state, perspective);
  if (timeUp(clock)) return evaluatePosition(state, perspective);

  const standPat = evaluatePosition(state, perspective);
  const maximizing = state.activeColor === perspective;

  if (qDepth >= 3) return standPat;

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  const s = toMovePhase(state);
  const moves = orderedMoves(s, 12).filter((m) => {
    if (!isTacticalMove(s, m)) return false;
    // Skip clearly losing exchanges in quiescence (keep assassination / checks-to-nexus)
    if (s.board.has(m.to)) {
      const t = s.board.get(m.to)!;
      if (t.kind === "K" && isInNexus(m.to)) return true;
      if (seeGain(s, m) < -50) return false;
    }
    return true;
  });
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
  clock.nodes++;
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

function pickEasy(state: GameState): Move | null {
  const s = toMovePhase(state);
  const moves = orderedMoves(s, 40);
  if (moves.length === 0) return null;
  const roll = Math.random();
  if (roll < 0.55) return moves[0];
  if (roll < 0.85) return pickRandom(moves.slice(0, Math.min(4, moves.length)));
  return pickRandom(moves.slice(0, Math.min(10, moves.length)));
}

type YieldFn = () => Promise<void>;

function defaultYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Root ability ideas — AI used to always skip, which made it look brain-dead.
 * Keep the list tiny so search stays under the freeze budget.
 */
function abilityCandidates(state: GameState, difficulty: AiDifficulty): (AbilityCast | null)[] {
  const out: (AbilityCast | null)[] = [null];
  if (difficulty < 2 || state.turnPhase !== "ability") return out;

  const mana = activePlayer(state).mana;
  const me = state.activeColor;
  const opp = opponent(me);
  const kingSq = findKing(state.board, me);
  const oppKing = findKing(state.board, opp);
  const maxExtra = difficulty >= 4 ? 5 : difficulty >= 3 ? 4 : 3;

  const push = (cast: AbilityCast) => {
    if (out.length > maxExtra) return;
    out.push(cast);
  };

  if (mana >= ABILITY_COST.aegis) {
    // Shield king before a Nexus push — critical so entry isn't suicide next turn
    if (kingSq && !isInNexus(kingSq)) {
      const d = distToNexus(kingSq);
      const danger = proximityDanger(state, kingSq, opp);
      if (d <= 2 || danger > 300 || nexusSupportCount(state, me) < 2) {
        push({ ability: "aegis", target: kingSq });
      }
    }
    for (const [sq, p] of state.board) {
      if (p.color !== me || p.kind === "K" || p.kind === "P") continue;
      if (p.isShielded) continue;
      if (PIECE_VALUE[p.kind] < 500) continue;
      if (proximityDanger(state, sq, opp) > 350) {
        push({ ability: "aegis", target: sq });
      }
    }
  }

  if (mana >= ABILITY_COST.overdrive) {
    const targets = abilityTargets(state, "overdrive");
    const ranked = targets
      .map((sq) => {
        const p = state.board.get(sq)!;
        let sc = PIECE_VALUE[p.kind];
        sc += (3 - Math.min(3, distToNexus(sq))) * 40;
        // Prefer overdrive that can finish / hunt a Nexus king
        if (oppKing && isInNexus(oppKing)) {
          sc += 500;
          sc += Math.max(0, 6 - manhattan(sq, oppKing)) * 80;
          if (pieceAttacksSquare(state.board, sq, oppKing, p.kind, me)) sc += 2_000;
        }
        return { sq, sc };
      })
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 2);
    for (const { sq } of ranked) push({ ability: "overdrive", target: sq });
  }

  if (mana >= ABILITY_COST.tacticalSwap && kingSq && difficulty >= 3) {
    // Flee: swap king OUT of a hot Nexus
    if (isInNexus(kingSq) && kingAssassinable(state, me)) {
      const escapes = abilityTargets(state, "tacticalSwap")
        .map((sq) => ({ sq, d: distToNexus(sq) }))
        .filter((x) => x.d > 0)
        .sort((a, b) => b.d - a.d)
        .slice(0, 2);
      for (const { sq } of escapes) push({ ability: "tacticalSwap", target: sq });
    } else {
      const kd = distToNexus(kingSq);
      const swaps = abilityTargets(state, "tacticalSwap")
        .map((sq) => ({ sq, d: distToNexus(sq) }))
        .filter((x) => x.d < kd && x.d > 0)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { sq } of swaps) push({ ability: "tacticalSwap", target: sq });
    }
  }

  return out;
}

/** Iterative deepening with async yields so the canvas keeps animating. */
async function pickSearchAsync(
  state: GameState,
  maxDepth: number,
  branchCap: number,
  budgetMs: number,
  yieldFn: YieldFn,
): Promise<Move | null> {
  const s = toMovePhase(state);
  const perspective = s.activeColor;
  const rootMoves = orderedMoves(s, branchCap);
  if (rootMoves.length === 0) return null;

  {
    const t = s.board.get(rootMoves[0].to);
    if (t && t.kind === "K" && isInNexus(rootMoves[0].to)) return rootMoves[0];
  }

  const clock = makeClock(budgetMs);
  let bestMoves = [rootMoves[0]];
  let bestScore = -Infinity;

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

    let i = 0;
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
      i++;
      if ((i & 1) === 0) await yieldFn();
    }

    if (iterMoves.length > 0) {
      bestScore = iterBest;
      bestMoves = iterMoves;
    }
    void bestScore;
    await yieldFn();
  }

  return pickRandom(bestMoves);
}

/** Sync pick — used by tests and Easy. */
export function aiPickMove(state: GameState, difficulty: AiDifficulty = 2): Move | null {
  if (difficulty === 0) return null;
  if (difficulty === 1) return pickEasy(state);
  const s = toMovePhase(state);
  const perspective = s.activeColor;
  const rootMoves = orderedMoves(s, BRANCH_CAP[difficulty]);
  if (rootMoves.length === 0) return null;
  {
    const t = s.board.get(rootMoves[0].to);
    if (t && t.kind === "K" && isInNexus(rootMoves[0].to)) return rootMoves[0];
  }
  const clock = makeClock(SEARCH_BUDGET_MS[difficulty]);
  let bestMoves = [rootMoves[0]];
  let bestScore = -Infinity;
  const maxDepth = SEARCH_DEPTH[difficulty];
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
      const sc = alphabeta(
        child,
        depth - 1,
        -Infinity,
        Infinity,
        perspective,
        BRANCH_CAP[difficulty],
        clock,
      );
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

function scoreRootMove(
  state: GameState,
  move: Move,
  perspective: Color,
  depth: number,
  branchCap: number,
  clock: SearchClock,
): number {
  const child = playFullMove(state, move);
  if (depth <= 1) return alphabeta(child, 0, -Infinity, Infinity, perspective, branchCap, clock);
  return alphabeta(child, depth - 1, -Infinity, Infinity, perspective, branchCap, clock);
}

/** Choose ability (or skip) + move for a full turn. */
function pickAbilityAndMove(
  state: GameState,
  difficulty: AiDifficulty,
): { cast: AbilityCast | null; move: Move | null } {
  if (difficulty === 0) return { cast: null, move: null };
  if (difficulty === 1) {
    const s = state.turnPhase === "ability" ? skipAbility(state) : state;
    return { cast: null, move: pickEasy(s) };
  }

  const casts = abilityCandidates(state, difficulty);
  const perspective = state.activeColor;
  const budget = SEARCH_BUDGET_MS[difficulty];
  const depth = SEARCH_DEPTH[difficulty];
  const branchCap = BRANCH_CAP[difficulty];
  const perCast = Math.max(40, Math.floor(budget / Math.max(1, casts.length)));

  let bestCast: AbilityCast | null = null;
  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (const cast of casts) {
    const clock = makeClock(perCast);
    let s =
      state.turnPhase === "ability"
        ? doAbilityPhase(state, cast)
        : cast
          ? state
          : toMovePhase(state);

    // If we somehow aren't in a movable phase, skip
    if (s.turnPhase !== "move" && s.turnPhase !== "overdrive") {
      s = toMovePhase(state);
    }

    const moves = orderedMoves(s, branchCap);
    if (moves.length === 0) continue;

    // Prefer assassination immediately
    {
      const t = s.board.get(moves[0].to);
      if (t && t.kind === "K" && isInNexus(moves[0].to)) {
        return { cast, move: moves[0] };
      }
    }

    let localBest = -Infinity;
    let localMoves: Move[] = [];
    // Shallow root probe for this ability line
    const probeDepth = Math.max(1, depth - (casts.length > 1 ? 1 : 0));
    for (const m of moves) {
      if (timeUp(clock) && localMoves.length > 0) break;
      const sc = scoreRootMove(s, m, perspective, probeDepth, branchCap, clock);
      if (sc > localBest) {
        localBest = sc;
        localMoves = [m];
      } else if (sc === localBest) {
        localMoves.push(m);
      }
    }
    if (localMoves.length > 0 && localBest > bestScore) {
      bestScore = localBest;
      bestCast = cast;
      bestMove = pickRandom(localMoves);
    }
  }

  if (!bestMove) {
    const s = toMovePhase(state);
    return { cast: null, move: aiPickMove(s, difficulty) };
  }
  return { cast: bestCast, move: bestMove };
}

async function pickAbilityAndMoveAsync(
  state: GameState,
  difficulty: AiDifficulty,
  yieldFn: YieldFn,
): Promise<{ cast: AbilityCast | null; move: Move | null }> {
  if (difficulty === 0) return { cast: null, move: null };
  if (difficulty === 1) {
    const s = state.turnPhase === "ability" ? skipAbility(state) : state;
    return { cast: null, move: pickEasy(s) };
  }

  const casts = abilityCandidates(state, difficulty);
  const perspective = state.activeColor;
  const budget = SEARCH_BUDGET_MS[difficulty];
  const depth = SEARCH_DEPTH[difficulty];
  const branchCap = BRANCH_CAP[difficulty];
  const perCast = Math.max(45, Math.floor(budget / Math.max(1, casts.length)));

  let bestCast: AbilityCast | null = null;
  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (const cast of casts) {
    const clock = makeClock(perCast);
    let s =
      state.turnPhase === "ability"
        ? doAbilityPhase(state, cast)
        : toMovePhase(state);

    if (s.turnPhase !== "move" && s.turnPhase !== "overdrive") {
      s = toMovePhase(state);
    }

    const move = await pickSearchAsync(
      s,
      Math.max(1, depth - (casts.length > 2 ? 1 : 0)),
      branchCap,
      perCast,
      yieldFn,
    );
    if (!move) {
      await yieldFn();
      continue;
    }

    const sc = scoreRootMove(s, move, perspective, 2, branchCap, clock);
    if (sc > bestScore) {
      bestScore = sc;
      bestCast = cast;
      bestMove = move;
    }
    await yieldFn();
  }

  if (!bestMove) {
    const s = toMovePhase(state);
    return {
      cast: null,
      move: await pickSearchAsync(s, depth, branchCap, budget, yieldFn),
    };
  }
  return { cast: bestCast, move: bestMove };
}

function forceResolve(state: GameState): GameState {
  return {
    ...state,
    turnPhase: "resolved",
    overdriveSquare: null,
    overdriveMovesLeft: 0,
  };
}

function applyChosenMove(
  state: GameState,
  move: Move,
  difficulty: AiDifficulty,
): { state: GameState; lastMove: Move } {
  let s = doMovePhase(state, move);
  let lastMove = move;
  if (s.winner) return { state: s, lastMove };

  let odGuard = 0;
  while (s.turnPhase === "overdrive" && !s.winner && odGuard++ < 3) {
    const prevLeft = s.overdriveMovesLeft;
    const follow = aiPickMove(s, difficulty === 1 ? 1 : (Math.min(difficulty, 2) as AiDifficulty));
    if (!follow) {
      s = forceResolve(s);
      break;
    }
    lastMove = follow;
    s = doMovePhase(s, follow);
    // No progress (illegal hop etc.) — end the turn instead of spinning
    if (s.turnPhase === "overdrive" && s.overdriveMovesLeft >= prevLeft) {
      s = forceResolve(s);
      break;
    }
  }

  if (s.winner) return { state: s, lastMove };
  if (s.turnPhase === "resolved") return { state: endTurn(s), lastMove };
  return { state: endTurn(forceResolve(s)), lastMove };
}

/** Execute a full AI turn (sync — prefer aiPlayAsync in the UI). */
export function aiPlay(
  state: GameState,
  difficulty: AiDifficulty = 2,
): { state: GameState; lastMove: Move | null } {
  if (difficulty === 0) return { state, lastMove: null };

  const { cast, move } = pickAbilityAndMove(state, difficulty);
  let s = state;
  if (s.turnPhase === "ability") {
    s = doAbilityPhase(s, cast);
  }

  if (!move) return { state: endTurn(forceResolve(toMovePhase(s))), lastMove: null };
  return applyChosenMove(s, move, difficulty);
}

/** Async AI turn — yields during search so captures/animations don't freeze. */
export async function aiPlayAsync(
  state: GameState,
  difficulty: AiDifficulty = 2,
  yieldFn: YieldFn = defaultYield,
): Promise<{ state: GameState; lastMove: Move | null }> {
  if (difficulty === 0) return { state, lastMove: null };

  const { cast, move } = await pickAbilityAndMoveAsync(state, difficulty, yieldFn);
  let s = state;
  if (s.turnPhase === "ability") {
    s = doAbilityPhase(s, cast);
  }

  if (!move) return { state: endTurn(forceResolve(toMovePhase(s))), lastMove: null };
  await yieldFn();
  return applyChosenMove(s, move, difficulty);
}

export function aiTurn(state: GameState, difficulty: AiDifficulty = 2): GameState {
  return aiPlay(state, difficulty).state;
}

export function aiThinkDelay(difficulty: AiDifficulty): number {
  switch (difficulty) {
    case 1:
      return 220;
    case 2:
      return 80;
    case 3:
      return 40;
    case 4:
      return 20;
    default:
      return 0;
  }
}
