export const ALTITUDE_COUNT = 3;
export const MAX_TURNS = 10;
export const HAND_MAX = 5;
export const START_WILL = 20;
export const SIGHT_CARRY_CAP = 6;
export const ESSENCE_CAP = 8;
export const ECLIPSE_WIN = 10;
/** Motley Favor track (Cash / Trick fuel). */
export const FAVOR_CAP = 3;
/** Veiled Holds → Forced Exposed + Strain at this stack count. */
export const SCRUTINY_FORCE = 2;

/** Tutorial foe Will — Break climax after two guided Resolves. */
export const TUTORIAL_ENEMY_WILL = 3;

export type Side = "player" | "enemy";
export type Altitude = 0 | 1 | 2; // High, Mid, Low

/**
 * Craft / heresy id on CardDef.
 * Live soft-reboot: ink · motley · toll · breach · lumen · ruin.
 * Other ids stay typed for leftover hooks and HERESY_LORE.
 */
export type Heresy =
  | "ink"
  | "motley"
  | "toll"
  | "breach"
  | "lumen"
  | "ruin"
  | "cube"
  | "many"
  | "graft"
  | "hollow"
  | "coral"
  | "deep"
  | "ring"
  | "neutral";

export type CardType = "figure" | "site" | "relic" | "sigil" | "vessel" | "rite" | "prophecy";

