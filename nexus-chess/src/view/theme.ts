/** Theme tokens + Classic / Nexus / Forge packs. Nexus is the default. */

export type ThemeId = "nexus" | "forge" | "classic";

export interface ThemeTokens {
  id: ThemeId;
  label: string;
  bg: string;
  bgSoft: string;
  tileDark: string;
  tileLight: string;
  tileSheen: string;
  nexus: string;
  nexusGlow: string;
  accent: string;
  accentDim: string;
  ink: string;
  inkDim: string;
  inkMute: string;
  inkFaint: string;
  hairline: string;
  hairlineStrong: string;
  hairlineBright: string;
  whitePiece: string;
  blackPiece: string;
  pieceShadow: string;
  btnFill: string;
  btnFillActive: string;
  radius: number;
  font: string;
  pieceMode: "unicode" | "sprites";
  /** Prefer sharp geometric chrome. */
  angular: boolean;
  backdropUrl: string | null;
  /** Optional full-board texture drawn under pieces. */
  boardUrl: string | null;
  /** Optional per-cell tile overlay. */
  tileUrl: string | null;
  /** Piece sprite folder under ./themes/ */
  piecePack: string | null;
  /** Pulse / FX accent rgba prefix ending with "(" e.g. "rgba(170,230,255," */
  pulseRgba: string;
}

export const CLASSIC_THEME: ThemeTokens = {
  id: "classic",
  label: "Classic",
  bg: "#050506",
  bgSoft: "#0a0a0c",
  tileDark: "#0c0c0e",
  tileLight: "#16161a",
  tileSheen: "rgba(255,255,255,0.035)",
  nexus: "#ffffff",
  nexusGlow: "rgba(255,255,255,0.55)",
  accent: "#f5f5f6",
  accentDim: "rgba(245,245,246,0.35)",
  ink: "#f5f5f6",
  inkDim: "rgba(245,245,246,0.62)",
  inkMute: "rgba(245,245,246,0.32)",
  inkFaint: "rgba(245,245,246,0.14)",
  hairline: "rgba(245,245,246,0.14)",
  hairlineStrong: "rgba(245,245,246,0.42)",
  hairlineBright: "rgba(245,245,246,0.72)",
  whitePiece: "#fafafb",
  blackPiece: "#9a9ea8",
  pieceShadow: "rgba(0,0,0,0.55)",
  btnFill: "rgba(255,255,255,0.045)",
  btnFillActive: "rgba(255,255,255,0.1)",
  radius: 4,
  font: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
  pieceMode: "unicode",
  angular: false,
  backdropUrl: null,
  boardUrl: null,
  tileUrl: null,
  piecePack: null,
  pulseRgba: "rgba(255,255,255,",
};

/** Built around the custom geometric piece set — icy energy on void black. */
export const NEXUS_THEME: ThemeTokens = {
  id: "nexus",
  label: "Nexus",
  bg: "#03050a",
  bgSoft: "#070b14",
  tileDark: "#080c14",
  tileLight: "#121a28",
  tileSheen: "rgba(140,200,230,0.05)",
  nexus: "#7eb8d8",
  nexusGlow: "rgba(90,170,210,0.22)",
  accent: "#7ec4e8",
  accentDim: "rgba(110,180,220,0.28)",
  ink: "#eef7ff",
  inkDim: "rgba(220,235,250,0.7)",
  inkMute: "rgba(170,200,230,0.4)",
  inkFaint: "rgba(140,180,220,0.16)",
  hairline: "rgba(120,170,210,0.14)",
  hairlineStrong: "rgba(130,180,220,0.32)",
  hairlineBright: "rgba(150,200,230,0.55)",
  whitePiece: "#f4fbff",
  blackPiece: "#7a8798",
  pieceShadow: "rgba(0,8,20,0.65)",
  btnFill: "rgba(120,180,230,0.06)",
  btnFillActive: "rgba(120,200,255,0.14)",
  radius: 1,
  font: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
  pieceMode: "sprites",
  angular: true,
  backdropUrl: "./themes/nexus/backdrop.png",
  boardUrl: "./themes/nexus/board.png",
  tileUrl: null,
  piecePack: "nexus",
  pulseRgba: "rgba(130,190,220,",
};

/** 3D indie forge set — cyan vs crimson metal on obsidian. */
export const FORGE_THEME: ThemeTokens = {
  id: "forge",
  label: "Forge",
  bg: "#050308",
  bgSoft: "#0c0a10",
  tileDark: "#0a090c",
  tileLight: "#1c181f",
  tileSheen: "rgba(220,180,150,0.04)",
  nexus: "#ff7a7a",
  nexusGlow: "rgba(255,90,100,0.5)",
  accent: "#7ec8ff",
  accentDim: "rgba(126,200,255,0.35)",
  ink: "#f2f4f8",
  inkDim: "rgba(230,220,225,0.72)",
  inkMute: "rgba(190,170,180,0.4)",
  inkFaint: "rgba(160,140,150,0.16)",
  hairline: "rgba(180,150,160,0.18)",
  hairlineStrong: "rgba(200,120,130,0.42)",
  hairlineBright: "rgba(140,210,255,0.8)",
  whitePiece: "#e8f6ff",
  blackPiece: "#ff8a8a",
  pieceShadow: "rgba(0,0,0,0.7)",
  btnFill: "rgba(140,100,110,0.08)",
  btnFillActive: "rgba(120,180,230,0.16)",
  radius: 2,
  font: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
  pieceMode: "sprites",
  angular: true,
  backdropUrl: "./themes/forge/backdrop.png",
  boardUrl: "./themes/forge/board.png",
  tileUrl: "./themes/forge/tile.png",
  piecePack: "forge",
  pulseRgba: "rgba(255,120,130,",
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  nexus: NEXUS_THEME,
  forge: FORGE_THEME,
  classic: CLASSIC_THEME,
};

export const THEME_CYCLE: ThemeId[] = ["nexus", "forge", "classic"];

const STORAGE_KEY = "nexus-chess-theme";

export function loadThemeId(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "classic" || v === "nexus" || v === "forge") return v;
  } catch {
    /* ignore */
  }
  return "nexus";
}

export function nextThemeId(id: ThemeId): ThemeId {
  const i = THEME_CYCLE.indexOf(id);
  return THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
}

/** Live-bound active theme (ESM live binding — reassignment updates importers). */
export let Theme: ThemeTokens = NEXUS_THEME;

export function applyTheme(id: ThemeId): ThemeTokens {
  Theme = THEMES[id];
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return Theme;
}

export function initTheme(): ThemeTokens {
  return applyTheme(loadThemeId());
}
