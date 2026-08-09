import type { CardDef } from "./types";

/** Scar Breach Wave 3 — lanes + Open pressure. Procedural placeholders until art. */
export const IRON_BREACH_WAVE3: CardDef[] = [
  {
    id: "cliffbrand_captain",
    name: "Cliffbrand Captain",
    heresy: "breach",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — male human cliffbrand captain high planted stance strap harness scar brands canyon",
    veiledAbility: "While on High, whenever you Witness a friendly Figure elsewhere, gain 1 Sight.",
    revelation: "If on High, Blind High this turn if an enemy is there; otherwise draw 1.",
    text: "Veiled: While on High, whenever you Witness a friendly Figure elsewhere, gain 1 Sight. Revelation: If on High, Blind High this turn if an enemy is there; otherwise draw 1. While Witnessed on High: When this wins Resolve, draw 1. Overexpose: shared; on High, opponent draws 1.",
  },
  {
    id: "lowscar_warden",
    name: "Lowscar Warden",
    heresy: "breach",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — male human lowscar warden low planted stance strap harness scar brands canyon",
    veiledAbility:
      "Hold on Low while you control another Witnessed friendly Figure → Blind Low this turn.",
    revelation: "If on Low, draw 1; otherwise gain 1 Sight.",
    text: "Veiled: Hold on Low while you control another Witnessed friendly Figure → Blind Low this turn. Revelation: If on Low, draw 1; otherwise gain 1 Sight. While Witnessed on Low: Enemy Witness and Gaze on Low cost +1 Sight.",
  },
  {
    id: "ember_herald",
    name: "Ember Herald",
    heresy: "breach",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — female human ember herald planted stance sexy-aggressive strap harness scar brands canyon",
    veiledAbility: "The first time each Resolve you deal Breach Will, gain 1 Sight.",
    revelation:
      "Witness another friendly Veiled Figure paying 1 less Sight (min 0). If you control no other Veiled Figure, gain 2 Sight instead.",
    text: "Veiled: The first time each Resolve you deal Breach Will, gain 1 Sight. Revelation: Witness another friendly Veiled Figure paying 1 less Sight (min 0). If you control no other Veiled Figure, gain 2 Sight instead. Overexpose: shared.",
  },
  {
    id: "banner_drill",
    name: "Banner Drill",
    heresy: "breach",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — banner drill training ground strapped banners wound-seam landmark",
    text: "Site. While a friendly Witnessed Figure is here, your other Witnessed Figures have +1 power. When a friendly Figure here becomes Witnessed, gain 1 Sight.",
  },
  {
    id: "full_breach",
    name: "Full Breach",
    heresy: "breach",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject: "Scar Breach open-wound — full breach rite war edict scar-seal parchment",
    text: "Gain 1 Sight. Until Resolve: your Witnessed Scar Breach Figures deal +1 Will Breach in addition to shared Breach on each Breach payout this Resolve. Until Resolve: the first Overexpose you take deals 1 Will to you.",
  },
];

export const IRON_BREACH_WAVE3_RITE_IDS = ["full_breach"];
