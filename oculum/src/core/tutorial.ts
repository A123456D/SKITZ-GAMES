import type { Altitude, BoardUnit, Intent, MatchState, Side, TutorialStep } from "./types";
import { START_WILL } from "./types";
import { teachDeckForHeresy, getCard } from "./cards";
import { findLessonByStep, getCurriculum, isCraftTutorialId } from "./tutorial/registry";
import type { TutorialId } from "./tutorial/types";

export type { TutorialId } from "./tutorial/types";
export { TUTORIAL_HUB, CRAFT_CURRICULA, getCurriculum, findLessonByStep } from "./tutorial/registry";

/**
 * First Gaze — anatomy → card types → shared loop → four craft demos → counters.
 * Soft CTA advances; demo steps play short scripted bot beats while the coach narrates.
 * Craft Teach curricula live under `src/core/tutorial/crafts/` (full Gaze + heresy kit).
 */
export const TUTORIAL_LESSONS: string[] = [
  "intro",
  "card_essence",
  "card_sight",
  "card_power",
  "hud_will",
  "hud_sight",
  "hud_eclipse",
  "hud_lanes",
  "types_figure",
  "types_site",
  "types_relic",
  "types_rite",
  "types_vessel",
  "loop_veil",
  "loop_resolve",
  "demo_ink",
  "demo_motley",
  "demo_toll",
  "demo_breach",
  "counter_erase_trick",
  "outro",
];

const SOFT_PASS_STEPS = new Set<string>(TUTORIAL_LESSONS);

export function isKnownTutorialStep(step: TutorialStep): boolean {
  if (step === "done") return true;
  if (SOFT_PASS_STEPS.has(step)) return true;
  return !!findLessonByStep(step);
}

export function isTutorialSoftPass(step: TutorialStep): boolean {
  if (SOFT_PASS_STEPS.has(step)) return true;
  return !!findLessonByStep(step);
}

export function isTutorialDemoStep(step: TutorialStep): boolean {
  const craft = findLessonByStep(step);
  if (craft) return !!(craft.lesson.demoBeats && craft.lesson.demoBeats.length > 0);
  return (
    step === "demo_ink" ||
    step === "demo_motley" ||
    step === "demo_toll" ||
    step === "demo_breach" ||
    step === "counter_erase_trick"
  );
}

function lessonIndex(step: TutorialStep): number {
  const craft = findLessonByStep(step);
  if (craft) return craft.index + 1;
  const i = TUTORIAL_LESSONS.indexOf(step);
  return i < 0 ? TUTORIAL_LESSONS.length : i + 1;
}

function lessonTotal(step: TutorialStep): number {
  const craft = findLessonByStep(step);
  if (craft) return craft.curriculum.lessons.length;
  return TUTORIAL_LESSONS.length;
}

function nextLesson(step: TutorialStep): TutorialStep {
  const craft = findLessonByStep(step);
  if (craft) {
    const next = craft.curriculum.lessons[craft.index + 1];
    return next?.id ?? "done";
  }
  const i = TUTORIAL_LESSONS.indexOf(step);
  if (i < 0 || i >= TUTORIAL_LESSONS.length - 1) return "done";
  return TUTORIAL_LESSONS[i + 1];
}

export type TutorialCoach = {
  title: string;
  body: string;
  action: string;
  cta: string | null;
};

export type TutorTarget =
  | { kind: "none" }
  | { kind: "dom"; sel: string }
  | { kind: "card"; anchor: "essence" | "witness" | "power" };

export const CARD_ANCHORS: Record<"essence" | "witness" | "power", { x: number; y: number }> = {
  essence: { x: 0.12, y: 0.08 },
  witness: { x: 0.88, y: 0.08 },
  /** Live power chip sits on the top-left seal (same spot as Essence pip). */
  power: { x: 0.12, y: 0.08 },
};

export function tutorialShowsCard(step: TutorialStep): boolean {
  const craft = findLessonByStep(step);
  if (craft) return !!craft.lesson.showsCard;
  return (
    step === "card_essence" ||
    step === "card_sight" ||
    step === "card_power" ||
    step === "types_figure" ||
    step === "types_site" ||
    step === "types_relic" ||
    step === "types_rite" ||
    step === "types_vessel"
  );
}

