import type { Curriculum, LessonDef } from "../types";
import { coreGazeLessons } from "../coreLessons";
import { clearBoardForLesson, mintTutorUnit, resetDemoSeats } from "../boardPrep";
import { START_WILL } from "../../types";

const craftSpecificLessons: LessonDef[] = [
  {
    id: "breach_kit_overview",
    coach: {
      title: "Scar kit",
      body: "Scar Breach Opens. Witness your Figures to turn the blade on — Open means Witnessed and live for Breach Will. Resolve wins while Open deal extra Will beyond soft chip. Overexpose is the risk: Opening too greedily can tax your own Sight. Spend Sight to fight harder; manage the burn.",
      action: "Open · Breach Will · Overexpose risk",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
  },
  {
    id: "breach_open_verb",
    coach: {
      title: "Open (Witness)",
      body: "Open is Scar's word for Witnessing your own Figure. VEIL drops, Revelation fires, and Breach power turns on. Without Open, Veiled Scar is setup only — Sight spent is the ignition. Mid Opens draw; Low refunds Sight; High Opens chip harder. Breach Order can Open cheaper.",
      action: "Open = Witness the blade",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
        veiled: false,
        revelationFired: true,
        openedSinceResolve: true,
      });
      state.altitudes[1].enemy = mintTutorUnit("pale_ledger", { veiled: true });
      state.sight = 3;
    },
  },
  {
    id: "breach_will_verb",
    coach: {
      title: "Breach Will",
      body: "When an Opened Scar Figure wins Resolve, you deal Breach Will on top of the normal chip. That is the agro spike — Sight spent earlier becomes Will damage now. Veiled wins do not Breach. Keep bodies Open through Resolve; Forced Expose or Blind that starves re-Open slows you.",
      action: "Opened win → extra Will",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
        veiled: false,
        revelationFired: true,
        openedSinceResolve: true,
      });
      state.altitudes[1].enemy = mintTutorUnit("pale_ledger", {
        veiled: false,
        revelationFired: true,
        strained: true,
      });
      state.enemyWill = START_WILL - 4;
    },
  },
  {
    id: "breach_overexpose",
    coach: {
      title: "Overexpose",
      body: "Overexpose is Scar's risk for Opening hard. Cards and shared rules can make you lose Sight when you Open too greedily in a window — the blade cuts both ways. Open when you will win Resolve; skip greedy flips into Toll tax or empty lanes. Rivet Vanguard prints shared Overexpose (lose 1 Sight) as the reminder.",
      action: "Open smart · Sight can burn",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#meters .meter.sight" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
        veiled: false,
        revelationFired: true,
        openedSinceResolve: true,
      });
      state.sight = 2;
    },
  },
  {
    id: "breach_site_scarforge",
    coach: {
      title: "Site · Scarforge",
      body: "Scarforge: when a friendly Figure here becomes Witnessed, gain 1 Sight. When a friendly Witnessed Figure here wins Resolve, gain 1 Sight. Park your Open seat on Scarforge so ignition and Breach wins refund looking.",
      action: "Scarforge refunds Open / wins",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "scarforge",
    caption: {
      kicker: "SITE · Scarforge",
      rules: "Friendly Witness here → +1 Sight. Friendly Witnessed win here → +1 Sight.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].playerSite = "scarforge";
      state.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
        veiled: false,
        revelationFired: true,
        openedSinceResolve: true,
      });
      state.hand = ["scarforge"];
    },
  },
  {
    id: "breach_relic_rivet",
    coach: {
      title: "Relic · Rivet Charm",
      body: "Rivet Charm Grafts +1 while Witnessed. When host Opens, gain 1 Sight. When host wins Resolve while Witnessed, draw 1 (once per Resolve). Graft on the Breach winner so Open refunds and wins dig.",
      action: "Graft Rivet on the Open seat",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "rivet_charm",
    caption: {
      kicker: "RELIC · Rivet Charm",
      rules: "+1 Witnessed. On Open → Sight. Witnessed Resolve win → draw (once).",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
        veiled: false,
        revelationFired: true,
        openedSinceResolve: true,
        grafts: [{ cardId: "rivet_charm", instanceId: "tut-rivet" }],
      });
      state.hand = ["rivet_charm"];
    },
  },
  {
    id: "breach_rite_order",
    coach: {
      title: "Rite · Breach Order",
      body: "Breach Order: choose your Figure's lane — if Veiled, Witness it paying 1 less Sight (min 0); if already Witnessed, deal 1 Will. Cheap Open spike or finish chip. Play Order the window you need the blade live without full Sight.",
      action: "Cheap Open · or 1 Will",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "breach_order",
    caption: {
      kicker: "RITE · Breach Order",
      rules: "Your Figure: Veiled → Witness at −1 Sight (min 0). Already Witnessed → deal 1 Will.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("rivet_vanguard", { veiled: true });
      state.hand = ["breach_order"];
      state.sight = 2;
    },
  },
  {
    id: "breach_vessel_iron",
    coach: {
      title: "Vessel · Iron Urn",
      body: "Iron Urn stores an Inhabitant. Revelation: Gain 2 Sight. Fall: Witness a friendly Veiled Figure for free if able; otherwise gain 1 Sight. Continuity — when the Urn breaks, another blade Opens for free.",
      action: "Urn fuels re-Open",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "iron_urn",
    caption: {
      kicker: "VESSEL · Iron Urn",
      rules: "Inhabitant. Revelation +2 Sight. Fall: free Witness a Veiled ally, else +1 Sight.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[0].player = mintTutorUnit("iron_urn", {
        veiled: true,
        inhabitant: "rivet_vanguard",
      });
      state.hand = ["iron_urn"];
    },
  },
  {
    id: "breach_combo_demo",
    coach: {
      title: "Combo · Open line",
      body: "Watch bottom Scar vs top Motley. Veiled setup, Open, then Breach Will. Follow VEIL drop and Will chips.",
      action: "Tap Watch — Open then Breach",
      cta: "Watch",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "breach", top: "motley" },
    demoBeats: [
      {
        line: "Rivet Vanguard enters Veiled on MID — setup only. Breach Will needs Open.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].player = mintTutorUnit("rivet_vanguard", { veiled: true });
          s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", { veiled: true });
          s.altitudes[1].playerSite = "scarforge";
        },
        cue: {
          sfx: "play",
          float: "Veiled setup",
          floatKind: "play",
          altitude: 1,
          toast: "Spend Sight to Open before Breach counts.",
          toastKind: "play",
        },
      },
      {
        line: "Open: Witness the Vanguard. VEIL drops. Blade live — Scarforge refunds Sight.",
        setup: (s) => {
          s.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            openedSinceResolve: true,
            grafts: [{ cardId: "rivet_charm", instanceId: "tut-rivet" }],
          });
          s.sight = 4;
        },
        cue: {
          sfx: "witness",
          float: "Opened",
          floatKind: "witness",
          altitude: 1,
          toast: "Open = Witnessed. Breach Will applies on wins.",
          toastKind: "witness",
        },
      },
      {
        line: "Resolve win while Open deals Breach Will on top of soft chip. Foe Will drops.",
        setup: (s) => {
          s.enemyWill = START_WILL - 4;
          s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
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
          toast: "Agro that pays Sight to turn on.",
          toastKind: "resolve",
          focusSel: "#willrow",
        },
      },
      {
        line: "Overexpose reminder: greedy extra Opens can burn Sight — only flip lanes you will win.",
        setup: (s) => {
          s.sight = 2;
        },
        cue: {
          sfx: "strain",
          float: "Overexpose risk",
          floatKind: "witness",
          toast: "Manage Sight burn when Opening hard.",
          toastKind: "witness",
          focusSel: "#meters .meter.sight",
        },
      },
    ],
  },
  {
    id: "breach_vs_ink",
    coach: {
      title: "vs Ink",
      body: "Ink Stains Opened bodies and Presses for Forced Expose. Open after Press is spent when you can, or Open Mid with draw to restock. Scarforge Sight helps re-Open after Blind. Do not leave Strained Open seats into Press.",
      action: "Watch — Open past Press",
      cta: "Watch",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "breach", top: "ink" },
    demoBeats: [
      {
        line: "Ink Stained the Opened Vanguard. Scar Breach Orders a second seat Open instead.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].player = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            stained: true,
            openedSinceResolve: true,
          });
          s.altitudes[1].enemy = mintTutorUnit("blot_herald", {
            veiled: false,
            revelationFired: true,
          });
          s.altitudes[0].player = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            openedSinceResolve: true,
          });
          s.altitudes[0].playerSite = "scarforge";
        },
        cue: {
          sfx: "witness",
          float: "Second Open",
          floatKind: "witness",
          altitude: 0,
          toast: "Do not Breach on a Pressed Mark alone.",
          toastKind: "witness",
        },
      },
      {
        line: "High Open wins Breach Will while Mid accepts Erase risk. Will race continues.",
        setup: (s) => {
          s.enemyWill = START_WILL - 5;
          s.altitudes[0].enemy = mintTutorUnit("pale_ledger", { veiled: true });
        },
        cue: {
          sfx: "resolve",
          float: "Breach High",
          floatKind: "resolve",
          altitude: 0,
          toast: "Split Opens across lanes vs Ink police.",
          toastKind: "resolve",
        },
      },
    ],
  },
  {
    id: "breach_vs_motley",
    coach: {
      title: "vs Motley",
      body: "Motley walls with B and races Eclipse. Open into their Veiled Cash seats to contest power, or Breach Will faster than ECL climbs. Forced Expose from Ink is not your verb — win Resolve Opened and chip. Blind from Motley hurts re-Open; bank Sight.",
      action: "Will race vs Eclipse",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "breach", top: "motley" },
    demoBeats: [
      {
        line: "Motley B Wager on Mid. Scar Opens High for Breach chips — race Will past ECL.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
            veiled: true,
            stanceB: true,
            wagered: true,
            wagerAntePaid: true,
          });
          s.enemyEclipse = 4;
          s.altitudes[0].player = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            openedSinceResolve: true,
          });
          s.enemyWill = START_WILL - 6;
        },
        cue: {
          sfx: "resolve",
          float: "Race Will",
          floatKind: "resolve",
          altitude: 0,
          toast: "Breach Will before they Ascend.",
          toastKind: "resolve",
        },
      },
    ],
  },
  {
    id: "breach_vs_toll",
    coach: {
      title: "vs Bellward",
      body: "Opening into Toll pays tax. Open on untaxed lanes, Breach Order for discounted Witness, and kill Peal seats with Resolve wins. Scarforge refunds help pay the tax once — do not Open Mid into a live Peal without Sight banked.",
      action: "Open off-Toll · Order discount",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "breach", top: "toll" },
    demoBeats: [
      {
        line: "Toll on Mid. Scar Opens Low with refund — tax avoided, Breach still live.",
        setup: (s) => {
          resetDemoSeats(s);
          s.tollOwner[1] = "enemy";
          s.pealArmed[1] = true;
          s.altitudes[1].enemy = mintTutorUnit("bell_debt_walker", { veiled: true });
          s.altitudes[2].player = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            openedSinceResolve: true,
          });
          s.sight = 4;
        },
        cue: {
          sfx: "witness",
          float: "Open Low",
          floatKind: "witness",
          altitude: 2,
          toast: "Low refund helps pay future tax.",
          toastKind: "witness",
        },
      },
    ],
  },
  {
    id: "breach_curve_tips",
    coach: {
      title: "Curve tips",
      body: "Bank Sight for at least one Open per window. Breach Order stretches thin Sight. Scarforge before the Open seat. Rivet Charm on the winner. Do not Overexpose three lanes when one win Breaks. High for chip, Mid for dig, Low for refund Opens.",
      action: "One clean Open · win Resolve",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "breach_win_break",
    coach: {
      title: "Win · Break",
      body: "Scar's primary win is Break via Breach Will. Eclipse and Law are backups. Count enemy Will after every Opened Resolve. Keep at least one Opened winner alive; Urn free Witness restarts the blade.",
      action: "Primary path: Breach Break",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow" },
  },
  {
    id: "breach_outro",
    coach: {
      title: "You see · Scar",
      body: "Open turns the blade on. Breach Will chips hard. Overexpose punishes greed. Scarforge, Rivet, Order, and Iron Urn keep Sight and Opens flowing. Enter Gaze with Scar Teach and Break.",
      action: "Ready for Breach matches",
      cta: "Finish Scar Teach",
    },
    target: { kind: "none" },
  },
];

export const BREACH_CURRICULUM: Curriculum = {
  id: "breach",
  title: "Scar · Breach",
  blurb: "Open, Breach Will, Overexpose risk — Break fast.",
  lessons: [
    ...coreGazeLessons("breach", {
      figureId: "rivet_vanguard",
      figureName: "Rivet Vanguard",
      craftTitle: "Scar",
      craftVerb: "Breach",
    }),
    ...craftSpecificLessons,
  ],
};
