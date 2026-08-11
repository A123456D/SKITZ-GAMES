import type { CardDef } from "./types";

/** Motley Masquerade — Wave 3 (shelved; old Stance set until rebuilt). */
export const MOTLEY_COURT_WAVE3: CardDef[] = [
  {
    id: "ribbon_duelist",
    name: "Ribbon Duelist",
    heresy: "motley",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "motley ribbon duelist purple teal sash blade smile halfmask high cliff duel original",
    text: "Revelation: Enter Stance B. If on High, gain 1 Sight.",
  },
  {
    id: "tithe_widow",
    name: "Tithe Widow",
    heresy: "motley",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "glamorous sexy motley tithe widow purple ledger veil gold coin tears court cliffs original",
    text: "Revelation: Switch Stance. If this became Stance B, the opponent loses 1 Sight and you gain 1 Sight.",
  },
  {
    id: "pairmask_usher",
    name: "Pairmask Usher",
    heresy: "motley",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 1,
    artSubject:
      "motley pairmask usher twin smile spiral masks purple teal court corridor original",
    text: "Revelation: If you control another Stance B Figure, gain 1 Favor and gain 1 Sight; else enter Stance B. Witnessed: +1 Sight/turn.",
  },
  {
    id: "gala_warden",
    name: "Gala Warden",
    heresy: "motley",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "motley gala warden tall grin guard purple gold court plaza cliffs original",
    text: "Revelation: Enter Stance B. Until Resolve: your Stance B Figures have +1 power.",
  },
  {
    id: "gallery_of_debts",
    name: "Gallery of Debts",
    heresy: "motley",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley gallery of debts ledger masks purple teal court hall landmark original",
    text: "Site. When an enemy Witnesses a Figure in this altitude, if you control a Motley Figure here, it enters Stance B and you gain 1 Sight.",
  },
  {
    id: "falseface_locket",
    name: "Falseface Locket",
    heresy: "motley",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "motley falseface locket hinged smile spiral gold purple charm original",
    text: "Graft: +1 power while host Witnessed. When host Holds against Forced Exposed, gain 1 Sight.",
  },
  {
    id: "encore_flip",
    name: "Encore Flip",
    heresy: "motley",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley encore flip second curtain card rite purple gold amphitheater original",
    text: "Switch Stance on a friendly Figure. If it became Stance B and is Veiled, it has +1 power until Resolve; gain 1 Sight.",
  },
  {
    id: "jury_grin",
    name: "Jury's Grin",
    heresy: "motley",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "motley jury grin many smile masks court rite purple teal original",
    text: "If you have 2+ Stance B Figures, gain 1 Favor and gain 1 Sight. Otherwise switch Stance on a friendly Figure at the chosen altitude.",
  },
];

export const MOTLEY_COURT_WAVE3_RITE_IDS = new Set(["encore_flip", "jury_grin"]);
