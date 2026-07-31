/** Hex-like code tokens used in the matrix. */
export const TOKENS = ["1C", "55", "7A", "BD", "E9", "FF"] as const;
export type Token = (typeof TOKENS)[number];

export type Pos = { c: number; r: number };

export type CellKind = "code" | "jam" | "sticky";

export type Cell = {
  token: Token;
  kind: CellKind;
  /** True once picked — cell blanks out (CP2077). */
  used: boolean;
};

export type Matrix = Cell[][];

/** Axis the player must pick along next. null = free first pick (top row). */
export type Axis = "row" | "col" | null;

/** Datamine tier — Basic / Advanced / Expert. */
export type DatamineTier = 1 | 2 | 3;

export type DatamineDef = {
  id: string;
  /** Display name e.g. DATAMINE V1 */
  name: string;
  tier: DatamineTier;
  sequence: Token[];
};

export type DatamineProgress = DatamineDef & {
  matched: number;
  completed: boolean;
};

/** @deprecated alias while migrating — prefer DatamineDef */
export type DaemonDef = DatamineDef & {
  required?: boolean;
  optional?: boolean;
};

export type DaemonProgress = DatamineProgress;

export type LevelTwists = {
  jam?: boolean;
  sticky?: boolean;
  scramble?: boolean;
  scrambleHard?: boolean;
  fork?: boolean;
  earlyConfirm?: boolean;
  /** Always true in CP mode; kept for generator opts. */
  firstRowOnly?: boolean;
  hazardScale?: number;
  coach?: string;
};

export type LevelDef = {
  id: number;
  name: string;
  brief: string;
  /** 0-based district index. */
  district: number;
  size: number;
  /** Base buffer before deck bonus. */
  buffer: number;
  /** Base breach time (seconds) before deck bonus. */
  timeLimit: number;
  datamines: DatamineDef[];
  seed: number;
  twists: LevelTwists;
  fixed?: {
    tokens: Token[][];
    kinds?: CellKind[][];
  };
};

export type Outcome = "breach" | "partial" | "fail";

export type Loot = {
  scrap: number;
  components: number;
};

export type Deck = {
  /** Extra buffer slots purchased (cap 4 → effective ≤ 8 with base). */
  bufferBonus: number;
  /** Extra seconds purchased (cap 12). */
  timeBonus: number;
  /** Almost In perk purchased once (+5s flat when owned). */
  almostIn: boolean;
};

export type Progress = {
  unlocked: number;
  stars: Record<number, number>;
  sound: boolean;
  scrap: number;
  components: number;
  deck: Deck;
  /** Highest district unlocked (0-based). */
  district: number;
};

export function keyPos(p: Pos): string {
  return `${p.c},${p.r}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.c === b.c && a.r === b.r;
}

export const MAX_BUFFER_BONUS = 4;
export const MAX_TIME_BONUS = 12;
export const ALMOST_IN_SECONDS = 5;
