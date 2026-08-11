import type { CardDef } from "./types";

/**
 * Lumen Host — Wave 1 (Radiance: Halo · Blaze · Fall/Sustain).
 * Cast: fully inhuman Herald + Seraph; near-human sexy Candela Blade.
 * Art DNA: burnt aureole gold/white — placeholders until install.
 */
export const LUMEN_HOST_WAVE1: CardDef[] = [
  {
    id: "halo_herald",
    name: "Halo Herald",
    heresy: "lumen",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — fully non-human multi-eye herald-beast living seal brass Eye-disc chalk ash burnt aureole rings NOT human, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "Enemy Witness on this altitude costs +1 Sight.",
    revelation: "Halo. If the enemy Figure here is Veiled, gain 1 Sight.",
    text: "Veiled 2 / Witnessed 3. Veiled: Enemy Witness on this altitude costs +1 Sight. Revelation: Halo. If the enemy Figure here is Veiled, gain 1 Sight.",
  },
  {
    id: "candela_blade",
    name: "Candela Blade",
    heresy: "lumen",
    type: "figure",
    essence: 3,
    witnessCost: 1,
    veiledPower: 3,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — near-human female extra sexy austere uncanny third Eye gold crackle skin membrane wing stubs spiked halo NOT Motley court, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    veiledAbility: "While you control another Halo'd Figure, this has +1 power while Veiled.",
    revelation: "Halo.",
    text: "Veiled 3 / Witnessed 5. Veiled: While you control another Halo'd Figure, this has +1 power while Veiled. Revelation: Halo. While Halo'd: Blaze always deals Will (even if the lane is empty).",
  },
  {
    id: "skyflare_seraph",
    name: "Skyflare Seraph",
    heresy: "lumen",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — fully non-human female-presenting porcelain multi-slit mask winged seraph-creature brass chest Eye burnt aureole NOT human face, unique scorched halo-ring wing-filigree inner frame, bone-white sun-gold ash-char sky cyan",
    revelation:
      "Halo. If on High and an enemy is here, Blind High this turn; otherwise gain 1 Sight.",
    text: "Veiled 2 / Witnessed 4. Revelation: Halo. If on High and an enemy is here, Blind High this turn; otherwise gain 1 Sight. While Halo'd on High: Blaze deals +1 Will.",
  },
  {
    id: "lumen_shrine",
    name: "Lumen Shrine",
    heresy: "lumen",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 1,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — landmark burnt aureole shrine chalk ash nested halo rings Eye-seal banners cliff sky, unique scorched halo-ring shrine inner frame, bone-white sun-gold ash-char sky cyan",
    text: "+1 Sight/turn. The first time each window you Sustain a friendly Halo'd Figure here, that Sustain costs 0 Sight.",
  },
  {
    id: "snuff_the_halo",
    name: "Snuff the Halo",
    heresy: "lumen",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Lumen Host set style as Skyflare Seraph — rite icon snuffing scorched halo ring chalk ash Eye-seal, unique scorched halo-ring rite inner frame, bone-white sun-gold ash-char sky cyan",
    text: "Choose an altitude. If your Figure there is Halo'd, clear Halo and Re-Veil it; gain 2 Sight. If an enemy Figure there is Witnessed, Blind that altitude this turn.",
  },
];

export const LUMEN_HOST_WAVE1_RITE_IDS = ["snuff_the_halo"];
