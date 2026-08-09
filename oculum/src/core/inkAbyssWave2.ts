import type { CardDef } from "./types";

/**
 * Ink Abyss — Wave 2 Erase support pack.
 * Roles: Erase police · Erase bank · Break spreader · Erase chain · Cash Mark.
 */
export const INK_ABYSS_WAVE2: CardDef[] = [
  {
    id: "pale_bailiff",
    name: "Pale Bailiff",
    heresy: "ink",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss creature glamorous pale bailiff cream robes black drip judgment staff void face, unique cream courthouse pillar inner frame, high-contrast cream-black ink-wash",
    veiledAbility:
      "Whenever an enemy Figure in another altitude becomes Forced Exposed, Stain a different enemy Figure if able.",
    revelation:
      "Stain the enemy Figure here if able. If it was already Stained, Blind this altitude this turn.",
    text: "Veiled: Whenever an enemy Figure in another altitude becomes Forced Exposed, Stain a different enemy Figure if able. Revelation: Stain the enemy Figure here if able. If it was already Stained, Blind this altitude this turn. Press: when your Press Forces Exposed, draw 1.",
  },
  {
    id: "blackwater_shrine",
    name: "Blackwater Shrine",
    heresy: "ink",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — blackwater ink shrine cream stone swamp gulf eye seals landmark, unique cream shrine-arch inner frame, high-contrast cream-black ink-wash",
    text: "Site. When an enemy Figure here becomes Forced Exposed, gain 1 Sight. When you Stain an enemy Figure here, gain 1 Sight.",
  },
  {
    id: "gulf_urn",
    name: "Gulf Urn",
    heresy: "ink",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink gulf urn vessel cream stone black drip seals swamp inhabitant chamber, unique cream urn-lip circle inner frame, high-contrast cream-black ink-wash",
    revelation: "Stain the enemy Figure here if able.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able — or tuck your Figure on this lane when you play the Urn over them. Revelation: Stain the enemy Figure here if able. When this Falls or is Forced Exposed: Stain an enemy Veiled Figure if able, then Blind that Figure's altitude this turn.",
  },
  {
    id: "smother_cord",
    name: "Smother Cord",
    heresy: "ink",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — black ink smother cord cream wrap eye seal floating swamp graft charm, unique cream cord-knot inner frame, high-contrast cream-black ink-wash",
    text: "Graft: +1 power while host Witnessed. When host Forces Exposed an enemy, Stain another enemy Veiled Figure if able; if host is on Mid, also gain 1 Sight.",
  },
  {
    id: "ashen_tithe",
    name: "Ashen Tithe",
    heresy: "ink",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ashen tithe rite pale hand black ink offering swamp seals parchment, unique cream offering-bowl inner frame, high-contrast cream-black ink-wash",
    text: "Choose an altitude. If the enemy Figure there is Stained, gain 1 Sight and draw 1. If it is also Veiled, Blind that altitude this turn, then you may Press it paying 0 Sight (still once per window).",
  },
];

export const INK_ABYSS_WAVE2_RITE_IDS = new Set(["ashen_tithe"]);
