import type { Ability, AbilityCast, GameState, Square } from "./types";
import { cloneBoard, activePlayer } from "./types";
import { findKing, isInNexus } from "./board";
import { spendMana } from "./mana";

export const ABILITY_COST: Record<Ability, number> = {
  aegis: 3,
  overdrive: 4,
  tacticalSwap: 5,
};

export const ABILITY_INFO: Record<
  Ability,
  { name: string; cost: number; summary: string; detail: string }
> = {
  aegis: {
    name: "Aegis",
    cost: ABILITY_COST.aegis,
    summary: "Shield one of your pieces.",
    detail:
      "Choose a friendly piece. It cannot be captured until the start of your next turn. Kings already in the Nexus cannot be shielded.",
  },
  overdrive: {
    name: "Overdrive",
    cost: ABILITY_COST.overdrive,
    summary: "Move a piece twice this turn.",
    detail:
      "Choose a non-king piece. It may move twice. The second move cannot end on the 1st or 8th rank.",
  },
  tacticalSwap: {
    name: "Tactical Swap",
    cost: ABILITY_COST.tacticalSwap,
    summary: "Swap your king with another piece.",
    detail:
      "Choose a friendly non-king piece. Your king swaps places with it. The king cannot land in the Nexus via this swap.",
  },
};

// ---------- Aegis ----------

function canAegis(state: GameState, target: Square): boolean {
  const piece = state.board.get(target);
  if (!piece || piece.color !== state.activeColor) return false;
  if (piece.isShielded) return false;
  if (activePlayer(state).mana < ABILITY_COST.aegis) return false;
  // Cannot shield a King that is entering the Nexus this turn
  // (We block shielding any King in or about to enter Nexus — simplification:
  //  block if King is already in Nexus since ability phase is before move)
  if (piece.kind === "K" && isInNexus(target)) return false;
  return true;
}

function applyAegis(state: GameState, target: Square): GameState | null {
  if (!canAegis(state, target)) return null;
  const after = spendMana(state, ABILITY_COST.aegis);
  if (!after) return null;
  const board = cloneBoard(after.board);
  const p = { ...board.get(target)! };
  p.isShielded = true;
  p.shieldExpiresTurn = after.turnNumber + 1;
  board.set(target, p);
  return { ...after, board };
}

// ---------- Overdrive ----------

function canOverdrive(state: GameState, target: Square): boolean {
  const piece = state.board.get(target);
  if (!piece || piece.color !== state.activeColor) return false;
  if (piece.kind === "K") return false;
  if (activePlayer(state).mana < ABILITY_COST.overdrive) return false;
  if (state.overdriveSquare) return false; // already active
  return true;
}

function applyOverdrive(state: GameState, target: Square): GameState | null {
  if (!canOverdrive(state, target)) return null;
  const after = spendMana(state, ABILITY_COST.overdrive);
  if (!after) return null;
  return { ...after, overdriveSquare: target, overdriveMovesLeft: 2 };
}

// ---------- Tactical Swap ----------

function canTacticalSwap(state: GameState, target: Square): boolean {
  const piece = state.board.get(target);
  if (!piece || piece.color !== state.activeColor) return false;
  if (piece.kind === "K") return false; // target must not be king
  if (activePlayer(state).mana < ABILITY_COST.tacticalSwap) return false;
  const kingSq = findKing(state.board, state.activeColor);
  if (!kingSq) return false;
  // King cannot land in Nexus via swap
  if (isInNexus(target)) return false;
  return true;
}

function applyTacticalSwap(state: GameState, target: Square): GameState | null {
  if (!canTacticalSwap(state, target)) return null;
  const after = spendMana(state, ABILITY_COST.tacticalSwap);
  if (!after) return null;
  const board = cloneBoard(after.board);
  const kingSq = findKing(board, state.activeColor)!;
  const king = { ...board.get(kingSq)! };
  const other = { ...board.get(target)! };
  board.set(kingSq, other);
  board.set(target, king);
  return { ...after, board };
}

// ---------- Public API ----------

export function canCastAbility(state: GameState, cast: AbilityCast): boolean {
  switch (cast.ability) {
    case "aegis":
      return !!cast.target && canAegis(state, cast.target);
    case "overdrive":
      return !!cast.target && canOverdrive(state, cast.target);
    case "tacticalSwap":
      return !!cast.target && canTacticalSwap(state, cast.target);
  }
}

export function applyCast(state: GameState, cast: AbilityCast): GameState | null {
  switch (cast.ability) {
    case "aegis":
      return cast.target ? applyAegis(state, cast.target) : null;
    case "overdrive":
      return cast.target ? applyOverdrive(state, cast.target) : null;
    case "tacticalSwap":
      return cast.target ? applyTacticalSwap(state, cast.target) : null;
  }
}

/** Get all valid targets for a given ability. */
export function abilityTargets(state: GameState, ability: Ability): Square[] {
  const targets: Square[] = [];
  for (const [sq, p] of state.board) {
    if (p.color !== state.activeColor) continue;
    const cast: AbilityCast = { ability, target: sq };
    if (canCastAbility(state, cast)) targets.push(sq);
  }
  return targets;
}
