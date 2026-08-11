import type { CardDef } from "./types";

/**
 * Lumen Host — Wave 2 (Sustain / Blaze support).
 * Cast: fully inhuman Ash Chorister; object Vessel/Relic/Site/Rite.
 * Art DNA: same burnt aureole as Wave 1 — placeholders until install.
 */
export const LUMEN_HOST_WAVE2: CardDef[] = [
  {
    id: "ash_chorister",
    name: "Ash Chorister",
    heresy: "lumen",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — fully non-human ash choir beast chalk dust multi-mouth Eye-seals burnt aureole Low cliff NOT human, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "When a friendly Figure Blazes, gain 1 Sight.",
    revelation: "Halo.",
    text: "Veiled 2 / Witnessed 3. Veiled: When a friendly Figure Blazes, gain 1 Sight. Revelation: Halo. While Halo'd on Low: Blaze also Blinds Low this turn if an enemy is there.",
  },
  {
    id: "aureole_well",
    name: "Aureole Well",
    heresy: "lumen",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — landmark aureole well nested burnt halo rings chalk ash Eye-seal cliff shrine, unique scorched halo-ring well inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Site. When a friendly Figure here becomes Halo'd, gain 1 Sight.",
  },
  {
    id: "lumen_urn",
    name: "Lumen Urn",
    heresy: "lumen",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — lumen urn vessel chalk ash burnt aureole brass Eye-disc shrine object, unique scorched halo-ring urn inner frame, bone-white sun-gold ash-char sky cyan",
    revelation: "Witness another friendly Veiled Lumen Figure paying 1 less Sight (min 0) if able.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Witness another friendly Veiled Lumen Figure paying 1 less Sight (min 0) if able. Fall: gain 1 Sight.",
  },
  {
    id: "halo_charm",
    name: "Halo Charm",
    heresy: "lumen",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — halo charm graft scorched ring brass Eye-seal floating chalk ash, unique scorched halo-ring charm inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Graft: +1 power while host Witnessed. When host becomes Halo'd, gain 1 Sight. When host Blazes, gain 1 Sight.",
  },
  {
    id: "kindle_the_halo",
    name: "Kindle the Halo",
    heresy: "lumen",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — kindle the halo rite hand lighting burnt aureole chalk ash Eye-seal, unique scorched halo-ring rite inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Choose an altitude. If your Figure there is Veiled and Lumen, Witness it for free (Halo). If it is already Halo'd, Sustain it for free.",
  },
];

export const LUMEN_HOST_WAVE2_RITE_IDS = ["kindle_the_halo"];
