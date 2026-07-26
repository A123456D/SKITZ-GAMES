/** Live theme palette — draw code reads `colors` (mutable). */

export type ThemeId = "paper" | "mono" | "retro" | "punk";

export type ThemeColors = {
  VOID: string;
  PAPER: string;
  PAPER_DARK: string;
  INK: string;
  INK_SOFT: string;
  INK_FAINT: string;
  INK_HAIR: string;
  SELECT: string;
  FILL: string;
  SHADE: string;
  /** Fallback / default inked objects. */
  OBJ: string;
  /** Solid wall / crate blocks. */
  BLOCK: string;
  /** Directional barrier shutters. */
  BARRIER: string;
  /** Turntable face fill. */
  TABLE_FILL: string;
  /** Turntable rim + wiring. */
  TABLE: string;
  /** Turntable outer outline. */
  TABLE_OUTLINE: string;
  /** Wormhole portals. */
  WORM: string;
  /** Mirrors. */
  MIRROR: string;
  /** Beam sinks. */
  SINK: string;
  /** Channel filters. */
  FILTER: string;
  /** Solid / dashed / dotted channel accents (lasers). */
  CH0: string;
  CH1: string;
  CH2: string;
  PRIMARY: string;
  ACCENT: string;
  TEXT: string;
  MUTED: string;
  SUCCESS: string;
  WARN: string;
  RIM_IDLE: string;
  RIM_SEL: string;
  FLOOR: string;
  METAL_DARK: string;
  METAL_MID: string;
  METAL_LIGHT: string;
};

type ThemeBase = Omit<
  ThemeColors,
  | "PRIMARY"
  | "ACCENT"
  | "TEXT"
  | "MUTED"
  | "SUCCESS"
  | "WARN"
  | "RIM_IDLE"
  | "RIM_SEL"
  | "FLOOR"
  | "METAL_DARK"
  | "METAL_MID"
  | "METAL_LIGHT"
>;

function pack(base: ThemeBase): ThemeColors {
  return {
    ...base,
    PRIMARY: base.INK,
    ACCENT: base.OBJ,
    TEXT: base.INK,
    MUTED: base.INK_FAINT,
    SUCCESS: base.CH0,
    WARN: base.INK_SOFT,
    RIM_IDLE: base.INK_SOFT,
    RIM_SEL: base.INK,
    FLOOR: base.PAPER,
    METAL_DARK: base.SHADE,
    METAL_MID: base.FILL,
    METAL_LIGHT: base.FILL,
  };
}

/**
 * Clean paper formula: one ink for every mark, one taupe for every disc.
 * No red/blue/yellow object accents — the board stays monochrome within its tint.
 */
