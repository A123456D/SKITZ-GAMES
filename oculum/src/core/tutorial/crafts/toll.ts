import type { Curriculum, LessonDef } from "../types";
import { coreGazeLessons } from "../coreLessons";
import { clearBoardForLesson, mintTutorUnit, resetDemoSeats } from "../boardPrep";

const craftSpecificLessons: LessonDef[] = [
  {
    id: "toll_kit_overview",
    coach: {
      title: "Bellward kit",
      body: "Bellward Tolls looking. Place a Toll on a lane — sticky tax when the foe Witnesses or Gazes into it. Peal arms that Toll so Resolve pays you Sight and a card. Lure yanks a Veiled foe (often clearing Toll). Resonance is the echo ping when Tolls fire or rites Sound. Tax their Sight, then Break or stall to Law.",
      action: "Toll · tax · Peal · Lure · Resonance",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
  },
  {
    id: "toll_tax_verb",
    coach: {
      title: "Toll tax",
      body: "A Toll marks an altitude (TOLL badge) owned by you. When the enemy spends Sight to Witness or Gaze into that lane, they pay Sight tax and you often gain Sight. Tolls stick until spent, Lured, or overwritten. Place Tolls on lanes they must Open — Mid draws and High Gazes are prime.",
      action: "TOLL = sticky looking tax",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
      state.tollOwner[1] = "player";
    },
  },
  {
    id: "toll_peal_arm",
    coach: {
      title: "Peal",
      body: "Peal costs Sight (once per window) to arm a Toll you own. When Resolve spends that Toll, Peal pays Sight and draw. Arm only when the tax will fire or Resolve will spend — wasted Peal burns Sight. Sound the Toll and Cloth Bellspire amplify Peal windows.",
      action: "Arm Peal when tax will fire",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
      state.tollOwner[1] = "player";
      state.pealArmed[1] = true;
      state.pealUsed.player = true;
      state.sight = 4;
    },
  },
  {
    id: "toll_lure_verb",
    coach: {
      title: "Lure",
      body: "Lure pulls an enemy Veiled Figure — often clearing the Toll on that lane as the price of the yank. Sound the Toll Lures when the lane is already Tolled. Use Lure to break Veil setups, spoil Motley Wagers, or reposition Scar before they Open. Lure is disruption, not a Will chip.",
      action: "Lure yank · often clears Toll",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("bell_debt_walker", {
        veiled: false,
        revelationFired: true,
      });
      state.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", { veiled: true });
      state.tollOwner[1] = null;
    },
  },
  {
    id: "toll_resonance",
    coach: {
      title: "Resonance",
      body: "Resonance is Bellward's echo — it fires when you Toll a fresh lane via rites like Sound the Toll, and other cards listen (Choir Loft gains Sight; Carillon and Bellcord draw or buff). Think of Resonance as the ping that pays Sites and grafts. Stack listeners before you Sound.",
      action: "Resonance = echo payoffs",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].playerSite = "choir_loft";
      state.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
      state.tollOwner[1] = "player";
      state.sight = 5;
    },
  },
  {
    id: "toll_site_bellspire",
    coach: {
      title: "Site · Cloth Bellspire",
      body: "Cloth Bellspire: when a Toll is paid or touched here, gain 1 Sight. Anchor your primary tax lane on Bellspire so every tax tick refunds looking for the next Peal.",
      action: "Bellspire banks Toll touches",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "cloth_bellspire",
    caption: {
      kicker: "SITE · Cloth Bellspire",
      rules: "When a Toll is paid or touched here, gain 1 Sight.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].playerSite = "cloth_bellspire";
      state.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
      state.tollOwner[1] = "player";
      state.hand = ["cloth_bellspire"];
    },
  },
  {
    id: "toll_site_choir",
    coach: {
      title: "Site · Choir Loft",
      body: "Choir Loft: when Resonance happens for you, gain 1 Sight. Pair Loft with Sound the Toll and fresh Tolls so every echo refunds Sight. Two Sites can split roles — Bellspire on the tax lane, Loft on a Resonance seat.",
      action: "Loft listens to Resonance",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "choir_loft",
    caption: {
      kicker: "SITE · Choir Loft",
      rules: "When Resonance happens for you, gain 1 Sight.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[0].playerSite = "choir_loft";
      state.altitudes[0].player = mintTutorUnit("path_bellman", { veiled: true });
      state.hand = ["choir_loft"];
    },
  },
  {
    id: "toll_relic_bellcord",
    coach: {
      title: "Relic · Bellcord Charm",
      body: "Bellcord Charm Grafts +1 while Witnessed. When you Toll the host's altitude, gain 1 Sight. When Resonance fires for you while host is Witnessed, draw 1. Graft on the body that sits under your tax Site.",
      action: "Graft Bellcord on the tax seat",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "bellcord_charm",
    caption: {
      kicker: "RELIC · Bellcord Charm",
      rules: "+1 Witnessed. Toll host lane → Sight. Resonance while Witnessed → draw.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("bell_debt_walker", {
        veiled: false,
        revelationFired: true,
        grafts: [{ cardId: "bellcord_charm", instanceId: "tut-bellcord" }],
      });
      state.tollOwner[1] = "player";
      state.hand = ["bellcord_charm"];
    },
  },
  {
    id: "toll_rite_sound",
    coach: {
      title: "Rite · Sound the Toll",
      body: "Sound the Toll: if the lane is not Tolled, Toll it and fire Resonance. If already Tolled: Lure an enemy Veiled Figure there (clears the Toll), else gain 1 Sight. Peal the same window after Sound for bonus Sight. Sound is your flexible Toll / Lure switch.",
      action: "Fresh Toll + Resonance · or Lure",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "sound_the_toll",
    caption: {
      kicker: "RITE · Sound the Toll",
      rules: "Untolled → Toll + Resonance. Tolled → Lure (clear) or +1 Sight. Peal after Sound → +1 Sight.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].enemy = mintTutorUnit("blot_herald", { veiled: true });
      state.hand = ["sound_the_toll"];
    },
  },
  {
    id: "toll_vessel_peal_urn",
    coach: {
      title: "Vessel · Peal Urn",
      body: "Peal Urn stores an Inhabitant. Revelation: Toll this altitude if able; otherwise Lure. Fall: Toll another altitude if able; otherwise Lure. When the Urn breaks, tax spreads — continuity for the shrine.",
      action: "Urn spreads Toll / Lure",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "peal_urn",
    caption: {
      kicker: "VESSEL · Peal Urn",
      rules: "Inhabitant. Revelation Toll or Lure. Fall: Toll or Lure elsewhere.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[0].player = mintTutorUnit("peal_urn", {
        veiled: true,
        inhabitant: "bell_debt_walker",
      });
      state.hand = ["peal_urn"];
    },
  },
  {
    id: "toll_combo_demo",
    coach: {
      title: "Combo · Tax line",
      body: "Watch bottom Bellward vs top Ink. Toll, tax on Witness, then Peal payout. Follow TOLL and PEAL badges.",
      action: "Tap Watch — Toll · tax · Peal",
      cta: "Watch",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "toll", top: "ink" },
    demoBeats: [
      {
        line: "Bellward places Toll on MID. Sticky tax — look for the TOLL badge.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
          s.altitudes[1].playerSite = "cloth_bellspire";
          s.tollOwner[1] = "player";
        },
        cue: {
          sfx: "rite",
          float: "Toll placed",
          floatKind: "toll",
          altitude: 1,
          toast: "Enemy Witness/Gaze into Mid pays tax.",
          toastKind: "rite",
        },
      },
      {
        line: "Ink Witnesses into the Toll — pays Sight tax. Bellward gains Sight via Bellspire.",
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
          toast: "Looking became expensive.",
          toastKind: "rite",
        },
      },
      {
        line: "Peal was armed (−1 Sight). Resolve spends the Toll — Peal pays Sight + draw.",
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
          toast: "Peal payout on Resolve spend.",
          toastKind: "rite",
        },
      },
      {
        line: "Resonance from Sound earlier fed Choir Loft Sight. Tax engine is rolling.",
        setup: (s) => {
          s.altitudes[0].playerSite = "choir_loft";
          s.sight = 6;
        },
        cue: {
          sfx: "rite",
          float: "Resonance",
          floatKind: "toll",
          altitude: 0,
          toast: "Listeners pay when echoes fire.",
          toastKind: "rite",
        },
      },
    ],
  },
  {
    id: "toll_vs_ink",
    coach: {
      title: "vs Ink",
      body: "Ink Blinds tax lanes and Presses your Toll seat. Re-Toll after Blind, Peal only live taxes, and Lure Stained Press threats off your shrine. Do not Witness into their Stainwell without Sight to spare.",
      action: "Watch — tax through Blind",
      cta: "Watch",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "toll", top: "ink" },
    demoBeats: [
      {
        line: "Ink Blinds Mid Toll. Bellward Sounds High instead — fresh Toll + Resonance.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].blinded = true;
          s.tollOwner[1] = "player";
          s.altitudes[0].player = mintTutorUnit("path_bellman", { veiled: true });
          s.tollOwner[0] = "player";
          s.altitudes[0].playerSite = "choir_loft";
        },
        cue: {
          sfx: "rite",
          float: "Re-Toll High",
          floatKind: "toll",
          altitude: 0,
          toast: "Blinded tax lanes — move the shrine.",
          toastKind: "rite",
        },
      },
      {
        line: "Lure yanks the Press threat. Toll clears, but Ink loses the Erase seat.",
        setup: (s) => {
          s.altitudes[1].blinded = false;
          s.tollOwner[1] = null;
          s.altitudes[1].enemy = null;
          s.altitudes[2].enemy = mintTutorUnit("mire_duelist", { veiled: true, stained: true });
        },
        cue: {
          sfx: "select",
          float: "Lure",
          floatKind: "lure",
          altitude: 1,
          toast: "Lure spoils Press lines.",
          toastKind: "rite",
        },
      },
    ],
  },
  {
    id: "toll_vs_motley",
    coach: {
      title: "vs Motley",
      body: "Motley stays Veiled to Cash — Witness tax hits less. Tax Gaze and forced Opens; Lure Wager seats to Bust antes; Peal when they finally flip. Stall Eclipse with Blind via craft cards when you can.",
      action: "Lure Wagers · tax Opens",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "toll", top: "motley" },
    demoBeats: [
      {
        line: "Motley Wagers Mid. Sound already Tolled — Lure clears Toll and yanks the bet.",
        setup: (s) => {
          resetDemoSeats(s);
          s.tollOwner[1] = "player";
          s.altitudes[1].enemy = mintTutorUnit("whitecard_mummer", {
            veiled: true,
            stanceB: true,
            wagered: true,
            wagerAntePaid: true,
          });
          s.altitudes[1].player = mintTutorUnit("bell_debt_walker", { veiled: true });
        },
        cue: {
          sfx: "select",
          float: "Lure the bet",
          floatKind: "lure",
          altitude: 1,
          toast: "Yank Wager seats before Cash.",
          toastKind: "rite",
        },
      },
    ],
  },
  {
    id: "toll_vs_breach",
    coach: {
      title: "vs Scar",
      body: "Scar must Open (Witness) for Breach Will — perfect tax prey. Toll their Open lane, Peal the spend, and Lure if they stay Veiled too long. Race Will only after tax has starved their Sight.",
      action: "Tax the Open",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "toll", top: "breach" },
    demoBeats: [
      {
        line: "Scar Opens into Toll — tax paid, Peal armed, Breach Sight starved.",
        setup: (s) => {
          resetDemoSeats(s);
          s.tollOwner[1] = "player";
          s.pealArmed[1] = true;
          s.altitudes[1].player = mintTutorUnit("bell_debt_walker", {
            veiled: false,
            revelationFired: true,
          });
          s.altitudes[1].enemy = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            openedSinceResolve: true,
          });
          s.enemySight = 0;
          s.sight = 5;
        },
        cue: {
          sfx: "law",
          float: "Open taxed",
          floatKind: "toll",
          altitude: 1,
          toast: "Breach needs Sight — Toll takes it.",
          toastKind: "rite",
        },
      },
    ],
  },
  {
    id: "toll_curve_tips",
    coach: {
      title: "Curve tips",
      body: "Keep 1 Sight for Peal when a Toll is live. Sound early for Resonance, Sound late for Lure. Mid Toll taxes draws; High Toll taxes Gaze. Do not arm Peal on a Blinded lane. Essence curve: cheap Toll walkers, then Sites, then Urn continuity.",
      action: "Peal budget · live Tolls only",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "toll_win_paths",
    coach: {
      title: "Win paths",
      body: "Bellward often Breaks by starving Sight until Resolve chips land free. Law at turn 10 favors tax stalls. Eclipse is secondary — take it if cards gift it, but your kit is tax and grind. Count enemy Sight every window.",
      action: "Break via tax · Law stall",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow" },
  },
  {
    id: "toll_outro",
    coach: {
      title: "You see · Bellward",
      body: "Toll taxes looking. Peal cashes Resolve. Lure yanks Veil. Resonance feeds Sites and grafts. Enter Gaze with Bellward Teach and make Sight expensive.",
      action: "Ready for Toll matches",
      cta: "Finish Bellward Teach",
    },
    target: { kind: "none" },
  },
];

export const TOLL_CURRICULUM: Curriculum = {
  id: "toll",
  title: "Bellward · Toll",
  blurb: "Toll tax, Peal, Lure, Resonance — starve Sight.",
  lessons: [
    ...coreGazeLessons("toll", {
      figureId: "bell_debt_walker",
      figureName: "Bell Debt Walker",
      craftTitle: "Bellward",
      craftVerb: "Toll",
    }),
    ...craftSpecificLessons,
  ],
};
