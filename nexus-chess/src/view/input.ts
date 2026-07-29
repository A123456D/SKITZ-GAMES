import type { Ability, GameState, Move, Square, AbilityCast } from "../core/types";
import type { ButtonRect, DrawCtx } from "./draw";
import { screenToSquare } from "./draw";
import { pieceMoves } from "../core/moves";
import { abilityTargets } from "../core/abilities";

export type UiMode =
  | "idle"
  | "selecting"
  | "abilityTarget"
  | "overdriveSelect";

export interface UiState {
  mode: UiMode;
  selected: Square | null;
  legalMoves: Move[];
  activeAbility: Ability | null;
  abilityTargetSquares: Square[];
}

export function createUiState(): UiState {
  return {
    mode: "idle",
    selected: null,
    legalMoves: [],
    activeAbility: null,
    abilityTargetSquares: [],
  };
}

export function hitButton(buttons: ButtonRect[], px: number, py: number): string | null {
  for (const b of buttons) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
  }
  return null;
}

export interface ClickResult {
  type:
    | "none"
    | "select"
    | "move"
    | "deselect"
    | "ability"
    | "abilityTarget"
    | "skip"
    | "newgame"
    | "toggleai"
    /** Piece tapped during ability phase — skip ability and select. */
    | "selectAfterSkip";
  square?: Square;
  move?: Move;
  ability?: Ability;
}

export function handleClick(
  ui: UiState,
  state: GameState,
  dc: DrawCtx,
  buttons: ButtonRect[],
  px: number,
  py: number,
): ClickResult {
  const btn = hitButton(buttons, px, py);
  if (btn) {
    if (btn === "skip") return { type: "skip" };
    if (btn === "newgame") return { type: "newgame" };
    if (btn === "toggleai") return { type: "toggleai" };
    if (btn === "aegis" || btn === "overdrive" || btn === "tacticalSwap") {
      return { type: "ability", ability: btn as Ability };
    }
  }

  const sq = screenToSquare(dc, px, py);
  if (!sq) return { type: "none" };

  if (ui.mode === "abilityTarget" && ui.activeAbility) {
    if (ui.abilityTargetSquares.includes(sq)) {
      return { type: "abilityTarget", square: sq, ability: ui.activeAbility };
    }
    return { type: "deselect" };
  }

  // Ability phase: tapping your piece skips ability and selects it
  if (state.turnPhase === "ability") {
    const piece = state.board.get(sq);
    if (piece && piece.color === state.activeColor) {
      return { type: "selectAfterSkip", square: sq };
    }
    return { type: "none" };
  }

  if (state.turnPhase === "move" || state.turnPhase === "overdrive") {
    if (ui.selected) {
      const move = ui.legalMoves.find((m) => m.to === sq);
      if (move) return { type: "move", move, square: sq };
      const piece = state.board.get(sq);
      if (piece && piece.color === state.activeColor) {
        if (state.overdriveSquare && sq !== state.overdriveSquare) return { type: "none" };
        return { type: "select", square: sq };
      }
      return { type: "deselect" };
    }
    const piece = state.board.get(sq);
    if (piece && piece.color === state.activeColor) {
      if (state.overdriveSquare && sq !== state.overdriveSquare) return { type: "none" };
      return { type: "select", square: sq };
    }
  }

  return { type: "none" };
}

export function applySelect(ui: UiState, state: GameState, sq: Square): UiState {
  const moves = pieceMoves(state, sq);
  let filtered = moves;
  if (state.overdriveMovesLeft === 1) {
    filtered = moves.filter((m) => {
      const rank = m.to.charCodeAt(1) - 49;
      return rank !== 0 && rank !== 7;
    });
  }
  return {
    ...ui,
    mode: "selecting",
    selected: sq,
    legalMoves: filtered,
    activeAbility: null,
    abilityTargetSquares: [],
  };
}

export function applyAbilitySelect(ui: UiState, state: GameState, ability: Ability): UiState {
  const targets = abilityTargets(state, ability);
  return {
    ...ui,
    mode: "abilityTarget",
    selected: null,
    legalMoves: [],
    activeAbility: ability,
    abilityTargetSquares: targets,
  };
}

export function clearUi(_ui?: UiState): UiState {
  return createUiState();
}

export function makeAbilityCast(ability: Ability, target: Square): AbilityCast {
  return { ability, target };
}
