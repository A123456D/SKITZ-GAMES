/** Core types for Chain Reactor. */

export type Direction = "up" | "down" | "left" | "right";

export type Faction = "volt" | "prismatic" | "void" | "neutral";

export type NodeType = "pulse" | "splitter" | "reflector" | "amplifier" | "inverter";

export type FactionSigil = "flood" | "redirect" | "invert";

export type Arrows = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type CardDef = {
  id: string;
  name: string;
  faction: Faction;
  cost: number;
  power: number;
  arrows: Arrows;
  node: NodeType;
  /** Short ability line shown on the card face. */
  ability: string;
  /** Reflector bend direction. Default clockwise. */
  reflectClockwise?: boolean;
  /** Signature syndicate verb card. */
  sigil?: FactionSigil;
};

export type BoardCard = {
  instanceId: string;
  defId: string;
  owner: "player" | "enemy";
  power: number;
  activated: boolean;
};

export type Pos = { col: number; row: number };

export const COLS = 3;
export const ROWS = 4;
export const HAND_SIZE = 3;
export const DECK_SIZE = 10;
export const MAX_ROUNDS = 6;
export const TURN_SECONDS = 15;
export const CASCADE_DEPTH_CAP = 4;

export type BeamEvent = {
  from: Pos;
  to: Pos | null;
  dir: Direction;
  power: number;
  step: number;
  kind: "hit" | "miss" | "pass";
};

export type CascadeEvent =
  | { type: "fire"; pos: Pos; arrows: Direction[]; step: number; power: number }
  | { type: "beam"; beam: BeamEvent }
  | { type: "damage"; pos: Pos; amount: number; remaining: number }
  | { type: "capture"; pos: Pos; newOwner: "player" | "enemy"; powerSet: number }
  | { type: "relay"; pos: Pos }
  | {
      type: "reflect";
      pos: Pos;
      fromDir: Direction;
      toDirs: Direction[];
      bonus: number;
    }
  | { type: "split"; pos: Pos; fromDir: Direction; toDirs: Direction[] }
  | { type: "overkill"; pos: Pos; bonus: number };

export type MatchMode = "versus" | "tutorial" | "campaign" | "daily";

export type ObjectiveKind =
  | "win_match"
  | "score_at_least"
  | "capture_at_least"
  | "chain_depth"
  | "survive_rounds";

export type MatchObjective = {
  kind: ObjectiveKind;
  target: number;
  progress: number;
  label: string;
};

export type MatchPhase =
  | "menu"
  | "faction_pick"
  | "campaign_map"
  | "playing"
  | "cascading"
  | "ai_thinking"
  | "match_over"
  | "tutorial";

export type PlayerState = {
  id: "player" | "enemy";
  deck: string[];
  hand: string[];
  faction: Faction;
};

export type MatchState = {
  phase: MatchPhase;
  mode: MatchMode;
  round: number;
  active: "player" | "enemy";
  energy: number;
  energyMax: number;
  turnSecondsLeft: number;
  board: (BoardCard | null)[][];
  players: Record<"player" | "enemy", PlayerState>;
  lastCascade: CascadeEvent[];
  winner: "player" | "enemy" | "draw" | null;
  nextInstance: number;
  /** Player may mulligan once before their first play. */
  mulliganAvailable: boolean;
  /** True while a cascade is animating; turn advances when cleared. */
  cascadePending: boolean;
  /** Score snapshot before last resolved play (for HUD deltas). */
  scoreBeforePlay: { player: number; enemy: number };
  /** Deltas from last finished play. */
  lastScoreDelta: { player: number; enemy: number };
  /** Tutorial mode flag. */
  tutorial: boolean;
  tutorialStep: number;
  /** First capture coach tip shown once. */
  sawCaptureTip: boolean;
  /** Campaign node id when mode=campaign. */
  campaignNodeId: string | null;
  /** Active win objective (campaign / daily). */
  objective: MatchObjective | null;
  /** Deepest cascade step seen this match (daily). */
  maxChainDepth: number;
  /** Events from the deepest player cascade (for end replay). */
  bestCascade: CascadeEvent[];
  /** Captures by the player this match. */
  capturesPlayer: number;
  /** Daily challenge date key YYYY-MM-DD. */
  dailyKey: string | null;
  /** Plays remaining in daily (null = unlimited). */
  playsLeft: number | null;
  /** Forced AI difficulty for this match (null = use prefs). */
  aiDifficulty: "easy" | "normal" | "hard" | null;
  /** Extra energy applied on player beginTurn. */
  playerEnergyBonus: number;
  /** Extra energy applied on enemy beginTurn. */
  enemyEnergyBonus: number;
  /** Optional hard cap on rounds for this match. */
  maxRoundsOverride: number | null;
  /** Scripted first-session versus (signature setup). */
  showcase: boolean;
  /** Signature verb banner already shown this match. */
  signatureSeen: boolean;
};

export function energyForRound(round: number): number {
  // Round 1 starts at 2 so openings aren't dead passes.
  const n = Math.min(MAX_ROUNDS, Math.max(1, round));
  return Math.max(2, n);
}

export function stepMultiplier(step: number): number {
  if (step <= 2) return 1;
  if (step === 3) return 1.25;
  return 1.5;
}

export function dirDelta(dir: Direction): Pos {
  switch (dir) {
    case "up":
      return { col: 0, row: -1 };
    case "down":
      return { col: 0, row: 1 };
    case "left":
      return { col: -1, row: 0 };
    case "right":
      return { col: 1, row: 0 };
  }
}

export function opposite(dir: Direction): Direction {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

export function turnClockwise(dir: Direction): Direction {
  switch (dir) {
    case "up":
      return "right";
    case "right":
      return "down";
    case "down":
      return "left";
    case "left":
      return "up";
  }
}

export function turnCounterClockwise(dir: Direction): Direction {
  switch (dir) {
    case "up":
      return "left";
    case "left":
      return "down";
    case "down":
      return "right";
    case "right":
      return "up";
  }
}

export function isVertical(dir: Direction): boolean {
  return dir === "up" || dir === "down";
}

export function emptyArrows(): Arrows {
  return { up: false, down: false, left: false, right: false };
}

export function arrowsFrom(...dirs: Direction[]): Arrows {
  const a = emptyArrows();
  for (const d of dirs) a[d] = true;
  return a;
}

export function listArrows(a: Arrows): Direction[] {
  const out: Direction[] = [];
  if (a.up) out.push("up");
  if (a.down) out.push("down");
  if (a.left) out.push("left");
  if (a.right) out.push("right");
  return out;
}

export function inBounds(pos: Pos): boolean {
  return pos.col >= 0 && pos.col < COLS && pos.row >= 0 && pos.row < ROWS;
}

export function emptyBoard(): (BoardCard | null)[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

export function cloneBoard(board: (BoardCard | null)[][]): (BoardCard | null)[][] {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}
