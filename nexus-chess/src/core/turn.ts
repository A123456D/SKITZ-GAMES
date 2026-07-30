import type { Color, GameState, Move, AbilityCast } from "./types";
import { opponent, cloneBoard } from "./types";
import { findKing, isInNexus } from "./board";
import { startTurnMana } from "./mana";
import { applyCast } from "./abilities";
import { applyMove } from "./moves";

/** Check Nexus Hold win: did friendly king survive a full round in the Nexus? */
function checkNexusHold(state: GameState): Color | null {
  for (const c of ["w", "b"] as Color[]) {
    const kingSq = findKing(state.board, c);
    if (kingSq && isInNexus(kingSq)) {
      const king = state.board.get(kingSq)!;
      if (king.nexusTurnCount >= 2) return c;
    }
  }
  return null;
}

/** Check Nexus Assassination: was an enemy king captured inside the Nexus? */
function checkNexusAssassination(
  prevBoard: Map<string, { kind: string; color: Color }>,
  newState: GameState,
): Color | null {
  // If the opponent's king was on a Nexus square before the move and is now gone, that's assassination
  const oc = opponent(newState.activeColor);
  const kingSq = findKing(newState.board, oc);
  if (kingSq) return null; // king still alive
  // King was captured — was it in the Nexus? Check prev board
  for (const [sq, p] of prevBoard) {
    if (p.kind === "K" && p.color === oc && isInNexus(sq)) {
      return newState.activeColor;
    }
  }
  return null;
}

/** Begin a new turn: grant mana, update nexus counters, check Nexus Hold win. */
export function beginTurn(state: GameState): GameState {
  // Mana phase
  let s = startTurnMana(state);

  // Update nexusTurnCount for the active player's king
  const board = cloneBoard(s.board);
  const kingSq = findKing(board, s.activeColor);
  if (kingSq) {
    const king = { ...board.get(kingSq)! };
    if (isInNexus(kingSq)) {
      king.nexusTurnCount++;
    } else {
      king.nexusTurnCount = 0;
    }
    board.set(kingSq, king);
  }
  s = { ...s, board, turnPhase: "ability" };

  // Check Nexus Hold
  const holdWinner = checkNexusHold(s);
  if (holdWinner) return { ...s, winner: holdWinner };

  return s;
}

/** Player uses an ability (or skips). Returns new state in "move" phase. */
export function doAbilityPhase(state: GameState, cast: AbilityCast | null): GameState {
  if (state.turnPhase !== "ability") return state;
  let s = state;
  if (cast) {
    const result = applyCast(s, cast);
    if (result) s = result;
  }
  return { ...s, turnPhase: s.overdriveSquare ? "overdrive" : "move" };
}

/** Skip ability phase. */
export function skipAbility(state: GameState): GameState {
  return doAbilityPhase(state, null);
}

/** Player makes a move. Returns new state. Checks assassination win. */
export function doMovePhase(state: GameState, move: Move): GameState {
  if (state.turnPhase !== "move" && state.turnPhase !== "overdrive") return state;

  const prevBoard = new Map(
    [...state.board].map(([sq, p]) => [sq, { kind: p.kind, color: p.color }]),
  );

  let s = applyMove(state, move);

  // Overdrive: second hop cannot end on the back ranks
  const finishedSecondOd =
    state.overdriveSquare != null && state.overdriveMovesLeft === 1;
  if (finishedSecondOd) {
    const r = move.to.charCodeAt(1) - 49;
    if (r === 0 || r === 7) return state;
  }

  // Overdrive: if moves left, stay in overdrive phase
  if (s.overdriveSquare && s.overdriveMovesLeft > 0) {
    return { ...s, turnPhase: "overdrive" };
  }

  // Clear overdrive after all moves used
  s = { ...s, overdriveSquare: null, overdriveMovesLeft: 0 };

  // Check assassination
  const assassinWinner = checkNexusAssassination(prevBoard, s);
  if (assassinWinner) return { ...s, winner: assassinWinner, turnPhase: "resolved" };

  // Expire shields
  const board = cloneBoard(s.board);
  for (const [sq, p] of board) {
    if (p.isShielded && p.shieldExpiresTurn <= s.turnNumber) {
      const updated = { ...p, isShielded: false, shieldExpiresTurn: -1 };
      board.set(sq, updated);
    }
  }

  return { ...s, board, turnPhase: "resolved" };
}

/** End the current turn and swap to the next player. */
export function endTurn(state: GameState): GameState {
  if (state.turnPhase !== "resolved") return state;
  const next: GameState = {
    ...state,
    activeColor: opponent(state.activeColor),
    turnNumber: state.turnNumber + 1,
    turnPhase: "ability",
    enPassantSquare: state.enPassantSquare,
  };
  return beginTurn(next);
}
