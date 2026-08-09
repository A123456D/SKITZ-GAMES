import type { CardDef } from "./types";

/**
 * Bonewick — Wave 3 (continuity walls / Fall value / soft control).
 * Mid only with Inhabitant/Vessel already online.
 * Names stay Bonewick-native — no Matron/Duelist/Herald clones.
 */
export const BONEWICK_WAVE3: CardDef[] = [
  {
    id: "gallery_keeper",
    name: "Gallery Keeper",
    heresy: "shell",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "gallery keeper cracked bone keeper coastal shrine blue eye-banners pale sea regal original Bonewick",
    text: "Revelation: If you have an Inhabitant, draw 1. Until Resolve: your Figures have +1 power while you control a Vessel.",
  },
  {
    id: "shard_blade",
    name: "Shard Blade",
    heresy: "shell",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 4,
    sightYield: 0,
    artSubject:
      "shard blade one-eye bone blade coastal dock duel stance blue cord original Bonewick",
    text: "Revelation: If you control a Vessel, Blind this altitude this turn. When this wins Resolve and you have an Inhabitant, draw 1.",
  },
  {
    id: "blue_shard_caller",
    name: "Blue-Shard Caller",
    heresy: "shell",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 2,
    witnessedPower: 2,
    sightYield: 1,
    artSubject:
      "blue-shard caller cracked bone mask blue shard staff coastal shrine original Bonewick",
    text: "Revelation: Gain 1 Sight per Vessel you control (max 2). Witnessed: +1 Sight/turn.",
  },
  {
    id: "wick_urn",
    name: "Wick Urn",
    heresy: "shell",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 2,
    sightYield: 0,
    artSubject:
      "wick urn cracked bone vessel pale wick interior coastal shrine original Bonewick",
    text: "Vessel. Tucks a Figure from hand if able. Fall: release Inhabitant here Veiled; if you control another Vessel, draw 1. Revelation: release Inhabitant here Veiled if empty, else to hand.",
  },
  {
    id: "bone_mast",
    name: "Bone Mast",
    heresy: "shell",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 1,
    artSubject:
      "bone mast coastal shrine mast blue banners bone charms landmark original Bonewick",
    text: "Site. +1 Sight/turn. Your Figures here have +1 power while you have an Inhabitant.",
  },
  {
    id: "refill_charm",
    name: "Refill Charm",
    heresy: "shell",
    type: "relic",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "refill charm bone wick pendant blue cord coastal relic original Bonewick",
    text: "Graft: +1 power while host Witnessed. When host Witnesses, if you control a Veiled Figure and a Vessel, gain 1 Sight.",
  },
  {
    id: "shell_tax",
    name: "Shell Tax",
    heresy: "shell",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "shell tax rite bone ledger bell coastal shrine blue seals original Bonewick",
    text: "If you have an Inhabitant, Bounce the enemy Veiled Figure here if able. Otherwise gain 1 Sight.",
  },
  {
    id: "open_shell",
    name: "Open Shell",
    heresy: "shell",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "open shell rite cracked bone urn opening coastal shrine original Bonewick",
    text: "Draw 1. If you control a Vessel with no Inhabitant, tuck a Figure from hand into it if able.",
  },
];

export const BONEWICK_WAVE3_RITE_IDS = new Set(["shell_tax", "open_shell"]);
