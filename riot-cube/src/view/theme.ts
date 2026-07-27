export const THEME_IDS = ["classic", "grime"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeDef = {
  id: ThemeId;
  label: string;
};

export const THEMES: ThemeDef[] = [
  { id: "classic", label: "CLASSIC" },
  { id: "grime", label: "GRIME" },
];

const THEME_KEY = "riotcube_theme";

let current: ThemeId = loadStored();

function loadStored(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v && (THEME_IDS as readonly string[]).includes(v)) return v as ThemeId;
  } catch {
    /* ignore */
  }
  return "grime";
}

export function getTheme(): ThemeId {
  return current;
}

export function getThemeLabel(): string {
  return THEMES.find((t) => t.id === current)?.label ?? current.toUpperCase();
}

export function setTheme(id: ThemeId): void {
  current = id;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Cycle classic → grime → … */
export function cycleTheme(): ThemeId {
  const i = THEME_IDS.indexOf(current);
  const next = THEME_IDS[(i + 1) % THEME_IDS.length]!;
  setTheme(next);
  return next;
}

export function stickerPath(kind: string, theme: ThemeId = current): string {
  return `./themes/${theme}/${kind}.png`;
}
