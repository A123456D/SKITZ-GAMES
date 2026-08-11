import type { CardDef } from "./types";

/**
 * Velvet Ruin — Wave 4 (Devour closer: Sovereign + support).
 * Cast: fully inhuman Veloth; object Charm/Urn/Site/Rite.
 * Names avoid Usher/Bride/Cantor/Shrine/Sever formulas.
 * Art DNA: thorned veil + horn-ring — placeholders until install.
 */
export const VELVET_RUIN_WAVE4: CardDef[] = [
  {
    id: "veloth",
    name: "Veloth",
    heresy: "ruin",
    type: "figure",
    essence: 5,
    witnessCost: 3,
    veiledPower: 3,
    witnessedPower: 7,
    sightYield: 0,
    sovereign: true,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — sovereign Veloth towering fully inhuman demon multi-horn thorn crown void maw sexy terrifying thorned veil SOVEREIGN legend presence NOT human NOT Motley court, unique thorned-veil horn-ring veloth inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    veiledAbility: "Whenever you Tempt an enemy Figure, gain 1 Sight.",
    revelation:
      "Tempt an enemy Veiled Figure if able. Then Brand a Tempted enemy Figure if able. If you control 2 or more Branded enemy Figures after this, deal 1 Will and gain 1 Sight.",
    text: "SOVEREIGN. Veiled 3 / Witnessed 7. Veiled: Whenever you Tempt an enemy Figure, gain 1 Sight. Revelation: Tempt an enemy Veiled Figure if able. Then Brand a Tempted enemy Figure if able. If you control 2 or more Branded enemy Figures after this, deal 1 Will and gain 1 Sight. While Witnessed: your Devours against Witnessed Branded enemies deal +1 Will. Fall: Gain 1 Sight.",
  },
  {
    id: "lace_charm",
    name: "Lace Charm",
    heresy: "ruin",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — lace charm graft thorned lace horn-ring Eye-seal floating, unique thorned-veil horn-ring charm inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Graft: +1 power while host Witnessed. When an enemy Figure on the host's altitude becomes Tempted, gain 1 Sight. When you Devour a Witnessed Branded enemy on the host's altitude, Blind that altitude this turn if an enemy is there.",
  },
  {
    id: "hunger_urn",
    name: "Hunger Urn",
    heresy: "ruin",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — hunger urn vessel thorned horn-ring void glaze desire seal shrine object, unique thorned-veil horn-ring urn inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    revelation: "Tempt an enemy Veiled Figure if able; otherwise gain 2 Sight.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Tempt an enemy Veiled Figure if able; otherwise gain 2 Sight. Fall: If you control a Branded enemy Figure, gain 1 Sight; otherwise Tempt an enemy Veiled Figure if able.",
  },
  {
    id: "wantwell",
    name: "Wantwell",
    heresy: "ruin",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — landmark wantwell thorned horn-ring basin void desire cliff shrine, unique thorned-veil horn-ring well inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Site. While a Branded enemy Figure is here, your Figure here has +1 power. When an enemy Figure here becomes Branded, the opponent loses 1 Sight if able.",
  },
  {
    id: "last_devour",
    name: "Last Devour",
    heresy: "ruin",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Velvet Ruin set style as Crimson Vow — last devour rite final feast seal thorned horn-ring Eye void, unique thorned-veil horn-ring rite inner frame, velvet-black blood-crimson bone-ivory violet-ember",
    text: "Choose an altitude. If enemy Veiled and not Tempted: Tempt it. If Veiled and Tempted: Brand it. If Witnessed and Branded: deal 2 Will. If Witnessed and unbranded: Brand it.",
  },
];

export const VELVET_RUIN_WAVE4_RITE_IDS = ["last_devour"];
