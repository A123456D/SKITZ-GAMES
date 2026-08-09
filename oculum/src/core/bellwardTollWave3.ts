import type { CardDef } from "./types";

/**
 * Bellward Toll — Wave 3 Trap Tax lanes.
 * Art: same set-style lock as Wave 1 (Veil Ringer anchor).
 */
export const BELLWARD_TOLL_WAVE3: CardDef[] = [
  {
    id: "highcliff_ringer",
    name: "Highcliff Ringer",
    heresy: "toll",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — male human highcliff ringer crimson white cloth bronze bells high cliff banners ocean, unique crimson high-rope cliff-post inner frame, high-contrast crimson-white-charcoal bell shrine",
    revelation: "Toll High if able; otherwise gain 1 Sight.",
    text: "Revelation: Toll High if able; otherwise gain 1 Sight.",
  },
  {
    id: "lowcloth_warden",
    name: "Lowcloth Warden",
    heresy: "toll",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — male human lowcloth warden crimson white cloth bronze bells low cliff banners ocean, unique crimson low-stone cloth-ward inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "When this Holds on Low and Low is Tolled, Blind Low this turn.",
    revelation: "Toll Low if able. If Low was already Tolled, draw 1.",
    text: "Veiled: When this Holds on Low and Low is Tolled, Blind Low this turn. Revelation: Toll Low if able. If Low was already Tolled, draw 1.",
  },
  {
    id: "rope_auditor",
    name: "Rope Auditor",
    heresy: "toll",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — male human rope auditor crimson white cloth bronze bells ledger cliff banners ocean, unique crimson ledger-rope tally inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility:
      "While Veiled: the first enemy Witness or Lure on a Tolled altitude each turn costs them +1 Sight.",
    revelation: "Toll Mid if able; otherwise draw 1.",
    text: "Veiled: While Veiled: the first enemy Witness or Lure on a Tolled altitude each turn costs them +1 Sight. Revelation: Toll Mid if able; otherwise draw 1.",
  },
  {
    id: "banner_bellwalk",
    name: "Banner Bellwalk",
    heresy: "toll",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — banner bellwalk site landmark crimson white cloth banners bronze bells cliff path ocean architecture hero, unique crimson banner-corridor path inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Site. When you Lure, gain 1 Sight. Peal: your Lure that clears a Pealed Toll still Peal-pays (no fizzle).",
  },
  {
    id: "ring_out",
    name: "Ring Out",
    heresy: "toll",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — ring out rite crimson cloth parchment bronze bell peal cliff, unique crimson peal-edict wax-seal inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Choose an altitude. If it is Tolled, fire Resonance for you and gain 1 Sight, then you may Peal it paying 0 Sight (still once per window). Otherwise Toll it and fire Resonance for you.",
  },
];

export const BELLWARD_TOLL_WAVE3_RITE_IDS = new Set(["ring_out"]);
