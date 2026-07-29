/** Theme tokens + Classic / Nexus theme packs. Nexus is the default. */

export type ThemeId = "nexus" | "classic";

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
  /** Prefer sharp geometric chrome (Nexus). */
  angular: boolean;
  backdropUrl: string | null;
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
  nexus: "#9fdfff",
  nexusGlow: "rgba(120,210,255,0.55)",
  accent: "#8ed6ff",
  accentDim: "rgba(142,214,255,0.35)",
  ink: "#eef7ff",
  inkDim: "rgba(220,235,250,0.7)",
  inkMute: "rgba(170,200,230,0.4)",
  inkFaint: "rgba(140,180,220,0.16)",
  hairline: "rgba(150,200,240,0.18)",
  hairlineStrong: "rgba(160,210,255,0.45)",
  hairlineBright: "rgba(190,230,255,0.85)",
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
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  nexus: NEXUS_THEME,
  classic: CLASSIC_THEME,
};

const STORAGE_KEY = "nexus-chess-theme";

export function loadThemeId(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "classic" || v === "nexus") return v;
  } catch {
    /* ignore */
  }
  return "nexus";
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