export function tutorialTarget(step: TutorialStep): TutorTarget {
  const craft = findLessonByStep(step);
  if (craft?.lesson.target) return craft.lesson.target;
  switch (step) {
    case "card_essence":
      return { kind: "card", anchor: "essence" };
    case "card_sight":
      return { kind: "card", anchor: "witness" };
    case "card_power":
    case "types_figure":
      return { kind: "card", anchor: "power" };
    case "types_site":
    case "types_relic":
    case "types_rite":
    case "types_vessel":
      return { kind: "card", anchor: "essence" };
    case "hud_will":
      return { kind: "dom", sel: "#willrow" };
    case "hud_sight":
      return { kind: "dom", sel: "#meters .meter.sight" };
    case "hud_eclipse":
      return { kind: "dom", sel: "#willrow .ecl-pip" };
    case "hud_lanes":
    case "loop_veil":
    case "loop_resolve":
    case "demo_ink":
    case "demo_motley":
    case "demo_toll":
    case "demo_breach":
    case "counter_erase_trick":
      return { kind: "dom", sel: "#altitudes" };
    default:
      return { kind: "none" };
  }
}

/** Plain-language caption under the teach card face. */
export function tutorialCardCaption(
  step: TutorialStep,
): { kicker: string; rules: string } | null {
  const craft = findLessonByStep(step);
  if (craft?.lesson.caption) return craft.lesson.caption;
  switch (step) {
    case "types_figure":
      return {
        kicker: "FIGURE · Blot Herald",
        rules:
          "A fighter. Enters Veiled. Costs 2 Essence · Witness 1 Sight. Veiled 2 / Witnessed 3. Revelation: Stain an enemy Veiled Figure (Ink's Mark).",
      };
    case "types_site":
      return {
        kicker: "SITE · Stainwell",
        rules:
          "A landmark — not a fighter. Enters already Witnessed. On play: Stain the enemy Veiled Figure here. Your Figures here hit +1 vs Stained foes. When a Stained foe here is Forced Exposed, gain 1 Sight.",
      };
    case "types_relic":
      return {
        kicker: "RELIC · Smother Cord",
        rules:
          "A Charm you Graft onto your Figure. +1 power while the host is Witnessed. When the host Forced Exposes an enemy, Stain another Veiled foe; on Mid, also gain 1 Sight.",
      };
    case "types_rite":
      return {
        kicker: "RITE · Ashen Tithe",
        rules:
          "A one-shot spell — play it, it resolves, it's gone. Choose a lane: if the foe there is Stained, gain Sight + draw. If also Veiled, Blind that lane and you may Press for free.",
      };
    case "types_vessel":
      return {
        kicker: "VESSEL · Gulf Urn",
        rules:
          "An Urn. Play over your Figure (or tuck from hand) to store an Inhabitant (INH). Revelation can Stain. When it Falls / Forced Exposes: Stain + Blind. Continuity after death.",
      };
    default:
      return null;
  }
}

