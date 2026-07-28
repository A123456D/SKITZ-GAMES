export const THEME_IDS = ["classroom", "edgy", "anime", "doodle", "relic"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemePalette = {
  /** Full-bleed desk gradient */
  desk0: string;
  desk1: string;
  /** Lime / purple accent */
  accent: string;
  /** Hot pink / blood accent */
  hot: string;
  /** Light paper / cream panels */
  paper: string;
  paperDeep: string;
  /** Dark ink on paper */
  ink: string;
  /** Soft secondary text */
  muted: string;
  /** Dark chrome panels (dock, tips) */
  panel: string;
  panelEdge: string;
  /** HUD scrap / goals */
  hudBg: string;
  hudInk: string;
  /** Cube face paper */
  faceActive: string;
  faceSide: string;
  faceStroke: string;
  faceRule: string;
  faceRuleDim: string;
  /** Rubik sticker colors: F B R L U D */
  faceColors: [string, string, string, string, string, string];
  /** Notebook rule / margin (legacy page) */
  rule: string;
  margin: string;
  tape: string;
  /** End overlay */
  losePanel: string;
  /** White / near-white */
  white: string;
  /** Document / PWA chrome */
  browser: string;
};

export type ThemeDef = {
  id: ThemeId;
  label: string;
  palette: ThemePalette;
};

/** Warm daytime desk — classroom wood tones, lime/pink accents. */
const CLASSROOM_PALETTE: ThemePalette = {
  desk0: "#d4c4a8",
  desk1: "#b8a888",
  accent: "#c8ff3d",
  hot: "#ff2d6a",
  paper: "#f3efe6",
  paperDeep: "#f7f3ea",
  ink: "#111111",
  muted: "#333333",
  panel: "#1b1b1b",
  panelEdge: "#c8ff3d",
  hudBg: "#f3efe6",
  hudInk: "#111111",
  faceActive: "#f4eee0",
  faceSide: "#e5dcc8",
  faceStroke: "#1a120c",
  faceRule: "rgba(80,140,200,0.2)",
  faceRuleDim: "rgba(80,140,200,0.14)",
  faceColors: [
    "#c8ff3d", // F lime
    "#5b8def", // B blue
    "#ff2d6a", // R hot pink
    "#ff9f1c", // L orange
    "#f3efe6", // U cream
    "#1b1b1b", // D black
  ],
  rule: "rgba(80,140,200,0.28)",
  margin: "rgba(220,80,80,0.35)",
  tape: "#ffd60a",
  losePanel: "#2a1a1a",
  white: "#ffffff",
  browser: "#c9b896",
};

/** Edgy sticker pack: black field, purple/pink graffiti accents. */
const EDGY_PALETTE: ThemePalette = {
  desk0: "#0c0a10",
  desk1: "#030203",
  accent: "#c084fc",
  hot: "#fb7185",
  paper: "#efe8df",
  paperDeep: "#e4dcd0",
  ink: "#0a0a0a",
  muted: "#a1a1aa",
  panel: "#141218",
  panelEdge: "#c084fc",
  hudBg: "#18161c",
  hudInk: "#f4f4f5",
  faceActive: "#f4eee0",
  faceSide: "#e5dcc8",
  faceStroke: "#1a120c",
  faceRule: "rgba(192,132,252,0.2)",
  faceRuleDim: "rgba(192,132,252,0.14)",
  faceColors: [
    "#c084fc", // F purple
    "#38bdf8", // B sky
    "#fb7185", // R pink
    "#fbbf24", // L amber
    "#f3efe6", // U cream
    "#1b1b1b", // D black
  ],
  rule: "rgba(192,132,252,0.28)",
  margin: "rgba(251,113,133,0.45)",
  tape: "#c084fc",
  losePanel: "#1a1014",
  white: "#fafafa",
  browser: "#030203",
};

/** Daytime neighborhood street — sky desk fallback, sakura hot, soft sky accent. */
const ANIME_PALETTE: ThemePalette = {
  desk0: "#87b8e8",
  desk1: "#c5dcf0",
  accent: "#0284c7",
  hot: "#ec4899",
  paper: "#f3efe6",
  paperDeep: "#e8e2d6",
  ink: "#0a0a0a",
  muted: "#64748b",
  panel: "#ffffff",
  panelEdge: "#0284c7",
  hudBg: "#ffffff",
  hudInk: "#0f172a",
  faceActive: "#f4eee0",
  faceSide: "#e5dcc8",
  faceStroke: "#1a120c",
  faceRule: "rgba(2,132,199,0.2)",
  faceRuleDim: "rgba(2,132,199,0.14)",
  faceColors: [
    "#38bdf8", // F sky
    "#a78bfa", // B soft purple
    "#f472b6", // R sakura
    "#fbbf24", // L amber
    "#f3efe6", // U cream
    "#64748b", // D slate
  ],
  rule: "rgba(2,132,199,0.28)",
  margin: "rgba(236,72,153,0.45)",
  tape: "#38bdf8",
  losePanel: "#e2e8f0",
  white: "#ffffff",
  browser: "#c5dcf0",
};

/** Horror night neighborhood — inky blacks, cool muted accents. */
const ANIME_DARK_PALETTE: ThemePalette = {
  desk0: "#0a0c12",
  desk1: "#030406",
  accent: "#7dd3fc",
  hot: "#f43f5e",
  paper: "#e8e4dc",
  paperDeep: "#d4cfc4",
  ink: "#0a0a0a",
  muted: "#94a3b8",
  panel: "#12141c",
  panelEdge: "#7dd3fc",
  hudBg: "#161820",
  hudInk: "#e2e8f0",
  faceActive: "#f4eee0",
  faceSide: "#e5dcc8",
  faceStroke: "#1a120c",
  faceRule: "rgba(125,211,252,0.18)",
  faceRuleDim: "rgba(125,211,252,0.12)",
  faceColors: [
    "#7dd3fc", // F ice
    "#a78bfa", // B soft purple
    "#f43f5e", // R blood
    "#fbbf24", // L amber
    "#e2e8f0", // U pale
    "#0f172a", // D night
  ],
  rule: "rgba(125,211,252,0.24)",
  margin: "rgba(244,63,94,0.45)",
  tape: "#7dd3fc",
  losePanel: "#0c0e14",
  white: "#f8fafc",
  browser: "#030406",
};

/** Sketchbook doodles — white paper, marker yellow accent, ink black. */
const DOODLE_PALETTE: ThemePalette = {
  desk0: "#f4f6f8",
  desk1: "#e2e8f0",
  accent: "#facc15",
  hot: "#22d3ee",
  paper: "#ffffff",
  paperDeep: "#f1f5f9",
  ink: "#0f172a",
  muted: "#64748b",
  panel: "#0f172a",
  panelEdge: "#facc15",
  hudBg: "#ffffff",
  hudInk: "#0f172a",
  faceActive: "#ffffff",
  faceSide: "#e2e8f0",
  faceStroke: "#0f172a",
  faceRule: "rgba(34,211,238,0.22)",
  faceRuleDim: "rgba(34,211,238,0.14)",
  faceColors: [
    "#4ade80", // F green
    "#60a5fa", // B blue
    "#fb7185", // R pink
    "#facc15", // L yellow
    "#ffffff", // U white
    "#334155", // D slate
  ],
  rule: "rgba(15,23,42,0.12)",
  margin: "rgba(34,211,238,0.4)",
  tape: "#facc15",
  losePanel: "#1e293b",
  white: "#ffffff",
  browser: "#e2e8f0",
};

/** Dark museum / occult relics — charcoal, crimson, electric purple. */
const RELIC_PALETTE: ThemePalette = {
  desk0: "#121018",
  desk1: "#07060a",
  accent: "#a855f7",
  hot: "#e11d48",
  paper: "#f3efe6",
  paperDeep: "#e5dcc8",
  ink: "#0a0a0a",
  muted: "#94a3b8",
  panel: "#16121c",
  panelEdge: "#e11d48",
  hudBg: "#1a1622",
  hudInk: "#f3efe6",
  faceActive: "#f4eee0",
  faceSide: "#e5dcc8",
  faceStroke: "#1a120c",
  faceRule: "rgba(168,85,247,0.2)",
  faceRuleDim: "rgba(168,85,247,0.12)",
  faceColors: [
    "#a855f7", // F purple
    "#38bdf8", // B sky
    "#e11d48", // R crimson
    "#fbbf24", // L amber
    "#f3efe6", // U cream
    "#0f0a14", // D void
  ],
  rule: "rgba(168,85,247,0.28)",
  margin: "rgba(225,29,72,0.45)",
  tape: "#a855f7",
  losePanel: "#0c0a10",
  white: "#fafafa",
  browser: "#07060a",
};

export const ANIME_MODES = ["day", "dark"] as const;
export type AnimeMode = (typeof ANIME_MODES)[number];

/** Asset folder under public/themes/ (anime resolves day/dark). */
export type ThemeAssetDir = ThemeId | "anime-dark";

export const THEMES: ThemeDef[] = [
  { id: "classroom", label: "CLASS ROOM", palette: CLASSROOM_PALETTE },
  { id: "edgy", label: "EDGY", palette: EDGY_PALETTE },
  { id: "anime", label: "ANIME", palette: ANIME_PALETTE },
  { id: "doodle", label: "DOODLE", palette: DOODLE_PALETTE },
  { id: "relic", label: "RELIC", palette: RELIC_PALETTE },
];

const THEME_KEY = "riotcube_theme";
const ANIME_MODE_KEY = "riotcube_anime_mode";

let current: ThemeId = loadStored();
let animeMode: AnimeMode = loadAnimeMode();

function loadStored(): ThemeId {
  try {
    let v = localStorage.getItem(THEME_KEY);
    if (v === "classic") v = "classroom";
    if (v === "grime") v = "edgy";
    if (
      v === "classroom" ||
      v === "edgy" ||
      v === "anime" ||
      v === "doodle" ||
      v === "relic"
    ) {
      try {
        localStorage.setItem(THEME_KEY, v);
      } catch {
        /* ignore */
      }
      return v;
    }
  } catch {
    /* ignore */
  }
  return "edgy";
}

function loadAnimeMode(): AnimeMode {
  try {
    const v = localStorage.getItem(ANIME_MODE_KEY);
    if (v && (ANIME_MODES as readonly string[]).includes(v)) return v as AnimeMode;
  } catch {
    /* ignore */
  }
  return "day";
}

export function getTheme(): ThemeId {
  return current;
}

export function getThemeDef(): ThemeDef {
  return THEMES.find((t) => t.id === current) ?? THEMES[0]!;
}

export function getThemeLabel(): string {
  return getThemeDef().label;
}

export function getAnimeMode(): AnimeMode {
  return animeMode;
}

export function setAnimeMode(mode: AnimeMode): void {
  animeMode = mode;
  try {
    localStorage.setItem(ANIME_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyThemeChrome();
}

export function toggleAnimeMode(): AnimeMode {
  const next: AnimeMode = animeMode === "day" ? "dark" : "day";
  setAnimeMode(next);
  return next;
}

/** Folder used for bg/btn/stickers for the active theme (+ anime mode). */
export function getThemeAssetDir(theme: ThemeId = current): ThemeAssetDir {
  if (theme === "anime" && animeMode === "dark") return "anime-dark";
  return theme;
}

export function getPalette(): ThemePalette {
  if (current === "anime" && animeMode === "dark") return ANIME_DARK_PALETTE;
  return getThemeDef().palette;
}

export function setTheme(id: ThemeId): void {
  current = id;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
  applyThemeChrome();
}

/** Cycle classroom → edgy → anime → doodle → relic → … */
export function cycleTheme(): ThemeId {
  const i = THEME_IDS.indexOf(current);
  const next = THEME_IDS[(i + 1) % THEME_IDS.length]!;
  setTheme(next);
  return next;
}

export function stickerPath(kind: string, theme: ThemeId = current): string {
  const dir = theme === "anime" ? getThemeAssetDir("anime") : theme;
  return `./themes/${dir}/${kind}.png`;
}

/** Sync page background / theme-color with active palette. */
export function applyThemeChrome(): void {
  const p = getPalette();
  try {
    document.documentElement.style.background = p.browser;
    document.body.style.background = p.browser;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.browser);
    const app = document.getElementById("app");
    if (app) (app as HTMLElement).style.background = p.browser;
  } catch {
    /* ignore */
  }
}
