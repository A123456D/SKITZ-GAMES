import type { AiDifficulty } from "../core/ai";

export type Prefs = {
  sfx: boolean;
  music: boolean;
  timer: boolean;
  reducedFx: boolean;
  difficulty: AiDifficulty;
  analytics: boolean;
};

const KEY = "chain-reactor-prefs-v1";

const defaults: Prefs = {
  sfx: true,
  music: true,
  timer: true,
  reducedFx: false,
  difficulty: "normal",
  analytics: true,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const d = parsed.difficulty;
    return {
      ...defaults,
      ...parsed,
      music: parsed.music !== false,
      difficulty: d === "easy" || d === "hard" || d === "normal" ? d : "normal",
      analytics: parsed.analytics !== false,
    };
  } catch {
    return { ...defaults };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

let prefs = loadPrefs();

export function getPrefs(): Prefs {
  return prefs;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Prefs {
  prefs = { ...prefs, [key]: value };
  savePrefs(prefs);
  return prefs;
}

export function togglePref(
  key: "sfx" | "music" | "timer" | "reducedFx" | "analytics",
): Prefs {
  return setPref(key, !prefs[key] as never);
}

export function cycleDifficulty(): Prefs {
  const order: AiDifficulty[] = ["easy", "normal", "hard"];
  const i = order.indexOf(prefs.difficulty);
  return setPref("difficulty", order[(i + 1) % order.length]);
}
