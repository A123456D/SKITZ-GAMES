import type { DatamineProgress, DatamineTier, Deck, Loot } from "./types";
import {
  ALMOST_IN_SECONDS,
  MAX_BUFFER_BONUS,
  MAX_TIME_BONUS,
} from "./types";

/** Payout per completed Datamine tier. */
export const DATAMINE_PAYOUT: Record<DatamineTier, Loot> = {
  1: { scrap: 15, components: 0 },
  2: { scrap: 25, components: 1 },
  3: { scrap: 40, components: 2 },
};

export const TRIPLE_CLEAR_BONUS: Loot = { scrap: 20, components: 0 };

export function lootForClears(daemons: DatamineProgress[]): Loot {
  let scrap = 0;
  let components = 0;
  let clears = 0;
  for (const d of daemons) {
    if (!d.completed) continue;
    clears += 1;
    const pay = DATAMINE_PAYOUT[d.tier];
    scrap += pay.scrap;
    components += pay.components;
  }
  if (clears >= 3) {
    scrap += TRIPLE_CLEAR_BONUS.scrap;
    components += TRIPLE_CLEAR_BONUS.components;
  }
  return { scrap, components };
}

export function effectiveBuffer(
  base: number,
  deck: Deck,
  /** Watson (0) ignores buffer upgrades so teaching levels stay tight. */
  district = 0,
): number {
  const bonus = district === 0 ? 0 : deck.bufferBonus;
  return Math.min(8, base + bonus);
}

export function effectiveTimeLimit(base: number, deck: Deck): number {
  const almost = deck.almostIn ? ALMOST_IN_SECONDS : 0;
  const comp = deck.compTime ?? 0;
  return base + deck.timeBonus + almost + comp;
}

/** Scrap cost for next buffer upgrade (0-indexed current bonus). */
export function bufferUpgradeCost(currentBonus: number): number | null {
  if (currentBonus >= MAX_BUFFER_BONUS) return null;
  return [80, 160, 280, 420][currentBonus] ?? null;
}

/** Scrap cost for next +3s time upgrade. */
export function timeUpgradeCost(currentBonus: number): number | null {
  if (currentBonus >= MAX_TIME_BONUS) return null;
  const step = Math.floor(currentBonus / 3);
  return [60, 120, 200, 300][step] ?? null;
}

/** One-time Almost In perk (components). */
export const ALMOST_IN_COST = 4;

/** Small mid-game Comp sink — +2s breach time. */
export const COMP_TIME_COST = 2;
export const COMP_TIME_SECONDS = 2;

/** Scrap to unlock district N (1-based next district index). */
export function districtUnlockCost(nextDistrict: number): number {
  return [50, 120, 200][nextDistrict - 1] ?? 300;
}

/** Last level id in each district (1-based level ids). */
export const DISTRICT_LAST_LEVEL = [4, 8, 12, 16] as const;

export function districtForLevel(levelId: number): number {
  for (let i = 0; i < DISTRICT_LAST_LEVEL.length; i++) {
    if (levelId <= DISTRICT_LAST_LEVEL[i]!) return i;
  }
  return DISTRICT_LAST_LEVEL.length - 1;
}

export const DISTRICT_NAMES = [
  "WATSON DOCKS",
  "JAPANTOWN GRID",
  "CITY CENTER ICE",
  "ARASAKA ROOT",
] as const;
