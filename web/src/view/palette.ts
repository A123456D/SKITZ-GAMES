/** Live theme palette — draw code reads `colors` (mutable). */

export type ThemeId = "paper" | "dusk" | "red" | "blue" | "mono" | "retro";

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
   * INK — cream paper, taupe knobs, charcoal paths.
   * Matches the reference look with no colored discs.
   */
  paper: pack(
    cleanBoard(
      "#F4F0E8", // paper
      "#E6E0D4", // paper dark
      "#EDE8DF", // void
      "#2C2A26", // ink
      "#4A4640", // ink soft
      "#8A857C", // ink faint
      "#C4BEB2", // ink hair
      "#B8B2A6", // disc taupe — matches the reference cardstock
      "#C4BEB2", // button
      "#9A9488", // shade
    ),
  ),
  /**
   * RED — same clean paper board, rose-tinted.
   */
  red: pack(
    cleanBoard(
      "#F8EDEA", // warmer rose paper
      "#EAD6D0",
      "#F2E6E2",
      "#5C2E2C", // deep rose ink
      "#8A504C",
      "#B8908C",
      "#D8C4C0",
      "#C9A8A2", // rose-taupe discs
      "#D4B8B2",
      "#A87872",
    ),
  ),
  /**
   * BLUE — same clean paper board, slate-tinted.
   */
  blue: pack(
    cleanBoard(
      "#ECF1F6",
      "#D4DEE8",
      "#E4EAF0",
      "#243848",
      "#3E5870",
      "#7A90A4",
      "#B0C0D0",
      "#A0B0C0",
      "#B0C0D0",
      "#7088A0",
    ),
  ),
  /**
   * DUSK — quiet night paper: navy field, light-grey knobs, single soft ink.
   */
  dusk: pack(
    cleanBoard(
      "#0E2448",
      "#16345F",
      "#071228",
      "#E8EEF8",
      "#C0CCE0",
      "#7E96BC",
      "#2A4A78",
      "#D0D6E0",
      "#1A3058",
      "#0A1B38",
      "#E8EEF8",
    ),
  ),
  /**
   * MONO — black field, grey knobs, white ink.
   */
  mono: pack(
    cleanBoard(
      "#0A0A0A",
      "#141414",
      "#000000",
      "#F0F0F0",
      "#C8C8C8",
      "#888888",
      "#3A3A3A",
      "#2A2A2A",
      "#1A1A1A",
      "#404040",
      "#FFFFFF",
    ),
  ),
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
    SHADE: "#2A1450",
    OBJ: "#5CFFF8",
    BLOCK: "#5CFFF8",
    BARRIER: "#5CFFF8",
    TABLE_FILL: "#1A0A3A",
    TABLE: "#5CFFF8",
    TABLE_OUTLINE: "#3AD0D8",
    WORM: "#5CFFF8",
    MIRROR: "#5CFFF8",
    SINK: "#5CFFF8",
    FILTER: "#5CFFF8",
    CH0: "#5CFFF8",
    CH1: "#A8F0F4",
    CH2: "#3AD0D8",
  }),
};

export const THEME_ORDER: ThemeId[] = ["paper", "dusk", "red", "blue", "mono", "retro"];

export const THEME_LABELS: Record<ThemeId, string> = {
  paper: "INK",
  dusk: "DUSK",
  red: "RED",
  blue: "BLUE",
  mono: "MONO",
  retro: "RETRO",
};

export const colors: ThemeColors = { ...THEMES.paper };

let currentId: ThemeId = "paper";

export function getThemeId(): ThemeId {
  return currentId;
}

/** Light paper-board themes (cream / tinted paper). */
export function isLightTheme(id: ThemeId = currentId): boolean {
  return id === "paper" || id === "red" || id === "blue";
}

/** Dark night-board themes. */
export function isDarkTheme(id: ThemeId = currentId): boolean {
  return id === "dusk" || id === "mono" || id === "retro";
}

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && v in THEMES;
}

export function channelColor(channel: number): string {
  if (channel === 1) return colors.CH1;
  if (channel === 2) return colors.CH2;
  return colors.CH0;
}

/** Sync page chrome to match canvas theme. */
export function syncDomTheme(): void {
  const root = document.documentElement;
  const body = document.body;
  const game = document.getElementById("game");
  root.style.background = colors.VOID;
  body.style.background = colors.VOID;
  body.style.color = colors.INK;
  if (game) {
    game.style.background = colors.PAPER;
    game.style.borderColor = colors.INK_HAIR;
    game.style.boxShadow = isDarkTheme()
      ? `0 16px 48px ${colors.VOID}aa`
      : `0 12px 40px ${colors.INK}18`;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.PAPER);
}

export function applyTheme(id: ThemeId): void {
  currentId = id;
  Object.assign(colors, THEMES[id]);
  syncDomTheme();
}
