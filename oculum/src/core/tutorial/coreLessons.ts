import type { LessonDef } from "./types";

type LiveCraft = "ink" | "motley" | "toll" | "breach";

const TYPE_CARDS: Record<
  LiveCraft,
  {
    site: string;
    relic: string;
    rite: string;
    vessel: string;
    siteName: string;
    relicName: string;
    riteName: string;
    vesselName: string;
  }
> = {
  ink: {
    site: "stainwell",
    relic: "smother_cord",
    rite: "ashen_tithe",
    vessel: "gulf_urn",
    siteName: "Stainwell",
    relicName: "Smother Cord",
    riteName: "Ashen Tithe",
    vesselName: "Gulf Urn",
  },
  motley: {
    site: "velvet_antehall",
    relic: "coinface_charm",
    rite: "gala_call",
    vessel: "masque_urn",
    siteName: "Velvet Antehall",
    relicName: "Coinface Charm",
    riteName: "Gala Call",
    vesselName: "Masque Urn",
  },
  toll: {
    site: "cloth_bellspire",
    relic: "bellcord_charm",
    rite: "sound_the_toll",
    vessel: "peal_urn",
    siteName: "Cloth Bellspire",
    relicName: "Bellcord Charm",
    riteName: "Sound the Toll",
    vesselName: "Peal Urn",
  },
  breach: {
    site: "scarforge",
    relic: "rivet_charm",
    rite: "breach_order",
    vessel: "iron_urn",
    siteName: "Scarforge",
    relicName: "Rivet Charm",
    riteName: "Breach Order",
    vesselName: "Iron Urn",
  },
};

/**
 * Full Gaze fundamentals — embedded in every heresy tutorial (no shortcuts).
 * Prefix = craft id so lesson ids never collide.
 */
