import type { Board, Color, GameState, Move, Piece, Square } from "./types";
import { squareToRC, rcToSquare, isInNexus } from "./board";

function inBounds(r: number, f: number): boolean {
  return r >= 0 && r < 8 && f >= 0 && f < 8;
}

function canCapture(board: Board, sq: Square, attackerColor: Color): boolean {
  const target = board.get(sq);
  if (!target || target.color === attackerColor) return false;
  // Kings can only be captured inside the Nexus
  if (target.kind === "K" && !isInNexus(sq)) return false;
  return true;
}

function isEmpty(board: Board, sq: Square): boolean {
  return !board.has(sq);
}

function slideMoves(
  board: Board,
  from: Square,
  color: Color,
  dirs: [number, number][],
): Move[] {
  const [r0, f0] = squareToRC(from);
  const moves: Move[] = [];
  for (const [dr, df] of dirs) {
    let r = r0 + dr,
      f = f0 + df;
    while (inBounds(r, f)) {
      const sq = rcToSquare(r, f);
      if (isEmpty(board, sq)) {
        moves.push({ from, to: sq });
      } else {
        if (canCapture(board, sq, color)) moves.push({ from, to: sq });
        break;
      }
      r += dr;
      f += df;
    }
  }
  return moves;
}

function stepMoves(
  board: Board,
  from: Square,
  color: Color,
  offsets: [number, number][],
): Move[] {
  const [r0, f0] = squareToRC(from);
  const moves: Move[] = [];
  for (const [dr, df] of offsets) {
    const r = r0 + dr,
      f = f0 + df;
    if (!inBounds(r, f)) continue;
    const sq = rcToSquare(r, f);
    if (isEmpty(board, sq) || canCapture(board, sq, color))
      moves.push({ from, to: sq });
  }
  return moves;
}

const ROOK_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_DIRS: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const QUEEN_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS];
const KNIGHT_OFFSETS: [number, number][] = [
  [2, 1],
  [2, -1],
  [-2, 1],
  [-2, -1],
  [1, 2],
  [1, -2],
  [-1, 2],
  [-1, -2],
];
const KING_OFFSETS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function pawnMoves(board: Board, from: Square, color: Color, enPassant: Square | null): Move[] {
  const [r, f] = squareToRC(from);
  const dir = color === "w" ? 1 : -1;
  const startRank = color === "w" ? 1 : 6;
  const promoRank = color === "w" ? 7 : 0;
  const moves: Move[] = [];

  const oneStep = r + dir;
  if (inBounds(oneStep, f)) {
    const sq1 = rcToSquare(oneStep, f);
    if (isEmpty(board, sq1)) {
      if (oneStep === promoRank) {
        for (const pk of ["Q", "R", "B", "N"] as const)
          moves.push({ from, to: sq1, promotion: pk });
      } else {
        moves.push({ from, to: sq1 });
      }
      // Double push from start
      if (r === startRank) {
        const twoStep = r + dir * 2;
        const sq2 = rcToSquare(twoStep, f);
        if (isEmpty(board, sq2)) moves.push({ from, to: sq2 });
      }
    }
  }

  // Captures (diagonal)
  for (const df of [-1, 1]) {
    if (!inBounds(oneStep, f + df)) continue;
    const csq = rcToSquare(oneStep, f + df);
    const isEp = csq === enPassant;
    if (canCapture(board, csq, color) || isEp) {
      if (oneStep === promoRank) {
        for (const pk of ["Q", "R", "B", "N"] as const)
          moves.push({ from, to: csq, promotion: pk, isEnPassant: isEp ? true : undefined });
      } else {
        moves.push({ from, to: csq, isEnPassant: isEp ? true : undefined });
      }
    }
  }
  return moves;
}

function castleMoves(board: Board, from: Square, color: Color): Move[] {
  const piece = board.get(from);
  if (!piece || piece.hasMoved) return [];
  const rank = color === "w" ? 0 : 7;
  const moves: Move[] = [];

  // Kingside
  const rookKS = board.get(rcToSquare(rank, 7));
  if (rookKS && !rookKS.hasMoved && rookKS.kind === "R" && rookKS.color === color) {
    const f5 = rcToSquare(rank, 5),
      g = rcToSquare(rank, 6);
    if (isEmpty(board, f5) && isEmpty(board, g))
      moves.push({ from, to: g, isCastle: true });
  }

  // Queenside
  const rookQS = board.get(rcToSquare(rank, 0));
  if (rookQS && !rookQS.hasMoved && rookQS.kind === "R" && rookQS.color === color) {
    const d = rcToSquare(rank, 3),
      c = rcToSquare(rank, 2),
      b = rcToSquare(rank, 1);
    if (isEmpty(board, d) && isEmpty(board, c) && isEmpty(board, b))
      moves.push({ from, to: c, isCastle: true });
  }
  return moves;
}

