import type { Curriculum, LessonDef } from "../types";
import { coreGazeLessons } from "../coreLessons";
import { clearBoardForLesson, mintTutorUnit, resetDemoSeats } from "../boardPrep";

const craftSpecificLessons: LessonDef[] = [
  {
    id: "motley_kit_overview",
    coach: {
      title: "Motley kit",
      body: "Motley Tricks. Stance A/B swaps how you fight while Veiled. Wager antes Sight (or Favor) for Cash or Bust. Favor funds Trick Eclipse — Ascend at 10 without Breaking Will. Stay Veiled when the bet is live; Forced Expose Busts the ante. Every Motley card feeds Stance, Wager, Favor, or Eclipse.",
      action: "Stance · Wager · Favor · Eclipse",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
  },
  {
    id: "motley_stance_a_b",
    coach: {
      title: "Stance A / B",
      body: "Stance is Motley's mask. Stance A is the default face. Stance B flips your Veiled fight profile — often a power swap — and prints the B badge. Switching Stance is a deliberate button (once per window unless a card Free Switches). Read whether you want B's wall and Trick line, or A's safer print.",
      action: "A = default · B = Trick face",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
        hasThirdFace: true,
      });
    },
  },
  {
    id: "motley_stance_b_wall",
    coach: {
      title: "Stance B wall",
      body: "While Veiled in Stance B, normal Ink Stain Erase Holds — the Trick wall. Ink must Press into B (free) to pierce. Keep B up when you are Marked; drop B only when you need Witnessed power or a Cash that does not need the wall. B is armor and Eclipse fuel, not free Will chips.",
      action: "B walls Stain Erase while Veiled",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
        stained: true,
      });
      state.altitudes[1].enemy = mintTutorUnit("blot_herald", {
        veiled: false,
        revelationFired: true,
      });
    },
  },
  {
    id: "motley_favor_currency",
    coach: {
      title: "Favor",
      body: "Favor is Motley's second currency (cap 3). You need Favor funded before Resolve to score Trick Eclipse — the Ascend path spends Favor when the Trick lands. Gain Favor from cards like Gala Call and Favor Broker. Never ante your last Favor away if Eclipse is the plan; bank at least 1 for the win Resolve.",
      action: "Favor fuels Trick Eclipse",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.favor = 2;
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
      });
    },
  },
  {
    id: "motley_wager_ante",
    coach: {
      title: "Wager ante",
      body: "Wager commits an ante — usually 1 Sight, sometimes Favor or a Free Wager from cards. The bet is public (WAGER badge). You may Wager once per window unless a card says otherwise. Ante only when you expect to stay Veiled and win, or when Bust is cheap.",
      action: "Ante Sight · public bet",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
        wagered: true,
        wagerAntePaid: true,
      });
      state.wagerUsed.player = true;
      state.sight = 3;
    },
  },
  {
    id: "motley_cash_bust",
    coach: {
      title: "Cash / Bust",
      body: "Cash: win Resolve while still Veiled and Wagered — refund or payoff triggers fire, often Sight or draw. Bust: lose Resolve or become Forced Exposed while Wagered — ante gone, sometimes foe gains Sight. Stance B + Veiled win is the Cash you want. Do not Wager a lane Ink can Press-Expose.",
      action: "Veiled win = Cash · Expose = Bust",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
        wagered: true,
        wagerAntePaid: true,
      });
      state.altitudes[1].enemy = null;
      state.sight = 4;
    },
  },
  {
    id: "motley_trick_eclipse",
    coach: {
      title: "Trick Eclipse",
      body: "Trick Eclipse: win Resolve while Veiled, Stance B, and Wagered with Favor funded — Eclipse rises and Favor is spent. Reach 10 Eclipse to Ascend. Fund Favor before that Resolve; an empty Favor track means Cash without the Ascend tick. Motley's primary win is Eclipse; Break is backup.",
      action: "Veiled + B + Wager + Favor → Eclipse",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow .ecl-pip" },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.favor = 1;
      state.eclipse = 2;
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
        wagered: true,
        wagerAntePaid: true,
      });
    },
  },
  {
    id: "motley_site_antehall",
    coach: {
      title: "Site · Velvet Antehall",
      body: "Velvet Antehall pays Sight when a friendly Figure here Switches Stance or Cashes. Park your Wager fighter on the Antehall so every mask flip and Cash refunds looking. Replace only when another Motley Site outclasses the bank.",
      action: "Antehall banks Stance / Cash",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "velvet_antehall",
    caption: {
      kicker: "SITE · Velvet Antehall",
      rules: "On Stance Switch here → +1 Sight. On Cash here → +1 Sight.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].playerSite = "velvet_antehall";
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
      });
      state.hand = ["velvet_antehall"];
    },
  },
  {
    id: "motley_relic_coinface",
    coach: {
      title: "Relic · Coinface Charm",
      body: "Coinface Charm Grafts +1 while Witnessed. When the host Switches Stance while Veiled, gain 1 Sight. When the host Cashes, draw 1. Graft on your Trick seat so mask flips fuel Sight and Cash draws deepen the hand.",
      action: "Graft Coinface on the Trick seat",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "coinface_charm",
    caption: {
      kicker: "RELIC · Coinface Charm",
      rules: "+1 Witnessed. Stance Switch while Veiled → Sight. Cash → draw.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
        grafts: [{ cardId: "coinface_charm", instanceId: "tut-coin" }],
      });
      state.hand = ["coinface_charm"];
    },
  },
  {
    id: "motley_rite_gala",
    coach: {
      title: "Rite · Gala Call",
      body: "Gala Call is a one-shot: gain 1 Favor, and until Resolve your Stance B Figures have +1 power. Play it the window you need Favor funded and a denser B wall for Cash / Trick Eclipse.",
      action: "Fund Favor · buff B",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "gala_call",
    caption: {
      kicker: "RITE · Gala Call",
      rules: "Gain 1 Favor. Until Resolve: Stance B Figures +1 power.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.favor = 1;
      state.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
        veiled: true,
        stanceB: true,
      });
      state.hand = ["gala_call"];
    },
  },
  {
    id: "motley_vessel_masque",
    coach: {
      title: "Vessel · Masque Urn",
      body: "Masque Urn tucks an Inhabitant. Revelation: Free Wager this if able. Fall / Forced Expose: Free Wager another friendly Veiled Figure. Continuity for the bet — when the mask breaks, another ante can still go live.",
      action: "Urn Free Wagers",
      cta: "Next",
    },
    target: { kind: "card", anchor: "essence" },
    showsCard: true,
    teachCard: "masque_urn",
    caption: {
      kicker: "VESSEL · Masque Urn",
      rules: "Inhabitant. Revelation Free Wager. Fall / Expose: Free Wager another Veiled ally.",
    },
    prepare: (state) => {
      clearBoardForLesson(state);
      state.altitudes[0].player = mintTutorUnit("masque_urn", {
        veiled: true,
        inhabitant: "whitecard_mummer",
      });
      state.hand = ["masque_urn"];
    },
  },
  {
    id: "motley_combo_demo",
    coach: {
      title: "Combo · Trick line",
      body: "Watch bottom Motley vs top Ink. Stance B, Wager ante, then Trick Eclipse with Favor funded. Follow badges and ECL.",
      action: "Tap Watch — Stance / Wager / Eclipse",
      cta: "Watch",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "motley", top: "ink" },
    demoBeats: [
      {
        line: "Motley flips Stance B on MID with Antehall. B walls Erase while Veiled.",
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
          toast: "Stance B — Erase wall while Veiled.",
          toastKind: "stance",
        },
      },
      {
        line: "Wager antes Sight. Public bet — Forced Expose would Bust.",
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
          toast: "Win Veiled for Cash. Expose = Bust.",
          toastKind: "stance",
        },
      },
      {
        line: "Gala Call funded Favor earlier. Win Veiled + B + Wager → Trick Eclipse.",
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
          toast: "Favor spent — Eclipse rose toward Ascend.",
          toastKind: "eclipse",
          focusSel: "#willrow .ecl-pip",
        },
      },
      {
        line: "Cash refunds and Antehall Sight keep the next ante alive. Climb to 10 ECL.",
        setup: (s) => {
          s.eclipse = 3;
          s.favor = 1;
          s.sight = 5;
        },
        cue: {
          sfx: "eclipse",
          float: "Climb ECL",
          floatKind: "eclipse",
          toast: "Primary win: Ascend at 10 Eclipse.",
          toastKind: "eclipse",
          focusSel: "#willrow .ecl-pip",
        },
      },
    ],
  },
  {
    id: "motley_vs_ink",
    coach: {
      title: "vs Ink",
      body: "Ink Presses into B for free. Keep Favor for Eclipse elsewhere, or hold a second Stance seat. Do not Wager the Pressed lane — Bust loses the ante. Pivot Witnessed only when Press is spent and Erase is offline.",
      action: "Watch — survive Press",
      cta: "Watch",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "motley", top: "ink" },
    demoBeats: [
      {
        line: "Ink Presses Motley B. Do not Cash this lane — Motley passes the bet to another seat.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].player = mintTutorUnit("whitecard_mummer", {
            veiled: true,
            stanceB: true,
            pressed: true,
            pressedBy: "enemy",
          });
          s.altitudes[1].enemy = mintTutorUnit("mire_duelist", {
            veiled: false,
            revelationFired: true,
          });
          s.altitudes[2].player = mintTutorUnit("favor_broker", {
            veiled: true,
            stanceB: true,
            wagered: true,
            wagerAntePaid: true,
          });
          s.favor = 2;
        },
        cue: {
          sfx: "strain",
          float: "Bet elsewhere",
          floatKind: "press",
          altitude: 2,
          toast: "Pressed lane Busts if Wagered — Trick on Low instead.",
          toastKind: "stance",
        },
      },
      {
        line: "Low Cashes with Favor → Trick Eclipse while Mid accepts Pierce risk.",
        setup: (s) => {
          s.eclipse = 2;
          s.favor = 1;
          s.altitudes[2].enemy = null;
        },
        cue: {
          sfx: "eclipse",
          float: "Trick elsewhere",
          floatKind: "eclipse",
          altitude: 2,
          toast: "Eclipse path survives Ink Press.",
          toastKind: "eclipse",
        },
      },
    ],
  },
  {
    id: "motley_vs_toll",
    coach: {
      title: "vs Bellward",
      body: "Toll taxes Witness and Gaze. Motley stays Veiled for Cash, so tax hurts less — but Peal still pays Bellward. Blind and Lure clear your bets; keep ante on untaxed lanes and Ascend before the tax grind Breaks you.",
      action: "Stay Veiled · ante off-Toll",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "motley", top: "toll" },
    demoBeats: [
      {
        line: "Toll on MID. Motley Wagers Low instead — Veiled Cash avoids Witness tax.",
        setup: (s) => {
          resetDemoSeats(s);
          s.tollOwner[1] = "enemy";
          s.altitudes[1].enemy = mintTutorUnit("bell_debt_walker", { veiled: true });
          s.altitudes[2].player = mintTutorUnit("whitecard_mummer", {
            veiled: true,
            stanceB: true,
            wagered: true,
            wagerAntePaid: true,
          });
          s.favor = 2;
        },
        cue: {
          sfx: "stance",
          float: "Ante off-Toll",
          floatKind: "wager",
          altitude: 2,
          toast: "Veiled Trick lanes dodge Witness tax.",
          toastKind: "stance",
        },
      },
    ],
  },
  {
    id: "motley_vs_breach",
    coach: {
      title: "vs Scar",
      body: "Scar Opens for Breach Will. Motley walls with B while Veiled and races Eclipse. If Scar Opens into your Wager, Bust risk spikes — Cash before they Open, or Blind their Open lane. Favor first; do not race raw Will chips against Breach.",
      action: "Eclipse race · Bust-safe antes",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#altitudes" },
    demoCrafts: { bottom: "motley", top: "breach" },
    demoBeats: [
      {
        line: "Scar Opens on MID. Motley keeps Veiled B Wager on High for Trick Eclipse.",
        setup: (s) => {
          resetDemoSeats(s);
          s.altitudes[1].enemy = mintTutorUnit("rivet_vanguard", {
            veiled: false,
            revelationFired: true,
            openedSinceResolve: true,
          });
          s.altitudes[0].player = mintTutorUnit("whitecard_mummer", {
            veiled: true,
            stanceB: true,
            wagered: true,
            wagerAntePaid: true,
          });
          s.favor = 2;
          s.eclipse = 3;
        },
        cue: {
          sfx: "eclipse",
          float: "Race Ascend",
          floatKind: "eclipse",
          altitude: 0,
          toast: "Do not Will-race Breach — climb Eclipse.",
          toastKind: "eclipse",
        },
      },
    ],
  },
  {
    id: "motley_curve_tips",
    coach: {
      title: "Curve tips",
      body: "Hold 1 Sight for Stance or Wager every window. Play Gala Call before the Trick Resolve so Favor is live. Mid draws help dig to Favor brokers. Low Veiled +1 pairs with Cash Holds. Never Witness your Trick seat the window you need Eclipse.",
      action: "Favor before Resolve · stay Veiled",
      cta: "Next",
    },
    target: { kind: "none" },
  },
  {
    id: "motley_win_eclipse",
    coach: {
      title: "Win · Eclipse",
      body: "Motley's primary win is Eclipse Ascend at 10. Trick Eclipse spends Favor — keep the track fed. Break is available if Ink stalls your masks, but your kit sings when ECL climbs. Count Favor and ECL every Pass.",
      action: "Primary path: Ascend",
      cta: "Next",
    },
    target: { kind: "dom", sel: "#willrow .ecl-pip" },
  },
  {
    id: "motley_outro",
    coach: {
      title: "You see · Motley",
      body: "Stance B walls and fuels. Wager Cashes or Busts. Favor funds Trick Eclipse. Sites, Charms, Gala, and Masque Urns keep the bet alive. Enter Gaze with Motley Teach and Ascend.",
      action: "Ready for Motley matches",
      cta: "Finish Motley Teach",
    },
    target: { kind: "none" },
  },
];

export const MOTLEY_CURRICULUM: Curriculum = {
  id: "motley",
  title: "Motley · Trick",
  blurb: "Stance, Wager, Favor — Trick Eclipse to Ascend.",
  lessons: [
    ...coreGazeLessons("motley", {
      figureId: "whitecard_mummer",
      figureName: "Whitecard Mummer",
      craftTitle: "Motley",
      craftVerb: "Trick",
    }),
    ...craftSpecificLessons,
  ],
};