export function tutorialCoach(step: TutorialStep): TutorialCoach | null {
  const craft = findLessonByStep(step);
  if (craft) {
    const n = craft.index + 1;
    const total = craft.curriculum.lessons.length;
    const tag = `${n}/${total}`;
    const titleBase = craft.lesson.coach.title ?? craft.curriculum.title;
    return {
      title: `${titleBase} · ${tag}`,
      body: craft.lesson.coach.body,
      action: craft.lesson.coach.action,
      cta: craft.lesson.coach.cta,
    };
  }
  const n = lessonIndex(step);
  const total = lessonTotal(step);
  const tag = `${n}/${total}`;
  switch (step) {
    case "intro":
      return {
        title: `First Gaze · ${tag}`,
        body: "Welcome. OCULUM is about looking. Cards enter half-real (Veiled). You spend Sight to Witness them into full power. Watch the board — every badge and toast means something.",
        action: "We'll go slow",
        cta: "Begin",
      };
    case "card_essence":
      return {
        title: `Essence · ${tag}`,
        body: "Gold pip (top-left) = Essence. That is the cost to play a card from your hand. Blot Herald costs 2 Essence.",
        action: "Find the gold pip",
        cta: "Next",
      };
    case "card_sight":
      return {
        title: `Witness cost · ${tag}`,
        body: "Teal pip (top-right) = Witness cost. That is how much Sight you spend to make a Figure fully real. Herald costs 1 Sight.",
        action: "Find the teal pip",
        cta: "Next",
      };
    case "card_power":
      return {
        title: `Power · ${tag}`,
        body: "Each Figure has two powers: Veiled (half-real, safer) and Witnessed (stronger). Herald is 2 Veiled / 3 Witnessed.",
        action: "Find Veiled / Witnessed",
        cta: "Next",
      };
    case "hud_will":
      return {
        title: `Will · ${tag}`,
        body: "Will is life — both seats start at 30. When lanes Resolve, winners chip the loser's Will. Hit 0 and you Break (lose).",
        action: "Look at the Will bars",
        cta: "Next",
      };
    case "hud_sight":
      return {
        title: `Sight · ${tag}`,
        body: "Sight is your looking currency. Spend it to Witness, Gaze, Press, Peal, or ante a Wager. You gain Sight each turn from Sites and Witnessed yields — unless a lane is Blind.",
        action: "Look at Sight",
        cta: "Next",
      };
    case "hud_eclipse":
      return {
        title: `Eclipse · ${tag}`,
        body: "Eclipse is a second win track (Motley loves it). Reach 10 Eclipse to Ascend — you win without Breaking Will.",
        action: "Look at ECL",
        cta: "Next",
      };
    case "hud_lanes":
      return {
        title: `Three lanes · ${tag}`,
        body: "HIGH / MID / LOW each matter differently. HIGH: cheaper Gaze, winners chip +1 Will. MID: Witness your own → draw. LOW: Veiled fighters hit harder; Witness/Gaze refunds Sight.",
        action: "Scan HIGH · MID · LOW",
        cta: "Next",
      };
    case "types_figure":
      return {
        title: `Figures · ${tag}`,
        body: "Figures are fighters. They enter Veiled (half-real). Spend Sight to Witness them — stronger power, and a one-time Revelation. Look at Blot Herald on the card.",
        action: "Read the Figure card",
        cta: "Next",
      };
    case "types_site":
      return {
        title: `Sites · ${tag}`,
        body: "Sites are landmarks, not fighters. They stay Witnessed and change a lane forever (until replaced). Example: Stainwell — Stains the foe here and buffs your Figures vs Stained enemies.",
        action: "Read the Site card",
        cta: "Next",
      };
    case "types_relic":
      return {
        title: `Relics · ${tag}`,
        body: "Relics are Charms. Graft = attach from hand onto your Figure (look for ×N). Example: Smother Cord — +1 while Witnessed, and chains Stain when you Forced Expose.",
        action: "Read the Relic card",
        cta: "Next",
      };
    case "types_rite":
      return {
        title: `Rites · ${tag}`,
        body: "Rites are one-shot spells. Play → effect → gone (they do not sit on the board). Example: Ashen Tithe — punish a Stained foe with Sight, draw, Blind, and a free Press.",
        action: "Read the Rite card",
        cta: "Next",
      };
    case "types_vessel":
      return {
        title: `Urns (Vessels) · ${tag}`,
        body: "Urns tuck a Figure as Inhabitant (INH badge). Play the Urn over your Figure or tuck from hand. Example: Gulf Urn — stores a fighter and can Stain / Blind when it breaks.",
        action: "Read the Vessel card",
        cta: "Next",
      };
    case "loop_veil":
      return {
        title: `Why Veil matters · ${tag}`,
        body: "A Veiled loser Holds — it cannot Fall (die). To kill it you must Forced Expose first (Ink Press/Erase, etc.), or Witness it yourself so it can Fall next loss.",
        action: "VEIL = armor",
        cta: "Next",
      };
    case "loop_resolve":
      return {
        title: `The turn loop · ${tag}`,
        body: "1) Play Veiled  2) Spend Sight (Witness / Gaze / craft buttons)  3) Pass. When both Pass → Resolve: higher power chips Will. Then a new window.",
        action: "Play · Witness · Pass · Resolve",
        cta: "Watch Ink",
      };
    case "demo_ink":
      return {
        title: `Heresy: Ink · ${tag}`,
        body: "Ink Erases. Watch bottom (Ink) vs top (Motley). Toasts and floating labels will name each step — Stain, Press, then Resolve.",
        action: "Tap Watch — follow the labels",
        cta: "Watch",
      };
    case "demo_motley":
      return {
        title: `Heresy: Motley · ${tag}`,
        body: "Motley Tricks. Stance B swaps power while Veiled and walls Erase. Wager antes Sight; win Veiled + Stance B → Eclipse (needs Favor).",
        action: "Tap Watch — follow Stance / Wager",
        cta: "Watch",
      };
    case "demo_toll":
      return {
        title: `Heresy: Bellward · ${tag}`,
        body: "Bellward Tolls looking. Toll marks a lane. If the foe Witnesses into your Toll, they pay Sight tax. Peal arms the Toll so Resolve pays you Sight + a card.",
        action: "Tap Watch — Toll · tax · Peal",
        cta: "Watch",
      };
    case "demo_breach":
      return {
        title: `Heresy: Scar Breach · ${tag}`,
        body: "Scar Opens. Breach Figures hit harder while Witnessed (Open). Resolve wins deal extra Breach Will. Spending Sight turns the blade on.",
        action: "Tap Watch — Open then Breach",
        cta: "Watch",
      };
    case "counter_erase_trick":
      return {
        title: `Counter · Ink vs Motley · ${tag}`,
        body: "Stance B normally Holds through Stain Erase. Ink's answer: Press into Stance B (free). Win Resolve → Forced Expose. Lose Resolve → Press backlash. Each craft forks Veil law.",
        action: "Tap Watch — Press pierces B",
        cta: "Watch",
      };
    case "outro":
      return {
        title: `You see · ${tag}`,
        body: "Ink Erases. Motley Tricks. Bellward Tolls looking. Scar Opens. Sites / Relics / Rites / Urns support those verbs. Read every toast. Hover badges for definitions. Go break Will — or Ascend on Eclipse.",
        action: "Ready for a real match",
        cta: "Finish First Gaze",
      };
    default:
      return null;
  }
}

