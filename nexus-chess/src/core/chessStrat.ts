/**
 * Classical chess strategy helpers mixed into Nexus AI.
 * Cheap (no full move-gen in hot paths) — Nexus Hold/Assassination stay primary in ai.ts.
 */
import type { Board, Color, GameState, Move, PieceKind, Square } from "./types";
import { opponent } from "./types";
import { isInNexus, findKing, squareToRC, rcToSquare } from "./board";

export const PIECE_VALUE: Record<PieceKind, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 0,
};

/** Midgame PST — ranks 0..7 from White’s side; Black mirrors. Nexus-aware center bias. */
const PST_P: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [0, 0, 0, 25, 25, 0, 0, 0],
  [5, 5, 15, 30, 30, 15, 5, 5],
  [10, 10, 20, 35, 35, 20, 10, 10],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const PST_N: number[][] = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 10, 20, 28, 28, 20, 10, -30],
  [-30, 10, 20, 28, 28, 20, 10, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const PST_B: number[][] = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-10, 10, 12, 15, 15, 12, 10, -10],
  [-10, 5, 15, 22, 22, 15, 5, -10],
  [-10, 10, 15, 22, 22, 15, 10, -10],
  [-10, 10, 12, 15, 15, 12, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const PST_R: number[][] = [
  [0, 0, 5, 10, 10, 5, 0, 0],
  [-5, 0, 0, 5, 5, 0, 0, -5],
  [-5, 0, 0, 5, 5, 0, 0, -5],
  [-5, 0, 0, 10, 10, 0, 0, -5],
  [-5, 0, 0, 10, 10, 0, 0, -5],
  [-5, 0, 0, 5, 5, 0, 0, -5],
  [5, 10, 10, 15, 15, 10, 10, 5],
  [0, 0, 5, 10, 10, 5, 0, 0],
];

const PST_Q: number[][] = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 10, 10, 5, 0, -5],
  [-5, 0, 5, 10, 10, 5, 0, -5],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

/** King: midgame — stay flexible, edge toward Nexus files without PST dominating Hold eval. */
const PST_K: number[][] = [
  [20, 30, 10, 0, 0, 10, 30, 20],
  [20, 20, 0, -10, -10, 0, 20, 20],
  [-10, -20, -25, -30, -30, -25, -20, -10],
  [-20, -30, -35, -40, -40, -35, -30, -20],
  [-30, -40, -45, -50, -50, -45, -40, -30],
  [-30, -40, -45, -50, -50, -45, -40, -30],
  [-30, -40, -40, -40, -40, -40, -40, -30],
  [-50, -40, -40, -40, -40, -40, -40, -50],
];

function pstLookup(kind: PieceKind, rank: number, file: number, color: Color): number {
  const r = color === "w" ? rank : 7 - rank;
  const table =
    kind === "P"
      ? PST_P
      : kind === "N"
        ? PST_N
        : kind === "B"
          ? PST_B
          : kind === "R"
            ? PST_R
            : kind === "Q"
              ? PST_Q
              : PST_K;
  return table[r][file];
}

function inBounds(r: number, f: number): boolean {
  return r >= 0 && r < 8 && f >= 0 && f < 8;
}

export function pieceAttacksSquare(
  board: Board,
  from: Square,
  to: Square,
  kind: PieceKind,
  color: Color,
): boolean {
  if (from === to) return false;
  const [r0, f0] = squareToRC(from);
  const [r1, f1] = squareToRC(to);
  const dr = r1 - r0;
  const df = f1 - f0;
  const adr = Math.abs(dr);
  const adf = Math.abs(df);

  const clearRay = () => {
    const sr = Math.sign(dr);
    const sf = Math.sign(df);
    let r = r0 + sr;
    let f = f0 + sf;
    while (r !== r1 || f !== f1) {
      if (board.has(rcToSquare(r, f))) return false;
      r += sr;
      f += sf;
    }
    return true;
  };

  switch (kind) {
    case "P": {
      const dir = color === "w" ? 1 : -1;
      return dr === dir && adf === 1;
    }
    case "N":
      return (adr === 2 && adf === 1) || (adr === 1 && adf === 2);
    case "B":
      return adr === adf && adr > 0 && clearRay();
    case "R":
      return (dr === 0 || df === 0) && adr + adf > 0 && clearRay();
    case "Q":
      return ((dr === 0 || df === 0) || adr === adf) && adr + adf > 0 && clearRay();
    case "K":
      return adr <= 1 && adf <= 1 && adr + adf > 0;
    default:
      return false;
  }
}

export function squareAttackedBy(state: GameState, sq: Square, by: Color): boolean {
  const target = state.board.get(sq);
  if (target?.kind === "K") {
    if (!isInNexus(sq)) return false;
    if (target.isShielded) return false;
  }
  for (const [from, p] of state.board) {
    if (p.color !== by) continue;
    if (pieceAttacksSquare(state.board, from, sq, p.kind, p.color)) return true;
  }
  return false;
}

