import type { Altitude, Intent, MatchState, TutorialStep } from "./types";
import { TUTORIAL_ENEMY_WILL } from "./types";

/**
 * First Gaze: a short real match with coach gates.
 * Play → Site → Pass/Resolve → Witness → Graft → Pass/Resolve (Break) → free if needed.
 */
export const TUTORIAL_LESSONS: Exclude<TutorialStep, "done">[] = [
  "intro",
  "play",
  "site",
  "pass1",
  "witness",
  "graft",
  "pass2",
];

const SOFT_PASS_STEPS = new Set<TutorialStep>(["intro"]);

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

export function tutorialCoach(step: TutorialStep): TutorialCoach | null {
  const n = lessonIndex(step);
  const total = TUTORIAL_LESSONS.length;
  const tag = `${n}/${total}`;
  switch (step) {
    case "intro":
      return {
        title: `First Gaze · ${tag}`,
        body: "Real match. Cards start Veiled. Witness them to make them real and stronger. Drain foe Will to win.",
        action: "Begin the match",
        cta: "Begin",
      };
    case "play":
      return {
        title: `Play a Figure · ${tag}`,
        body: "Three lanes: HIGH · MID · LOW. Spend Essence — Cliff Seeker enters Veiled.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "site":
      return {
        title: `Play a Site · ${tag}`,
        body: "Sites are landmarks. Veil Banner gives +1 power to your Veiled figure here.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "pass1":
      return {
        title: `Pass · Resolve · ${tag}`,
        body: "Pass to end your window. When both Pass, lanes Resolve — higher power hits Will.",
        action: "Tap Pass",
        cta: null,
      };
    case "witness":
      return {
        title: `Witness · ${tag}`,
        body: "Spend Sight on MID. Cliff Seeker becomes real, power jumps, Revelation fires.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "graft":
      return {
        title: `Graft a Relic · ${tag}`,
        body: "Relics attach to your Figure. Ace grafts onto Cliff Seeker for extra power.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "pass2":
      return {
        title: `Finish them · ${tag}`,
        body: "Pass again. Resolve should Break their Will. Loop: play → Site → Witness → Graft → Pass.",
        action: "Tap Pass",
        cta: null,
      };
    default:
      return null;
  }
}

export function tutorialHint(step: TutorialStep): string {
  const c = tutorialCoach(step);
  if (!c) return "Select a card — or Witness / Stance / Pass.";
  return c.action;
}

export function tutorialTeachCard(step: TutorialStep): string | null {
  switch (step) {
    case "play":
      return "cliff_seeker";
    case "site":
      return "veil_banner";
    case "graft":
      return "ace_of_hollows";
    default:
      return null;
  }
}

/** One teach card (or empty) — no extra hand clutter on mobile. */
export function syncTutorialHand(state: MatchState): void {
  switch (state.tutorialStep) {
    case "intro":
    case "play":
      state.hand = ["cliff_seeker"];
      break;
    case "site":
      state.hand = ["veil_banner"];
      break;
    case "graft":
      state.hand = ["ace_of_hollows"];
      break;
    case "pass1":
    case "witness":
    case "pass2":
      state.hand = [];
      break;
    default:
      break;
  }
}

/** Opening board for a real guided match (after beginTurn). */
export function setupTutorial(state: MatchState): void {
  state.tutorial = true;
  state.tutorialStep = "intro";
  state.enemyWill = TUTORIAL_ENEMY_WILL;
  state.will = 20;
  syncTutorialHand(state);
  state.essence = Math.max(state.essence, 3);
  state.sight = Math.max(state.sight, 2);
  state.enemyHand = ["hatline_trickster", "stake_field_pilgrim"];
  state.enemyEssence = 0;
  state.enemySight = 1;
  state.enemyDeck = [
    "root_chassis",
    "hole_choir",
    "coral_crown",
    "inkdrip_acolyte",
    "mire_debtor",
    "veil_banner",
  ];
  state.prophecies = [];
  state.enemyProphecies = [];
  state.witnessedSchoolsThisTurn = [];
  for (const slot of state.altitudes) {
    slot.player = null;
    slot.enemy = null;
    slot.playerSite = null;
    slot.enemySite = null;
    slot.blinded = false;
  }
}

export function filterTutorialIntents(state: MatchState, intents: Intent[]): Intent[] {
  if (!state.tutorial || state.tutorialStep === "done") return intents;
  // Never gate the foe — they use the scripted AI path instead.
  if (state.active !== "player") return intents;
  if (SOFT_PASS_STEPS.has(state.tutorialStep)) {
    return intents.filter((i) => i.kind === "pass");
  }
  switch (state.tutorialStep) {
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
    case "pass1":
    case "pass2":
      return intents.filter((i) => i.kind === "pass");
    case "witness":
      return intents.filter((i) => i.kind === "witness" && i.altitude === 1 && !i.enemy);
    case "graft":
      return intents.filter(
        (i) =>
          i.kind === "graft" &&
          state.hand[i.handIndex] === "ace_of_hollows" &&
          i.altitude === 1,
      );
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
      if (intent.kind === "pass") next = "play";
      break;
    case "play":
      if (intent.kind === "play") next = "site";
      break;
    case "site":
      if (intent.kind === "play") next = "pass1";
      break;
    case "pass1":
      if (intent.kind === "pass") next = "witness";
      break;
    case "witness":
      if (intent.kind === "witness" && !intent.enemy) next = "graft";
      break;
    case "graft":
      if (intent.kind === "graft") next = "pass2";
      break;
    case "pass2":
      if (intent.kind === "pass") next = "done";
      break;
  }

  if (!next) return false;
  state.tutorialStep = next;
  if (next !== "done") syncTutorialHand(state);
  return next !== "done";
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
      return "witness";
    case "play":
    case "site":
    case "graft":
      return "play";
    case "pass1":
    case "pass2":
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
      return 1;
    default:
      return null;
  }
}

/** Scripted foe during First Gaze — pass-heavy, never contests MID. */
export function chooseTutorialEnemyMove(state: MatchState, legal: Intent[]): Intent {
  if (legal.length === 0) return { kind: "pass" };
  // Prefer a cheap veiled figure on LOW if empty, otherwise pass.
  const lowEmpty = !state.altitudes[2].enemy;
  const plays = legal.filter(
    (i) => i.kind === "play" && i.altitude === 2 && lowEmpty,
  );
  if (plays.length && state.enemyEssence > 0 && Math.random() < 0.45) {
    return plays[0];
  }
  const pass = legal.find((i) => i.kind === "pass");
  return pass ?? legal[0];
}
