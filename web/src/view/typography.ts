/** Shared UI typefaces — clean sans by default; hand for INK; tech for RETRO; flyer for PUNK. */

import { getThemeId } from "./palette";

export const FONT_FAMILY = '"Source Sans 3", "Segoe UI", sans-serif';
/** Bold stamp hand-lettering — titles / buttons on the INK theme. */
export const FONT_HAND = '"Permanent Marker", "Patrick Hand", "Segoe UI", cursive';
/** Soft handwriting — coach hints on the INK theme. */
export const FONT_SCRIPT = '"Caveat", "Segoe UI", cursive';
/** Synthwave display — titles / buttons / HUD on the RETRO theme. */
export const FONT_RETRO = '"Orbitron", "Segoe UI", sans-serif';
/** Xerox-flyer display — titles / buttons / HUD on the PUNK theme. */
export const FONT_PUNK = '"Rubik Glitch", "Bungee", "Impact", sans-serif';
/** Squared techno display — titles / buttons / HUD on the CYBER theme. */
export const FONT_CYBER = '"Chakra Petch", "Rajdhani", "Segoe UI", sans-serif';

function defaultFamily(): string {
  const id = getThemeId();
  if (id === "retro") return FONT_RETRO;
  if (id === "punk") return FONT_PUNK;
  if (id === "mono") return FONT_CYBER;
  return FONT_FAMILY;
}

/** Canvas `ctx.font` helper: weight + size in px. Theme-aware default family. */
export function font(weight: number | string, sizePx: number, family?: string): string {
  return `${weight} ${Math.round(sizePx)}px ${family ?? defaultFamily()}`;
}

export function fontHand(sizePx: number, weight: number | string = 400): string {
  return font(weight, sizePx, FONT_HAND);
}

export function fontScript(sizePx: number, weight: number | string = 600): string {
  return font(weight, sizePx, FONT_SCRIPT);
}

export function fontRetro(sizePx: number, weight: number | string = 700): string {
  return font(weight, sizePx, FONT_RETRO);
}

export function fontPunk(sizePx: number, weight: number | string = 400): string {
  return font(weight, sizePx, FONT_PUNK);
}

export function fontCyber(sizePx: number, weight: number | string = 700): string {
  return font(weight, sizePx, FONT_CYBER);
}

/** Preload weights used by the UI so the first frame isn't a fallback flash. */
export async function loadUiFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`500 16px ${FONT_FAMILY}`),
      document.fonts.load(`600 18px ${FONT_FAMILY}`),
      document.fonts.load(`700 28px ${FONT_FAMILY}`),
      document.fonts.load(`400 28px ${FONT_HAND}`),
      document.fonts.load(`700 36px ${FONT_HAND}`),
      document.fonts.load(`400 34px "Permanent Marker"`),
      document.fonts.load(`600 22px ${FONT_SCRIPT}`),
      document.fonts.load(`600 18px ${FONT_RETRO}`),
      document.fonts.load(`700 28px ${FONT_RETRO}`),
      document.fonts.load(`800 34px ${FONT_RETRO}`),
      document.fonts.load(`400 22px ${FONT_PUNK}`),
      document.fonts.load(`400 28px "Rubik Glitch"`),
      document.fonts.load(`400 32px "Bungee"`),
      document.fonts.load(`600 18px ${FONT_CYBER}`),
      document.fonts.load(`700 28px ${FONT_CYBER}`),
      document.fonts.load(`700 34px "Chakra Petch"`),
    ]);
  } catch {
    // Offline / blocked CDN — canvas falls back to Segoe UI.
  }
}