export function attackCount(state: GameState, sq: Square, by: Color): number {
  let n = 0;
  for (const [from, p] of state.board) {
    if (p.color !== by) continue;
    if (pieceAttacksSquare(state.board, from, sq, p.kind, p.color)) n++;
  }
  return n;
}

const KNIGHT_OFF: [number, number][] = [
  [2, 1],
  [2, -1],
  [-2, 1],
  [-2, -1],
  [1, 2],
  [1, -2],
  [-1, 2],
  [-1, -2],
];
const KING_OFF: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const BISHOP_DIR: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const ROOK_DIR: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Approximate legal destinations (mobility), ignoring pins/checks. */
function pieceMobility(board: Board, from: Square, kind: PieceKind, color: Color): number {
  const [r0, f0] = squareToRC(from);
  let n = 0;

  const tryStep = (r: number, f: number) => {
    if (!inBounds(r, f)) return;
    const sq = rcToSquare(r, f);
    const t = board.get(sq);
    if (!t || t.color !== color) n++;
  };

  const slide = (dirs: [number, number][]) => {
    for (const [dr, df] of dirs) {
      let r = r0 + dr;
      let f = f0 + df;
      while (inBounds(r, f)) {
        const sq = rcToSquare(r, f);
        const t = board.get(sq);
        if (!t) n++;
        else {
          if (t.color !== color) n++;
          break;
        }
        r += dr;
        f += df;
      }
    }
  };

  switch (kind) {
    case "N":
      for (const [dr, df] of KNIGHT_OFF) tryStep(r0 + dr, f0 + df);
      break;
    case "K":
      for (const [dr, df] of KING_OFF) tryStep(r0 + dr, f0 + df);
      break;
    case "B":
      slide(BISHOP_DIR);
      break;
    case "R":
      slide(ROOK_DIR);
      break;
    case "Q":
      slide(BISHOP_DIR);
      slide(ROOK_DIR);
      break;
    case "P": {
      const dir = color === "w" ? 1 : -1;
      const fwd = rcToSquare(r0 + dir, f0);
      if (inBounds(r0 + dir, f0) && !board.has(fwd)) {
        n++;
        const start = color === "w" ? 1 : 6;
        if (r0 === start) {
          const fwd2 = rcToSquare(r0 + 2 * dir, f0);
          if (!board.has(fwd2)) n++;
        }
      }
      for (const df of [-1, 1]) {
        if (!inBounds(r0 + dir, f0 + df)) continue;
        const cap = board.get(rcToSquare(r0 + dir, f0 + df));
        if (cap && cap.color !== color) n++;
      }
      break;
    }
  }
  return n;
}

/** Attackers of `sq` sorted ascending by piece value (for SEE). */
function attackersOn(
  board: Board,
  sq: Square,
  by: Color,
  exclude?: Square,
): { from: Square; kind: PieceKind; value: number }[] {
  const out: { from: Square; kind: PieceKind; value: number }[] = [];
  for (const [from, p] of board) {
    if (p.color !== by) continue;
    if (exclude && from === exclude) continue;
    if (pieceAttacksSquare(board, from, sq, p.kind, p.color)) {
      out.push({ from, kind: p.kind, value: PIECE_VALUE[p.kind] || 100 });
    }
  }
  out.sort((a, b) => a.value - b.value);
  return out;
}

/**
 * Static Exchange Evaluation on `move.to`.
 * Positive = profitable capture for the side moving.
 */
export function seeGain(state: GameState, move: Move): number {
  const attacker = state.board.get(move.from);
  if (!attacker) return 0;
  const target = state.board.get(move.to);
  if (target?.isShielded) return -PIECE_VALUE[attacker.kind];
  if (target?.kind === "K") {
    if (!isInNexus(move.to)) return -10_000;
    return 100_000; // assassination
  }
  if (!target && !move.isEnPassant) return 0;

  const board = new Map(state.board);
  board.delete(move.from);
  if (move.isEnPassant && !target) {
    // rare in Nexus AI paths — treat as pawn gain
    return PIECE_VALUE.P;
  }
  board.set(move.to, { ...attacker });

  const capturedVal = target ? PIECE_VALUE[target.kind] : PIECE_VALUE.P;
  const reply = bestRecapture(board, move.to, opponent(attacker.color));
  if (reply < 0) return capturedVal;
  return capturedVal - reply;
}