export function pieceMoves(state: GameState, from: Square): Move[] {
  const piece = state.board.get(from);
  if (!piece) return [];
  const { board } = state;
  const c = piece.color;

  switch (piece.kind) {
    case "P":
      return pawnMoves(board, from, c, state.enPassantSquare);
    case "N":
      return stepMoves(board, from, c, KNIGHT_OFFSETS);
    case "B":
      return slideMoves(board, from, c, BISHOP_DIRS);
    case "R":
      return slideMoves(board, from, c, ROOK_DIRS);
    case "Q":
      return slideMoves(board, from, c, QUEEN_DIRS);
    case "K":
      return [
        ...stepMoves(board, from, c, KING_OFFSETS),
        ...castleMoves(board, from, c),
      ];
  }
}

/** All legal moves for the active player. */
export function allMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (const [sq, p] of state.board) {
    if (p.color !== state.activeColor) continue;
    // During overdrive, only the overdrive piece can move
    if (state.overdriveSquare && sq !== state.overdriveSquare) continue;
    moves.push(...pieceMoves(state, sq));
  }
  return moves;
}

/** Apply a move to the board, returning a new state. Does NOT handle turn/mana transitions. */
export function applyMove(state: GameState, move: Move): GameState {
  const board = new Map(state.board);
  // Deep-clone moved pieces
  const piece = { ...state.board.get(move.from)! };
  piece.hasMoved = true;

  let captured = false;
  let enPassant: Square | null = null;

  // En passant capture
  if (move.isEnPassant) {
    const [r, f] = squareToRC(move.to);
    const capturedSq = rcToSquare(r + (piece.color === "w" ? -1 : 1), f);
    board.delete(capturedSq);
    captured = true;
  } else if (board.has(move.to)) {
    const target = board.get(move.to)!;
    if (target.isShielded) {
      // Shield absorbs the capture; piece stays, shield consumed
      const shielded = { ...target, isShielded: false, shieldExpiresTurn: -1 };
      board.set(move.to, shielded);
      board.delete(move.from);
      // Piece that tried to capture stays at `from`? No — in chess, the attacker moves.
      // With shield: the attack is "blocked", attacker stays at from.
      board.set(move.from, piece);
      return {
        ...state,
        board,
        enPassantSquare: null,
        overdriveMovesLeft: Math.max(0, state.overdriveMovesLeft - 1),
      };
    }
    captured = true;
  }

  board.delete(move.from);

  // Promotion
  if (move.promotion) {
    piece.kind = move.promotion;
  }

  board.set(move.to, piece);

  // Castling: move rook
  if (move.isCastle) {
    const [rank] = squareToRC(move.to);
    const [, toFile] = squareToRC(move.to);
    if (toFile === 6) {
      // Kingside
      const rook = { ...board.get(rcToSquare(rank, 7))! };
      rook.hasMoved = true;
      board.delete(rcToSquare(rank, 7));
      board.set(rcToSquare(rank, 5), rook);
    } else {
      // Queenside
      const rook = { ...board.get(rcToSquare(rank, 0))! };
      rook.hasMoved = true;
      board.delete(rcToSquare(rank, 0));
      board.set(rcToSquare(rank, 3), rook);
    }
  }

  // En passant square for pawn double-push
  if (piece.kind === "P") {
    const [fromR] = squareToRC(move.from);
    const [toR, toF] = squareToRC(move.to);
    if (Math.abs(toR - fromR) === 2) {
      enPassant = rcToSquare((fromR + toR) / 2, toF);
    }
  }

  // Mana bonus for captures
  const players: [typeof state.players[0], typeof state.players[1]] = [
    { ...state.players[0] },
    { ...state.players[1] },
  ];
  if (captured) {
    const idx = state.activeColor === "w" ? 0 : 1;
    players[idx].mana = Math.min(10, players[idx].mana + 2);
  }

  // Track overdrive moves
  let overdriveSquare = state.overdriveSquare;
  let overdriveMovesLeft = state.overdriveMovesLeft;
  if (overdriveSquare === move.from) {
    overdriveSquare = move.to;
    overdriveMovesLeft = Math.max(0, overdriveMovesLeft - 1);
  }

  return {
    ...state,
    board,
    players,
    enPassantSquare: enPassant,
    overdriveSquare,
    overdriveMovesLeft,
  };
}
