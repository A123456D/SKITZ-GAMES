export const THEME_IDS = ["classroom", "grime", "anime"] as const;
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

/** Matches GRIME sticker sheet: black field, purple/pink graffiti. */
const GRIME_PALETTE: ThemePalette = {
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

export const THEMES: ThemeDef[] = [
  { id: "classroom", label: "CLASS ROOM", palette: CLASSROOM_PALETTE },
  { id: "grime", label: "GRIME", palette: GRIME_PALETTE },
  { id: "anime", label: "ANIME", palette: ANIME_PALETTE },
];

const THEME_KEY = "riotcube_theme";

let current: ThemeId = loadStored();

function loadStored(): ThemeId {
  try {
    let v = localStorage.getItem(THEME_KEY);
    if (v === "classic") {
      v = "classroom";
      try {
        localStorage.setItem(THEME_KEY, v);
      } catch {
        /* ignore */
      }
    }
    if (v && (THEME_IDS as readonly string[]).includes(v)) return v as ThemeId;
  } catch {
    /* ignore */
  }
  return "grime";
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

export function getPalette(): ThemePalette {
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

/** Cycle classroom → grime → anime → … */
export function cycleTheme(): ThemeId {
  const i = THEME_IDS.indexOf(current);
  const next = THEME_IDS[(i + 1) % THEME_IDS.length]!;
  setTheme(next);
  return next;
}

export function stickerPath(kind: string, theme: ThemeId = current): string {
  return `./themes/${theme}/${kind}.png`;
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