export function coreGazeLessons(
  craft: LiveCraft,
  opts: { figureId: string; figureName: string; craftTitle: string; craftVerb: string },
): LessonDef[] {
  const p = craft;
  const t = TYPE_CARDS[craft];
  return [
    {
      id: `${p}_intro`,
      coach: {
        title: `${opts.craftTitle} · Tutorial`,
        body: `This is the full ${opts.craftTitle} tutorial — not a skim. You will learn shared Gaze law (Veil, Witness, Essence, Sight, Will, Eclipse, altitudes, Pass/Resolve) and then every ${opts.craftVerb} verb, how the pieces combo, and how rivals answer you. Stay until the outro.`,
        action: "No shortcuts",
        cta: "Begin",
      },
      target: { kind: "none" },
    },
    {
      id: `${p}_essence`,
      coach: {
        body: "ESSENCE (gold pip, top-left on the card) is the cost to play a card from your hand into a lane. You and the foe each track Essence. It refills each new round after Resolve. If you cannot afford the gold number, you cannot play that card.",
        action: "Find the gold pip",
        cta: "Next",
      },
      showsCard: true,
      teachCard: opts.figureId,
      target: { kind: "card", anchor: "essence" },
      caption: {
        kicker: `ESSENCE · ${opts.figureName}`,
        rules: "Gold pip = play cost from hand. Spend Essence to summon / place / cast.",
      },
    },
    {
      id: `${p}_witness_cost`,
      coach: {
        body: "WITNESS COST (teal pip, top-right) is how much Sight you spend to flip a Veiled Figure Face-up. That flip is Witnessing — the card becomes real, uses Witnessed power, and fires its one-time Revelation. Gaze spends Sight the same way to Witness an enemy Figure (you steal their Revelation).",
        action: "Find the teal pip",
        cta: "Next",
      },
      showsCard: true,
      teachCard: opts.figureId,
      target: { kind: "card", anchor: "witness" },
      caption: {
        kicker: `WITNESS COST · ${opts.figureName}`,
        rules: "Teal pip = Sight to Witness (or Gaze). Live cost can change on High (−1) / Low (+1).",
      },
    },
    {
      id: `${p}_power`,
      coach: {
        body: "Every Figure prints two powers: Veiled (half-real, usually safer/weaker) and Witnessed (fully real, usually stronger). While Veiled you can lose Resolve fights and still Hold — you do not Fall until Forced Exposed or you Witness yourself. Live power on the board can rise from grafts, Sites, Stance, and buffs.",
        action: "Read Veiled / Witnessed",
        cta: "Next",
      },
      showsCard: true,
      teachCard: opts.figureId,
      target: { kind: "card", anchor: "power" },
      caption: {
        kicker: `POWER · ${opts.figureName}`,
        rules: "Veiled N / Witnessed M on the face. Board seals show live power.",
      },
    },
    {
      id: `${p}_will`,
      coach: {
        body: "WILL is life. Both seats start at 30. When both players Pass, lanes Resolve — higher power chips the loser's Will (High winners chip +1 before halving rules apply). Hit 0 Will and you Break: you lose. Breaking the foe is the primary win for most crafts.",
        action: "Look at Will bars",
        cta: "Next",
      },
      target: { kind: "dom", sel: "#willrow" },
    },
    {
      id: `${p}_sight`,
      coach: {
        body: "SIGHT is looking currency. Spend it to Witness, Gaze, Press, Peal, ante a Wager, or craft commits like Open. You gain Sight each turn from Witnessed yields and Sites — unless that altitude is Blind. Blind means that lane yields no Sight this turn. Run out of Sight and you cannot flip or densify.",
        action: "Look at Sight",
        cta: "Next",
      },
      target: { kind: "dom", sel: "#meters .meter.sight" },
    },
    {
      id: `${p}_eclipse`,
      coach: {
        body: "ECLIPSE is a second win track. Reach 10 Eclipse to Ascend — you win without Breaking Will. Motley banks Eclipse with Trick wins (Veiled + Stance B + paid Wager + Favor). Other crafts can still score Eclipse from rares or Law. Watch ECL you · foe on the Will row.",
        action: "Look at Eclipse",
        cta: "Next",
      },
      target: { kind: "dom", sel: "#willrow .ecl-pip" },
    },
    {
      id: `${p}_lanes`,
      coach: {
        body: "Three altitudes always matter. HIGH: Gaze costs 1 less Sight; Resolve winners chip +1 Will before soft rules. MID: Witness your own Figure here to draw 1. LOW: Veiled fighters hit harder; Witness/Gaze here refunds Sight. Crafts hang Tolls, Sites, and Marks on these lanes — never treat them as identical.",
        action: "Look at High / Mid / Low",
        cta: "Next",
      },
      target: { kind: "dom", sel: "#altitudes" },
    },
    {
      id: `${p}_types_figure`,
      coach: {
        body: `FIGURES are fighters. They enter Veiled. You spend Sight to Witness them — power flips up and Revelation fires once. ${opts.figureName} is your ${opts.craftTitle} example. Graft Relics onto Figures. They contest Resolve and can Fall when Witnessed and beaten twice (Strain then Fall) or erased through craft kill paths.`,
        action: `Study ${opts.figureName}`,
        cta: "Next",
      },
      showsCard: true,
      teachCard: opts.figureId,
      target: { kind: "card", anchor: "power" },
      caption: {
        kicker: `FIGURE · ${opts.figureName}`,
        rules: "Fighter. Enters Veiled. Witness for power + one-time Revelation.",
      },
    },
    {
      id: `${p}_types_site`,
      coach: {
        body: `SITES are landmarks on a lane — not fighters. They enter already Witnessed and stay. They change the rules of their altitude (power, Sight, Marks, taxes). Example for ${opts.craftTitle}: ${t.siteName}. One Site per seat per altitude.`,
        action: `Study ${t.siteName}`,
        cta: "Next",
      },
      showsCard: true,
      teachCard: t.site,
      target: { kind: "card", anchor: "essence" },
      caption: {
        kicker: `SITE · ${t.siteName}`,
        rules: "Landmark. Enters Witnessed. Shapes its lane for the rest of the match.",
      },
    },
    {
      id: `${p}_types_relic`,
      coach: {
        body: `RELICS are Charms you Graft onto your Figure. They cost Essence to play onto a host and add power and/or triggers while attached. Example: ${t.relicName}. Tap graft badges on the board to inspect Charms.`,
        action: `Study ${t.relicName}`,
        cta: "Next",
      },
      showsCard: true,
      teachCard: t.relic,
      target: { kind: "card", anchor: "essence" },
      caption: {
        kicker: `RELIC · ${t.relicName}`,
        rules: "Charm Grafted onto a Figure. Boosts and triggers with the host.",
      },
    },
    {
      id: `${p}_types_rite`,
      coach: {
        body: `RITES are one-shot spells. Play → effect resolves → gone. They do not sit on the board. Example: ${t.riteName}. Many rites need a target altitude. Read the toast — rites are easy to miss if you only watch the board.`,
        action: `Study ${t.riteName}`,
        cta: "Next",
      },
      showsCard: true,
      teachCard: t.rite,
      target: { kind: "card", anchor: "essence" },
      caption: {
        kicker: `RITE · ${t.riteName}`,
        rules: "One-shot spell. Cast, resolve, gone — no board body.",
      },
    },
    {
      id: `${p}_types_vessel`,
      coach: {
        body: `VESSELS / URNS tuck a Figure as an Inhabitant (INH badge). They are continuity after death — not normal fighters. Example: ${t.vesselName}. On play you can tuck from hand or tuck the Figure you play over. Revelation and Fall lines often release or spread effects.`,
        action: `Study ${t.vesselName}`,
        cta: "Next",
      },
      showsCard: true,
      teachCard: t.vessel,
      target: { kind: "card", anchor: "essence" },
      caption: {
        kicker: `VESSEL · ${t.vesselName}`,
        rules: "Urn. Tucks an Inhabitant. Continuity / release lines matter.",
      },
    },
    {
      id: `${p}_loop_veil`,
      coach: {
        body: "VEIL is half-real armor. A Veiled Figure that loses Resolve Holds — it does not die. To kill through Veil you need Forced Expose (Press, Scrutiny 2, or craft erase) or the controller Witnesses willingly. Witnessed losers take Strain; a second Witnessed loss = Fall (dies). Never forget: Veiled ≠ safe forever, but it buys time.",
        action: "Veil vs Fall",
        cta: "Next",
      },
      target: { kind: "dom", sel: "#altitudes" },
    },
    {
      id: `${p}_loop_turn`,
      coach: {
        body: "TURN LOOP (memorize): (1) Play cards Veiled from hand for Essence. (2) Spend Sight — Witness / Gaze / craft buttons (Press, Stance, Wager, Peal…). (3) Pass when your window is done. When BOTH seats Pass, altitudes Resolve and Will chips. Then a new round: Essence refills, Sight yields tick, Blind clears. Match ends on Break, Eclipse 10, or round 10.",
        action: "Play → Sight → Pass → Resolve",
        cta: "Next",
      },
      target: { kind: "dom", sel: "#altitudes" },
    },
  ];
}
