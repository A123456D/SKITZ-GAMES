import type { CardDef } from "./types";

/**
 * Dusk Ledger — Wave 2 (bounce ledgers / spend-combo / Vessel-Debt).
 * Deepens Debt without cloning Wave 1 threshold stubs.
 */
export const DUSK_LEDGER_WAVE2: CardDef[] = [
  {
    id: "ledger_bouncer",
    name: "Ledger Bouncer",
    heresy: "deal",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "ledger bouncer canyon doorman copper coat debt tags bouncing coin-ofuda dusk terrace muscular sly original",
    text: "Revelation: Bounce the enemy Veiled Figure here if able. If Mid has no enemy Figure, gain 1 Eclipse.",
  },
  {
    id: "sundebt_widow",
    name: "Sundebt Widow",
    heresy: "deal",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "glamorous sexy sundebt widow copper-gold veil eclipsed sun jewelry canyon sunset beauty wrongness original",
    text: "Revelation: Pay 1 Eclipse: draw 2. If you cannot, gain 1 Eclipse and 1 Sight.",
  },
  {
    id: "recall_cantor",
    name: "Recall Cantor",
    heresy: "deal",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "recall cantor dusk singer wind-key staff reeling ledger ribbons canyon mid path copper charcoal original",
    text: "Revelation: Bounce a friendly Veiled Figure in another altitude to hand if able. If you have Eclipse, draw 1; else gain 1 Sight.",
  },
  {
    id: "tithe_urn",
    name: "Tithe Urn",
    heresy: "deal",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "tithe urn jackal-coin mouth copper vessel canyon dusk debt seals ledger interior original",
    text: "Vessel. Tucks a Figure from hand if able. Fall: release Inhabitant here; if you have Eclipse, gain 1 Sight. Revelation: release Inhabitant here if empty, else to hand. If you have Eclipse, draw 1.",
  },
  {
    id: "recall_gallery",
    name: "Recall Gallery",
    heresy: "deal",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "recall gallery canyon alcove empty pedestals wind-key hooks floating ofuda dusk landmark original",
    text: "Site. Your Figures here have +1 power while you have Eclipse. When you bounce a unit, gain 1 Sight.",
  },
  {
    id: "paystone_charm",
    name: "Paystone Charm",
    heresy: "deal",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "paystone charm copper eclipse amulet ledger cord canyon dusk hanging relic original",
    text: "Graft: +1 power while host Witnessed. When host Witnesses, Pay 1 Eclipse: draw 1. If Mid has no enemy Figure, also gain 1 Sight.",
  },
  {
    id: "call_the_debt",
    name: "Call the Debt",
    heresy: "deal",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "call the debt rite copper ledger whip canyon dusk bounced ofuda eclipse seals original",
    text: "Bounce an enemy Veiled Figure at this altitude if able. If you have Eclipse, draw 1.",
  },
  {
    id: "double_entry",
    name: "Double Entry",
    heresy: "deal",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "double entry rite twin ledger stamps copper ink canyon dusk original",
    text: "Pay 1 Eclipse: gain 2 Sight. If you cannot, gain 1 Eclipse.",
  },
];

export const DUSK_LEDGER_WAVE2_RITE_IDS = new Set(["call_the_debt", "double_entry"]);
