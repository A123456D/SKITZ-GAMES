import type { Altitude, BoardUnit, Intent, MatchState, TutorialStep } from "./types";

/**
 * First Gaze: each action has a follow-up "see" beat so players read the board
 * before the next tap (do → see → do → see …).
 */
export const TUTORIAL_LESSONS: Exclude<TutorialStep, "done">[] = [
  "intro",
  "read",
  "play",
  "see_play",
  "site",
  "see_site",
  "witness",
  "see_witness",
  "graft",
  "see_graft",
  "gaze",
  "see_gaze",
  "stance",
  "see_stance",
  "rite",
  "see_rite",
  "law",
  "see_law",
];

const SOFT_PASS_STEPS = new Set<TutorialStep>([
  "intro",
  "read",
  "see_play",
  "see_site",
  "see_witness",
  "see_graft",
  "see_gaze",
  "see_stance",
  "see_rite",
  "see_law",
]);

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

/** Coach copy — explain before the tap, then explain what changed after. */
export function tutorialCoach(step: TutorialStep): TutorialCoach | null {
  const n = lessonIndex(step);
  const total = TUTORIAL_LESSONS.length;
  const tag = `${n}/${total}`;
  switch (step) {
    case "intro":
      return {
        title: `The idea · ${tag}`,
        body: "In OCULUM, cards start Veiled (half-real, usually weaker). Spending Sight to Witness them makes them real — bigger power, plus a one-time Revelation bonus. You win by draining Will, or by Eclipse (5).",
        action: "Next",
        cta: "Got it",
      };
    case "read":
      return {
        title: `Card numbers · ${tag}`,
        body: "Hold Cliff Seeker if you want. Essence = cost to play. Witness cost = Sight to make it real. Veiled power / Witnessed power = combat before and after Witness. Witnessed is a state — not just the bigger number.",
        action: "Hold optional · then continue",
        cta: "Got it",
      };
    case "play":
      return {
        title: `Play a Figure · ${tag}`,
        body: "Three lanes: HIGH (winners deal +1 damage), MID (normal), LOW (Veiled figures +1 power). You're going to spend Essence and put Cliff Seeker on MID — still Veiled.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_play":
      return {
        title: `What just happened · ${tag}`,
        body: "Look at MID: Cliff Seeker is on the board, Veiled (misty). Check ESS — you spent Essence. Power chip is the Veiled number. Nothing is fully real yet.",
        action: "Look at MID · then continue",
        cta: "Got it",
      };
    case "site":
      return {
        title: `Play a Site · ${tag}`,
        body: "Sites are landmarks, not fighters. Veil Banner will sit on MID and give +1 power to your Veiled figure there. Watch the power chip after.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_site":
      return {
        title: `What just happened · ${tag}`,
        body: "The seal on MID is Veil Banner. Cliff Seeker is still Veiled, so Banner's +1 applies — power should be higher than before. Sites don't fight; they change the lane.",
        action: "Check the power chip · continue",
        cta: "Got it",
      };
    case "witness":
      return {
        title: `Witness your card · ${tag}`,
        body: "Now spend Sight to Witness Cliff Seeker. It becomes real: uses Witnessed power, fires Revelation (Cliff Seeker gains Sight), and loses the Banner's Veiled-only bonus.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_witness":
      return {
        title: `What just happened · ${tag}`,
        body: "Mist is gone — Witnessed. Check SIGHT (you paid). Power changed to the Witnessed number. Revelation already fired (+Sight). Banner no longer buffs this figure.",
        action: "Compare power & Sight · continue",
        cta: "Got it",
      };
    case "graft":
      return {
        title: `Graft a Relic · ${tag}`,
        body: "Relics attach to a Figure you control. Ace of Hollows will graft onto Cliff Seeker and add power while Witnessed. Watch for a charm seal on the figure.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_graft":
      return {
        title: `What just happened · ${tag}`,
        body: "Ace is attached (small seal on Cliff Seeker). Power went up again. Grafts ride with the host — they're not a separate lane fighter.",
        action: "Find the charm seal · continue",
        cta: "Got it",
      };
    case "gaze":
      return {
        title: `Gaze (enemy Witness) · ${tag}`,
        body: "Gaze = Witness their Veiled card to steal its Revelation. Ring Gaze (your landmark) is on HIGH with an enemy Cliff Seeker. Same Witness action — their lane.",
        action: "Tap glowing HIGH",
        cta: null,
      };
    case "see_gaze":
      return {
        title: `What just happened · ${tag}`,
        body: "You Witnessed their card. You got the Revelation bonus, not them. Gaze needs a Gaze landmark on that lane — without it, you can only Witness your own cards.",
        action: "Remember: Gaze steals · continue",
        cta: "Got it",
      };
    case "stance":
      return {
        title: `Stance flip · ${tag}`,
        body: "Third Face (sigil) lets you swap a figure's Veiled and Witnessed power numbers once per turn. Useful if you want the bigger number while still Veiled.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_stance":
      return {
        title: `What just happened · ${tag}`,
        body: "The A/B chip flipped. Powers swapped. You can flip back next turn (once per turn). Stance is optional tech — not required every game.",
        action: "Note the A/B chip · continue",
        cta: "Got it",
      };
    case "rite":
      return {
        title: `Rite · Blind · ${tag}`,
        body: "Rites Blind a lane for the turn — that lane won't give Sight income. Starving Sight helps you push Eclipse (win if they end turns at 0 Sight).",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_rite":
      return {
        title: `What just happened · ${tag}`,
        body: "MID is Blinded this turn. Use Rites to cut their Sight engine, then pressure Eclipse — or just win on Will damage at Resolve.",
        action: "Blind = no Sight here · continue",
        cta: "Got it",
      };
    case "law":
      return {
        title: `Law setup · ${tag}`,
        body: "Unblinking Law: Witness 3 different schools in one turn, then Pass for Eclipse. You already have Cube + Deal progress — Witness Inkdrip (Hollow) on MID to finish the set.",
        action: "Tap glowing MID",
        cta: null,
      };
    case "see_law":
      return {
        title: `First Gaze complete · ${tag}`,
        body: "Law track would be ready after Pass in a real game. You now know: play Veiled → Sites help → Witness to reveal → Gaze steals → Resolve hits Will. Free play starts next — try Enter the Gaze anytime.",
        action: "Finish tutorial",
        cta: "Play free",
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
    case "see_play":
    case "see_site":
    case "see_witness":
    case "see_graft":
    case "see_gaze":
    case "see_stance":
    case "see_rite":
    case "see_law":
      // Keep board as-is; clear hand noise so focus stays on the lane.
      state.hand = [];
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
      if (intent.kind === "play") next = "see_play";
      break;
    case "see_play":
      if (intent.kind === "pass") next = "site";
      break;
    case "site":
      if (intent.kind === "play") next = "see_site";
      break;
    case "see_site":
      if (intent.kind === "pass") next = "witness";
      break;
    case "witness":
      if (intent.kind === "witness" && !intent.enemy) next = "see_witness";
      break;
    case "see_witness":
      if (intent.kind === "pass") next = "graft";
      break;
    case "graft":
      if (intent.kind === "graft") next = "see_graft";
      break;
    case "see_graft":
      if (intent.kind === "pass") next = "gaze";
      break;
    case "gaze":
      if (intent.kind === "witness" && intent.enemy) next = "see_gaze";
      break;
    case "see_gaze":
      if (intent.kind === "pass") next = "stance";
      break;
    case "stance":
      if (intent.kind === "stance") next = "see_stance";
      break;
    case "see_stance":
      if (intent.kind === "pass") next = "rite";
      break;
    case "rite":
      if (intent.kind === "rite") next = "see_rite";
      break;
    case "see_rite":
      if (intent.kind === "pass") next = "law";
      break;
    case "law":
      if (intent.kind === "witness" && !intent.enemy) next = "see_law";
      break;
    case "see_law":
      if (intent.kind === "pass") next = "done";
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
