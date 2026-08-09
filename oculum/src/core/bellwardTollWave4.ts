import type { CardDef } from "./types";

/**
 * Bellward Toll — Wave 4 Trap Tax closer.
 * Art: same set-style lock as Wave 1 (Veil Ringer anchor).
 */
export const BELLWARD_TOLL_WAVE4: CardDef[] = [
  {
    id: "carillon",
    name: "Carillon",
    heresy: "toll",
    type: "figure",
    essence: 5,
    witnessCost: 3,
    veiledPower: 3,
    witnessedPower: 7,
    sightYield: 0,
    sovereign: true,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — sovereign carillon towering non-human cliff peal spirit crimson white cloth bronze bells eye-seals shrine ocean SOVEREIGN legend presence, unique crimson carillon-tower cathedral inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "Whenever Resonance happens for you, gain 1 Sight.",
    revelation:
      "Toll High if able and Toll Low if able. If High and Low are both Tolled after this, gain 1 Sight.",
    text: "SOVEREIGN. Veiled: Whenever Resonance happens for you, gain 1 Sight. Revelation: Toll High if able and Toll Low if able. If High and Low are both Tolled after this, gain 1 Sight. While Witnessed: Whenever you Lure, Blind that altitude this turn. Peal: when Peal pays for you, Blind that altitude this turn. Fall: Draw 1.",
  },
  {
    id: "siren_cord",
    name: "Siren Cord",
    heresy: "toll",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — siren cord charm graft crimson cloth cord bronze bell lure seal floating cliff ocean, unique crimson siren-knot cord inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Graft: +1 power while host Witnessed. When an enemy pays or touches Toll on the host's altitude while host is Witnessed, gain 1 Sight. If that altitude is Mid, also draw 1.",
  },
  {
    id: "peal_urn",
    name: "Peal Urn",
    heresy: "toll",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — peal urn vessel crimson white cloth bronze bell chamber cliff shrine ocean object, unique crimson peal-rim urn oval inner frame, high-contrast crimson-white-charcoal bell shrine",
    revelation: "Toll this altitude if able; otherwise Lure an enemy Veiled Figure if able.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Toll this altitude if able; otherwise Lure an enemy Veiled Figure if able. Fall: Toll another altitude if able; otherwise Lure an enemy Veiled Figure if able.",
  },
  {
    id: "choir_loft",
    name: "Choir Loft",
    heresy: "toll",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — choir loft shrine landmark crimson white cloth bronze bells cliff banners ocean architecture hero, unique crimson loft-gallery arch inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Site. When Resonance happens for you, gain 1 Sight.",
  },
  {
    id: "full_peal",
    name: "Full Peal",
    heresy: "toll",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — full peal rite crimson cloth parchment bronze bells peal cliff ocean, unique crimson full-peal edict inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Fire Resonance for you. Then: if any altitude is Tolled, gain 1 Sight; otherwise Toll Mid. Then Peal one altitude you Toll paying 0 Sight if able (still once per window).",
  },
];

export const BELLWARD_TOLL_WAVE4_RITE_IDS = new Set(["full_peal"]);
