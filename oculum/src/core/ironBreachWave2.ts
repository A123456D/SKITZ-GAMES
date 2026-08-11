import type { CardDef } from "./types";

/** Scar Breach Wave 2 — Open / Breach support. Procedural placeholders until art. */
export const IRON_BREACH_WAVE2: CardDef[] = [
  {
    id: "ashcoil_blade",
    name: "Ashcoil Blade",
    heresy: "breach",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — male human ashcoil blade escort planted stance blade at rest strap harness scar brands canyon",
    veiledAbility:
      "Whenever another friendly Figure becomes Witnessed, this has +1 power until Resolve (max +2). The first Overexpose you take each Resolve, this gains +1 power until Resolve (same max +2).",
    revelation:
      "Gain 1 Sight. You may Witness a friendly Veiled Figure paying 1 less Sight (min 0).",
    text: "Veiled: Whenever another friendly Figure becomes Witnessed, this has +1 power until Resolve (max +2). The first Overexpose you take each Resolve, this gains +1 power until Resolve (same max +2). Revelation: Gain 1 Sight. You may Witness a friendly Veiled Figure paying 1 less Sight (min 0).",
  },
  {
    id: "scarforge",
    name: "Scarforge",
    heresy: "breach",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — scarforge cliff forge landmark strapped banners eye-brand wound-seams",
    text: "Site. When a friendly Figure here becomes Witnessed, gain 1 Sight. When a friendly Witnessed Figure here wins Resolve, gain 1 Sight.",
  },
  {
    id: "iron_urn",
    name: "Iron Urn",
    heresy: "breach",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — iron urn vessel slag-scar chamber strap bindings war camp",
    revelation: "Gain 2 Sight.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Gain 2 Sight. Fall: Witness a friendly Veiled Figure for free if able; otherwise gain 1 Sight.",
  },
  {
    id: "rivet_charm",
    name: "Rivet Charm",
    heresy: "breach",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — rivet charm graft strap-bound eye-brand scar seal",
    text: "Graft: +1 power while host Witnessed. When host becomes Witnessed, gain 1 Sight. When host wins Resolve while Witnessed, gain 1 Sight (once per Resolve).",
  },
  {
    id: "breach_order",
    name: "Breach Order",
    heresy: "breach",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — breach order rite parchment scar-seal edict",
    text: "Choose an altitude with your Figure: if Veiled, Witness it paying 1 less Sight (min 0); if already Witnessed, deal 1 Will.",
  },
];

export const IRON_BREACH_WAVE2_RITE_IDS = ["breach_order"];