export function tutorialHint(step: TutorialStep): string {
  const c = tutorialCoach(step);
  if (!c) return "Watch the board — tap Next when ready.";
  return c.action;
}

export function tutorialTeachCard(step: TutorialStep): string | null {
  const craft = findLessonByStep(step);
  if (craft?.lesson.teachCard) return craft.lesson.teachCard;
  switch (step) {
    case "card_essence":
    case "card_sight":
    case "card_power":
    case "types_figure":
      return "blot_herald";
    case "types_site":
      return "stainwell";
    case "types_relic":
      return "smother_cord";
    case "types_rite":
      return "ashen_tithe";
    case "types_vessel":
      return "gulf_urn";
    default:
      return null;
  }
}

function clearBoard(state: MatchState): void {
  for (const slot of state.altitudes) {
    slot.player = null;
    slot.enemy = null;
    slot.playerSite = null;
    slot.enemySite = null;
    slot.blinded = false;
  }
  state.tollOwner = [null, null, null];
  state.pealArmed = [false, false, false];
  state.passed = { player: false, enemy: false };
  state.pressUsed = { player: false, enemy: false };
  state.wagerUsed = { player: false, enemy: false };
  state.pealUsed = { player: false, enemy: false };
  state.stanceUsed = { player: false, enemy: false };
}

export function mintTutorUnit(cardId: string, opts: Partial<BoardUnit> = {}): BoardUnit {
  return {
    instanceId: `tut-${cardId}-${Math.random().toString(36).slice(2, 7)}`,
    cardId,
    veiled: true,
    hybridSite: false,
    stanceB: false,
    grafts: [],
    inhabitant: null,
    hasThirdFace: false,
    strained: false,
    stained: false,
    revelationFired: false,
    scrutiny: 0,
    wagered: false,
    wagerAntePaid: false,
    wagerAnteFavor: false,
    openedSinceResolve: false,
    lastBreachOpened: false,
    pressed: false,
    pressedBy: null,
    ...opts,
  };
}

