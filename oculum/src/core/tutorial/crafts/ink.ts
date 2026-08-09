import { coreGazeLessons } from "../coreLessons";
import { mintTutorUnit, prepBaseLesson, resetDemoSeats } from "../boardPrep";
import type { Curriculum, LessonDef } from "../types";

const craftLessons: LessonDef[] = [
  {
    id: "ink_kit",
    coach: {
      body: "INK ABYSS verb = ERASE. Private kit: STAIN (Mark on a foe) → PRESS (densify a Stained Veiled foe) → FORCED EXPOSE / Fall (kill path) · plus BLIND (deny Sight from a lane). You grind Marks and remove safety. Primary win: Break Will — not Eclipse.",
      action: "Kit: Stain · Press · Erase · Blind",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "ink_stain",
    coach: {
      body: "STAIN is Ink's Mark. It sits on an enemy Figure (black drip badge on the card). Stain enables Press and many Ink payloads (power vs Stained, Blind if Stained, draw on Stained wins). Stain does nothing alone against Motley Stance B Veil — you still need Press to pierce.",
      action: "Stain = Mark",
      cta: "Next",
    },
    prepare: (s) => {
      prepBaseLesson(s);
      s.altitudes[1].player = mintTutorUnit("blot_herald", { veiled: false, revelationFired: true });
      s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", { veiled: true, stained: true });
    },
    target: { kind: "dom", sel: '.alt-hit[data-alt="1"] .alt-stain[data-side="enemy"]' },
  },
  {
    id: "ink_revelation_stain",
    coach: {
      body: "Most Ink Figures Stain on Revelation — the one-shot when you Witness. Example: Blot Herald Witnesses and Stains the enemy here (and often spreads). Spend Sight to Witness; the Mark appears; now Press is legal. Do not Witness with empty follow-up Sight if you needed Press the same window.",
      action: "Witness → Revelation → Stain",
      cta: "Next",
    },
    showsCard: true,
    teachCard: "blot_herald",
    caption: {
      kicker: "REVELATION · Blot Herald",
      rules: "Witness Herald → Revelation Stains the foe here (Ink's enter Mark).",
    },
    target: { kind: "card", anchor: "witness" },
  },
  {
    id: "ink_press",
    coach: {
      body: "PRESS (button) costs 1 Sight on a Stained Veiled enemy: they get −1 power and a PRESS badge. If you win Resolve there, Forced Expose (Veil breaks, usually Strain). If you lose Resolve, Press backlash hits you (Smother — lose Sight). SPECIAL: Press into Motley Stance B is FREE and does not need Stain — once per window. Press is densify, not a free kill by itself.",
      action: "Press densifies Marks",
      cta: "Next",
    },
    prepare: (s) => {
      prepBaseLesson(s);
      s.altitudes[1].player = mintTutorUnit("mire_duelist", { veiled: false, revelationFired: true });
      s.altitudes[1].enemy = mintTutorUnit("pale_ledger", {
        veiled: true,
        stained: true,
        pressed: true,
        pressedBy: "player",
      });
      s.pressUsed.player = true;
    },
    target: { kind: "dom", sel: '.alt-hit[data-alt="1"] .alt-status.foe [data-press]' },
  },
  {
    id: "ink_forced_expose",
    coach: {
      body: "FORCED EXPOSE means the Veil broke against their will — they become Witnessed with no Revelation. Often they are Strained. A Witnessed Strained Figure that loses Resolve again Falls (dies). That removal chain is Erase. Scrutiny 2 also Forced Exposes. Erase is how Ink answers stalls.",
      action: "Forced Expose → Strain → Fall",
      cta: "Next",
    },
    prepare: (s) => {
      prepBaseLesson(s);
      s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
        veiled: false,
        stained: true,
        strained: true,
      });
    },
    target: { kind: "dom", sel: '.alt-hit[data-alt="1"] .alt-status.foe [data-strain]' },
  },
  {
    id: "ink_blind",
    coach: {
      body: "BLIND shuts Sight income on an altitude for the turn (Sites / yields). Ink uses Blind to starve Witness agro and Peal plans. Blind is deny — pair it with Marks so the foe cannot easily re-flip.",
      action: "Blind = Sight deny",
      cta: "Next",
    },
    prepare: (s) => {
      prepBaseLesson(s);
      s.altitudes[2].blinded = true;
      s.altitudes[1].enemy = mintTutorUnit("pale_ledger", { veiled: true, stained: true });
    },
    target: { kind: "dom", sel: '.alt-hit[data-alt="2"] [data-blind]' },
  },
  {
    id: "ink_site",
    coach: {
      body: "STAINWELL (Site): as you play it, Stain the enemy Veiled Figure here if able. Your Figures here +1 vs Stained. When a Stained foe here Forced Exposes, gain 1 Sight. Sites bank Marks so your Figures stay fed.",
      action: "Site banks Marks",
      cta: "Next",
    },
    showsCard: true,
    teachCard: "stainwell",
    caption: {
      kicker: "SITE · Stainwell",
      rules: "Enter-Stain · +1 vs Stained here · Sight when Stained foe Forced Exposes.",
    },
    prepare: (s) => {
      prepBaseLesson(s);
      s.altitudes[1].playerSite = "stainwell";
      s.altitudes[1].player = mintTutorUnit("mire_duelist", { veiled: true });
      s.altitudes[1].enemy = mintTutorUnit("pale_ledger", { veiled: true, stained: true });
    },
    target: { kind: "card", anchor: "essence" },
  },
  {
    id: "ink_relic",
    coach: {
      body: "SMOTHER CORD (Relic): +1 power while host Witnessed. When host Forced Exposes an enemy, Stain another Veiled foe; on Mid also gain 1 Sight. Grafts turn one erase into a chain.",
      action: "Relic chains Erase",
      cta: "Next",
    },
    showsCard: true,
    teachCard: "smother_cord",
    caption: {
      kicker: "RELIC · Smother Cord",
      rules: "+1 while host Witnessed. Forced Expose → Stain another; Mid → +Sight.",
    },
    target: { kind: "card", anchor: "essence" },
  },
  {
    id: "ink_rite",
    coach: {
      body: "ASHEN TITHE (Rite): choose a lane — if foe is Stained, gain Sight + draw; if also Veiled, Blind that lane and you may Press for free. Rites cash Marks instantly when the board is already inked.",
      action: "Rite cashes Marks",
      cta: "Next",
    },
    showsCard: true,
    teachCard: "ashen_tithe",
    caption: {
      kicker: "RITE · Ashen Tithe",
      rules: "Stained foe → Sight + draw; Veiled too → Blind + free Press.",
    },
    target: { kind: "card", anchor: "essence" },
  },
  {
    id: "ink_vessel",
    coach: {
      body: "GULF URN (Vessel): tuck an Inhabitant. Revelation can Stain. When it Falls / Forced Exposes: Stain a Veiled foe and Blind that altitude. Urns keep Ink pressure after a body dies.",
      action: "Vessel spreads on death",
      cta: "Next",
    },
    showsCard: true,
    teachCard: "gulf_urn",
    caption: {
      kicker: "VESSEL · Gulf Urn",
      rules: "Tuck INH. Fall / Forced Expose → Stain + Blind.",
    },
    prepare: (s) => {
      prepBaseLesson(s);
      s.altitudes[0].player = mintTutorUnit("gulf_urn", { veiled: true, inhabitant: "blot_herald" });
    },
    target: { kind: "card", anchor: "essence" },
  },
  {
    id: "ink_combo_demo",
    coach: {
      body: "COMBO DEMO — watch the full Erase loop. Bottom = you (Ink). Top = Motley foe. Tap Watch; read every beat.",
      action: "Watch Erase",
      cta: "Watch",
    },
    demoCrafts: { bottom: "ink", top: "motley" },
    demoBeats: [
      {
        line: "Both play Veiled on MID. VEIL badges = half-real armor. Ink cannot Fall them yet.",
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
          toast: "Veiled = Hold on Resolve loss. Need Marks + Press to Erase.",
          toastKind: "play",
          focusSel: '.alt-hit[data-alt="1"] [data-veil]',
        },
      },
      {
        line: "Ink Witnesses Herald (Sight). Revelation Stains the Motley foe — STAIN drip appears.",
        setup: (s) => {
          s.altitudes[1].player = mintTutorUnit("blot_herald", { veiled: false, revelationFired: true });
          s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", { veiled: true, stained: true });
          s.sight = 4;
        },
        cue: {
          sfx: "stain",
          float: "Stained!",
          floatKind: "stain",
          altitude: 1,
          toast: "STAIN enables Press. Without it, densify is illegal (unless Stance B free Press).",
          toastKind: "stain",
          focusSel: '.alt-hit[data-alt="1"] .alt-stain[data-side="enemy"]',
        },
      },
      {
        line: "Ink Presses (1 Sight). PRESS badge: −1 power; win Resolve → Forced Expose.",
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
          toast: "Lose the lane after Press = backlash. Only Press when you can win or accept the tax.",
          toastKind: "stain",
          focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-press]',
        },
      },
      {
        line: "Both Pass → Resolve. Ink wins: Forced Expose + Strain. Veil armor is gone — Erase path open.",
        setup: (s) => {
          s.altitudes[1].player = mintTutorUnit("blot_herald", { veiled: false, revelationFired: true });
          s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
            veiled: false,
            stained: true,
            strained: true,
          });
        },
        cue: {
          sfx: "resolve",
          float: "Forced Expose",
          floatKind: "resolve",
          altitude: 1,
          toast: "Next Witnessed loss can Fall. That is Ink's kill clock.",
          toastKind: "resolve",
          focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-strain]',
        },
      },
    ],
    target: { kind: "dom", sel: "#altitudes" },
  },
  {
    id: "ink_vs_motley",
    coach: {
      body: "VS MOTLEY: Stance B Veiled walls normal Erase. Answer = Press into Stance B (free, no Stain required). Win Resolve to pierce. Do not waste Stain-only plans into B without Press.",
      action: "Watch Press pierce",
      cta: "Watch",
    },
    demoCrafts: { bottom: "ink", top: "motley" },
    demoBeats: [
      {
        line: "Motley sits Veiled + Stance B + Stained. Stain alone cannot Erase through B.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].player = mintTutorUnit("mire_duelist", { veiled: false, revelationFired: true });
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
          toast: "Stance B + Veil = Trick wall. Need Press.",
          toastKind: "stance",
          focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-stance-mark]',
        },
      },
      {
        line: "Ink Presses into Stance B for free. PRESS appears — densify answer, once per window.",
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
          toast: "Free Press into B — Ink's printed answer to Motley.",
          toastKind: "stain",
          focusSel: '.alt-hit[data-alt="1"] .alt-status.foe [data-press]',
        },
      },
      {
        line: "Ink wins Resolve: Forced Expose through the wall. Motley must re-set Stance / Favor elsewhere.",
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
        },
      },
    ],
    target: { kind: "dom", sel: "#altitudes" },
  },
  {
    id: "ink_vs_toll",
    coach: {
      body: "VS BELLWARD: Witness/Gaze into a Toll pays Sight tax. Ink still needs Witness for Revelation Stains — bank Sight, Blind their Peal lanes, or Witness on untolled altitudes. Do not Open every lane into sticky Tolls without a plan.",
      action: "Tax vs Marks",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "ink_vs_breach",
    coach: {
      body: "VS SCAR: Opened (Witnessed) Scar Figures Breach for Will. Stain + Press them before they stack Open wins. Blind High if they live there. Race: your Erase clock vs their Breach Will.",
      action: "Erase vs Open pressure",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "ink_curve",
    coach: {
      body: "CURVE: Early — cheap Stain Figures + Site. Mid — Witness + Press same window when you can win the lane. Keep 1 Sight for Press after Revelation. Blind when they try to re-Witness. Do not over-Witness into empty Press.",
      action: "Sight sequencing",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "ink_win",
    coach: {
      body: "WIN PATH: Break the foe's Will to 0 by removing blockers and winning Resolves after Erase. Eclipse is secondary. Law exists but Ink Teach wins by grinding Marks into Falls and chips.",
      action: "Break via Erase",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow" },
  },
  {
    id: "ink_outro",
    coach: {
      body: "You finished the Ink Abyss tutorial. Enter Gaze with Ink Teach from the craft picker — Stain, Press, Blind, and Erase for real. Tap ESS/SIGHT and card keywords any time for reminders.",
      action: "Ready to Erase",
      cta: "Finish",
    },
    target: { kind: "none" },
  },
];

export const INK_CURRICULUM: Curriculum = {
  id: "ink",
  title: "Ink Abyss",
  blurb: "Full Erase school — Stain, Press, Blind, and every combo vs Motley / Toll / Scar.",
  lessons: [
    ...coreGazeLessons("ink", {
      figureId: "blot_herald",
      figureName: "Blot Herald",
      craftTitle: "Ink Abyss",
      craftVerb: "Erase",
    }),
    ...craftLessons,
  ],
};
