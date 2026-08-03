import type { Altitude, BoardUnit, Intent, MatchState, TutorialStep } from "./types";

/** Ordered First Gaze lessons (excluding `done`). */
export const TUTORIAL_LESSONS: Exclude<TutorialStep, "done">[] = [
  "intro",
  "goal",
  "read",
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

const SOFT_PASS_STEPS = new Set<TutorialStep>(["intro", "goal", "read"]);
const SCENE_STEPS = new Set<TutorialStep>(["read", "play", "gaze", "stance", "rite", "law", "resolve"]);

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
};

/** Full coach panel copy — designed to teach the game, not just the button. */
export function tutorialCoach(step: TutorialStep): TutorialCoach | null {
  const n = lessonIndex(step);
  const total = TUTORIAL_LESSONS.length;
  const tag = `${n}/${total}`;
  switch (step) {
    case "intro":
      return {
        title: `The Gaze · ${tag}`,
        body: "OCULUM's world: things only fully exist when Witnessed. Cards enter Veiled (half-real, weaker). Spend Sight to Witness them — they become real, fire a one-time Revelation, and usually hit harder.",
        action: "Pass = Got it",
      };
    case "goal":
      return {
        title: `How you win · ${tag}`,
        body: "Break: reduce enemy Will to 0. Eclipse: if they end a turn at 0 Sight, you gain Eclipse — 5 Eclipse wins. Or after 10 rounds, highest Will wins. Essence plays cards; Sight Witnesses.",
        action: "Pass = Next — read a card",
      };
    case "read":
      return {
        title: `Read a card · ${tag}`,
        body: "Cliff Seeker face: Essence 1 — pay to play. Witness cost 1 Sight — pay to make it Witnessed (real). Veiled power 1 — combat while half-real. Witnessed power 2 — combat once Witnessed. Tap the card, then Got it.",
        action: "Tap Cliff Seeker → Got it",
      };
    case "play":
      return {
        title: `Altitudes · ${tag}`,
        body: "Three lanes: HIGH (extra Sight & damage), MID (default), LOW (Veiled figures stronger). Spend Essence to play a Figure Veiled into a lane. Drag or tap Cliff Seeker onto MID.",
        action: "Play Cliff Seeker → MID",
      };
    case "site":
      return {
        title: `Sites combo · ${tag}`,
        body: "Sites are landmarks on a lane (not Figures). Veil Banner: your Veiled figures on that lane get +1 power. Combo: Banner + Veiled Cliff Seeker. Play Veil Banner on MID.",
        action: "Play Veil Banner → MID",
      };
    case "witness":
      return {
        title: `Witness · ${tag}`,
        body: "This is the core verb. Tap Witness, then MID. You spend Sight; Cliff Seeker becomes real, fires Revelation, and uses witnessed power. Banner only buffs Veiled — so after Witness the Banner bonus drops.",
        action: "Witness → MID",
      };
    case "graft":
      return {
        title: `Graft combo · ${tag}`,
        body: "Relics graft onto Figures. Ace of Hollows: +1 power while the host is Witnessed, and draw when they Witness. Tap Ace, then MID (your Figure).",
        action: "Graft Ace → MID",
      };
    case "gaze":
      return {
        title: `Gaze · ${tag}`,
        body: "Gaze lets you Witness an enemy's Veiled card and steal its Revelation. You need a Gaze landmark (Ring Gaze here on HIGH). Tap Witness, then HIGH on their card.",
        action: "Witness (Gaze) → HIGH",
      };
    case "stance":
      return {
        title: `Stance · ${tag}`,
        body: "Third Face (sigil) lets you flip a Figure between Stance A (printed powers) and B (swapped veiled/witnessed powers) once per turn. Tap Stance, then MID.",
        action: "Stance → MID",
      };
    case "rite":
      return {
        title: `Rites · ${tag}`,
        body: "Rites Blind a lane for the turn — no Sight income from there. Starve their Sight to push Eclipse. Tap Pale Silence, then MID.",
        action: "Rite → MID",
      };
    case "law":
      return {
        title: `Law · ${tag}`,
        body: "Unblinking Law (prophecy): Witness 3 different schools in one turn, then Pass for Eclipse. You've got Cube + Deal already — Witness Inkdrip (Hollow) on MID.",
        action: "Witness → MID",
      };
    case "resolve":
      return {
        title: `Resolve · ${tag}`,
        body: "Pass ends your window (Law can fire now). When both players Pass, each lane compares power — winners deal Will damage (HIGH winners deal +1). Then free play begins.",
        action: "Pass to finish lesson",
      };
    default:
      return null;
  }
}

/** Short toast line (secondary to coach). */
export function tutorialHint(step: TutorialStep): string {
  const c = tutorialCoach(step);
  if (!c) return "Select a card — or Witness / Stance / Pass.";
  return `${c.title}: ${c.action}`;
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
    case "read": {
      state.hand = ["cliff_seeker"];
      state.essence = 5;
      state.sight = 4;
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
    case "read":
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

export function advanceTutorial(state: MatchState, intent: Intent): boolean {
  if (!state.tutorial || state.tutorialStep === "done") return false;
  const prev = state.tutorialStep;
  let next: TutorialStep | null = null;

  switch (prev) {
    case "intro":
      if (intent.kind === "pass") next = "goal";
      break;
    case "goal":
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
