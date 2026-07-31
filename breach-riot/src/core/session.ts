import { bufferCost, refreshDaemons } from "./buffer";
import { effectiveBuffer, effectiveTimeLimit, lootForClears } from "./economy";
import {
  canAfford,
  cloneMatrix,
  generatePuzzle,
  isLegalPick,
  legalPicks,
  mulberry32,
  nextAxis,
  scrambleUnused,
} from "./matrix";
import type {
  Axis,
  DatamineProgress,
  Deck,
  LevelDef,
  Loot,
  Matrix,
  Outcome,
  Pos,
  Token,
} from "./types";

export type Session = {
  level: LevelDef;
  matrix: Matrix;
  buffer: Token[];
  remaining: number;
  /** Effective buffer size this round (base + deck). */
  bufferSize: number;
  last: Pos | null;
  axis: Axis;
  daemons: DatamineProgress[];
  picks: Pos[];
  ended: boolean;
  outcome: Outcome | null;
  score: number;
  loot: Loot;
  scrambleAt: number;
  rng: () => number;
  coach: string | null;
  timerStarted: boolean;
  timeLeft: number;
  timedOut: boolean;
};

export function startSession(level: LevelDef, deck: Deck): Session {
  const bufferSize = effectiveBuffer(level.buffer, deck, level.district);
  const timeLimit = effectiveTimeLimit(level.timeLimit, deck);
  const playLevel: LevelDef = {
    ...level,
    buffer: bufferSize,
    timeLimit,
    twists: { ...level.twists, firstRowOnly: true },
  };
  const { matrix } = generatePuzzle(playLevel);
  const daemons: DatamineProgress[] = level.datamines.map((d) => ({
    ...d,
    matched: 0,
    completed: false,
  }));
  const expert = level.datamines.find((d) => d.tier === 3);
  let coach = level.twists.coach ?? null;
  if (expert && expert.sequence.length + 2 > bufferSize) {
    coach =
      (coach ? coach + " " : "") +
      "Expert may need a longer buffer — upgrade the Deck after Watson.";
  }
  return {
    level: playLevel,
    matrix,
    buffer: [],
    remaining: bufferSize,
    bufferSize,
    last: null,
    axis: null,
    daemons,
    picks: [],
    ended: false,
    outcome: null,
    score: 0,
    loot: { scrap: 0, components: 0 },
    scrambleAt: 0,
    rng: mulberry32(level.seed ^ 0x9e3779b9),
    coach,
    timerStarted: false,
    timeLeft: timeLimit,
    timedOut: false,
  };
}

export function currentLegal(session: Session): Pos[] {
  if (session.ended) return [];
  return legalPicks(session.matrix, session.last, session.axis, {
    firstRowOnly: true,
  }).filter((p) => {
    const kind = session.matrix[p.r]![p.c]!.kind;
    return canAfford(session.remaining, kind);
  });
}

export type PickResult =
  | { ok: true; session: Session; scrambled: Pos[] }
  | { ok: false; reason: string; session: Session };

export function tryPick(session: Session, pos: Pos): PickResult {
  if (session.ended) {
    return { ok: false, reason: "round over", session };
  }
  if (
    !isLegalPick(session.matrix, pos, session.last, session.axis, {
      firstRowOnly: true,
    })
  ) {
    return { ok: false, reason: "illegal", session };
  }
  const cell = session.matrix[pos.r]![pos.c]!;
  const cost = bufferCost(cell.kind);
  if (session.remaining < cost) {
    return { ok: false, reason: "buffer", session };
  }

  const matrix = cloneMatrix(session.matrix);
  // Blank the cell (CP2077 — code disappears).
  matrix[pos.r]![pos.c]!.used = true;

  const buffer = [...session.buffer, cell.token];
  const remaining = session.remaining - cost;
  const picks = [...session.picks, pos];
  const daemons = refreshDaemons(buffer, session.daemons);
  const axis = nextAxis(picks.length);

  let next: Session = {
    ...session,
    matrix,
    buffer,
    remaining,
    last: pos,
    axis,
    daemons,
    picks,
    coach: null,
    timerStarted: true,
  };

  let scrambled: Pos[] = [];
  if (session.level.twists.scramble && !next.ended) {
    next.scrambleAt += 1;
    const every = session.level.twists.scrambleHard ? 1 : 2;
    if (next.scrambleAt % every === 0) {
      const rate = session.level.twists.scrambleHard ? 0.26 : 0.18;
      scrambled = scrambleUnused(next.matrix, next.rng, undefined, rate);
    }
  }

  if (remaining === 0 || currentLegal(next).length === 0) {
    next = resolveRound(next);
  } else if (next.daemons.every((d) => d.completed)) {
    // All Datamines uploaded — don't force junk filler picks.
    next = resolveRound(next);
  }

  return { ok: true, session: next, scrambled };
}

export function tickTimer(session: Session, dt: number): Session {
  if (session.ended || !session.timerStarted) return session;
  const timeLeft = Math.max(0, session.timeLeft - dt);
  if (timeLeft <= 0) return expireTimer({ ...session, timeLeft: 0 });
  return { ...session, timeLeft };
}

/** Timeout — no loot uploaded. */
export function expireTimer(session: Session): Session {
  if (session.ended) return session;
  return {
    ...session,
    ended: true,
    outcome: "fail",
    score: 0,
    loot: { scrap: 0, components: 0 },
    timedOut: true,
    timeLeft: 0,
    timerStarted: true,
  };
}

/** Cash out after at least one Datamine is complete. */
export function canConfirm(session: Session): boolean {
  if (session.ended || session.buffer.length === 0) return false;
  return session.daemons.some((d) => d.completed);
}

export function confirmEarly(session: Session): Session {
  if (!canConfirm(session)) return session;
  return resolveRound(session);
}

export function resolveRound(session: Session): Session {
  const clears = session.daemons.filter((d) => d.completed).length;
  const loot = lootForClears(session.daemons);

  let outcome: Outcome;
  if (clears >= 3) outcome = "breach";
  else if (clears >= 1) outcome = "partial";
  else outcome = "fail";

  const score = loot.scrap * 2 + loot.components * 25;

  return {
    ...session,
    ended: true,
    outcome,
    score,
    loot,
  };
}

/** Stars = number of Datamines cleared (0–3). */
export function starsFor(session: Session): number {
  if (session.timedOut) return 0;
  if (!session.outcome || session.outcome === "fail") return 0;
  return session.daemons.filter((d) => d.completed).length;
}
