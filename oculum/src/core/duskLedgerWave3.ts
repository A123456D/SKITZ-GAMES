import type { CardDef } from "./types";

/**
 * Dusk Ledger — Wave 3 (Eclipse tax / Debt surge / Mid control).
 * Soft hate + temporary power; not another Bounce/Spend stub pack.
 */
export const DUSK_LEDGER_WAVE3: CardDef[] = [
  {
    id: "cliff_creditor",
    name: "Cliff Creditor",
    heresy: "deal",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "cliff creditor canyon bailiff copper ledger tablet debt tags dusk ledge stern coin-eye seals original",
    text: "Revelation: If the opponent has Eclipse, they lose 1 Sight and you gain 1 Sight. If Mid has no enemy Figure, gain 1 Eclipse.",
  },
  {
    id: "ledger_matron",
    name: "Ledger Matron",
    heresy: "deal",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "glamorous sexy ledger matron copper veil canyon throne dusk beauty wrongness eclipsed sun jewelry original",
    text: "Revelation: Gain 1 Eclipse. Until Resolve: your Figures have +1 power while you have Eclipse.",
  },
  {
    id: "mesa_duelist",
    name: "Mesa Duelist",
    heresy: "deal",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "mesa duelist athletic canyon fighter copper scarf wind-key blade empty mid terrace dusk sly original",
    text: "Revelation: If Mid has no enemy Figure, draw 1. If you have Eclipse, this has +1 power until Resolve.",
  },
  {
    id: "coin_urn",
    name: "Coin Urn",
    heresy: "deal",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "coin urn copper vessel stacked debt-coins jackal mouth canyon dusk ledger seals original",
    text: "Vessel. Tucks a Figure from hand if able. Fall: release Inhabitant here; if Mid has no enemy Figure, gain 1 Eclipse. Revelation: release Inhabitant here if empty, else to hand. If the opponent has Eclipse, gain 1 Sight.",
  },
  {
    id: "tithe_mast",
    name: "Tithe Mast",
    heresy: "deal",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "tithe mast canyon stake copper banners debt ofuda eclipsed sun dusk landmark original",
    text: "Site. Your Figures here have +1 power while Mid has no enemy Figure. When an enemy Witnesses a Figure here, if you have Eclipse, gain 1 Sight.",
  },
  {
    id: "eclipse_cord",
    name: "Eclipse Cord",
    heresy: "deal",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "eclipse cord copper braid eclipsed-sun pendant canyon dusk hanging relic original",
    text: "Graft: +1 power while host Witnessed. When host Witnesses, if the opponent has Eclipse, they lose 1 Sight.",
  },
  {
    id: "foreclose",
    name: "Foreclose",
    heresy: "deal",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "foreclose rite copper seal stamp closing canyon ledger dusk eclipse original",
    text: "Pay 1 Eclipse: Bounce the enemy Veiled Figure at this altitude if able; if you bounced, draw 1. If you cannot pay, gain 1 Sight.",
  },
  {
    id: "open_books",
    name: "Open Books",
    heresy: "deal",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "open books rite unfurled canyon ledger copper pages dusk wind original",
    text: "If Mid has no enemy Figure, gain 1 Eclipse and draw 1. Otherwise gain 1 Sight.",
  },
];

export const DUSK_LEDGER_WAVE3_RITE_IDS = new Set(["foreclose", "open_books"]);
