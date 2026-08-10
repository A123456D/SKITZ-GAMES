export const LANE_COUNT = 3;
export const MAX_TURNS = 6;
export const MAX_STACK = 2;
export const HAND_SIZE = 3;

export type Side = "player" | "enemy";
export type Keyword = "brace" | "sting" | "glue" | "flash";

export type CardDef = {
  id: string;
  name: string;
  cost: number;
  /** Printed (unfolded) power */
  frontPower: number;
  /** Ink-back power after Fold */
  inkPower: number;
  frontKeyword?: Keyword;
  inkKeyword?: Keyword;
  /** Short colour-pen subject for art prompts */
  artSubject: string;
  inkSubject: string;
};

export type PlacedCard = {
  instanceId: string;
  cardId: string;
  folded: boolean;
  scarred: boolean;
};

/** One side of a lane: body + optional sticker on top */
export type PaperStack = {
  body: PlacedCard;
  sticker?: PlacedCard;
};

export type Lane = {
  player: PaperStack | null;
  enemy: PaperStack | null;
};

export type PaperEvent =
  | {
      type: "play";
      side: Side;
      lane: number;
      cardId: string;
      stacked: boolean;
      stung?: boolean;
    }
  | {
      type: "fold";
      side: Side;
      lane: number;
      target: "body" | "sticker";
      drew?: boolean;
    }
  | {
      type: "rip";
      side: Side;
      lane: number;
      result: "peel" | "destroy" | "scar" | "blocked";
    }
  | { type: "pass"; side: Side }
  | { type: "turn"; turn: number; side: Side }
  | { type: "end"; winner: Side | "draw"; laneWinners: Array<Side | "tie"> };

export type MatchPhase = "menu" | "play" | "end";

export type TutorialStep = "play" | "fold" | "stack" | "rip" | "done";

export type MatchState = {
  phase: MatchPhase;
  turn: number;
  active: Side;
  lanes: [Lane, Lane, Lane];
  hand: string[];
  enemyHand: string[];
  deck: string[];
  enemyDeck: string[];
  ripAvailable: boolean;
  enemyRipAvailable: boolean;
  winner: Side | "draw" | null;
  laneWinners: Array<Side | "tie"> | null;
  events: PaperEvent[];
  tutorial: boolean;
  tutorialStep: TutorialStep;
  /** Instance id counter */
  nextId: number;
};

export type Intent =
  | { kind: "play"; handIndex: number; lane: number }
  | { kind: "fold"; lane: number }
  | { kind: "rip"; lane: number }
  | { kind: "pass" };
