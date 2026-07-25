/** Live theme palette — draw code reads `colors` (mutable). */

export type ThemeId = "paper" | "pastel" | "red" | "blue" | "mono" | "synthwave";

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
    ...PAPER_BASE,
    ...monoObjects("#A95F63"),
    CH0: "#B9676B",
    CH1: "#CB7D72",
    CH2: "#8E4F58",
  }),
  blue: pack({
    ...PAPER_BASE,
    ...monoObjects("#607F9F"),
    CH0: "#698CAC",
    CH1: "#7CA4BC",
    CH2: "#526D91",
  }),
  pastel: pack({
    ...PAPER_BASE,
    OBJ: "#141414",
    BLOCK: "#E05C5C",
    BARRIER: "#2FBF78",
    TABLE_FILL: "#1B3A6E",
    TABLE: "#D7E6FF",
    TABLE_OUTLINE: "#0C1F40",
    WORM: "#E6C84A",
    MIRROR: "#9B6BC9",
    SINK: "#E0894A",
    FILTER: "#D46BA3",
    CH0: "#2FBF78",
    CH1: "#2FBF78",
    CH2: "#2FBF78",
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
  synthwave: pack({
    VOID: "#05010F",
    PAPER: "#0D0221",
    PAPER_DARK: "#1A0A2E",
    INK: "#FFE3F5",
    INK_SOFT: "#FF71CE",
    INK_FAINT: "#9B7BB8",
    INK_HAIR: "#4A2A6A",
    SELECT: "#05D9E8",
    FILL: "#1B0B3A",
    SHADE: "#2D1B4E",
    OBJ: "#FFE3F5",
    BLOCK: "#FFE3F5",
    BARRIER: "#39FF8A",
    TABLE_FILL: "#1B0B3A",
    TABLE: "#FFE3F5",
    TABLE_OUTLINE: "#05D9E8",
    WORM: "#FFE3F5",
    MIRROR: "#FFE3F5",
    SINK: "#FFE3F5",
    FILTER: "#FFE3F5",
    CH0: "#05D9E8",
    CH1: "#FF71CE",
    CH2: "#B967FF",
  }),
};

export const THEME_ORDER: ThemeId[] = ["paper", "pastel", "red", "blue", "mono", "synthwave"];

export const THEME_LABELS: Record<ThemeId, string> = {
  paper: "INK",
  pastel: "PASTEL",
  red: "RED",
  blue: "BLUE",
  mono: "MONO",
  synthwave: "WAVE",
};

export const colors: ThemeColors = { ...THEMES.paper };

let currentId: ThemeId = "paper";

export function getThemeId(): ThemeId {
  return currentId;
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
    game.style.boxShadow = `0 12px 40px ${colors.INK}22`;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.PAPER);
}

export function applyTheme(id: ThemeId): void {
  currentId = id;
  Object.assign(colors, THEMES[id]);
  syncDomTheme();
}
