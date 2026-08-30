import type { DatamineProgress, Token } from "./types";

/** Contiguous subsequence match: longest prefix of seq that is a suffix of buffer. */
export function matchProgress(buffer: Token[], seq: Token[]): number {
  const max = Math.min(buffer.length, seq.length);
  for (let len = max; len >= 0; len--) {
    let ok = true;
    for (let i = 0; i < len; i++) {
      if (buffer[buffer.length - len + i] !== seq[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return len;
  }
  return 0;
}

/** True if seq appears as any contiguous run inside buffer. */
export function sequenceCompleted(buffer: Token[], seq: Token[]): boolean {
  if (seq.length === 0) return true;
  if (buffer.length < seq.length) return false;
  outer: for (let start = 0; start <= buffer.length - seq.length; start++) {
    for (let i = 0; i < seq.length; i++) {
      if (buffer[start + i] !== seq[i]) continue outer;
    }
    return true;
  }
  return false;
}

export function refreshDaemons(
  buffer: Token[],
  daemons: DatamineProgress[],
): DatamineProgress[] {
  return daemons.map((d) => {
    const completed = d.completed || sequenceCompleted(buffer, d.sequence);
    return {
      ...d,
      matched: completed ? d.sequence.length : matchProgress(buffer, d.sequence),
      completed,
    };
  });
}

/**
 * CP2077: if remaining buffer slots cannot finish this sequence
 * from current suffix progress, the daemon disables.
 */
export function sequenceStillPossible(
  buffer: Token[],
  remaining: number,
  seq: Token[],
  completed: boolean,
): boolean {
  if (completed || sequenceCompleted(buffer, seq)) return true;
  const matched = matchProgress(buffer, seq);
  return remaining >= seq.length - matched;
}

export function bufferCost(kind: "code" | "jam" | "sticky"): number {
  if (kind === "sticky") return 2;
  return 1;
}
