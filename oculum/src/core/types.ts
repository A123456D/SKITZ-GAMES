export const ALTITUDE_COUNT = 3;
export const MAX_TURNS = 10;
export const HAND_MAX = 5;
export const START_WILL = 20;
export const SIGHT_CARRY_CAP = 6;
export const ESSENCE_CAP = 8;
export const ECLIPSE_WIN = 5;

/** Tutorial foe Will — Break climax after two guided Resolves. */
export const TUTORIAL_ENEMY_WILL = 5;

export type Side = "player" | "enemy";
export type Altitude = 0 | 1 | 2; // High, Mid, Low
export type School =
  | "cube"
  | "deal"
  | "many"
  | "graft"
  | "hollow"
  | "coral"
  | "shell"
  | "deep"
  | "ring"
  | "neutral";

export type CardType = "figure" | "site" | "relic" | "sigil" | "vessel" | "rite" | "prophecy";

export type CardDef = {
  id: string;
  name: string;
  school: School;
  type: CardType;
  essence: number;
  /** Sight to Witness; 0 = N/A or auto */
  witnessCost: number;
  veiledPower: number;
  witnessedPower: number;
  sightYield: number;
  /** Short subject for art prompts / procedural face */
  artSubject: string;
  text: string;
  /** Internal flag: Codex sort pin + future skins (not printed rarity) */
  premium?: boolean;
};

export type Grafted = {
  instanceId: string;
  cardId: string;
};

export type BoardUnit = {
  instanceId: string;
  cardId: string;
  veiled: boolean;
  /** Root Chassis post-Revelation site-hybrid */
  hybridSite: boolean;
  stanceB: boolean;
  grafts: Grafted[];
  /** Vessel inhabitant card id */
  inhabitant: string | null;
  /** Sigil Third Face on this altitude */
  hasThirdFace: boolean;
};

export type AltitudeSlot = {
  /** Figure / Vessel occupant */
  player: BoardUnit | null;
  enemy: BoardUnit | null;
  /** Site or Sigil card id (shares altitude with a Figure) */
  playerSite: string | null;
  enemySite: string | null;
  /** End-of-turn blind (no sight from this altitude) */
  blinded: boolean;
};

export type OculusEvent =
  | { type: "play"; side: Side; altitude: Altitude; cardId: string; veiled: boolean }
  | { type: "witness"; side: Side; altitude: Altitude; cardId: string; enemyTarget?: boolean }
  | { type: "graft"; side: Side; altitude: Altitude; relicId: string }
  | { type: "rite"; side: Side; cardId: string; altitude?: Altitude }
  | { type: "stance"; side: Side; altitude: Altitude; stanceB: boolean }
  | { type: "law"; side: Side; cardId: string; eclipseGain: number }
  | { type: "pass"; side: Side }
  | { type: "resolve"; damages: { player: number; enemy: number } }
  | { type: "turn"; turn: number; side: Side }
  | { type: "end"; winner: Side | "draw"; reason: "break" | "eclipse" | "turns" };

export type MatchPhase = "menu" | "play" | "end";

/**
 * First Gaze — real guided match (not isolated lesson scenes).
 * Soft CTA only on intro; later beats are legal match actions with real Pass/Resolve.
 */
export type TutorialStep =
  | "intro"
  | "play"
  | "site"
  | "pass1"
  | "witness"
  | "graft"
  | "pass2"
  | "done";

export type AiDifficulty = "easy" | "normal" | "hard";

export type MatchState = {
  phase: MatchPhase;
  turn: number;
  active: Side;
  passed: { player: boolean; enemy: boolean };
  /** Third Face Stance used this action window */
  stanceUsed: { player: boolean; enemy: boolean };
  altitudes: [AltitudeSlot, AltitudeSlot, AltitudeSlot];
  hand: string[];
  enemyHand: string[];
  deck: string[];
  enemyDeck: string[];
  /** Active prophecy/law cards for each side */
  prophecies: string[];
  enemyProphecies: string[];
  essence: number;
  enemyEssence: number;
  sight: number;
  enemySight: number;
  will: number;
  enemyWill: number;
  eclipse: number;
  enemyEclipse: number;
  /** Schools Witnessed this turn (for Unblinking Law) */
  witnessedSchoolsThisTurn: School[];
  prophecyProgress: number;
  winner: Side | "draw" | null;
  endReason: "break" | "eclipse" | "turns" | null;
  events: OculusEvent[];
  nextId: number;
  tutorial: boolean;
  tutorialStep: TutorialStep;
  aiDifficulty: AiDifficulty;
};

export type Intent =
  | { kind: "play"; handIndex: number; altitude: Altitude }
  | { kind: "witness"; altitude: Altitude; enemy?: boolean }
  | { kind: "graft"; handIndex: number; altitude: Altitude }
  | { kind: "rite"; handIndex: number; altitude?: Altitude }
  | { kind: "stance"; altitude: Altitude }
  | { kind: "pass" };