/** Best material the side can force by recapturing on `sq` (−1 = cannot). */
function bestRecapture(board: Board, sq: Square, side: Color): number {
  const atks = attackersOn(board, sq, side);
  for (const a of atks) {
    if (a.kind === "K" && !isInNexus(sq)) continue;
    const victim = board.get(sq);
    if (!victim || victim.isShielded) continue;
    const gain = PIECE_VALUE[victim.kind];
    const next = new Map(board);
    next.delete(a.from);
    next.set(sq, {
      kind: a.kind,
      color: side,
      isShielded: false,
      shieldExpiresTurn: -1,
      nexusTurnCount: 0,
      hasMoved: true,
    });
    const their = bestRecapture(next, sq, opponent(side));
    return their < 0 ? gain : gain - their;
  }
  return -1;
}

/**
 * Classical positional score from `perspective` (material excluded — caller adds it).
 * Includes PST, mobility, pawn structure, bishop pair, hanging-piece pressure.
 */
export function classicalPositional(state: GameState, perspective: Color): number {
  const opp = opponent(perspective);
  let score = 0;

  let myBishops = 0;
  let oppBishops = 0;
  const myPawnsByFile = new Array(8).fill(0);
  const oppPawnsByFile = new Array(8).fill(0);
  const myPawnRanks: number[] = [];
  const oppPawnRanks: number[] = [];

  for (const [sq, p] of state.board) {
    const [rank, file] = squareToRC(sq);
    const pst = pstLookup(p.kind, rank, file, p.color);
    const mob = pieceMobility(state.board, sq, p.kind, p.color);
    const mobScore =
      p.kind === "N" || p.kind === "B"
        ? mob * 4
        : p.kind === "R"
          ? mob * 2
          : p.kind === "Q"
            ? mob * 1
            : p.kind === "P"
              ? mob * 2
              : 0;

    // Development: minors off back rank
    let develop = 0;
    if (p.kind === "N" || p.kind === "B") {
      const back = p.color === "w" ? 0 : 7;
      if (rank !== back) develop = 18;
      else develop = -8;
    }

    // Nexus gravity on top of classical PST (small)
    const nexusPull = p.kind !== "K" ? (4 - Math.min(4, distApprox(sq))) * 3 : 0;

    const local = pst + mobScore + develop + nexusPull;

    if (p.color === perspective) {
      score += local;
      if (p.kind === "B") myBishops++;
      if (p.kind === "P") {
        myPawnsByFile[file]++;
        myPawnRanks.push(rank * 8 + file);
      }
    } else {
      score -= local;
      if (p.kind === "B") oppBishops++;
      if (p.kind === "P") {
        oppPawnsByFile[file]++;
        oppPawnRanks.push(rank * 8 + file);
      }
    }
  }

  if (myBishops >= 2) score += 40;
  if (oppBishops >= 2) score -= 40;

  score += pawnStructureScore(myPawnsByFile, perspective) - pawnStructureScore(oppPawnsByFile, opp);

  // Hanging / under-defended pieces (tactical hygiene)
  score += hangingPressure(state, perspective);
  score -= hangingPressure(state, opp);

  // Open files toward enemy king (classical attack motif) — light
  const oppKing = findKing(state.board, opp);
  if (oppKing) {
    const [, kf] = squareToRC(oppKing);
    for (const [sq, p] of state.board) {
      if (p.color !== perspective) continue;
      if (p.kind !== "R" && p.kind !== "Q") continue;
      const [, f] = squareToRC(sq);
      if (f === kf) score += isInNexus(oppKing) ? 35 : 12;
    }
  }

  return score;
}

function distApprox(sq: Square): number {
  if (isInNexus(sq)) return 0;
  const [r, f] = squareToRC(sq);
  // Nexus is ranks 3-4, files 3-4
  const dr = r < 3 ? 3 - r : r > 4 ? r - 4 : 0;
  const df = f < 3 ? 3 - f : f > 4 ? f - 4 : 0;
  return dr + df;
}

function pawnStructureScore(byFile: number[], color: Color): number {
  let s = 0;
  for (let f = 0; f < 8; f++) {
    if (byFile[f] > 1) s -= 18 * (byFile[f] - 1); // doubled
    if (byFile[f] > 0) {
      const isolated =
        (f === 0 || byFile[f - 1] === 0) && (f === 7 || byFile[f + 1] === 0);
      if (isolated) s -= 12;
    }
  }
  void color;
  return s;
}

function hangingPressure(state: GameState, color: Color): number {
  const opp = opponent(color);
  let pen = 0;
  for (const [sq, p] of state.board) {
    if (p.color !== color || p.kind === "K") continue;
    if (p.isShielded) continue;
    const atk = attackCount(state, sq, opp);
    if (atk === 0) continue;
    const def = attackCount(state, sq, color);
    const val = PIECE_VALUE[p.kind];
    if (def === 0) pen -= Math.floor(val * 0.55);
    else if (atk > def) pen -= Math.floor(val * 0.2);
  }
  return pen;
}