/** Freeze a readable tableau for the current lesson. */
export function prepareTutorialStep(state: MatchState): void {
  const craft = findLessonByStep(state.tutorialStep);
  if (craft) {
    if (craft.lesson.prepare) {
      craft.lesson.prepare(state);
    } else {
      state.active = "player";
      state.hand = [];
      state.enemyHand = [];
      state.essence = 5;
      state.enemyEssence = 5;
      state.sight = 4;
      state.enemySight = 4;
      state.will = START_WILL;
      state.enemyWill = START_WILL;
      state.eclipse = 0;
      state.enemyEclipse = 0;
      state.favor = 1;
      state.enemyFavor = 1;
      clearBoard(state);
    }
    const teach = craft.lesson.teachCard;
    if (teach && craft.lesson.showsCard) {
      state.hand = [teach];
    }
    return;
  }

  state.active = "player";
  state.hand = [];
  state.enemyHand = [];
  state.essence = 5;
  state.enemyEssence = 5;
  state.sight = 4;
  state.enemySight = 4;
  state.will = START_WILL;
  state.enemyWill = START_WILL;
  state.eclipse = 0;
  state.enemyEclipse = 0;
  state.favor = 1;
  state.enemyFavor = 1;
  clearBoard(state);

  switch (state.tutorialStep) {
    case "types_figure":
      state.altitudes[1].player = mintTutorUnit("blot_herald", { veiled: true });
      state.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", { veiled: true });
      break;
    case "types_site":
      state.altitudes[1].playerSite = "stainwell";
      state.altitudes[1].player = mintTutorUnit("mire_duelist", { veiled: true });
      state.altitudes[1].enemy = mintTutorUnit("pale_ledger", { veiled: true, stained: true });
      break;
    case "types_relic":
      state.altitudes[1].player = mintTutorUnit("blot_herald", {
        veiled: false,
        revelationFired: true,
        grafts: [{ cardId: "smother_cord", instanceId: "tut-cord" }],
      });
      break;
    case "types_rite":
      state.altitudes[2].blinded = true;
      state.altitudes[1].enemy = mintTutorUnit("pale_ledger", { veiled: true, stained: true });
      break;
    case "types_vessel":
      state.altitudes[0].player = mintTutorUnit("gulf_urn", {
        veiled: true,
        inhabitant: "blot_herald",
      });
      break;
    case "loop_veil":
      state.altitudes[1].player = mintTutorUnit("blot_herald", {
        veiled: false,
        revelationFired: true,
      });
      state.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stained: true,
        stanceB: true,
      });
      break;
    case "loop_resolve":
      state.altitudes[0].player = mintTutorUnit("cliff_maw", { veiled: false, revelationFired: true });
      state.altitudes[0].enemy = mintTutorUnit("rivet_vanguard", { veiled: true });
      state.altitudes[1].player = mintTutorUnit("well_cantor", { veiled: false, revelationFired: true });
      state.altitudes[1].enemy = mintTutorUnit("bell_debt_walker", { veiled: true });
      break;
    case "demo_ink":
    case "demo_motley":
    case "demo_toll":
    case "demo_breach":
    case "counter_erase_trick":
      // Demos build themselves as they play
      break;
    default:
      break;
  }

  const teach = tutorialTeachCard(state.tutorialStep);
  if (teach && tutorialShowsCard(state.tutorialStep)) {
    state.hand = [teach];
  }
}

export function syncTutorialHand(state: MatchState): void {
  prepareTutorialStep(state);
}

export function setupTutorial(state: MatchState, tutorialId: TutorialId = "first_gaze"): void {
  state.tutorial = true;
  state.tutorialId = tutorialId;
  state.will = START_WILL;
  state.enemyWill = START_WILL;
  state.prophecies = [];
  state.enemyProphecies = [];
  state.witnessedHeresiesThisTurn = [];
  if (isCraftTutorialId(tutorialId)) {
    const curriculum = getCurriculum(tutorialId);
    state.tutorialStep = curriculum.lessons[0]?.id ?? "done";
    const teach = teachDeckForHeresy(tutorialId);
    state.deck = teach.slice(0, 8);
    state.enemyDeck = ["blot_herald", "whitecard_mummer", "bell_debt_walker", "rivet_vanguard"].filter(
      (id) => getCard(id).heresy !== tutorialId,
    );
  } else {
    state.tutorialStep = "intro";
    state.deck = ["blot_herald", "well_cantor", "mire_duelist", "stainwell", "gulf_urn"];
    state.enemyDeck = ["whitecard_mummer", "bell_debt_walker", "rivet_vanguard", "pale_ledger"];
  }
  prepareTutorialStep(state);
}

export function filterTutorialIntents(state: MatchState, intents: Intent[]): Intent[] {
  if (!state.tutorial || state.tutorialStep === "done") return intents;
  // Soft curriculum — only Pass advances (coach CTA)
  if (isTutorialSoftPass(state.tutorialStep)) {
    return intents.filter((i) => i.kind === "pass");
  }
  return intents;
}

export function advanceTutorial(state: MatchState, intent: Intent): boolean {
  if (!state.tutorial || state.tutorialStep === "done") return false;
  if (intent.kind !== "pass") return false;
  if (!isTutorialSoftPass(state.tutorialStep)) return false;
  const next = nextLesson(state.tutorialStep);
  state.tutorialStep = next;
  if (next !== "done") prepareTutorialStep(state);
  return next !== "done";
}

export function tutorialSelectHandIndex(_state: MatchState): number | null {
  return null;
}

export function tutorialUiMode(_step: TutorialStep): "play" | "witness" | "stance" | null {
  return null;
}

export function tutorialAltitudeFocus(_step: TutorialStep): Altitude | null {
  return null;
}

