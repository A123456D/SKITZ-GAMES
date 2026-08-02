import { getCard } from "./cards";
import { emptyTiles, scoreFor } from "./board";
import { resolveCascade } from "./cascade";
import { canPlayCard, passTurn, playCard, type FactionKey } from "./match";
import { cloneBoard, type MatchState, type Pos } from "./types";

export type AiDifficulty = "easy" | "normal" | "hard";

export type AiMove = { handIndex: number; pos: Pos; score: number } | { pass: true };

export type ThreatInfo = {
  /** Short coach line, e.g. "Threat: OVERTHROW on B3" */
  label: string;
  pos: Pos;
  kind: "capture" | "fork" | "damage" | "score";
};

const COL_LABEL = ["A", "B", "C"] as const;

export function tileLabel(pos: Pos): string {
  return `${COL_LABEL[pos.col] ?? "?"}${pos.row + 1}`;
}

type ScoredPlay = {
  handIndex: number;
  pos: Pos;
  score: number;
  captures: number;
  damage: number;
  relays: number;
  splits: number;
  scoreDelta: number;
};

/**
 * Score a hypothetical play. Normal weights captures + center harder.
 */
function evaluatePlay(
  state: MatchState,
  handIndex: number,
  pos: Pos,
  difficulty: AiDifficulty,
): ScoredPlay {
  const who = state.active;
  const board = cloneBoard(state.board);
  const defId = state.players[who].hand[handIndex];
  const def = getCard(defId);
  board[pos.row][pos.col] = {
    instanceId: "sim",
    defId,
    owner: who,
    power: def.power,
    activated: false,
  };
  const { board: after, events } = resolveCascade(board, pos, who);
  const myScore = scoreFor(after, who);
  const opp = who === "player" ? "enemy" : "player";
  const theirScore = scoreFor(after, opp);
  const scoreBefore = scoreFor(state.board, who);
  let captures = 0;
  let damage = 0;
  let relays = 0;
  let splits = 0;
  for (const e of events) {
    if (e.type === "capture") captures += 1;
    if (e.type === "damage") damage += e.amount;
    if (e.type === "relay") relays += 1;
    if (e.type === "split") splits += 1;
  }

  const captureW = difficulty === "hard" ? 18 : difficulty === "normal" ? 14 : 5;
  const damageW = difficulty === "hard" ? 0.55 : difficulty === "normal" ? 0.45 : 0.25;
  const centerBias = pos.col === 1 ? (difficulty === "easy" ? 1 : difficulty === "normal" ? 2.5 : 3.2) : 0;
  const rowBias = pos.row === 1 || pos.row === 2 ? (difficulty === "easy" ? 0.4 : difficulty === "normal" ? 1.2 : 1.8) : 0;
  const forkBias = splits > 0 && difficulty !== "easy" ? (difficulty === "hard" ? 3.5 : 2) : 0;

  const score =
    myScore -
    theirScore +
    captures * captureW +
    damage * damageW +
    centerBias +
    rowBias +
    forkBias +
    def.power * 0.2 +
    relays * 0.3;

  return {
    handIndex,
    pos,
    score,
    captures,
    damage,
    relays,
    splits,
    scoreDelta: myScore - scoreBefore,
  };
}

function allScoredPlays(state: MatchState, difficulty: AiDifficulty): ScoredPlay[] {
  const tiles = emptyTiles(state.board);
  const hand = state.players[state.active].hand;
  const out: ScoredPlay[] = [];
  for (let hi = 0; hi < hand.length; hi++) {
    const def = getCard(hand[hi]);
    if (def.cost > state.energy) continue;
    for (const pos of tiles) {
      if (!canPlayCard(state, hi, pos)) continue;
      out.push(evaluatePlay(state, hi, pos, difficulty));
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function chooseAiMove(
  state: MatchState,
  difficulty: AiDifficulty = "normal",
  rng: () => number = Math.random,
): AiMove {
  if (state.phase !== "ai_thinking" && state.active !== "enemy") {
    return { pass: true };
  }

  const plays = allScoredPlays(state, difficulty);
  if (plays.length === 0) return { pass: true };

  if (difficulty === "easy") {
    // Sometimes pass even with a play; sometimes pick a middling move.
    if (rng() < 0.12) return { pass: true };
    if (rng() < 0.45) {
      const pick = plays[Math.floor(rng() * Math.min(plays.length, 4))];
      return { handIndex: pick.handIndex, pos: pick.pos, score: pick.score };
    }
    // Soften best pick with noise among top 3
    const top = plays.slice(0, Math.min(3, plays.length));
    const pick = top[Math.floor(rng() * top.length)];
    return { handIndex: pick.handIndex, pos: pick.pos, score: pick.score };
  }

  // Normal: always best, prefer captures when tied-ish
  const best = plays[0];
  return { handIndex: best.handIndex, pos: best.pos, score: best.score };
}

/**
 * Peek at the enemy's best reply from the current board (uses enemy hand).
 * Call while it's the player's turn to coach threats.
 */
export function forecastThreat(
  state: MatchState,
  difficulty: AiDifficulty = "normal",
): ThreatInfo | null {
  if (state.phase !== "playing" || state.active !== "player") return null;
  if (state.tutorial) return null;

  const ghost: MatchState = {
    ...state,
    active: "enemy",
    phase: "ai_thinking",
    energy: state.energyMax,
  };

  const plays = allScoredPlays(ghost, difficulty);
  if (plays.length === 0) return null;
  const best = plays[0];

  // Only telegraph meaningful threats
  if (best.captures <= 0 && best.damage < 3 && best.splits <= 0 && best.scoreDelta < 4) {
    return null;
  }

  const where = tileLabel(best.pos);
  if (best.captures > 0) {
    return {
      label: `Threat: OVERTHROW on ${where}`,
      pos: best.pos,
      kind: "capture",
    };
  }
  if (best.splits > 0) {
    return {
      label: `Threat: fork on ${where}`,
      pos: best.pos,
      kind: "fork",
    };
  }
  if (best.damage >= 4) {
    return {
      label: `Threat: heavy hit via ${where}`,
      pos: best.pos,
      kind: "damage",
    };
  }
  return {
    label: `Threat: score push on ${where}`,
    pos: best.pos,
    kind: "score",
  };
}

/** One-line telegraph when the AI commits to a cell. */
export function aiIntentLabel(move: AiMove): string | null {
  if ("pass" in move) return "Enemy passes…";
  return `Enemy targets ${tileLabel(move.pos)}…`;
}

export function applyAiMove(
  state: MatchState,
  difficulty: AiDifficulty = "normal",
  rng: () => number = Math.random,
  forced?: AiMove | null,
  opts: { deferTurn?: boolean } = {},
): AiMove {
  // Tutorial: enemy always passes so the coach can focus on your beats.
  if (state.tutorial) {
    passTurn(state);
    return { pass: true };
  }
  const move = forced ?? chooseAiMove(state, difficulty, rng);
  if ("pass" in move) {
    passTurn(state);
    return move;
  }
  playCard(state, move.handIndex, move.pos, { deferTurn: opts.deferTurn ?? false });
  return move;
}

/** Pick an enemy faction different from the player. */
export function pickEnemyFaction(player: FactionKey): FactionKey {
  if (player === "volt") return "void";
  if (player === "prismatic") return "volt";
  return "prismatic";
}
