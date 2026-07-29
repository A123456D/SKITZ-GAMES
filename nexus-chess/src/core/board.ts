import type { Board, Color, GameState, Piece, PieceKind, Square } from "./types";

export const FILES = "abcdefgh";
export const RANKS = "12345678";
export const NEXUS_SQUARES: readonly Square[] = ["d4", "d5", "e4", "e5"];

export function isInNexus(sq: Square): boolean {
  return NEXUS_SQUARES.includes(sq);
}

export function squareToRC(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = sq.charCodeAt(1) - 49; // 1=0
  return [rank, file];
}

export function rcToSquare(rank: number, file: number): Square {
  return String.fromCharCode(97 + file) + String.fromCharCode(49 + rank);
}

export function allSquares(): Square[] {
  const out: Square[] = [];
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) out.push(rcToSquare(r, f));
  return out;
}

function makePiece(kind: PieceKind, color: Color): Piece {
  return {
    kind,
    color,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
    hasMoved: false,
  };
}

export function initialBoard(): Board {
  const b: Board = new Map();
  const backRank: PieceKind[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let f = 0; f < 8; f++) {
    b.set(rcToSquare(0, f), makePiece(backRank[f], "w"));
    b.set(rcToSquare(1, f), makePiece("P", "w"));
    b.set(rcToSquare(6, f), makePiece("P", "b"));
    b.set(rcToSquare(7, f), makePiece(backRank[f], "b"));
  }
  return b;
}

export function newGame(): GameState {
  return {
    board: initialBoard(),
    players: [
      { color: "w", mana: 2 },
      { color: "b", mana: 2 },
    ],
    activeColor: "w",
    turnPhase: "ability",
    turnNumber: 1,
    winner: null,
    enPassantSquare: null,
    overdriveSquare: null,
    overdriveMovesLeft: 0,
  };
}

export function findKing(board: Board, color: Color): Square | null {
  for (const [sq, p] of board) {
    if (p.kind === "K" && p.color === color) return sq;
  }
  return null;
}