/** Legacy AI hook — tutorial enemy no longer free-acts mid-lesson. */
export function chooseTutorialEnemyMove(_state: MatchState, legal: Intent[]): Intent {
  const pass = legal.find((i) => i.kind === "pass");
  return pass ?? legal[0] ?? { kind: "pass" };
}

export type TutorDemoBeat = {
  /** Coach line shown while this beat plays */
  line: string;
  /** Board prep before intents (optional) */
  setup?: (state: MatchState) => void;
  /** Scripted seats — applied in order */
  acts?: { side: Side; intent: Intent }[];
  /** Sensory cue when the tableau lands (SFX / float / toast / focus). */
  cue?: {
    sfx?: "play" | "witness" | "stain" | "strain" | "stance" | "rite" | "resolve" | "select" | "law" | "eclipse" | "pass";
    float?: string;
    floatKind?: string;
    altitude?: 0 | 1 | 2;
    toast?: string;
    toastKind?: string;
    focusSel?: string;
  };
};

function resetDemoSeats(state: MatchState): void {
  clearBoard(state);
  state.hand = [];
  state.enemyHand = [];
  state.essence = 6;
  state.enemyEssence = 6;
  state.sight = 5;
  state.enemySight = 5;
  state.favor = 2;
  state.enemyFavor = 2;
  state.eclipse = 0;
  state.enemyEclipse = 0;
  state.will = START_WILL;
  state.enemyWill = START_WILL;
  state.active = "player";
  state.passed = { player: false, enemy: false };
  state.pressUsed = { player: false, enemy: false };
  state.wagerUsed = { player: false, enemy: false };
  state.pealUsed = { player: false, enemy: false };
  state.stanceUsed = { player: false, enemy: false };
  state.events = [];
}

