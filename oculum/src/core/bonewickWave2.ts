import type { CardDef } from "./types";

/**
 * Bonewick — Wave 2 (forced release / tuck tempo / multi-Vessel).
 * Names stay Bonewick-native — no ash/ember, no shared Widow/Cantor/Bailiff/Siren labels.
 */
export const BONEWICK_WAVE2: CardDef[] = [
  {
    id: "bell_hollow",
    name: "Bell Hollow",
    heresy: "shell",
    type: "figure",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 4,
    sightYield: 1,
    artSubject:
      "bell hollow cracked bone-white coastal shrine one-eye hollow bells blue banners pale sea NO dusk hat original Bonewick",
    text: "Revelation: Force-release an Inhabitant from a Vessel to hand if able. If you did, draw 1. Witnessed: +1 Sight/turn.",
  },
  {
    id: "rib_warden",
    name: "Rib Warden",
    heresy: "shell",
    type: "figure",
    essence: 4,
    witnessCost: 2,
    veiledPower: 2,
    witnessedPower: 5,
    sightYield: 0,
    artSubject:
      "rib warden one-eye bone construct coastal dock blue cord staff pale sea original Bonewick",
    text: "Revelation: If you have an Inhabitant, Blind this altitude this turn. While Witnessed: your Vessels have +1 power.",
  },
  {
    id: "tide_chanter",
    name: "Tide Chanter",
    heresy: "shell",
    type: "figure",
    essence: 2,
    witnessCost: 1,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 0,
    artSubject:
      "tide chanter bone singer salt spray coastal mid dock blue banners original Bonewick",
    text: "Revelation: If on Mid and you have an Inhabitant, draw 1. Else if you control a Vessel, gain 1 Sight.",
  },
  {
    id: "rib_vessel",
    name: "Rib Vessel",
    heresy: "shell",
    type: "vessel",
    essence: 3,
    witnessCost: 2,
    veiledPower: 1,
    witnessedPower: 3,
    sightYield: 1,
    artSubject:
      "rib vessel cracked bone vessel angel-with-interior coastal shrine blue shards original Bonewick",
    text: "Vessel. Tucks a Figure from hand if able. Fall: release Inhabitant here Veiled. Revelation: release Inhabitant here Veiled if empty, else to hand. If you control Bone Gallery, gain 1 Sight.",
  },
  {
    id: "inhabit_dock",
    name: "Inhabit Dock",
    heresy: "shell",
    type: "site",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "inhabit dock coastal bone pier empty shells low tide landmark blue banners original Bonewick",
    text: "Site. When you tuck a Figure into a Vessel, gain 1 Sight.",
  },
  {
    id: "shell_seal",
    name: "Shell Seal",
    heresy: "shell",
    type: "relic",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 1,
    sightYield: 0,
    artSubject:
      "shell seal bone ofuda blue wax coastal relic original Bonewick",
    text: "Graft: +1 power while host Witnessed. When host Witnesses, if you control a Vessel with no Inhabitant, tuck a Figure from hand into it if able.",
  },
  {
    id: "forced_wick",
    name: "Forced Wick",
    heresy: "shell",
    type: "rite",
    essence: 2,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "forced wick rite bone bell cord coastal shrine blue banners original Bonewick",
    text: "Force-release an Inhabitant from a Vessel to hand if able. If you did and control another Vessel, draw 1.",
  },
  {
    id: "empty_shell",
    name: "Empty Shell",
    heresy: "shell",
    type: "rite",
    essence: 1,
    witnessCost: 0,
    veiledPower: 0,
    witnessedPower: 0,
    sightYield: 0,
    artSubject:
      "empty shell rite hollow bone urn seal coastal shrine original Bonewick",
    text: "If you control a Vessel with no Inhabitant, draw 1. Otherwise gain 1 Sight.",
  },
];

export const BONEWICK_WAVE2_RITE_IDS = new Set(["forced_wick", "empty_shell"]);
