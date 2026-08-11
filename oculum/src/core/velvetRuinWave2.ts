import type { CardDef } from "./types";

/**
 * Velvet Ruin — Wave 2 (Tempt / Brand / Devour support).
 * Cast: ♀ Low demon Vespera; object Site/Vessel/Relic/Rite.
 * Names avoid Usher/Bride/Cantor/Shrine/Sever formulas.
 * Art DNA: thorned veil + horn-ring — placeholders until install.
 */
export const VELVET_RUIN_WAVE2: CardDef[] = [
  {
    id: "vespera",
    name: "Vespera",
    heresy: "ruin",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — female Low demon Vespera softthorn lips horned sexy seductive evil frightening thorned veil NOT Motley court NOT exaggerated bust, unique thorned-veil horn-ring vespera inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "When you Tempt an enemy Figure on Low, gain 1 Sight.",
    revelation: "Tempt the enemy Figure here if able.",
    text: "Veiled 2 / Witnessed 3. Veiled: When you Tempt an enemy Figure on Low, gain 1 Sight. Revelation: Tempt the enemy Figure here if able. While Witnessed on Low: your Devour against a Branded enemy on Low deals +1 Will.",
  },
  {
    id: "thorn_font",
    name: "Thorn Font",
    heresy: "ruin",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — landmark thorn font horn-ring basin void offering cliff night, unique thorned-veil horn-ring font inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Site. When an enemy Figure here becomes Branded, gain 1 Sight. When you Tempt an enemy Figure here, gain 1 Sight.",
  },
  {
    id: "want_urn",
    name: "Want Urn",
    heresy: "ruin",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — want urn vessel thorned horn-ring desire seal void glaze shrine object, unique thorned-veil horn-ring urn inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    revelation: "Tempt the enemy Figure here if able; otherwise Brand a Witnessed enemy Figure here if able.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Tempt the enemy Figure here if able; otherwise Brand a Witnessed enemy Figure here if able. Fall: Tempt an enemy Veiled Figure if able; otherwise gain 1 Sight.",
  },
  {
    id: "horn_charm",
    name: "Horn Charm",
    heresy: "ruin",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — horn charm graft thorned ring bone horn Eye-seal floating, unique thorned-veil horn-ring charm inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Graft: +1 power while host Witnessed. When an enemy Figure on the host's altitude becomes Branded, gain 1 Sight. When you Devour a Branded enemy on the host's altitude, gain 1 Sight.",
  },
  {
    id: "invite_the_look",
    name: "Invite the Look",
    heresy: "ruin",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — invite the look rite seal thorned invitation horn-ring Eye void, unique thorned-veil horn-ring rite inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Choose an altitude. If enemy Veiled and not Tempted: Tempt it. If Veiled and Tempted: Brand it. If Witnessed and Branded: gain 1 Sight. If Witnessed and unbranded: Brand it.",
  },
];

export const VELVET_RUIN_WAVE2_RITE_IDS = ["invite_the_look"];
