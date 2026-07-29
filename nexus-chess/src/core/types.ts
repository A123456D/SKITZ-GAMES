export type Color = "w" | "b";
export type PieceKind = "K" | "Q" | "R" | "B" | "N" | "P";
export type Square = string; // algebraic e.g. "e4"
export type Ability = "aegis" | "overdrive" | "tacticalSwap";
export type Board = Map<Square, Piece>;

export interface Piece {
  kind: PieceKind;
  color: Color;
  isShielded: boolean;
  shieldExpiresTurn: number; // turn number when shield wears off
  nexusTurnCount: number;   // how many consecutive start-of-turns king has been in Nexus
  hasMoved: boolean;        // for castling / pawn double-push tracking
}

export interface Player {
  color: Color;
  mana: number;
}

export type TurnPhase = "ability" | "move" | "overdrive" | "resolved";

export interface GameState {
  board: Board;
  players: [Player, Player]; // [white, black]
  activeColor: Color;
  turnPhase: TurnPhase;
  turnNumber: number;
  winner: Color | null;
  enPassantSquare: Square | null;
  overdriveSquare: Square | null; // piece that gets a 2nd move this turn
  overdriveMovesLeft: number;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceKind;
  isCastle?: boolean;
  isEnPassant?: boolean;
}

export interface AbilityCast {
  ability: Ability;
  target?: Square;   // for Aegis: the piece to shield
  target2?: Square;  // for Tactical Swap: the piece to swap king with
}

export function clonePiece(p: Piece): Piece {
  return { ...p };
}

export function cloneBoard(b: Map<Square, Piece>): Map<Square, Piece> {
  const m = new Map<Square, Piece>();
  for (const [sq, p] of b) m.set(sq, clonePiece(p));
  return m;
}

export function cloneState(s: GameState): GameState {
  return {
    board: cloneBoard(s.board),
    players: [{ ...s.players[0] }, { ...s.players[1] }],
    activeColor: s.activeColor,
    turnPhase: s.turnPhase,
    turnNumber: s.turnNumber,
    winner: s.winner,
    enPassantSquare: s.enPassantSquare,
    overdriveSquare: s.overdriveSquare,
    overdriveMovesLeft: s.overdriveMovesLeft,
  };
}

export function activePlayer(s: GameState): Player {
  return s.players[s.activeColor === "w" ? 0 : 1];
}

export function opponent(c: Color): Color {
  return c === "w" ? "b" : "w";
}
