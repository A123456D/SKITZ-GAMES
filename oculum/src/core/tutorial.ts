import type { Altitude, BoardUnit, Intent, MatchState, TutorialStep } from "./types";

/** Ordered First Gaze lessons (excluding `done`). */
export const TUTORIAL_LESSONS: Exclude<TutorialStep, "done">[] = [
  "intro",
  "goal",
  "play",
  "site",
  "witness",
  "graft",
  "gaze",
  "stance",
  "rite",
  "law",
  "resolve",
];

/** Pass acknowledges the lesson without ending the action window. */
const SOFT_PASS_STEPS = new Set<TutorialStep>(["intro", "goal"]);

const SCENE_STEPS = new Set<TutorialStep>(["play", "gaze", "stance", "rite", "law", "resolve"]);

function clearBoard(state: MatchState): void {
  for (const slot of state.altitudes) {
    slot.player = null;
    slot.enemy = null;
    slot.playerSite = null;
    slot.enemySite = null;
    slot.blinded = false;
  }
}

function mkUnit(state: MatchState, cardId: string, veiled: boolean, extra?: Partial<BoardUnit>): BoardUnit {
  return {
    instanceId: `t${state.nextId++}`,
    cardId,
    veiled,
    hybridSite: false,
    stanceB: false,
    grafts: [],
    inhabitant: null,
    hasThirdFace: false,
    ...extra,
  };
}

function lessonIndex(step: TutorialStep): number {
  const i = TUTORIAL_LESSONS.indexOf(step as Exclude<TutorialStep, "done">);
  return i < 0 ? TUTORIAL_LESSONS.length : i + 1;
}

export function isTutorialSoftPass(step: TutorialStep): boolean {
  return SOFT_PASS_STEPS.has(step);
}

export function tutorialHint(step: TutorialStep): string {
  const n = lessonIndex(step);
  const total = TUTORIAL_LESSONS.length;
  const p = (msg: string) => `Lesson ${n}/${total} — ${msg}`;
  switch (step) {
    case "intro":
      return p(
        "Why OCULUM: things only fully exist when Witnessed. Veiled cards are half-real; Witness spends Sight to make them true — power, Revelation, Ascend.",
      );
    case "goal":
      return p(
        "How you win: Break their Will to 0, or reach 5 Eclipse (they end a turn at 0 Sight), or hold more Will after 10 rounds. Pass to begin.",
      );
    case "play":
      return p(
        "Each turn: spend Essence to play Veiled into HIGH / MID / LOW. High = Sight & damage; Low helps Veiled. Play Cliff Seeker into MID.",
      );
    case "site":
      return p("COMBO: play Veil Banner on MID — Sites are landmarks. Banner gives +1 to your Veiled figures here.");
    case "witness":
      return p(
        "Spend Sight to Witness MID — the reason of the game. Revelation fires; full power. Banner only buffs Veiled.",
      );
    case "graft":
      return p("COMBO: graft Ace of Hollows onto your Figure — +1 while Witnessed; draws when the host Witnesses.");
    case "gaze":
      return p("GAZE: with Ring Gaze, Witness THEIR Veiled card on HIGH — steal their Revelation.");
    case "stance":
      return p("STANCE: Third Face lets you flip A/B powers once per turn. Tap Stance, then MID.");
    case "rite":
      return p("RITE: play Pale Silence on MID — Blind blocks Sight income there (starve them toward Eclipse).");
    case "law":
      return p("LAW: Witness Inkdrip (Hollow) — Witness 3 schools in one turn to arm Unblinking Law (+Eclipse on Pass).");
    case "resolve":
      return p(
        "Pass ends your window (Law may fire). Both Pass → Resolve: winning altitudes deal Will damage. Then free play — Ascend.",
      );
    default:
      return "Select a card — or Witness / Stance / Pass.";
  }
}

/** Hand card id to pulse for the current lesson, if any. */
export function tutorialTeachCard(step: TutorialStep): string | null {
  switch (step) {
    case "play":
      return "cliff_seeker";
    case "site":
      return "veil_banner";
    case "graft":
      return "ace_of_hollows";
    case "rite":
      return "pale_silence";
    default:
      return null;
  }
}

export function setupTutorial(state: MatchState): void {
  state.tutorial = true;
  state.tutorialStep = "intro";
  setupTutorialScene(state, "intro");
}

