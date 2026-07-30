/**
 * Nexus Chess SFX catalogs by pack.
 * forge  — current metallic / combat bank (existing files)
 * soft   — gentle board sounds for Nexus + Classic themes
 */

export const FORGE_SFX_CATALOG = [
  {
    id: "move-lift",
    file: "move-lift.mp3",
    duration: 0.55,
    text: "Sci-fi chess piece lift whoosh, soft holographic hover rise, clean short",
  },
  {
    id: "move-land",
    file: "move-land.mp3",
    duration: 0.55,
    text: "Futuristic chess piece hard land on digital board, solid thud with light tech click",
  },
  {
    id: "capture",
    file: "capture.mp3",
    duration: 0.7,
    text: "Sci-fi chess capture impact, energy shatter crunch, bright digital combat hit, short",
  },
  {
    id: "ui-tap",
    file: "ui-tap.mp3",
    duration: 0.5,
    text: "Clean futuristic UI tap click, soft neon button, very short",
  },
  {
    id: "ability",
    file: "ability.mp3",
    duration: 0.85,
    text: "Nexus ability cast shimmer, magical shield energy bloom, sci-fi power activate, short epic",
  },
  {
    id: "win",
    file: "win.mp3",
    duration: 1.5,
    text: "Nexus chess victory fanfare, triumphant sci-fi triumph sting, bright heroic short",
  },
  {
    id: "lose",
    file: "lose.mp3",
    duration: 1.2,
    text: "Nexus chess defeat sting, dark digital fail, short solemn loss cue",
  },
  {
    id: "select",
    file: "select.mp3",
    duration: 0.5,
    text: "Soft holographic piece select blip, gentle confirm, short UI",
  },
];

/** Soft pleasant pack shared by Nexus + Classic boards. */
export const SOFT_SFX_CATALOG = [
  {
    id: "move-lift",
    file: "move-lift.mp3",
    duration: 0.5,
    text: "Very soft wooden chess piece gentle lift, quiet felt whisper, warm pleasant short, no metal no harsh",
  },
  {
    id: "move-land",
    file: "move-land.mp3",
    duration: 0.5,
    text: "Soft wooden chess piece place on felt board, gentle muted tap, warm cozy short, pleasant soft",
  },
  {
    id: "capture",
    file: "capture.mp3",
    duration: 0.65,
    text: "Soft chess capture, gentle wood click remove piece, muted pleasant short, no crunch no shatter",
  },
  {
    id: "ui-tap",
    file: "ui-tap.mp3",
    duration: 0.45,
    text: "Soft pleasant UI tap, gentle glass chime tick, quiet short, warm",
  },
  {
    id: "ability",
    file: "ability.mp3",
    duration: 0.8,
    text: "Soft magical shimmer chime, gentle sparkle bloom, calm pleasant short ability cue",
  },
  {
    id: "win",
    file: "win.mp3",
    duration: 1.4,
    text: "Soft pleasant victory chime, warm gentle triumph bells, calm happy short fanfare, no brass blast",
  },
  {
    id: "lose",
    file: "lose.mp3",
    duration: 1.1,
    text: "Soft gentle loss sigh, quiet low warm tones fade, calm solemn short, not harsh",
  },
  {
    id: "select",
    file: "select.mp3",
    duration: 0.45,
    text: "Soft pleasant select tick, tiny warm wood click, very short gentle",
  },
];

/** @deprecated use FORGE_SFX_CATALOG — kept for older generate calls */
export const SFX_CATALOG = FORGE_SFX_CATALOG;

export const SFX_PACKS = {
  forge: FORGE_SFX_CATALOG,
  soft: SOFT_SFX_CATALOG,
};