function cleanBoard(
  paper: string,
  paperDark: string,
  voidBg: string,
  ink: string,
  inkSoft: string,
  inkFaint: string,
  inkHair: string,
  disc: string,
  button: string,
  shade: string,
  select = ink,
): ThemeBase {
  return {
    VOID: voidBg,
    PAPER: paper,
    PAPER_DARK: paperDark,
    INK: ink,
    INK_SOFT: inkSoft,
    INK_FAINT: inkFaint,
    INK_HAIR: inkHair,
    SELECT: select,
    FILL: button,
    SHADE: shade,
    OBJ: ink,
    BLOCK: ink,
    BARRIER: ink,
    TABLE_FILL: disc,
    TABLE: ink,
    TABLE_OUTLINE: inkSoft,
    WORM: ink,
    MIRROR: ink,
    SINK: ink,
    FILTER: ink,
    CH0: ink,
    CH1: inkSoft,
    CH2: inkFaint,
  };
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  /**
   * INK — crumpled sketchbook paper, white embossed cutout knobs,
   * hard black fineliner paths. Matches the hand-drawn reference.
   */
  paper: pack(
    cleanBoard(
      "#FBF9F4", // smooth warm-white paper, matching the knob stock
      "#E8E2D6", // paper dark / torn edge
      "#E4DED2", // outer desk / void
      "#1A1A1A", // fineliner ink
      "#3A3A3A", // ink soft
      "#7A7A72", // faded ink
      "#C8C2B6", // hairlines
      "#FBF9F4", // white paper disc cutout
      "#F5F2EA", // button stock
      "#D4CEC2", // soft shade under cutouts
    ),
  ),
  /**
   * CYBER — black / red hacking terminal: carbon panels, neon-red HUD, laser
   * traces. Internal id stays `mono` for save compatibility.
   */
  mono: {
    VOID: "#050506",
    PAPER: "#0A0A0C",
    PAPER_DARK: "#121214",
    INK: "#FF2A2A",
    INK_SOFT: "#FF6A6A",
    INK_FAINT: "#8A3030",
    INK_HAIR: "#2A1214",
    SELECT: "#FF2A2A",
    FILL: "#101012",
    SHADE: "#050506",
    OBJ: "#FF2A2A",
    BLOCK: "#FF2A2A",
    BARRIER: "#FF2A2A",
    TABLE_FILL: "#0C0C0E",
    TABLE: "#FF2A2A",
    TABLE_OUTLINE: "#FF2A2A",
    WORM: "#FF2A2A",
    MIRROR: "#FF6A6A",
    SINK: "#FF2A2A",
    FILTER: "#FF2A2A",
    CH0: "#FF2A2A",
    CH1: "#FF6A6A",
    CH2: "#FF9A9A",
    PRIMARY: "#FF2A2A",
    ACCENT: "#FF2A2A",
    TEXT: "#FF2A2A",
    MUTED: "#8A3030",
    SUCCESS: "#FF2A2A",
    WARN: "#FF6A6A",
    RIM_IDLE: "#FF2A2A",
    RIM_SEL: "#FF6A6A",
    FLOOR: "#0A0A0C",
    METAL_DARK: "#050506",
    METAL_MID: "#121214",
    METAL_LIGHT: "#1A1A1E",
  },
  /**
   * RETRO — still night, still cyan, but one accent only (no rainbow objects).
   */
  retro: pack({
    VOID: "#060014",
    PAPER: "#100228",
    PAPER_DARK: "#1C0A3C",
    INK: "#F4ECF8",
    INK_SOFT: "#C8B0D8",
    INK_FAINT: "#8870A0",
    INK_HAIR: "#3A2860",
    SELECT: "#5CFFF8",
    FILL: "#1A0A3A",
    SHADE: "#10081A",
    OBJ: "#5CFFF8",
    BLOCK: "#5CFFF8",
    BARRIER: "#5CFFF8",
    // Dark plum cardstock with neon retrowave edge and signal traces.
    TABLE_FILL: "#1A0A30",
    TABLE: "#5CFFF8",
    TABLE_OUTLINE: "#FF6EC7",
    WORM: "#5CFFF8",
    MIRROR: "#5CFFF8",
    SINK: "#5CFFF8",
    FILTER: "#5CFFF8",
    CH0: "#5CFFF8",
    CH1: "#A8F0F4",
    CH2: "#3AD0D8",
  }),
  /**
   * PUNK — xerox flyer grit, black enamel badges, acid lime + hot magenta.
   * Hard edges and sticker energy — no soft purple glow.
   */
  punk: pack({
    VOID: "#050505",
    PAPER: "#0E0E0E",
    PAPER_DARK: "#161616",
    INK: "#F2F0E8",
    INK_SOFT: "#C8FF00",
    INK_FAINT: "#8A8878",
    INK_HAIR: "#2A2A2A",
    SELECT: "#FF2D95",
    FILL: "#1A1A1A",
    SHADE: "#0A0A0A",
    OBJ: "#C8FF00",
    BLOCK: "#F2F0E8",
    BARRIER: "#FF2D95",
    TABLE_FILL: "#141414",
    TABLE: "#C8FF00",
    TABLE_OUTLINE: "#FF2D95",
    WORM: "#C8FF00",
    MIRROR: "#F2F0E8",
    SINK: "#FF2D95",
    FILTER: "#C8FF00",
    CH0: "#C8FF00",
    CH1: "#E8FF66",
    CH2: "#FF2D95",
  }),
};

export const THEME_ORDER: ThemeId[] = ["paper", "mono", "retro", "punk"];

export const THEME_LABELS: Record<ThemeId, string> = {
  paper: "INK",
  mono: "CYBER",
  retro: "RETRO",
  punk: "PUNK",
};

export const colors: ThemeColors = { ...THEMES.paper };

let currentId: ThemeId = "paper";

export function getThemeId(): ThemeId {
  return currentId;
}

/** Light paper-board themes (cream / white boards). */
export function isLightTheme(id: ThemeId = currentId): boolean {
  return id === "paper";
}

/** Dark night-board themes. */
export function isDarkTheme(id: ThemeId = currentId): boolean {
  return id === "retro" || id === "punk" || id === "mono";
}

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && v in THEMES;
}

export function channelColor(channel: number): string {
  if (channel === 1) return colors.CH1;
  if (channel === 2) return colors.CH2;
  return colors.CH0;
}

import { setMusicThemeBed } from "../audio/music";

/** Sync page chrome to match canvas theme. */
export function syncDomTheme(): void {
  const root = document.documentElement;
  const body = document.body;
  const game = document.getElementById("game");
  root.style.background = colors.VOID;
  body.style.background = colors.VOID;
  body.style.color = colors.INK;
  if (game) {
    game.style.background = colors.VOID;
    game.style.border = "none";
    game.style.boxShadow = "none";
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.VOID);
}

export function applyTheme(id: ThemeId): void {
  currentId = id;
  Object.assign(colors, THEMES[id]);
  syncDomTheme();
  setMusicThemeBed(
    id === "retro" ? "retro" : id === "punk" ? "punk" : id === "mono" ? "cyber" : "ambient",
  );
}
