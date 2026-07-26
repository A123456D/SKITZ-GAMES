/** Shared UI typeface — clean, calm sans for paper/ink UI. */
export const FONT_FAMILY = '"Source Sans 3", "Segoe UI", sans-serif';

/** Canvas `ctx.font` helper: weight + size in px. */
export function font(weight: number | string, sizePx: number): string {
  return `${weight} ${Math.round(sizePx)}px ${FONT_FAMILY}`;
}

/** Preload weights used by the UI so the first frame isn't a fallback flash. */
export async function loadUiFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`500 16px ${FONT_FAMILY}`),
      document.fonts.load(`600 18px ${FONT_FAMILY}`),
      document.fonts.load(`700 28px ${FONT_FAMILY}`),
    ]);
  } catch {
    // Offline / blocked CDN — canvas falls back to Segoe UI.
  }
}
