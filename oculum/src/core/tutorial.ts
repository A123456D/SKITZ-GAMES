import type { Altitude, Intent, MatchState, TutorialStep } from "./types";
import { START_WILL, TUTORIAL_ENEMY_WILL } from "./types";

/**
 * First Gaze — card anatomy → HUD resources → guided Ink match.
 * Soft CTA steps advance via Begin/Next (soft pass). Action steps use real intents.
 */
export const TUTORIAL_LESSONS: Exclude<TutorialStep, "done">[] = [
  "intro",
  "card_essence",
  "card_sight",
  "card_power",
  "hud_will",
  "hud_sight",
  "hud_eclipse",
  "hud_lanes",
  "play",
  "pass1",
  "witness",
  "graft",
  "pass2",
];

const SOFT_PASS_STEPS = new Set<TutorialStep>([
  "intro",
  "card_essence",
  "card_sight",
  "card_power",
  "hud_will",
  "hud_sight",
  "hud_eclipse",
  "hud_lanes",
]);

const ACTION_STEPS = new Set<TutorialStep>(["play", "pass1", "witness", "graft", "pass2"]);

function lessonIndex(step: TutorialStep): number {
  const i = TUTORIAL_LESSONS.indexOf(step as Exclude<TutorialStep, "done">);
  return i < 0 ? TUTORIAL_LESSONS.length : i + 1;
}

function nextLesson(step: TutorialStep): TutorialStep {
  const i = TUTORIAL_LESSONS.indexOf(step as Exclude<TutorialStep, "done">);
  if (i < 0 || i >= TUTORIAL_LESSONS.length - 1) return "done";
  return TUTORIAL_LESSONS[i + 1];
}

export function isTutorialSoftPass(step: TutorialStep): boolean {
  return SOFT_PASS_STEPS.has(step);
}

export type TutorialCoach = {
  title: string;
  body: string;
  action: string;
  cta: string | null;
};

/** Where the arrow / ring should point for this beat. */
export type TutorTarget =
  | { kind: "none" }
  | { kind: "dom"; sel: string }
  | { kind: "card"; anchor: "essence" | "witness" | "power" };

/** Percentage anchors on a 2:3 full-face card (finished or procedural). */
export const CARD_ANCHORS: Record<"essence" | "witness" | "power", { x: number; y: number }> = {
  essence: { x: 0.12, y: 0.08 },
  witness: { x: 0.88, y: 0.08 },
  power: { x: 0.5, y: 0.78 },
};

export function tutorialShowsCard(step: TutorialStep): boolean {
  return step === "card_essence" || step === "card_sight" || step === "card_power";
}

export function tutorialTarget(step: TutorialStep): TutorTarget {
  switch (step) {
    case "card_essence":
      return { kind: "card", anchor: "essence" };
    case "card_sight":
      return { kind: "card", anchor: "witness" };
    case "card_power":
      return { kind: "card", anchor: "power" };
    case "hud_will":
      return { kind: "dom", sel: "#willrow" };
    case "hud_sight":
      return { kind: "dom", sel: "#meters .meter.sight" };
    case "hud_eclipse":
      return { kind: "dom", sel: "#willrow .ecl-pip" };
    case "hud_lanes":
      return { kind: "dom", sel: "#altitudes" };
    case "play":
    case "witness":
      return { kind: "dom", sel: '.alt-hit[data-alt="1"]' };
    case "graft":
      return { kind: "dom", sel: '.alt-hit[data-alt="2"]' };
    case "pass1":
    case "pass2":
      return { kind: "dom", sel: "#btn-pass" };
    default:
      return { kind: "none" };
  }
}