/** Scripted bot showcase for demo lessons. */
export function tutorialDemoBeats(step: TutorialStep): TutorDemoBeat[] {
  const craft = findLessonByStep(step);
  if (craft?.lesson.demoBeats) return craft.lesson.demoBeats;
  switch (step) {
    case "demo_ink":
      return [
        {
          line: "Bottom = Ink. Top = Motley. Both play Veiled Figures on MID. See the VEIL badges — half-real armor.",
          setup: (s) => {
            resetDemoSeats(s);
            s.altitudes[1].player = mintTutorUnit("blot_herald", { veiled: true });
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", { veiled: true });
          },
          cue: {
            sfx: "play",
            float: "Both Veiled",
            floatKind: "play",
            altitude: 1,
            toast: "Veiled = half-real. Safer, but usually weaker until Witnessed.",
            toastKind: "play",
            focusSel: '.alt-hit[data-alt="1"] [data-veil]',
          },
        },
        {
          line: "Ink Witnesses Herald (spends Sight). Revelation Stains the Motley foe — STAIN badge appears. That Mark enables Press.",
          setup: (s) => {
            s.altitudes[1].player = mintTutorUnit("blot_herald", {
              veiled: false,
              revelationFired: true,
            });
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stained: true,
            });
            s.sight = 4;
          },
          cue: {
            sfx: "stain",
            float: "Stained!",
            floatKind: "stain",
            altitude: 1,
            toast: "STAIN = Ink Mark on the foe. Next step: Press it.",
            toastKind: "stain",
            focusSel: '.alt-hit[data-alt="1"] .alt-stain[data-side="enemy"]',
          },
        },
        {
          line: "Ink Presses (1 Sight). PRESS badge = −1 power, and if Ink wins Resolve the Veil breaks (Forced Expose).",
          setup: (s) => {
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stained: true,
              pressed: true,
              pressedBy: "player",
            });
            s.pressUsed.player = true;
            s.sight = 3;
          },
          cue: {
            sfx: "strain",
            float: "Pressed!",
            floatKind: "press",
            altitude: 1,
            toast: "PRESS — win this lane to Forced Expose. Lose the lane = backlash on Ink.",
            toastKind: "stain",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-press]',
          },
        },
        {
          line: "Both Pass → Resolve. Ink wins: Press Forces Expose + Strain. The Motley fighter is no longer safely Veiled. That is Erase.",
          setup: (s) => {
            s.altitudes[1].player = mintTutorUnit("blot_herald", {
              veiled: false,
              revelationFired: true,
            });
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
              veiled: false,
              stained: true,
              strained: true,
              revelationFired: false,
            });
          },
          cue: {
            sfx: "resolve",
            float: "Forced Expose",
            floatKind: "resolve",
            altitude: 1,
            toast: "Forced Expose — Veil armor broken. Next Witnessed loss can Fall (die).",
            toastKind: "resolve",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-strain]',
          },
        },
      ];
    case "demo_motley":
      return [
        {
          line: "Bottom = Motley. Stance B flips on (badge B) — power swap while Veiled. This walls normal Ink Erase.",
          setup: (s) => {
            resetDemoSeats(s);
            s.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stanceB: true,
              hasThirdFace: true,
            });
            s.altitudes[1].enemy = mintTutorUnit("blot_herald", { veiled: true, stained: true });
            s.altitudes[1].playerSite = "velvet_antehall";
          },
          cue: {
            sfx: "stance",
            float: "Stance B",
            floatKind: "stance",
            altitude: 1,
            toast: "Stance B — Motley's Erase wall while still Veiled.",
            toastKind: "stance",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.you [data-stance-mark]',
          },
        },
        {
          line: "Motley Wagers — antes Sight. The bet is public. If Forced Exposed while Wagered → Bust (ante gone).",
          setup: (s) => {
            s.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stanceB: true,
              hasThirdFace: true,
              wagered: true,
              wagerAntePaid: true,
            });
            s.altitudes[1].playerSite = "velvet_antehall";
            s.sight = 3;
            s.wagerUsed.player = true;
          },
          cue: {
            sfx: "select",
            float: "Wager ante",
            floatKind: "wager",
            altitude: 1,
            toast: "WAGER — win still Veiled for Cash. Lose / Forced Expose = Bust.",
            toastKind: "stance",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.you [data-wager]',
          },
        },
        {
          line: "Win Resolve while Veiled + Stance B + paid ante (with Favor) → Trick Eclipse. Motley's alt win engine.",
          setup: (s) => {
            s.eclipse = 2;
            s.favor = 1;
            s.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stanceB: true,
              wagered: true,
              wagerAntePaid: true,
            });
            s.altitudes[1].enemy = null;
          },
          cue: {
            sfx: "eclipse",
            float: "Trick Eclipse",
            floatKind: "resolve",
            altitude: 1,
            toast: "Eclipse rose — Motley can win by reaching 10 Eclipse, not only by Breaking Will.",
            toastKind: "eclipse",
            focusSel: "#willrow .ecl-pip",
          },
        },
      ];
    case "demo_toll":
      return [
        {
          line: "Bottom = Bellward. Toll placed on MID — sticky tax on that lane. Look for the TOLL badge.",
          setup: (s) => {
            resetDemoSeats(s);
            s.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
            s.tollOwner[1] = "player";
          },
          cue: {
            sfx: "rite",
            float: "Toll placed",
            floatKind: "toll",
            altitude: 1,
            toast: "TOLL — enemy Witness/Gaze into this lane pays Sight tax.",
            toastKind: "rite",
            focusSel: '.alt-hit[data-alt="1"] [data-toll]',
          },
        },
        {
          line: "Foe Witnesses into the Toll — they pay Sight tax. Looking became expensive. Bellward gained Sight.",
          setup: (s) => {
            s.altitudes[1].enemy = mintTutorUnit("blot_herald", {
              veiled: false,
              revelationFired: true,
            });
            s.enemySight = 1;
            s.sight = 5;
          },
          cue: {
            sfx: "law",
            float: "Tax paid",
            floatKind: "toll",
            altitude: 1,
            toast: "Toll tax collected — Bellward rewards looking, not hiding.",
            toastKind: "rite",
            focusSel: '.alt-hit[data-alt="1"] [data-toll]',
          },
        },
        {
          line: "Peal arms the Toll (−1 Sight). When Resolve spends that Toll, Peal pays Sight + draw. Arm only when the tax will fire.",
          setup: (s) => {
            s.pealArmed[1] = true;
            s.pealUsed.player = true;
            s.sight = 4;
          },
          cue: {
            sfx: "law",
            float: "Peal armed",
            floatKind: "peal",
            altitude: 1,
            toast: "PEAL — when Resolve spends the Toll, you gain Sight and draw a card.",
            toastKind: "rite",
            focusSel: '.alt-hit[data-alt="1"] [data-peal]',
          },
        },
      ];
    case "demo_breach":
      return [
        {
          line: "Bottom = Scar Breach. Rivet Vanguard enters Veiled — setup only. Breach Will needs Witnessed (Open).",
          setup: (s) => {
            resetDemoSeats(s);
            s.altitudes[1].player = mintTutorUnit("rivet_vanguard", { veiled: true });
            s.altitudes[1].enemy = mintTutorUnit("pale_ledger", { veiled: true });
          },
          cue: {
            sfx: "play",
            float: "Veiled setup",
            floatKind: "play",
            altitude: 1,
            toast: "Scar starts Veiled. Spend Sight to Open (Witness) before Breach Will counts.",
            toastKind: "play",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.you [data-veil]',
          },
        },
        {
          line: "Open: Witness the Vanguard. VEIL drops. The blade is live — Witnessed Breach power is on.",
          setup: (s) => {
            s.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
              veiled: false,
              revelationFired: true,
              openedSinceResolve: true,
            });
          },
          cue: {
            sfx: "witness",
            float: "Opened",
            floatKind: "witness",
            altitude: 1,
            toast: "Open = Witnessed. Breach Will now applies on Resolve wins.",
            toastKind: "witness",
            focusSel: '.alt-hit[data-alt="1"]',
          },
        },
        {
          line: "Resolve win while Open deals Breach Will on top of soft chip. Agro that pays Sight to turn on.",
          setup: (s) => {
            s.enemyWill = START_WILL - 4;
            s.altitudes[1].enemy = mintTutorUnit("pale_ledger", {
              veiled: false,
              revelationFired: true,
              strained: true,
            });
          },
          cue: {
            sfx: "resolve",
            float: "Breach Will",
            floatKind: "resolve",
            altitude: 1,
            toast: "Foe Will dropped from Breach damage — Scar's win path is pressure.",
            toastKind: "resolve",
            focusSel: "#willrow",
          },
        },
      ];
    case "counter_erase_trick":
      return [
        {
          line: "Motley Stance B + VEIL + STAIN: normal Erase would Hold. Veil armor + Trick wall.",
          setup: (s) => {
            resetDemoSeats(s);
            s.altitudes[1].player = mintTutorUnit("mire_duelist", {
              veiled: false,
              revelationFired: true,
            });
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stained: true,
              stanceB: true,
            });
          },
          cue: {
            sfx: "stance",
            float: "Erase blocked",
            floatKind: "stance",
            altitude: 1,
            toast: "Stain alone is not enough vs Stance B Veiled — need Press.",
            toastKind: "stance",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-stance-mark]',
          },
        },
        {
          line: "Ink Presses into Stance B for free (no Stain required). PRESS badge appears — densify answer, once per window.",
          setup: (s) => {
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
              veiled: true,
              stained: true,
              stanceB: true,
              pressed: true,
              pressedBy: "player",
            });
            s.pressUsed.player = true;
          },
          cue: {
            sfx: "strain",
            float: "Press pierces",
            floatKind: "press",
            altitude: 1,
            toast: "Press into Stance B is free — Ink's answer to the Trick wall.",
            toastKind: "stain",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-press]',
          },
        },
        {
          line: "Ink wins Resolve: Press pierces — Forced Expose + Strain. Motley kept Favor for Eclipse elsewhere; Ink spent the Mark on removal.",
          setup: (s) => {
            s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
              veiled: false,
              stained: true,
              strained: true,
              stanceB: true,
            });
          },
          cue: {
            sfx: "resolve",
            float: "Pierce!",
            floatKind: "resolve",
            altitude: 1,
            toast: "Counter complete: Press turned Trick armor into Forced Expose.",
            toastKind: "resolve",
            focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-strain]',
          },
        },
      ];
    default:
      return [];
  }
}

export function tutorialTypeExample(step: TutorialStep): string | null {
  return tutorialTeachCard(step);
}

/** Seat craft labels during heresy demos (bottom = YOU / player). */
export function tutorialDemoCrafts(
  step: TutorialStep,
): { bottom: "ink" | "motley" | "toll" | "breach"; top: "ink" | "motley" | "toll" | "breach" } | null {
  const craft = findLessonByStep(step);
  if (craft?.lesson.demoCrafts) return craft.lesson.demoCrafts as {
    bottom: "ink" | "motley" | "toll" | "breach";
    top: "ink" | "motley" | "toll" | "breach";
  };
  switch (step) {
    case "demo_ink":
    case "counter_erase_trick":
      return { bottom: "ink", top: "motley" };
    case "demo_motley":
      return { bottom: "motley", top: "ink" };
    case "demo_toll":
      return { bottom: "toll", top: "ink" };
    case "demo_breach":
      return { bottom: "breach", top: "motley" };
    default:
      return null;
  }
}
