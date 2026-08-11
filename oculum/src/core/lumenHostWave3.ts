import type { CardDef } from "./types";

/**
 * Lumen Host — Wave 3 (High / Low densify + Sustain Mid escort).
 * Cast: fully inhuman Highflare + Cinder; near-human sexy Veilburn Usher (♂).
 * Art DNA: same burnt aureole as Wave 1 — placeholders until install.
 */
export const LUMEN_HOST_WAVE3: CardDef[] = [
  {
    id: "highflare_cantor",
    name: "Highflare Cantor",
    heresy: "lumen",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — fully non-human highflare cantor multi-eye chalk ash burnt aureole High cliff NOT human, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "While on High, when you Halo a friendly Figure elsewhere, gain 1 Sight.",
    revelation: "Halo. If on High, Blind High this turn if an enemy is there; otherwise gain 1 Sight.",
    text: "Veiled 2 / Witnessed 4. Veiled: While on High, when you Halo a friendly Figure elsewhere, gain 1 Sight. Revelation: Halo. If on High, Blind High this turn if an enemy is there; otherwise gain 1 Sight. While Halo'd on High: Blaze also Blinds High this turn if an enemy is there.",
  },
  {
    id: "cinder_warden",
    name: "Cinder Warden",
    heresy: "lumen",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — fully non-human cinder warden Low ash beast chalk burnt aureole Eye-seals NOT human, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "Hold on Low while you control a Halo'd Figure → Blind Low this turn.",
    revelation: "Halo.",
    text: "Veiled 2 / Witnessed 3. Veiled: Hold on Low while you control a Halo'd Figure → Blind Low this turn. Revelation: Halo. While Halo'd on Low: Enemy Witness and Gaze on Low cost +1 Sight.",
  },
  {
    id: "veilburn_usher",
    name: "Veilburn Usher",
    heresy: "lumen",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — near-human male extra sexy austere uncanny third Eye gold crackle skin membrane wing stubs spiked halo NOT Motley court, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "The first time each window you Sustain, gain 1 Sight.",
    revelation:
      "Halo. Witness another friendly Veiled Lumen Figure paying 1 less Sight (min 0) if able; otherwise gain 1 Sight.",
    text: "Veiled 1 / Witnessed 3. Veiled: The first time each window you Sustain, gain 1 Sight. Revelation: Halo. Witness another friendly Veiled Lumen Figure paying 1 less Sight (min 0) if able; otherwise gain 1 Sight.",
  },
  {
    id: "halo_gallery",
    name: "Halo Gallery",
    heresy: "lumen",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — landmark halo gallery nested burnt aureole corridor chalk ash Eye-seal cliff shrine, unique scorched halo-ring gallery inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Site. While a friendly Halo'd Figure is here, your other Halo'd Figures have +1 power. When a friendly Figure here Blazes, gain 1 Sight.",
  },
  {
    id: "full_radiance",
    name: "Full Radiance",
    heresy: "lumen",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — full radiance rite hand opening burnt aureole chalk ash Eye-seal edict, unique scorched halo-ring rite inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Gain 1 Sight. Until Resolve: your Blazes deal +1 Will.",
  },
];

export const LUMEN_HOST_WAVE3_RITE_IDS = ["full_radiance"];