export function tutorialCoach(step: TutorialStep): TutorialCoach | null {
  const n = lessonIndex(step);
  const total = TUTORIAL_LESSONS.length;
  const tag = `${n}/${total}`;
  switch (step) {
    case "intro":
      return {
        title: `First Gaze · ${tag}`,
        body: "Things only fully exist when Witnessed. We'll read a card, learn the meters, then play a real short match.",
        action: "Start with the card",
        cta: "Begin",
      };
    case "card_essence":
      return {
        title: `Card · Essence · ${tag}`,
        body: "Gold pip (top-left) is Essence — the cost to play this card from hand. Blot Herald costs 2 Essence.",
        action: "Look at the gold pip",
        cta: "Next",
      };
    case "card_sight":
      return {
        title: `Card · Witness cost · ${tag}`,
        body: "Teal pip (top-right) is Witness cost — Sight you spend to make this Figure real. Herald costs 1 Sight to Witness.",
        action: "Look at the teal pip",
        cta: "Next",
      };
    case "card_power":
      return {
        title: `Card · Power · ${tag}`,
        body: "Rules open with Veiled power / Witnessed power. Herald is 2 while Veiled, 3 once Witnessed. Veiled = half-real; Witnessed = fully real.",
        action: "Find Veiled / Witnessed",
        cta: "Next",
      };
    case "hud_will":
      return {
        title: `Will · ${tag}`,
        body: "Will is your life. Both sides start at 40. Soft Resolve damage chips it. Hit 0 and you lose by Break — the main win path.",
        action: "Look at the Will bars",
        cta: "Next",
      };
    case "hud_sight":
      return {
        title: `Sight · ${tag}`,
        body: "Sight fuels Witness and Gaze. You gain Sight from the board each turn (lanes not Blind). Spend it to make figures real — or Gaze an enemy Veiled card to steal their Revelation.",
        action: "Look at Sight",
        cta: "Next",
      };
    case "hud_eclipse":
      return {
        title: `Eclipse · ${tag}`,
        body: "Eclipse is the alt win. Motley banks it with Trick seals and payoffs. Reach 10 Eclipse and you Ascend without Breaking Will.",
        action: "Look at ECL",
        cta: "Next",
      };
    case "hud_lanes":
      return {
        title: `Three altitudes · ${tag}`,
        body: "HIGH: Gaze costs −1 Sight, winners deal +1. MID: Witness your own figure to draw 1. LOW: Veiled +1 power, but Witness/Gaze cost +1 Sight.",
        action: "Scan HIGH · MID · LOW",
        cta: "Play the match",
      };
    case "play":
      return {
        title: `Play Veiled · ${tag}`,
        body: "Figures enter Veiled. Put Blot Herald on MID. Ink Stains enemies so Veil won't Hold forever.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "pass1":
      return {
        title: `Pass → Resolve · ${tag}`,
        body: "Pass ends your window. When both Pass, lanes Resolve: higher power chips Will. Veiled losers Hold; Witnessed losers Fall.",
        action: "Tap Pass",
        cta: null,
      };
    case "witness":
      return {
        title: `Witness · ${tag}`,
        body: "Spend Sight on your MID figure. Herald becomes real, Revelation fires (Stain + Sight), and MID draws you a card.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "graft":
      return {
        title: `Pack a lane · ${tag}`,
        body: "Play Well Cantor on LOW. Ink figures team up — ally Holds help Stain the Cantor's lane.",
        action: "Tap glowing LOW",
        cta: null,
      };
    case "pass2":
      return {
        title: `Break them · ${tag}`,
        body: "Pass again. Resolve should Break their Will. Loop: Play Veiled → Witness → Pass → Resolve. Essence pays plays; Sight pays Witness.",
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
      return "blot_herald";
    case "graft":
      return "well_cantor";
    case "card_essence":
    case "card_sight":
    case "card_power":
      return "blot_herald";
    default:
      return null;
  }
}

export function syncTutorialHand(state: MatchState): void {
  switch (state.tutorialStep) {
    case "intro":
    case "card_essence":
    case "card_sight":
    case "card_power":
    case "hud_will":
    case "hud_sight":
    case "hud_eclipse":
    case "hud_lanes":
    case "play":
      state.hand = ["blot_herald"];
      break;
    case "graft":
      state.hand = ["well_cantor"];
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

export function setupTutorial(state: MatchState): void {
  state.tutorial = true;
  state.tutorialStep = "intro";
  state.enemyWill = TUTORIAL_ENEMY_WILL;
  state.will = START_WILL;
  syncTutorialHand(state);
  state.essence = Math.max(state.essence, 5);
  state.sight = Math.max(state.sight, 2);
  state.enemyHand = ["pale_ledger", "smother_bride"];
  state.enemyEssence = 0;
  state.enemySight = 1;
  state.enemyDeck = [
    "blot_herald",
    "well_cantor",
    "mire_duelist",
    "pale_ledger",
    "smother_bride",
    "blot_herald",
  ];
  state.prophecies = [];
  state.enemyProphecies = [];
  state.witnessedHeresiesThisTurn = [];
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
  if (state.active !== "player") return intents;
  if (SOFT_PASS_STEPS.has(state.tutorialStep)) {
    return intents.filter((i) => i.kind === "pass");
  }
  switch (state.tutorialStep) {
    case "play":
      return intents.filter(
        (i) =>
          i.kind === "play" &&
          state.hand[i.handIndex] === "blot_herald" &&
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
          i.kind === "play" &&
          state.hand[i.handIndex] === "well_cantor" &&
          i.altitude === 2,
      );
    default:
      return intents;
  }
}

export function advanceTutorial(state: MatchState, intent: Intent): boolean {
  if (!state.tutorial || state.tutorialStep === "done") return false;
  const prev = state.tutorialStep;
  let next: TutorialStep | null = null;

  if (SOFT_PASS_STEPS.has(prev)) {
    if (intent.kind === "pass") next = nextLesson(prev);
  } else if (ACTION_STEPS.has(prev)) {
    switch (prev) {
      case "play":
        if (intent.kind === "play") next = nextLesson(prev);
        break;
      case "pass1":
      case "pass2":
        if (intent.kind === "pass") next = nextLesson(prev);
        break;
      case "witness":
        if (intent.kind === "witness" && !intent.enemy) next = nextLesson(prev);
        break;
      case "graft":
        if (intent.kind === "play") next = nextLesson(prev);
        break;
    }
  }

  if (!next) return false;
  state.tutorialStep = next;
  if (next !== "done") syncTutorialHand(state);
  return next !== "done";
}

export function tutorialSelectHandIndex(state: MatchState): number | null {
  if (!ACTION_STEPS.has(state.tutorialStep)) return null;
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
    case "graft":
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
    case "witness":
      return 1;
    case "graft":
      return 2;
    default:
      return null;
  }
}

export function chooseTutorialEnemyMove(state: MatchState, legal: Intent[]): Intent {
  if (legal.length === 0) return { kind: "pass" };
  const lowEmpty = !state.altitudes[2].enemy;
  const plays = legal.filter((i) => i.kind === "play" && i.altitude === 2 && lowEmpty);
  if (plays.length && state.enemyEssence > 0 && Math.random() < 0.45) {
    return plays[0];
  }
  const pass = legal.find((i) => i.kind === "pass");
  return pass ?? legal[0];
}
