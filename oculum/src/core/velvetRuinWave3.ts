import type { CardDef } from "./types";

/**
 * Velvet Ruin — Wave 3 (High / Low densify + Mid Tempt escort).
 * Cast: ♀ Thorncrown High · ♂ incubus Siltthorn Low · ♀ Brandlace Mid.
 * Names avoid Usher/Bride/Cantor/Shrine/Sever formulas.
 * Art DNA: thorned veil + horn-ring — placeholders until install.
 */
export const VELVET_RUIN_WAVE3: CardDef[] = [
  {
    id: "thorncrown",
    name: "Thorncrown",
    heresy: "ruin",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — female High demon thorn crown horns sexy seductive evil frightening thorned veil NOT Motley court NOT exaggerated bust, unique thorned-veil horn-ring thorncrown inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "While on High, whenever an enemy Figure becomes Branded elsewhere, gain 1 Sight.",
    revelation: "If on High, Brand a Tempted enemy Figure if able; otherwise Tempt the enemy Figure here if able.",
    text: "Veiled 2 / Witnessed 4. Veiled: While on High, whenever an enemy Figure becomes Branded elsewhere, gain 1 Sight. Revelation: If on High, Brand a Tempted enemy Figure if able; otherwise Tempt the enemy Figure here if able. While Witnessed on High: Enemy Witness and Gaze on High cost +1 Sight unless the target is Tempted.",
  },
  {
    id: "siltthorn",
    name: "Siltthorn",
    heresy: "ruin",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — male incubus Low siltthorn demon horns thorn silt sexy evil frightening NOT Motley court, unique thorned-veil horn-ring siltthorn inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "Hold on Low while you control a Branded enemy Figure → Blind Low this turn.",
    revelation: "If on Low, Tempt the enemy Figure here if able; otherwise gain 1 Sight.",
    text: "Veiled 2 / Witnessed 3. Veiled: Hold on Low while you control a Branded enemy Figure → Blind Low this turn. Revelation: If on Low, Tempt the enemy Figure here if able; otherwise gain 1 Sight. While Witnessed on Low: Enemy Witness and Gaze on Low cost +1 Sight.",
  },
  {
    id: "brandlace",
    name: "Brandlace",
    heresy: "ruin",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — female Mid demon brandlace silk thorns sexy seductive evil frightening NOT Motley court NOT exaggerated bust, unique thorned-veil horn-ring brandlace inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "The first time each window you Tempt, gain 1 Sight.",
    revelation: "Tempt the enemy Figure on Mid if able; otherwise Brand a Witnessed enemy Figure on Mid if able.",
    text: "Veiled 1 / Witnessed 3. Veiled: The first time each window you Tempt, gain 1 Sight. Revelation: Tempt the enemy Figure on Mid if able; otherwise Brand a Witnessed enemy Figure on Mid if able.",
  },
  {
    id: "lace_gallery",
    name: "Lace Gallery",
    heresy: "ruin",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — landmark lace gallery thorned veil corridor horn-ring niches void cliff shrine, unique thorned-veil horn-ring gallery inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Site. While a Branded enemy Figure is here, your other Figures have +1 power. When an enemy Figure here becomes Branded, Tempt an enemy Veiled Figure in another altitude if able.",
  },
  {
    id: "full_devour",
    name: "Full Devour",
    heresy: "ruin",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — full devour rite feast seal thorned horn-ring Eye void, unique thorned-veil horn-ring rite inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Gain 1 Sight. Until Resolve: your Devours against Witnessed Branded enemies deal +1 Will.",
  },
];

export const VELVET_RUIN_WAVE3_RITE_IDS = ["full_devour"];
