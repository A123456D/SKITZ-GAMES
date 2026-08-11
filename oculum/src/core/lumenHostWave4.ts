import type { CardDef } from "./types";

/**
 * Lumen Host — Wave 4 (Radiance closer: Sovereign + support).
 * Cast: fully inhuman Solarch; object Charm/Urn/Site/Rite.
 * Art DNA: same burnt aureole as Wave 1 — placeholders until install.
 */
export const LUMEN_HOST_WAVE4: CardDef[] = [
  {
    id: "solarch",
    name: "Solarch",
    heresy: "lumen",
    type: "figure",
    essence: 5,
    witnessCost: 3,
    veiledPower: 3,
    witnessedPower: 7,
    sightYield: 0,
    sovereign: true,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — sovereign solarch towering fully non-human multi-wing sun-throne seraph-creature brass Eye-disc nested burnt aureole chalk ash NOT human SOVEREIGN legend presence, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "Whenever a friendly Figure becomes Halo'd, gain 1 Sight.",
    revelation:
      "Halo. Witness another friendly Veiled Lumen Figure paying 1 less Sight (min 0) if able. If you control 2 or more Halo'd Figures after this (including this), deal 1 Will and gain 1 Sight.",
    text: "SOVEREIGN. Veiled 3 / Witnessed 7. Veiled: Whenever a friendly Figure becomes Halo'd, gain 1 Sight. Revelation: Halo. Witness another friendly Veiled Lumen Figure paying 1 less Sight (min 0) if able. If you control 2 or more Halo'd Figures after this (including this), deal 1 Will and gain 1 Sight. While Halo'd: your other Halo'd Figures' Blazes deal +1 Will. Fall: Gain 1 Sight.",
  },
  {
    id: "aureole_charm",
    name: "Aureole Charm",
    heresy: "lumen",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — aureole charm graft scorched nested rings brass Eye-seal floating chalk ash, unique scorched halo-ring charm inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Graft: +1 power while host Witnessed. When host Blazes while Halo'd, Blind that altitude this turn if an enemy is there.",
  },
  {
    id: "radiance_urn",
    name: "Radiance Urn",
    heresy: "lumen",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — radiance urn vessel chalk ash burnt aureole brass Eye-disc shrine object, unique scorched halo-ring urn inner frame, bone-white sun-gold ash-char sky cyan",
    revelation:
      "Witness a friendly Veiled Lumen Figure for free if able; otherwise gain 2 Sight.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Witness a friendly Veiled Lumen Figure for free if able; otherwise gain 2 Sight. Fall: If you control a Halo'd Figure, gain 1 Sight; otherwise Witness a friendly Veiled Lumen Figure for free if able.",
  },
  {
    id: "sunwell",
    name: "Sunwell",
    heresy: "lumen",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — landmark sunwell nested burnt aureole chalk ash Eye-seal cliff shrine, unique scorched halo-ring well inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Site. Halo'd Figures here have +1 power. When you Sustain a friendly Figure here, gain 1 Sight.",
  },
  {
    id: "last_radiance",
    name: "Last Radiance",
    heresy: "lumen",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — last radiance rite hand opening final burnt aureole chalk ash Eye-seal edict, unique scorched halo-ring rite inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Choose an altitude with your Lumen Figure: if Veiled, Witness it paying 1 less Sight (min 0); if Halo'd, deal 2 Will.",
  },
];

export const LUMEN_HOST_WAVE4_RITE_IDS = ["last_radiance"];
