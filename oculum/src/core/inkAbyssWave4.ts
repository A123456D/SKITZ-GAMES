import type { CardDef } from "./types";

/**
 * Ink Abyss — Wave 4 closing pack (Ink 20 complete).
 * Roles: Sovereign · Mill-Stain · Blind payoff · Enter-Stain site · Vessel continuity.
 */
export const INK_ABYSS_WAVE4: CardDef[] = [
  {
    id: "dahaka",
    name: "Dahaka",
    heresy: "ink",
    type: "figure",
    essence: 5,
    witnessCost: 3,
    veiledPower: 3,
    witnessedPower: 7,
    sightYield: 0,
    sovereign: true,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — ink-abyss sovereign Dahaka towering glamorous ink-maw monarch cream-black throne cloak void crown eye seals, unique cream sovereign abyss-arch inner frame, high-contrast cream-black ink-wash, SOVEREIGN legend presence",
    veiledAbility:
      "Whenever an enemy Figure becomes Forced Exposed, gain 1 Sight.",
    revelation:
      "Stain each enemy Figure. If you Stained 2 or more, draw 1 and Blind Mid this turn.",
    text: "SOVEREIGN. Veiled: Whenever an enemy Figure becomes Forced Exposed, gain 1 Sight. Revelation: Stain each enemy Figure. If you Stained 2 or more, draw 1 and Blind Mid this turn. While Witnessed: Whenever you Forced Expose an enemy Figure, Blind that altitude this turn. Press: when you Press, if this is Witnessed, deal 1 Will. Fall: Draw 1.",
  },
  {
    id: "echo_blot",
    name: "Echo Blot",
    heresy: "ink",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — echo blot rite pale hand double ink stain swamp seals, unique cream double-blot inner frame, high-contrast cream-black ink-wash",
    text: "Stain an enemy Figure in the chosen altitude if able. If Mid, draw 1. If it was already Stained, Blind that altitude this turn.",
  },
  {
    id: "blot_lens",
    name: "Blot Lens",
    heresy: "ink",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — black blot lens charm cream cord eye ink glass floating swamp, unique cream lens-rim inner frame, high-contrast cream-black ink-wash",
    text: "Graft: +1 power while host Witnessed. When you Blind an altitude that has a Stained enemy, gain 1 Sight. If that altitude is Low, also draw 1.",
  },
  {
    id: "stainwell",
    name: "Stainwell",
    heresy: "ink",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — stainwell ink shrine cream stone black well drip swamp landmark eye seals, unique cream well-mouth inner frame, high-contrast cream-black ink-wash",
    text: "Site. As you play this, Stain the enemy Veiled Figure here if able. Your Figures here have +1 power against Stained enemies. When a Stained enemy Figure here becomes Forced Exposed, gain 1 Sight.",
  },
  {
    id: "abyss_urn",
    name: "Abyss Urn",
    heresy: "ink",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Ink Abyss set style as Mire Duelist — abyss urn vessel cream stone black drip deep seals swamp inhabitant chamber, unique cream abyss-urn lip inner frame, high-contrast cream-black ink-wash",
    revelation:
      "Release Inhabitant here if the lane is empty, otherwise to hand. Stain the enemy Figure here if able.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able — or tuck your Figure on this lane when you play the Urn over them. Revelation: Release Inhabitant here if the lane is empty, otherwise to hand. Stain the enemy Figure here if able. Fall: release Inhabitant here Veiled if able.",
  },
];

export const INK_ABYSS_WAVE4_RITE_IDS = new Set(["echo_blot"]);
