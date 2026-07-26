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

/** One ink color across all object roles. */
function monoObjects(ink: string, fill = "#FFFFFF", outline = ink): Pick<
  ThemeBase,
  | "OBJ"
  | "BLOCK"
  | "BARRIER"
  | "TABLE_FILL"
  | "TABLE"
  | "TABLE_OUTLINE"
  | "WORM"
  | "MIRROR"
  | "SINK"
  | "FILTER"
  | "CH0"
  | "CH1"
  | "CH2"
> {
  return {
    OBJ: ink,
    BLOCK: ink,
    BARRIER: ink,
    TABLE_FILL: fill,
    TABLE: ink,
    TABLE_OUTLINE: outline,
    WORM: ink,
    MIRROR: ink,
    SINK: ink,
    FILTER: ink,
    CH0: ink,
    CH1: ink,
    CH2: ink,
  };
}

/** Classic paper / ink — the original look. */
const PAPER_BASE = {
  VOID: "#F4F1EA",
  PAPER: "#F7F4EC",
  PAPER_DARK: "#E8E2D6",
  INK: "#141414",
  INK_SOFT: "#2A2A2A",
  INK_FAINT: "#9A958C",
  INK_HAIR: "#C4BFB4",
  SELECT: "#141414",
  FILL: "#FFFFFF",
  SHADE: "#B8B2A6",
} as const;

export const THEMES: Record<ThemeId, ThemeColors> = {
  paper: pack({
    ...PAPER_BASE,
    ...monoObjects("#141414"),
  }),
  red: pack({
    VOID: "#F3E8E6",
    PAPER: "#F8EEEB",
    PAPER_DARK: "#E8D4D0",
    INK: "#5C2E32",
    INK_SOFT: "#A95F63",
    INK_FAINT: "#B89694",
    INK_HAIR: "#D4B8B4",
    SELECT: "#A95F63",
    FILL: "#FFF8F6",
    SHADE: "#C9A8A4",
    ...monoObjects("#A95F63", "#FFF8F6", "#8E4F58"),
    CH0: "#B9676B",
    CH1: "#CB7D72",
    CH2: "#8E4F58",
  }),
  blue: pack({
    VOID: "#E6ECF2",
    PAPER: "#EEF3F8",
    PAPER_DARK: "#D4DEE8",
    INK: "#2E4058",
    INK_SOFT: "#607F9F",
    INK_FAINT: "#8A9BB0",
    INK_HAIR: "#B8C6D4",
    SELECT: "#607F9F",
    FILL: "#F7FAFC",
    SHADE: "#A8B8C8",
    ...monoObjects("#607F9F", "#F7FAFC", "#526D91"),
    CH0: "#698CAC",
    CH1: "#7CA4BC",
    CH2: "#526D91",
  }),
  /**
   * Soft night board: deep navy field, light-grey knobs,
   * mint connectors, coral ports. Calm, not neon.
   */
  dusk: pack({
    VOID: "#071228",
    PAPER: "#0E2448",
    PAPER_DARK: "#16345F",
    INK: "#F4F8FF",
    INK_SOFT: "#C9D8F0",
    INK_FAINT: "#7E96BC",
    INK_HAIR: "#2A4A78",
    SELECT: "#FF7A8A",
    FILL: "#152E58",
    SHADE: "#0A1B38",
    OBJ: "#F4F8FF",
    BLOCK: "#FF7A8A",
    BARRIER: "#5AD6A5",
    TABLE_FILL: "#D8DEE8",
    TABLE: "#5AD6A5",
    TABLE_OUTLINE: "#1A3358",
    WORM: "#F0D56A",
    MIRROR: "#B48AE8",
    SINK: "#F0A06A",
    FILTER: "#E08ABA",
    CH0: "#5AD6A5",
    CH1: "#7EE0BA",
    CH2: "#3FBF90",
  }),
  mono: pack({
    VOID: "#000000",
    PAPER: "#0A0A0A",
    PAPER_DARK: "#141414",
    INK: "#F2F2F2",
    INK_SOFT: "#D0D0D0",
    INK_FAINT: "#888888",
    INK_HAIR: "#3A3A3A",
    SELECT: "#FFFFFF",
    FILL: "#1A1A1A",
    SHADE: "#2A2A2A",
    ...monoObjects("#F2F2F2", "#1A1A1A", "#FFFFFF"),
    CH0: "#FFFFFF",
    CH1: "#C8C8C8",
    CH2: "#A0A0A0",
  }),
  /**
   * Neon night: violet void, dark knob faces,
   * hot-pink select, glowing cyan connectors, purple accents.
   */
  retro: pack({
    VOID: "#060014",
    PAPER: "#100228",
    PAPER_DARK: "#1C0A3C",
    INK: "#FFE8F6",
    INK_SOFT: "#FF6EC7",
    INK_FAINT: "#A88BC8",
    INK_HAIR: "#4A2A72",
    SELECT: "#C77DFF",
    FILL: "#1A0A3A",
    SHADE: "#2A1450",
    OBJ: "#FFE8F6",
    BLOCK: "#FF6EC7",
    BARRIER: "#00E5F0",
    TABLE_FILL: "#1A0A3A",
    TABLE: "#00E5F0",
    TABLE_OUTLINE: "#5CFFF8",
    WORM: "#FFE8F6",
    MIRROR: "#C77DFF",
    SINK: "#FF6EC7",
    FILTER: "#5CFFF8",
    CH0: "#00E5F0",
    CH1: "#5CFFF8",
    CH2: "#C77DFF",
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
      : `0 12px 40px ${colors.INK}22`;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.PAPER);
}

export function applyTheme(id: ThemeId): void {
  currentId = id;
  Object.assign(colors, THEMES[id]);
  syncDomTheme();
}
