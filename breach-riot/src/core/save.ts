import {
  ALMOST_IN_COST,
  bufferUpgradeCost,
  districtForLevel,
  DISTRICT_LAST_LEVEL,
  districtUnlockCost,
  timeUpgradeCost,
  COMP_TIME_COST,
  COMP_TIME_SECONDS,
} from "./economy";
import type { Deck, Progress } from "./types";
import { MAX_BUFFER_BONUS, MAX_TIME_BONUS } from "./types";

const KEY = "breach-riot-progress-v2";

const DEFAULT_DECK: Deck = {
  bufferBonus: 0,
  timeBonus: 0,
  almostIn: false,
  compTime: 0,
};

const DEFAULT: Progress = {
  unlocked: 1,
  stars: {},
  sound: true,
  scrap: 0,
  components: 0,
  deck: { ...DEFAULT_DECK },
  district: 0,
};

function normalizeDeck(raw: Partial<Deck> | undefined): Deck {
  return {
    bufferBonus: Math.max(
      0,
      Math.min(MAX_BUFFER_BONUS, Number(raw?.bufferBonus) || 0),
    ),
    timeBonus: Math.max(
      0,
      Math.min(MAX_TIME_BONUS, Number(raw?.timeBonus) || 0),
    ),
    almostIn: raw?.almostIn === true,
    compTime: Math.max(0, Number(raw?.compTime) || 0),
  };
}

export function loadProgress(): Progress {
  try {
    const raw =
      localStorage.getItem(KEY) ??
      localStorage.getItem("breach-riot-progress-v1");
    if (!raw) return { ...DEFAULT, stars: {}, deck: { ...DEFAULT_DECK } };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      unlocked: Math.max(1, Number(parsed.unlocked) || 1),
      stars:
        parsed.stars && typeof parsed.stars === "object" ? parsed.stars : {},
      sound: parsed.sound !== false,
      scrap: Math.max(0, Number(parsed.scrap) || 0),
      components: Math.max(0, Number(parsed.components) || 0),
      deck: normalizeDeck(parsed.deck),
      district: Math.max(0, Number(parsed.district) || 0),
    };
  } catch {
    return { ...DEFAULT, stars: {}, deck: { ...DEFAULT_DECK } };
  }
}

export function saveProgress(p: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function applyWin(
  progress: Progress,
  levelId: number,
  stars: number,
  loot: { scrap: number; components: number },
  levelCount: number,
): Progress {
  const prev = progress.stars[levelId] ?? 0;
  const nextStars = { ...progress.stars, [levelId]: Math.max(prev, stars) };
  let unlocked = progress.unlocked;
  // L1 can advance on a single Datamine; after that need V1+V2 (2★).
  const need = levelId <= 1 ? 1 : 2;
  if (stars >= need) {
    unlocked = Math.max(unlocked, Math.min(levelCount, levelId + 1));
  }

  const maxInDistrict = DISTRICT_LAST_LEVEL[progress.district] ?? levelCount;
  const nextDistrictStart = maxInDistrict + 1;
  if (
    unlocked > maxInDistrict &&
    progress.district < DISTRICT_LAST_LEVEL.length - 1
  ) {
    unlocked = Math.min(unlocked, nextDistrictStart);
  }

  return {
    ...progress,
    stars: nextStars,
    unlocked,
    scrap: progress.scrap + loot.scrap,
    components: progress.components + loot.components,
  };
}

export function tryUnlockDistrict(progress: Progress): Progress | null {
  const next = progress.district + 1;
  if (next >= DISTRICT_LAST_LEVEL.length) return null;
  const gateLevel = DISTRICT_LAST_LEVEL[progress.district]!;
  const cleared = (progress.stars[gateLevel] ?? 0) >= 2;
  if (!cleared) return null;
  const cost = districtUnlockCost(next);
  if (progress.scrap < cost) return null;
  const nextStart = gateLevel + 1;
  return {
    ...progress,
    scrap: progress.scrap - cost,
    district: next,
    unlocked: Math.max(progress.unlocked, nextStart),
  };
}

export function canUnlockDistrict(progress: Progress): {
  ok: boolean;
  cost: number;
  reason?: string;
} {
  const next = progress.district + 1;
  if (next >= DISTRICT_LAST_LEVEL.length) {
    return { ok: false, cost: 0, reason: "max" };
  }
  const gateLevel = DISTRICT_LAST_LEVEL[progress.district]!;
  const cleared = (progress.stars[gateLevel] ?? 0) >= 2;
  const cost = districtUnlockCost(next);
  if (!cleared) return { ok: false, cost, reason: "clear" };
  if (progress.scrap < cost) return { ok: false, cost, reason: "scrap" };
  return { ok: true, cost };
}

export function tryBuyBuffer(progress: Progress): Progress | null {
  const cost = bufferUpgradeCost(progress.deck.bufferBonus);
  if (cost === null || progress.scrap < cost) return null;
  return {
    ...progress,
    scrap: progress.scrap - cost,
    deck: {
      ...progress.deck,
      bufferBonus: progress.deck.bufferBonus + 1,
    },
  };
}

export function tryBuyTime(progress: Progress): Progress | null {
  if (progress.deck.timeBonus >= MAX_TIME_BONUS) return null;
  const cost = timeUpgradeCost(progress.deck.timeBonus);
  if (cost === null || progress.scrap < cost) return null;
  return {
    ...progress,
    scrap: progress.scrap - cost,
    deck: {
      ...progress.deck,
      timeBonus: Math.min(MAX_TIME_BONUS, progress.deck.timeBonus + 3),
    },
  };
}

export function tryBuyAlmostIn(progress: Progress): Progress | null {
  if (progress.deck.almostIn) return null;
  if (progress.components < ALMOST_IN_COST) return null;
  return {
    ...progress,
    components: progress.components - ALMOST_IN_COST,
    deck: { ...progress.deck, almostIn: true },
  };
}

export function tryBuyCompTime(progress: Progress): Progress | null {
  if (progress.components < COMP_TIME_COST) return null;
  return {
    ...progress,
    components: progress.components - COMP_TIME_COST,
    deck: {
      ...progress.deck,
      compTime: (progress.deck.compTime ?? 0) + COMP_TIME_SECONDS,
    },
  };
}

export {
  districtForLevel,
  bufferUpgradeCost,
  timeUpgradeCost,
  ALMOST_IN_COST,
  COMP_TIME_COST,
  COMP_TIME_SECONDS,
};
