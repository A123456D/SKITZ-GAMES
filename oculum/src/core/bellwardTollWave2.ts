import type { CardDef } from "./types";

/**
 * Bellward Toll — Wave 2 Trap Tax support.
 * Art: same set-style lock as Wave 1 (Veil Ringer anchor).
 */
export const BELLWARD_TOLL_WAVE2: CardDef[] = [
  {
    id: "path_bellman",
    name: "Path Bellman",
    heresy: "toll",
    type: "figure",
    essence: 2,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — male human path bellman crimson white cloth robes bronze bells cliff path banners ocean, unique crimson path-stone milepost cloth-banner inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "When you Toll an altitude, this has +1 power until Resolve.",
    revelation: "Toll Mid if able. If Mid was already Tolled, gain 1 Sight.",
    text: "Veiled: When you Toll an altitude, this has +1 power until Resolve. Revelation: Toll Mid if able. If Mid was already Tolled, gain 1 Sight.",
  },
  {
    id: "cloth_bellspire",
    name: "Cloth Bellspire",
    heresy: "toll",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — cloth bellspire shrine landmark crimson white cloth bronze bells cliff banners ocean architecture hero, unique crimson vertical banner-spire inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Site. When a Toll is paid or touched here, gain 1 Sight.",
  },
  {
    id: "toll_urn",
    name: "Toll Urn",
    heresy: "toll",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — toll urn vessel crimson white cloth bronze bell chamber cliff shrine object, unique crimson bronze bell-rim oval inner frame, high-contrast crimson-white-charcoal bell shrine",
    revelation: "Toll this altitude if it is not Tolled.",
    text: "Vessel. On play, tuck a Figure from hand as Inhabitant if able. Revelation: Toll this altitude if it is not Tolled. Fall: Toll another altitude if able.",
  },
  {
    id: "bellcord_charm",
    name: "Bellcord Charm",
    heresy: "toll",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — bellcord charm graft crimson cloth cord bronze bell eye-seal floating cliff ocean, unique crimson cord-knot charm inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Graft: +1 power while host Witnessed. When you Toll the host's altitude, gain 1 Sight. When Resonance happens for you while host is Witnessed, draw 1.",
  },
  {
    id: "sound_the_toll",
    name: "Sound the Toll",
    heresy: "toll",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — sound the toll rite hand bronze handbell crimson cloth parchment cliff, unique crimson wax-seal parchment edict inner frame, high-contrast crimson-white-charcoal bell shrine",
    text: "Choose an altitude. If it is not Tolled, Toll it and fire Resonance for you. Otherwise: Lure an enemy Veiled Figure there if able (clears the Toll); else gain 1 Sight. Peal: if you Peal this window after Sound, gain 1 Sight.",
  },
];

export const BELLWARD_TOLL_WAVE2_RITE_IDS = new Set(["sound_the_toll"]);
