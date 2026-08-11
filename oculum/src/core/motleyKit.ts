/**
 * Motley Wager kit switch.
 * - cashbust: live — Cash/Bust Resolve ante kit
 * - coinflip: archived Heads/Tails kit (kept for regression tests)
 */
export type MotleyWagerMode = "coinflip" | "cashbust";

let mode: MotleyWagerMode = "cashbust";

export function getMotleyWagerMode(): MotleyWagerMode {
  return mode;
}

/** @deprecated Prefer getMotleyWagerMode() */
export const MOTLEY_WAGER_MODE: MotleyWagerMode = "cashbust";

export function setMotleyWagerMode(next: MotleyWagerMode): void {
  mode = next;
}

export function motleyCoinFlip(): boolean {
  return mode === "coinflip";
}

export function motleyCashBust(): boolean {
  return mode === "cashbust";
}
