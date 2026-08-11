import type { CardDef } from "./types";

/**
 * Bellward Toll — Wave 1 Trap Tax identity.
 * Art: same set-style lock as Ink (`same … set style as …` + unique inner frame).
 * Cast: 2 male humans · 1 human female (modest) · 2 creature females — no Motley bust-stack.
 */
export const BELLWARD_TOLL_WAVE1: CardDef[] = [
  {
    id: "bell_debt_walker",
    name: "Bell Debt Walker",
    heresy: "toll",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — male human monastic pilgrim conical kasa white face-veil red eye-seal crimson robes red parasol staff bronze bells cliff path banners ocean, unique crimson pilgrim-cloth parasol-staff inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "When this Holds, Toll this altitude if it is not Tolled.",
    revelation: "If any altitude is Tolled, gain 1 Sight.",
    text: "Veiled: When this Holds, Toll this altitude if it is not Tolled. Revelation: If any altitude is Tolled, gain 1 Sight.",
  },
  {
    id: "bell_siren",
    name: "Bell Siren",
    heresy: "toll",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — creature female siren yokai fish scales fin ears NOT human NO conical kasa NO red parasol bronze handbells crimson white sea robes cliff ocean banners, unique crimson sea-foam cloth bell-buoy inner frame, high-contrast crimson-white-charcoal bell shrine",
    revelation:
      "Lure an enemy Veiled Figure (true Witness). If Mid is Tolled, gain 1 Sight.",
    text: "Revelation: Lure an enemy Veiled Figure (true Witness). If Mid is Tolled, gain 1 Sight.",
  },
  {
    id: "clapper_cantor",
    name: "Clapper Cantor",
    heresy: "toll",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 1,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — creature female bell-spirit choir wraith not human bronze dual handbells crimson white robes eye-seal cliff shrine banners ocean, unique crimson ofuda-corner cloth bell-shelf inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "When Resonance happens for you, gain 1 Sight.",
    revelation: "Toll Mid if able; otherwise Toll an untolled altitude.",
    text: "Veiled: When Resonance happens for you, gain 1 Sight. Revelation: Toll Mid if able; otherwise Toll an untolled altitude. While Witnessed: +1 Sight/turn. Peal: when Peal pays for you, gain 1 Sight.",
  },
  {
    id: "veil_ringer",
    name: "Veil Ringer",
    heresy: "toll",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — male human temple guardian crimson robes white face-veil red eye-seal ringing great bronze bell rope cliff shrine banners ocean, unique crimson rope-column white-veil canopy temple-bell inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "When an enemy Witnesses on a Tolled altitude, gain 1 Sight.",
    revelation: "Toll High if able; otherwise Toll Low if able.",
    text: "Veiled: When an enemy Witnesses on a Tolled altitude, gain 1 Sight. Revelation: Toll High if able; otherwise Toll Low if able.",
  },
  {
    id: "parasol_debtor",
    name: "Parasol Debtor",
    heresy: "toll",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "same Bellward Toll set style as Veil Ringer — human female pilgrim debtor modest proportions conical kasa white face-veil red eye-seal crimson white robes bright red parasol hanging bronze bells cliff path ocean banners, unique crimson parasol-rib cloth arch inner frame, high-contrast crimson-white-charcoal bell shrine",
    veiledAbility: "When this Holds on a Tolled altitude, gain 1 Sight.",
    revelation: "If any altitude is Tolled, gain 1 Sight.",
    text: "Veiled: When this Holds on a Tolled altitude, gain 1 Sight. Revelation: If any altitude is Tolled, gain 1 Sight.",
  },
];

export const BELLWARD_TOLL_WAVE1_RITE_IDS: string[] = [];
