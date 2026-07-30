export const W = 720;
export const H = 1280;

/** Sticker-punk terminal — mint/acid on charcoal, tape coral accent. */
export const theme = {
  bg0: "#0d1110",
  bg1: "#151c19",
  bg2: "#1c2622",
  panel: "#1a2420",
  line: "#2e3d36",
  text: "#e8f0ea",
  muted: "#8a9e93",
  dim: "#5a6e64",
  accent: "#9dffb0",
  accent2: "#ff6b4a",
  warn: "#ffd166",
  jam: "#2a1818",
  sticky: "#ff8f6b",
  used: "#24302b",
  legalGlow: "rgba(157,255,176,0.35)",
  crt: "rgba(157,255,176,0.04)",
  fail: "#ff5c5c",
  ok: "#9dffb0",
} as const;

export type Theme = typeof theme;
