import type { Color, GameState, Piece, Square, TurnPhase } from "./types";
import { clampElo } from "./elo";

const MATCH_KEY = "nexus-chess-match";
const PREFS_KEY = "nexus-chess-prefs";

export type SavedPlayMode = "ai" | "local";

export interface PlayerPrefs {
  /** Preferred side when starting vs AI. */
  playerColor: Color;
  lastOpponentElo: number;
}

export interface SavedMatch {
  version: 1;
  playMode: SavedPlayMode;
  opponentElo: number;
  playerColor: Color;
  eloRecorded: boolean;
  lastMove: { from: Square; to: Square } | null;
  state: SerializedState;
}

interface SerializedPiece {
  kind: Piece["kind"];
  color: Color;
  isShielded: boolean;
  shieldExpiresTurn: number;
  nexusTurnCount: number;
  hasMoved: boolean;
}

interface SerializedState {
  board: [Square, SerializedPiece][];
  players: GameState["players"];
  activeColor: Color;
  turnPhase: TurnPhase;
  turnNumber: number;
  winner: Color | null;
  enPassantSquare: Square | null;
  overdriveSquare: Square | null;
  overdriveMovesLeft: number;
}

export function defaultPrefs(): PlayerPrefs {
  return { playerColor: "w", lastOpponentElo: 1200 };
}

export function loadPrefs(): PlayerPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    const color = parsed.playerColor === "b" ? "b" : "w";
    const elo =
      typeof parsed.lastOpponentElo === "number" ? clampElo(parsed.lastOpponentElo) : 1200;
    return { playerColor: color, lastOpponentElo: elo };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: PlayerPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function serializeState(state: GameState): SerializedState {
  const board: SerializedState["board"] = [];
  for (const [sq, p] of state.board) {
    board.push([
      sq,
      {
        kind: p.kind,
        color: p.color,
        isShielded: p.isShielded,
        shieldExpiresTurn: p.shieldExpiresTurn,
        nexusTurnCount: p.nexusTurnCount,
        hasMoved: p.hasMoved,
      },
    ]);
  }
  return {
    board,
    players: [{ ...state.players[0] }, { ...state.players[1] }],
    activeColor: state.activeColor,
    turnPhase: state.turnPhase,
    turnNumber: state.turnNumber,
    winner: state.winner,
    enPassantSquare: state.enPassantSquare,
    overdriveSquare: state.overdriveSquare,
    overdriveMovesLeft: state.overdriveMovesLeft,
  };
}

function deserializeState(raw: SerializedState): GameState {
  const board = new Map<Square, Piece>();
  for (const [sq, p] of raw.board) {
    board.set(sq, { ...p });
  }
  return {
    board,
    players: [{ ...raw.players[0] }, { ...raw.players[1] }],
    activeColor: raw.activeColor,
    turnPhase: raw.turnPhase,
    turnNumber: raw.turnNumber,
    winner: raw.winner,
    enPassantSquare: raw.enPassantSquare,
    overdriveSquare: raw.overdriveSquare,
    overdriveMovesLeft: raw.overdriveMovesLeft,
  };
}

export function saveMatch(match: Omit<SavedMatch, "version" | "state"> & { state: GameState }): void {
  const payload: SavedMatch = {
    version: 1,
    playMode: match.playMode,
    opponentElo: match.opponentElo,
    playerColor: match.playerColor,
    eloRecorded: match.eloRecorded,
    lastMove: match.lastMove,
    state: serializeState(match.state),
  };
  localStorage.setItem(MATCH_KEY, JSON.stringify(payload));
}

export function loadMatch():
  | (Omit<SavedMatch, "state"> & { state: GameState })
  | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedMatch;
    if (parsed.version !== 1 || !parsed.state?.board) return null;
    if (parsed.state.winner) return null;
    return {
      version: 1,
      playMode: parsed.playMode === "local" ? "local" : "ai",
      opponentElo: clampElo(parsed.opponentElo ?? 1200),
      playerColor: parsed.playerColor === "b" ? "b" : "w",
      eloRecorded: !!parsed.eloRecorded,
      lastMove: parsed.lastMove ?? null,
      state: deserializeState(parsed.state),
    };
  } catch {
    return null;
  }
}

export function clearMatch(): void {
  localStorage.removeItem(MATCH_KEY);
}

export function hasSavedMatch(): boolean {
  return loadMatch() !== null;
}
