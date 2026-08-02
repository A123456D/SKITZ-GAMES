/** Persistent meta: card unlocks + cosmetics. */

export type Cosmetics = {
  beamTint: "default" | "volt" | "prism" | "void" | "gold";
  frame: "default" | "storm" | "vector" | "invert";
};

export type MetaProgress = {
  wins: number;
  matches: number;
  unlockedCards: string[];
  cosmetics: Cosmetics;
  seenDailyCta: boolean;
  /** Player has completed (or skipped into) the scripted first versus. */
  seenShowcase: boolean;
  dailyStreak: number;
  lastDailyKey: string | null;
};

const KEY = "cr_meta_v1";

/** Cards earned beyond the base faction presets. */
export const UNLOCK_POOL = [
  "v_corner",
  "p_wall",
  "o_split",
  "v_storm",
  "p_vector",
  "o_invert",
  "n_amp",
  "n_pulse_cross",
  "o_siphon",
  "p_amp2",
  "v_edge",
  "o_heavy",
] as const;

const defaults: MetaProgress = {
  wins: 0,
  matches: 0,
  unlockedCards: ["v_storm", "p_vector", "o_invert"],
  cosmetics: { beamTint: "default", frame: "default" },
  seenDailyCta: false,
  seenShowcase: false,
  dailyStreak: 0,
  lastDailyKey: null,
};

export function loadMeta(): MetaProgress {
  try {
    if (typeof localStorage === "undefined") {
      return {
        ...defaults,
        unlockedCards: [...defaults.unlockedCards],
        cosmetics: { ...defaults.cosmetics },
      };
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        ...defaults,
        unlockedCards: [...defaults.unlockedCards],
        cosmetics: { ...defaults.cosmetics },
      };
    }
    const parsed = JSON.parse(raw) as Partial<MetaProgress>;
    return {
      wins: parsed.wins ?? 0,
      matches: parsed.matches ?? 0,
      unlockedCards: Array.isArray(parsed.unlockedCards)
        ? parsed.unlockedCards
        : [...defaults.unlockedCards],
      cosmetics: { ...defaults.cosmetics, ...(parsed.cosmetics ?? {}) },
      seenDailyCta: parsed.seenDailyCta ?? false,
      seenShowcase: parsed.seenShowcase ?? false,
      dailyStreak: parsed.dailyStreak ?? 0,
      lastDailyKey: parsed.lastDailyKey ?? null,
    };
  } catch {
    return {
      ...defaults,
      unlockedCards: [...defaults.unlockedCards],
      cosmetics: { ...defaults.cosmetics },
    };
  }
}

export function saveMeta(m: MetaProgress): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function unlockCard(cardId: string): boolean {
  const m = loadMeta();
  if (m.unlockedCards.includes(cardId)) return false;
  m.unlockedCards.push(cardId);
  saveMeta(m);
  return true;
}

export function applyCosmeticUnlock(opts: {
  beamTint?: Cosmetics["beamTint"];
  frame?: Cosmetics["frame"];
}): void {
  const m = loadMeta();
  if (opts.beamTint && opts.beamTint !== "default") m.cosmetics.beamTint = opts.beamTint;
  if (opts.frame && opts.frame !== "default") m.cosmetics.frame = opts.frame;
  saveMeta(m);
}

export type MatchReward = {
  unlockedCard: string | null;
  cosmetic: string | null;
  wins: number;
};

/** Apply end-of-match meta rewards (versus / daily filler). */
export function grantMatchReward(opts: {
  won: boolean;
  maxChainDepth: number;
  faction: "volt" | "prismatic" | "void";
}): MatchReward {
  const m = loadMeta();
  m.matches += 1;
  let unlockedCard: string | null = null;
  let cosmetic: string | null = null;

  if (opts.won) {
    m.wins += 1;
    const missing = UNLOCK_POOL.filter((id) => !m.unlockedCards.includes(id));
    if (missing.length > 0) {
      unlockedCard = missing[Math.floor(Math.random() * missing.length)];
      m.unlockedCards.push(unlockedCard);
    }
    if (opts.maxChainDepth >= 3 && m.cosmetics.beamTint === "default") {
      m.cosmetics.beamTint =
        opts.faction === "volt" ? "volt" : opts.faction === "prismatic" ? "prism" : "void";
      cosmetic = `Beam tint: ${m.cosmetics.beamTint}`;
    }
    if (m.wins >= 3 && m.cosmetics.frame === "default") {
      m.cosmetics.frame = "storm";
      cosmetic = cosmetic ?? "Frame: storm";
    }
  }

  saveMeta(m);
  return { unlockedCard, cosmetic, wins: m.wins };
}

/** Track consecutive daily clears by calendar day. */
export function noteDailyClear(key: string): number {
  const m = loadMeta();
  if (m.lastDailyKey === key) return m.dailyStreak;
  const prev = m.lastDailyKey;
  if (prev) {
    const prevDate = new Date(`${prev}T12:00:00`);
    const curDate = new Date(`${key}T12:00:00`);
    const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);
    m.dailyStreak = diffDays === 1 ? m.dailyStreak + 1 : 1;
  } else {
    m.dailyStreak = 1;
  }
  m.lastDailyKey = key;
  saveMeta(m);
  return m.dailyStreak;
}

export function markDailyCtaSeen(): void {
  const m = loadMeta();
  m.seenDailyCta = true;
  saveMeta(m);
}

export function markShowcaseSeen(): void {
  const m = loadMeta();
  m.seenShowcase = true;
  saveMeta(m);
}

export function beamColorForTint(tint: Cosmetics["beamTint"], fallback: string): string {
  switch (tint) {
    case "volt":
      return "#ffe566";
    case "prism":
      return "#2ef0ff";
    case "void":
      return "#b44cff";
    case "gold":
      return "#ffc857";
    default:
      return fallback;
  }
}

export function frameStrokeFor(frame: Cosmetics["frame"]): string | null {
  switch (frame) {
    case "storm":
      return "#ffe566";
    case "vector":
      return "#2ef0ff";
    case "invert":
      return "#b44cff";
    default:
      return null;
  }
}
