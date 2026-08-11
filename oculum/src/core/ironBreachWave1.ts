import type { CardDef } from "./types";

/** Scar Breach Wave 1 — Open / Breach identity. Open-wound / strap art law. */
export const IRON_BREACH_WAVE1: CardDef[] = [
  {
    id: "rivet_vanguard",
    name: "Rivet Vanguard",
    heresy: "breach",
    type: "figure",
    essence: 2,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — male human rivet vanguard planted stance staff at rest strap harness scar brands eye-seal canyon",
    veiledAbility: "When this wins Resolve while Veiled, gain 1 Sight.",
    revelation: "Witness another friendly Veiled Figure paying 1 less Sight (min 0). If you did, gain 1 Sight.",
    text: "Veiled: When this wins Resolve while Veiled, gain 1 Sight. Revelation: Witness another friendly Veiled Figure paying 1 less Sight (min 0). If you did, gain 1 Sight. Overexpose: shared (lose 1 Sight).",
  },
  {
    id: "ember_banner",
    name: "Ember Banner",
    heresy: "breach",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 1,
    artSubject:
      "Scar Breach open-wound portrait — living war-standard ember banner planted pole wound-seams eye-brand canyon",
    veiledAbility: "When this Holds, gain 1 Sight.",
    revelation: "Gain 1 Sight for each Witnessed friendly Figure you control (including this), max 3.",
    text: "Veiled: When this Holds, gain 1 Sight. Revelation: Gain 1 Sight for each Witnessed friendly Figure you control (including this), max 3. While Witnessed: +1 Sight/turn.",
  },
  {
    id: "highscar_lancer",
    name: "Highscar Lancer",
    heresy: "breach",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — male human highscar lancer planted cliff lance at rest strap harness scar brands",
    veiledAbility: "While on High, +1 power.",
    revelation: "If on High, deal 1 Will; otherwise gain 1 Sight.",
    text: "Veiled: While on High, +1 power. Revelation: If on High, deal 1 Will; otherwise gain 1 Sight. While Witnessed on High: When this wins Resolve, deal +1 Will in addition to shared Breach. Overexpose: shared; on High, also take 1 Will.",
  },
  {
    id: "scarsteel_cleaver",
    name: "Scarsteel Cleaver",
    heresy: "breach",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — female human scarsteel cleaver planted stance cleaver at rest sexy-aggressive strap harness scar brands canyon",
    veiledAbility: "Whenever another friendly Figure becomes Witnessed, gain 1 Sight.",
    revelation:
      "Gain 1 Sight. Then: you may Witness another friendly Veiled Figure paying 1 less Sight (min 0).",
    text: "Veiled: Whenever another friendly Figure becomes Witnessed, gain 1 Sight. Revelation: Gain 1 Sight. Then: you may Witness another friendly Veiled Figure paying 1 less Sight (min 0). Overexpose: shared.",
  },
  {
    id: "slag_reaper",
    name: "Slag Reaper",
    heresy: "breach",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "Scar Breach open-wound portrait — war-spirit slag reaper slag-scar body strap bindings eye-brand canyon scythe",
    veiledAbility: "The first time each turn an enemy Figure becomes Strained, gain 1 Sight.",
    revelation: "If any enemy Figure is Strained, deal 1 Will.",
    text: "Veiled: The first time each turn an enemy Figure becomes Strained, gain 1 Sight. Revelation: If any enemy Figure is Strained, deal 1 Will. While Witnessed: If a Strained enemy Figure here loses Resolve, they Fall.",
  },
];

export const IRON_BREACH_WAVE1_RITE_IDS: string[] = [];
