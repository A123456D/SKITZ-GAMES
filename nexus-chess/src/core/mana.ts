import type { GameState } from "./types";
import { isInNexus } from "./board";

const MANA_CAP = 10;

function clamp(v: number): number {
  return Math.min(MANA_CAP, Math.max(0, v));
}

function playerIdx(state: GameState): 0 | 1 {
  return state.activeColor === "w" ? 0 : 1;
}

/** +1 passive, +1 per friendly piece in Nexus. Called at start of turn. */
export function startTurnMana(state: GameState): GameState {
  const idx = playerIdx(state);
  const players = [{ ...state.players[0] }, { ...state.players[1] }] as [
    typeof state.players[0],
    typeof state.players[1],
  ];

  let nexusBonus = 0;
  for (const [sq, p] of state.board) {
    if (p.color === state.activeColor && isInNexus(sq)) nexusBonus++;
  }

  players[idx].mana = clamp(players[idx].mana + 1 + nexusBonus);
  return { ...state, players };
}

/** Deduct mana. Returns new state or null if insufficient. */
export function spendMana(state: GameState, cost: number): GameState | null {
  const idx = playerIdx(state);
  if (state.players[idx].mana < cost) return null;
  const players = [{ ...state.players[0] }, { ...state.players[1] }] as [
    typeof state.players[0],
    typeof state.players[1],
  ];
  players[idx].mana = clamp(players[idx].mana - cost);
  return { ...state, players };
}
