/** Paper Riot visual themes — classroom (default) + edgy (Riot Cube pack). */

export type ThemeId = "classroom" | "edgy";

export const THEME_IDS: readonly ThemeId[] = ["classroom", "edgy"] as const;

export const THEME_LABELS: Record<ThemeId, string> = {
  classroom: "CLASSROOM",
  edgy: "EDGY",
};

export type ThemePalette = {
  bg: string;
  paper: string;
  paperDim: string;
  ink: string;
  hot: string;
  lime: string;
  purple: string;
  orange: string;
  white: string;
  tape: string;
  gridLine: string;
  shadow: string;
};

const CLASSROOM: ThemePalette = {
  bg: "#0a0a0a",
  paper: "#f4f0e6",
  paperDim: "#e8e0d0",
  ink: "#111111",
  hot: "#ff2d6a",
  lime: "#b6ff3b",
  purple: "#7a3cff",
  orange: "#ff7a18",
  white: "#ffffff",
  tape: "#ffd24a",
  gridLine: "rgba(20,20,20,0.55)",
  shadow: "rgba(0,0,0,0.45)",
};

/** Riot Cube edgy desk — purple/pink on black. */
const EDGY: ThemePalette = {
  bg: "#030203",
  paper: "#efe8df",
  paperDim: "#e4dcd0",
  ink: "#0a0a0a",
  hot: "#fb7185",
  lime: "#fbbf24",
  purple: "#c084fc",
  orange: "#fb7185",
  white: "#fafafa",
  tape: "#c084fc",
  gridLine: "rgba(192,132,252,0.35)",
  shadow: "rgba(0,0,0,0.55)",
};

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  classroom: CLASSROOM,
  edgy: EDGY,
};

const THEME_KEY = "paper-riot-theme";

/** Mutable current palette — draw code keeps using `Palette.x`. */
export const Palette: ThemePalette = { ...CLASSROOM };

let themeId: ThemeId = readStoredTheme();

function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "edgy" || raw === "classroom") return raw;
  } catch {
    /* ignore */
  }
  return "classroom";
}

export function getTheme(): ThemeId {
  return themeId;
}

export function applyThemePalette(id: ThemeId): void {
  themeId = id;
  Object.assign(Palette, THEME_PALETTES[id]);
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", Palette.bg);
    document.documentElement.style.background = Palette.bg;
    document.body.style.background = Palette.bg;
    const app = document.getElementById("app");
    if (app) app.style.background = Palette.bg;
  }
}

/** Apply stored theme on boot (before first paint). */
export function initTheme(): ThemeId {
  applyThemePalette(themeId);
  return themeId;
}

export function cycleTheme(): ThemeId {
  const i = THEME_IDS.indexOf(themeId);
  const next = THEME_IDS[(i + 1) % THEME_IDS.length]!;
  applyThemePalette(next);
  return next;
}
