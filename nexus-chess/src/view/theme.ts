/** Nexus visual identity — monochrome tech + cyber accents. */

export const Theme = {
  bg: "#000000",
  bgElevated: "#0c0c0e",
  panel: "#111116",
  gridLine: "rgba(255,255,255,0.04)",

  // Board tiles (dark monochrome, slight contrast)
  tileDark: "#121218",
  tileLight: "#1c1c24",
  tileBorder: "rgba(255,255,255,0.06)",

  // Nexus energy
  nexusGold: "#f0c040",
  nexusBlue: "#4aa8ff",
  nexusWhite: "#ffffff",

  // UI
  ink: "#ffffff",
  inkDim: "rgba(255,255,255,0.55)",
  inkMute: "rgba(255,255,255,0.28)",
  stroke: "rgba(255,255,255,0.85)",
  strokeDim: "rgba(255,255,255,0.35)",
  accent: "#4aa8ff",
  accentHot: "#f0c040",
  danger: "#ff4d5a",
  success: "#3dff9a",

  // Pieces
  whitePiece: "#ffffff",
  blackPiece: "#0a0a0a",
  blackOutline: "#ffffff",

  font: '"Orbitron", "Segoe UI", system-ui, sans-serif',
  fontDisplay: '"Orbitron", "Segoe UI", system-ui, sans-serif',
} as const;

export type ThemeColors = typeof Theme;
