import type { CardDef } from "./types";

/**
 * Ink Abyss — Wave 3 lane / grind pack.
 * Roles: High specialist · Low Blind · Mid grind lord · Fall bank · Grind anthem.
 */
export const INK_ABYSS_WAVE3: CardDef[] = [
  {
    id: "cliff_maw",
    name: "Cliff Maw",
    heresy: "ink",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature cliff maw pilgrim cream cloth black drip high ledge void face, unique cream cliff-ledge inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "When this wins Resolve while Veiled on High, draw 1.",
    revelation:
      "Stain the enemy Figure here if able. If this is on High, Blind High this turn and gain 1 Sight.",
    text: "Veiled: When this wins Resolve while Veiled on High, draw 1. Revelation: Stain the enemy Figure here if able. If this is on High, Blind High this turn and gain 1 Sight.",
  },
  {
    id: "silt_warden",
    name: "Silt Warden",
    heresy: "ink",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — glamorous ink silt warden cream wraps black drip low mire staff, unique cream silt-gate inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "When this Holds on Low against a Stained enemy, Blind Low this turn.",
    revelation:
      "If any enemy Figure is Stained, Blind Low this turn. If a Stained enemy Figure is on Low, also draw 1.",
    text: "Veiled: When this Holds on Low against a Stained enemy, Blind Low this turn. Revelation: If any enemy Figure is Stained, Blind Low this turn. If a Stained enemy Figure is on Low, also draw 1.",
  },
  {
    id: "ink_matron",
    name: "Ink Matron",
    heresy: "ink",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — glamorous sexy ink matron cream robes black drip mid shrine beauty wrongness, unique cream matron-halo inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "While Veiled on Mid: +1 power if any enemy Figure is Stained.",
    revelation:
      "If any enemy Figure is Stained, draw 1. If 2 or more are Stained, also gain 1 Sight.",
    text: "Veiled: While Veiled on Mid: +1 power if any enemy Figure is Stained. Revelation: If any enemy Figure is Stained, draw 1. If 2 or more are Stained, also gain 1 Sight. While Witnessed on Mid: your Ink Abyss Figures have +1 power against Stained enemies.",
  },
  {
    id: "gulf_cairn",
    name: "Gulf Cairn",
    heresy: "ink",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink gulf cairn cream stone black drip swamp fall marker eye seals, unique cream cairn-stack inner frame, high-contrast cream-black ink-wash",
    text: "Site. When an enemy Figure here Falls, Stain an enemy Veiled Figure in another altitude if able and gain 1 Sight.",
  },
  {
    id: "mire_surge",
    name: "Mire Surge",
    heresy: "ink",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — mire surge rite black ink flood cream shores swamp eye seals, unique cream flood-wave inner frame, high-contrast cream-black ink-wash",
    text: "Until Resolve: your Figures have +1 power against Stained enemies. If any enemy Figure is Stained, Blind Low this turn.",
  },
];

export const INK_ABYSS_WAVE3_RITE_IDS = new Set(["mire_surge"]);