export function setupTutorialScene(state: MatchState, step: TutorialStep): void {
  state.active = "player";
  state.passed = { player: false, enemy: false };
  state.stanceUsed = { player: false, enemy: false };
  state.enemyHand = ["cliff_seeker", "veil_banner"];
  state.enemyDeck = ["root_chassis", "hole_choir", "coral_crown", "hatline_trickster"];
  state.enemyEssence = 0;
  state.enemySight = 1;
  state.prophecies = ["unblinking_law"];
  state.enemyProphecies = [];
  state.witnessedSchoolsThisTurn = [];
  state.deck = [
    "hole_choir",
    "coral_crown",
    "root_chassis",
    "hatline_trickster",
    "ring_gaze",
    "ribcity_angel",
    "third_face",
    "pale_silence",
  ];

  clearBoard(state);

  switch (step) {
    case "intro":
    case "goal": {
      state.hand = [];
      state.essence = 0;
      state.sight = 3;
      break;
    }
    case "play":
    case "site":
    case "witness":
    case "graft": {
      if (step === "play") {
        state.hand = ["cliff_seeker", "veil_banner", "ace_of_hollows"];
        state.essence = 5;
        state.sight = 4;
      }
      break;
    }
    case "gaze": {
      state.hand = ["root_chassis"];
      state.essence = 0;
      state.sight = 4;
      state.altitudes[0].playerSite = "ring_gaze";
      state.altitudes[0].enemy = mkUnit(state, "cliff_seeker", true);
      break;
    }
    case "stance": {
      state.hand = [];
      state.essence = 0;
      state.sight = 3;
      state.altitudes[1].player = mkUnit(state, "cliff_seeker", false);
      state.altitudes[1].playerSite = "third_face";
      break;
    }
    case "rite": {
      state.hand = ["pale_silence"];
      state.essence = 2;
      state.sight = 2;
      state.altitudes[1].enemy = mkUnit(state, "cliff_seeker", true);
      break;
    }
    case "law": {
      state.hand = [];
      state.essence = 0;
      state.sight = 3;
      state.altitudes[1].player = mkUnit(state, "inkdrip_acolyte", true);
      state.witnessedSchoolsThisTurn = ["cube", "deal"];
      break;
    }
    case "resolve": {
      state.hand = ["veil_banner"];
      state.essence = 0;
      state.sight = 2;
      state.altitudes[1].player = mkUnit(state, "hatline_trickster", false, {
        grafts: [{ instanceId: `t${state.nextId++}`, cardId: "ace_of_hollows" }],
      });
      state.altitudes[1].enemy = mkUnit(state, "cliff_seeker", true);
      state.witnessedSchoolsThisTurn = ["cube", "deal", "hollow"];
      break;
    }
    default:
      break;
  }
}

export function filterTutorialIntents(state: MatchState, intents: Intent[]): Intent[] {
  if (!state.tutorial || state.tutorialStep === "done") return intents;
  switch (state.tutorialStep) {
    case "intro":
    case "goal":
    case "resolve":
      return intents.filter((i) => i.kind === "pass");
    case "play":
      return intents.filter(
        (i) =>
          i.kind === "play" &&
          state.hand[i.handIndex] === "cliff_seeker" &&
          i.altitude === 1,
      );
    case "site":
      return intents.filter(
        (i) =>
          i.kind === "play" &&
          state.hand[i.handIndex] === "veil_banner" &&
          i.altitude === 1,
      );
    case "witness":
      return intents.filter((i) => i.kind === "witness" && i.altitude === 1 && !i.enemy);
    case "graft":
      return intents.filter(
        (i) =>
          i.kind === "graft" &&
          state.hand[i.handIndex] === "ace_of_hollows" &&
          i.altitude === 1,
      );
    case "gaze":
      return intents.filter((i) => i.kind === "witness" && i.altitude === 0 && !!i.enemy);
    case "stance":
      return intents.filter((i) => i.kind === "stance" && i.altitude === 1);
    case "rite":
      return intents.filter(
        (i) =>
          i.kind === "rite" &&
          state.hand[i.handIndex] === "pale_silence" &&
          i.altitude === 1,
      );
    case "law":
      return intents.filter((i) => i.kind === "witness" && i.altitude === 1 && !i.enemy);
    default:
      return intents;
  }
}

/** Advance step after a successful intent. Returns true if a fresh scene was loaded. */
export function advanceTutorial(state: MatchState, intent: Intent): boolean {
  if (!state.tutorial || state.tutorialStep === "done") return false;
  const prev = state.tutorialStep;
  let next: TutorialStep | null = null;

  switch (prev) {
    case "intro":
      if (intent.kind === "pass") next = "goal";
      break;
    case "goal":
      if (intent.kind === "pass") next = "play";
      break;
    case "play":
      if (intent.kind === "play") next = "site";
      break;
    case "site":
      if (intent.kind === "play") next = "witness";
      break;
    case "witness":
      if (intent.kind === "witness" && !intent.enemy) next = "graft";
      break;
    case "graft":
      if (intent.kind === "graft") next = "gaze";
      break;
    case "gaze":
      if (intent.kind === "witness" && intent.enemy) next = "stance";
      break;
    case "stance":
      if (intent.kind === "stance") next = "rite";
      break;
    case "rite":
      if (intent.kind === "rite") next = "law";
      break;
    case "law":
      if (intent.kind === "witness" && !intent.enemy) next = "resolve";
      break;
    case "resolve":
      if (intent.kind === "pass") next = "done";
      break;
  }

  if (!next) return false;
  state.tutorialStep = next;
  if (SCENE_STEPS.has(next)) {
    setupTutorialScene(state, next);
    return true;
  }
  return false;
}

export function tutorialSelectHandIndex(state: MatchState): number | null {
  const id = tutorialTeachCard(state.tutorialStep);
  if (!id) return null;
  const i = state.hand.indexOf(id);
  return i >= 0 ? i : null;
}

/** Preferred UI mode for gated lessons. */
export function tutorialUiMode(step: TutorialStep): "play" | "witness" | "stance" | null {
  switch (step) {
    case "witness":
    case "gaze":
    case "law":
      return "witness";
    case "stance":
      return "stance";
    case "play":
    case "site":
    case "graft":
    case "rite":
      return "play";
    default:
      return null;
  }
}

export function tutorialAltitudeFocus(step: TutorialStep): Altitude | null {
  switch (step) {
    case "play":
    case "site":
    case "witness":
    case "graft":
    case "stance":
    case "rite":
    case "law":
      return 1;
    case "gaze":
      return 0;
    default:
      return null;
  }
}