export type CardDef = {
  id: string;
  name: string;
  heresy: Heresy;
  type: CardType;
  essence: number;
  /** Sight to Witness; 0 = N/A or auto (Sites) */
  witnessCost: number;
  veiledPower: number;
  witnessedPower: number;
  sightYield: number;
  /** Short subject for art prompts / procedural face */
  artSubject: string;
  text: string;
  /** Printed Veiled: ability (Figures) */
  veiledAbility?: string;
  /** Printed Revelation: (Figures / some Vessels) */
  revelation?: string;
  /** Internal: Codex sort pin + future skins (not printed rarity) */
  premium?: boolean;
  /** Sovereign singleton — constructed ≤1 total / per id */
  sovereign?: boolean;
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
  /** Witnessed loser already Strained — next Witnessed loss Falls */
  strained: boolean;
  /** Ink Abyss Stain mark */
  stained: boolean;
  /** Revelation already fired this board life */
  revelationFired: boolean;
  /** Veiled Hold stacks toward SCRUTINY_FORCE */
  scrutiny: number;
  /** Motley: ante committed — Cash on Veiled win / Bust on lose or Forced Expose (cashbust mode) */
  wagered: boolean;
  /** True if ante spent a resource (refund on Cash); false for Free Wager */
  wagerAntePaid: boolean;
  /** True if ante was Favor (not Sight); only when wagerAntePaid */
  wagerAnteFavor: boolean;
  /** Motley coinflip: scored Heads this action window (Eclipse arm) */
  wagerHeads: boolean;
  /** Motley coinflip: temporary power from Heads steals this Resolve */
  wagerPowerDelta: number;
  /** Iron Breach: became Witnessed via own Open since last Resolve (Overexpose eligible) */
  openedSinceResolve: boolean;
  /** Iron Breach Last Breach: Opened by that rite this round (Overexpose → draw) */
  lastBreachOpened: boolean;
  /** Ink Press: currently Pressed (−1 power until Resolve) */
  pressed: boolean;
  /** Side that Pressed this unit (for backlash / pierce) */
  pressedBy: Side | null;
  /** Lumen Host: Halo'd after own Witness */
  haloed: boolean;
  /** Lumen Host: Sustained this window (keeps Halo after Blaze) */
  haloSustained: boolean;
  /** Velvet Ruin: Tempt bait mark (enemy Veiled) */
  tempted: boolean;
  /** Side that Tempted this unit */
  temptedBy: Side | null;
  /** Velvet Ruin: Brand after Witness on Tempt (or card Brand) */
  branded: boolean;
  /** Side that Brands this unit (Devour on their Pass) */
  brandedBy: Side | null;
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
  | { type: "reveil"; side: Side; altitude: Altitude; cardId: string }
  | { type: "graft"; side: Side; altitude: Altitude; relicId: string }
  | { type: "rite"; side: Side; cardId: string; altitude?: Altitude }
  | { type: "stance"; side: Side; altitude: Altitude; stanceB: boolean }
  | { type: "wager"; side: Side; altitude: Altitude; cardId: string; free: boolean }
  | {
      type: "wager_flip";
      side: Side;
      altitude: Altitude;
      cardId: string;
      result: "heads" | "tails";
      ante: boolean;
    }
  | { type: "up_ante"; side: Side; altitude: Altitude; cardId: string }
  | { type: "cash"; side: Side; altitude: Altitude; cardId: string }
  | { type: "bust"; side: Side; altitude: Altitude; cardId: string }
  | { type: "fold"; side: Side; altitude: Altitude; cardId: string }
  | { type: "favor"; side: Side; amount: number }
  | { type: "press"; side: Side; altitude: Altitude; cardId: string; bonusWill?: number }
  | { type: "press_backlash"; side: Side; altitude: Altitude; cardId: string }
  | { type: "peal"; side: Side; altitude: Altitude }
  | { type: "peal_pay"; side: Side; altitude: Altitude }
  | { type: "toll"; side: Side; altitude: Altitude }
  | { type: "toll_pay"; side: Side; altitude: Altitude; paid: boolean }
  | { type: "lure"; side: Side; altitude: Altitude; cardId: string }
  | { type: "resonance"; side: Side; altitude: Altitude }
  | { type: "overexpose"; side: Side; altitude: Altitude; cardId: string }
  | { type: "halo"; side: Side; altitude: Altitude; cardId: string }
  | { type: "blaze"; side: Side; altitude: Altitude; cardId: string; will?: number; sight?: number }
  | { type: "sustain"; side: Side; altitude: Altitude; cardId: string }
  | { type: "tempt"; side: Side; altitude: Altitude; cardId: string }
  | { type: "brand"; side: Side; altitude: Altitude; cardId: string }
  | { type: "devour"; side: Side; altitude: Altitude; cardId: string; will?: number; sight?: number }
  | { type: "stain"; side: Side; altitude: Altitude; cardId: string }
  | {
      type: "hold";
      side: Side;
      altitude: Altitude;
      cardId: string;
      reason: "veil" | "motley_b" | "smile";
    }
  | {
      type: "erase";
      side: Side;
      altitude: Altitude;
      cardId: string;
      via: "stain" | "press" | "false_hold";
    }
  | { type: "breach"; side: Side; altitude: Altitude; cardId: string; amount: number }
  | {
      type: "lane_result";
      altitude: Altitude;
      winner: Side | null;
      softChip: number;
    }
  | { type: "blind"; altitude: Altitude }
  | { type: "scrutiny"; side: Side; altitude: Altitude; cardId: string; stacks: number }
  | { type: "overwrite"; side: Side; altitude: Altitude; bouncedId: string }
  | { type: "tuck"; side: Side; altitude: Altitude; vesselId: string; inhabitantId: string }
  | { type: "draw"; side: Side; cardId: string; to: "hand" | "law" }
  | { type: "law"; side: Side; cardId: string; eclipseGain: number }
  | { type: "eclipse"; side: Side; amount: number; reason?: string }
  | { type: "pass"; side: Side }
  | { type: "resolve"; damages: { player: number; enemy: number } }
  | { type: "strain"; side: Side; altitude: Altitude; cardId: string }
  | { type: "fall"; side: Side; altitude: Altitude; cardId: string }
  | { type: "turn"; turn: number; side: Side }
  | { type: "end"; winner: Side | "draw"; reason: "break" | "eclipse" | "turns" };

export type MatchPhase = "menu" | "play" | "end";

/**
 * Tutorial lesson id.
 * First Gaze uses the named steps below; craft curricula use prefixed ids (ink_*, motley_*, …).
 */
export type TutorialStep = string;

/** Named First Gaze steps (also valid TutorialStep values). */
export type FirstGazeStep =
  | "intro"
  | "card_essence"
  | "card_sight"
  | "card_power"
  | "hud_will"
  | "hud_sight"
  | "hud_eclipse"
  | "hud_lanes"
  | "types_figure"
  | "types_site"
  | "types_relic"
  | "types_rite"
  | "types_vessel"
  | "loop_veil"
  | "loop_resolve"
  | "demo_ink"
  | "demo_motley"
  | "demo_toll"
  | "demo_breach"
  | "counter_erase_trick"
  | "outro"
  | "done"
  /** legacy interactive steps (no longer used; kept for save compat) */
  | "play"
  | "site"
  | "pass1"
  | "witness"
  | "graft"
  | "pass2";

/** @deprecated Prefer TutorialStep; kept as alias of FirstGazeStep for older imports. */
export type LegacyTutorialStep = FirstGazeStep;

export type AiDifficulty = "easy" | "normal" | "hard";

export type MatchState = {
  phase: MatchPhase;
  turn: number;
  active: Side;
  passed: { player: boolean; enemy: boolean };
  /** Third Face / Motley Stance used this action window */
  stanceUsed: { player: boolean; enemy: boolean };
  /** Re-Veil used this action window */
  reveilUsed: { player: boolean; enemy: boolean };
  /** Motley Wager used this action window */
  wagerUsed: { player: boolean; enemy: boolean };
  /** Motley coinflip — Up the Ante armed after Heads */
  pendingUpAnte: { side: Side; altitude: Altitude; free: boolean } | null;
  /** Entropy for Motley coin flips */
  wagerEntropy: number;
  /** Whitecard Mummer — Up the Ante draw used this turn */
  mummerAnteDrawUsed: { player: boolean; enemy: boolean };
  /** Grinning Debtor Witnessed tails power — once per Resolve */
  debtorTailsBuffUsed: { player: boolean; enemy: boolean };
  /** Spire Caprice High steal Sight — once per turn */
  capriceStealSightUsed: { player: boolean; enemy: boolean };
  /** Trick Eclipse already scored this Resolve (coinflip) */
  trickEclipseScored: { player: boolean; enemy: boolean };
  /** Ink Press used this action window */
  pressUsed: { player: boolean; enemy: boolean };
  /** Figure/vessel plays per altitude this action window — stops lane spam */
  figurePlaysThisWindow: { player: [number, number, number]; enemy: [number, number, number] };
  /** Bellward Peal used this action window */
  pealUsed: { player: boolean; enemy: boolean };
  /** Velvet Ruin Tempt used this action window */
  temptUsed: { player: boolean; enemy: boolean };
  /** Velvet Ruin — Desire Altar free Tempt available this window */
  desireAltarTemptFree: { player: boolean; enemy: boolean };
  /** Velvet Ruin — Brandlace: first Tempt Sight available this window */
  ruinBrandlaceTemptSight: { player: boolean; enemy: boolean };
  /** Velvet Ruin — Full Devour: Devours deal +1 Will until Resolve */
  ruinFullDevourArmed: { player: boolean; enemy: boolean };
  /** Sound the Toll — Peal pays even without Resolve spend */
  soundTollPealBonus: { player: boolean; enemy: boolean };
  /** Debtor of Caprice — Bust draw used this match */
  debtorBustDrawUsed: { player: boolean; enemy: boolean };
  /** Smile That Holds / False Hold — next Forced Exposed cancel arm */
  falseHoldArmed: { player: boolean; enemy: boolean };
  /** False Face — cancel Forced Exposed once */
  falseFaceArmed: { player: boolean; enemy: boolean };
  /** Mire Surge rite armed */
  mireSurgeArmed: { player: boolean; enemy: boolean };
  /** Gala Surge rite armed */
  galaSurgeArmed: { player: boolean; enemy: boolean };
  /** Encore buff altitude (null = none) */
  encoreBuffAlt: { player: Altitude | null; enemy: Altitude | null };
  /** Debt Surge armed */
  debtSurgeArmed: { player: boolean; enemy: boolean };
  /** Vessel Surge armed */
  vesselSurgeArmed: { player: boolean; enemy: boolean };
  /** Mesa buff altitude */
  mesaBuffAlt: { player: Altitude | null; enemy: Altitude | null };
  /** Well Cantor choir buff until Resolve */
  inkChoirBuff: { player: boolean; enemy: boolean };
  /** Smother Bride Sight tax used this turn */
  smotherTaxUsed: { player: boolean; enemy: boolean };
  /** Toll owner per altitude (null = untolled) */
  tollOwner: [Side | null, Side | null, Side | null];
  /** Peal armed on altitude */
  pealArmed: [boolean, boolean, boolean];
  /** Bell Debt Walker resonance buff */
  walkerResonanceBuff: { player: boolean; enemy: boolean };
  /** Path Bellman buff */
  pathBellmanBuff: { player: boolean; enemy: boolean };
  /** Rope Auditor — enemy Tolled Witness/Lure Sight tax used this turn */
  ropeAuditorTaxUsed: { player: boolean; enemy: boolean };
  /** Iron Breach Full Breach — +1 Breach Will until Resolve */
  fullBreachArmed: { player: boolean; enemy: boolean };
  /** Iron Breach — Breach Will payouts already dealt this Resolve (cap 2/side) */
  breachDealtThisResolve: { player: number; enemy: number };
  /** Overexpose already taken this Resolve */
  overexposeTakenThisResolve: { player: boolean; enemy: boolean };
  /** Ashcoil buff stacks */
  ashcoilBuff: { player: number; enemy: number };
  /** Skaroth first-Breach power arm */
  skarothPowerArmed: { player: boolean; enemy: boolean };
  /** Rivet Charm draw used */
  rivetCharmDrawUsed: { player: boolean; enemy: boolean };
  /** Slag Reaper strain draw used */
  slagStrainDrawUsed: { player: boolean; enemy: boolean };
  /** Lumen — free Sustain from Shrine available this window */
  lumenShrineSustainFree: { player: boolean; enemy: boolean };
  /** Lumen Host — Veilburn Usher: first Sustain Sight available this window */
  lumenUsherSustainSight: { player: boolean; enemy: boolean };
  /** Lumen Host — Full Radiance: Blazes deal +1 Will until Resolve */
  lumenFullRadianceArmed: { player: boolean; enemy: boolean };
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
  favor: number;
  enemyFavor: number;
  favorGainedThisTurn: { player: boolean; enemy: boolean };
  /** Motley Cash count this Resolve (Trick / Lady Masque) */
  cashThisResolve: { player: number; enemy: number };
  will: number;
  enemyWill: number;
  eclipse: number;
  enemyEclipse: number;
  /** Distinct heresies Witnessed this turn (for Unblinking Law) */
  witnessedHeresiesThisTurn: Heresy[];
  prophecyProgress: number;
  winner: Side | "draw" | null;
  endReason: "break" | "eclipse" | "turns" | null;
  events: OculusEvent[];
  nextId: number;
  tutorial: boolean;
  /** Active curriculum — first_gaze or a craft Teach (ink/motley/toll/breach). */
  tutorialId: import("./tutorial/types").TutorialId | null;
  tutorialStep: TutorialStep;
  aiDifficulty: AiDifficulty;
  /**
   * Crafts present in the starting deck (incl. prophecies).
   * Kit buttons (Stance/Wager/Press/Peal) stay for the whole match even if
   * every Motley/Ink/Toll body has Fallen or been tucked.
   */
  craftKits: { player: string[]; enemy: string[] };
};

export type Intent =
  | { kind: "play"; handIndex: number; altitude: Altitude }
  | { kind: "witness"; altitude: Altitude; enemy?: boolean }
  | { kind: "reveil"; altitude: Altitude }
  | { kind: "graft"; handIndex: number; altitude: Altitude }
  | { kind: "rite"; handIndex: number; altitude?: Altitude }
  | { kind: "stance"; altitude: Altitude }
  | { kind: "wager"; altitude: Altitude }
  | { kind: "up_ante"; altitude: Altitude }
  | { kind: "skip_ante" }
  | { kind: "press"; altitude: Altitude }
  | { kind: "peal"; altitude: Altitude }
  | { kind: "sustain"; altitude: Altitude }
  | { kind: "tempt"; altitude: Altitude }
  | { kind: "pass" };
