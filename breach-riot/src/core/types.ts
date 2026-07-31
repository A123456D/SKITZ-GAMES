/** Hex-like code tokens used in the matrix. */
export const TOKENS = ["1C", "55", "7A", "BD", "E9", "FF"] as const;
export type Token = (typeof TOKENS)[number];

export type Pos = { c: number; r: number };

export type CellKind = "code" | "jam" | "sticky";

export type Cell = {
  token: Token;
  kind: CellKind;
  /** True once picked this round. */
  used: boolean;
};

export type Matrix = Cell[][];

/** Axis the player must pick along next. null = free first pick. */
export type Axis = "row" | "col" | null;

export type DaemonDef = {
  id: string;
  name: string;
  sequence: Token[];
  /** Required for a full breach. */
  required: boolean;
  /** Fork / bonus daemon. */
  optional?: boolean;
};

export type DaemonProgress = DaemonDef & {
  /** How many tokens matched so far as a contiguous run ending at buffer tip. */
  matched: number;
  completed: boolean;
};

export type LevelTwists = {
  jam?: boolean;
  sticky?: boolean;
  scramble?: boolean;
  /** Scramble fires every pick (default: every other). */
  scrambleHard?: boolean;
  fork?: boolean;
  /** Allow finishing before buffer is full. */
  earlyConfirm?: boolean;
  /** First pick restricted to top row. */
  firstRowOnly?: boolean;
  /** 0–1 jam/sticky density scale (default 1). */
  hazardScale?: number;
  coach?: string;
};

export type LevelDef = {
  id: number;
  name: string;
  brief: string;
  size: number;
  buffer: number;
  daemons: DaemonDef[];
  /** Seed for reproducible generation. */
  seed: number;
  twists: LevelTwists;
  /** Hand-planted matrix (tutorial). If set, skips generator. */
  fixed?: {
    tokens: Token[][];
    kinds?: CellKind[][];
  };
};

export type Outcome = "breach" | "partial" | "fail";

export type Progress = {
  unlocked: number;
  stars: Record<number, number>;
  sound: boolean;
};

export function keyPos(p: Pos): string {
  return `${p.c},${p.r}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.c === b.c && a.r === b.r;
}
