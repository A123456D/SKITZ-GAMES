import type { Altitude, BoardUnit, Intent, MatchState, TutorialStep } from "./types";

/** Ordered First Gaze lessons (excluding `done`). */
export const TUTORIAL_LESSONS: Exclude<TutorialStep, "done">[] = [
  "intro",
  "read",
  "play",
  "site",
  "witness",
  "graft",
  "gaze",
  "stance",
  "rite",
  "law",
];

const SOFT_PASS_STEPS = new Set<TutorialStep>(["intro", "read"]);
/** Full board rebuild when entering these steps. */
const SCENE_STEPS = new Set<TutorialStep>(["intro", "read", "play", "gaze", "stance", "rite", "law"]);

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

export type TutorialCoach = {
  title: string;
  body: string;
  action: string;
  /** Soft-step button label; null for action lessons. */
  cta: string | null;
};

/** Full coach panel copy — short, action-first for mobile. */
export function tutorialCoach(step: TutorialStep): TutorialCoach | null {
  const n = lessonIndex(step);
  const total = TUTORIAL_LESSONS.length;
  const tag = `${n}/${total}`;
  switch (step) {
    case "intro":
      return {
        title: `The Gaze · ${tag}`,
        body: "Cards enter Veiled (half-real). Spend Sight to Witness them — they become real and hit harder. Win by draining Will, or by Eclipse (5).",
        action: "Next — read a card",
        cta: "Got it",
      };
    case "read":
      return {
        title: `Read a card · ${tag}`,
        body: "Cliff Seeker: Essence to play · Sight to Witness · Veiled power / Witnessed power. Hold the card to inspect.",
        action: "Hold card optional · then Got it",
        cta: "Got it",
      };
    case "play":
      return {
        title: `Play · ${tag}`,
        body: "Spend Essence to play a Figure Veiled into a lane. HIGH / MID / LOW are altitudes.",
        action: "Tap MID",
        cta: null,
      };
    case "site":
      return {
        title: `Site · ${tag}`,
        body: "Sites are landmarks. Veil Banner gives +1 to your Veiled figures here.",
        action: "Tap MID",
        cta: null,
      };
    case "witness":
      return {
        title: `Witness · ${tag}`,
        body: "Spend Sight to make Cliff Seeker real. It fires a Revelation and uses Witnessed power.",
        action: "Tap MID",
        cta: null,
      };
    case "graft":
      return {
        title: `Graft · ${tag}`,
        body: "Relics attach to Figures. Ace of Hollows boosts a Witnessed host.",
        action: "Tap MID",
        cta: null,
      };
    case "gaze":
      return {
        title: `Gaze · ${tag}`,
        body: "With Ring Gaze, Witness an enemy's Veiled card and steal its Revelation.",
        action: "Tap HIGH",
        cta: null,
      };
    case "stance":
      return {
        title: `Stance · ${tag}`,
        body: "Third Face lets you flip A/B powers once per turn.",
        action: "Tap MID",
        cta: null,
      };
    case "rite":
      return {
        title: `Rite · ${tag}`,
        body: "Rites Blind a lane — no Sight income there. Starve Sight to push Eclipse.",
        action: "Tap MID",
        cta: null,
      };
    case "law":
      return {
        title: `Law · ${tag}`,
        body: "Unblinking Law: Witness 3 schools in one turn, then Pass for Eclipse. Finish by Witnessing Inkdrip.",
        action: "Tap MID",
        cta: null,
      };
    default:
      return null;
  }
}

/** Short toast line (secondary to coach). */
export function tutorialHint(step: TutorialStep): string {
  const c = tutorialCoach(step);
  if (!c) return "Select a card — or Witness / Stance / Pass.";
  return c.action;
}

export function tutorialTeachCard(step: TutorialStep): string | null {
  switch (step) {
    case "read":
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

/** Trim hand when continuing a board between linked lessons. */
function applyHandForStep(state: MatchState, step: TutorialStep): void {
  switch (step) {
    case "site":
      state.hand = ["veil_banner"];
      state.essence = Math.max(state.essence, 2);
      break;
    case "witness":
      state.hand = [];
      state.sight = Math.max(state.sight, 2);
      break;
    case "graft":
      state.hand = ["ace_of_hollows"];
      break;
    default:
      break;
  }
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
    case "intro": {
      state.hand = [];
      state.essence = 0;
      state.sight = 3;
      break;
    }
    case "read": {
      state.hand = ["cliff_seeker"];
      state.essence = 5;
      state.sight = 4;
      break;
    }
    case "play": {
      state.hand = ["cliff_seeker"];
      state.essence = 5;
      state.sight = 4;
      break;
    }
    case "gaze": {
      state.hand = [];
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
    default:
      break;
  }
}

export function filterTutorialIntents(state: MatchState, intents: Intent[]): Intent[] {
  if (!state.tutorial || state.tutorialStep === "done") return intents;
  switch (state.tutorialStep) {
    case "intro":
    case "read":
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

export function advanceTutorial(state: MatchState, intent: Intent): boolean {
  if (!state.tutorial || state.tutorialStep === "done") return false;
  const prev = state.tutorialStep;
  let next: TutorialStep | null = null;

  switch (prev) {
    case "intro":
      if (intent.kind === "pass") next = "read";
      break;
    case "read":
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
      if (intent.kind === "witness" && !intent.enemy) next = "done";
      break;
  }

  if (!next) return false;
  state.tutorialStep = next;
  if (next === "done") return false;
  if (SCENE_STEPS.has(next)) {
    setupTutorialScene(state, next);
    return true;
  }
  applyHandForStep(state, next);
  return true;
}

export function tutorialSelectHandIndex(state: MatchState): number | null {
  const id = tutorialTeachCard(state.tutorialStep);
  if (!id) return null;
  const i = state.hand.indexOf(id);
  return i >= 0 ? i : null;
}

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
