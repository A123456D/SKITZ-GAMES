import { describe, expect, it } from "vitest";
import {
  matchProgress,
  sequenceCompleted,
  sequenceStillPossible,
  refreshDaemons,
  bufferCost,
} from "./buffer";
import { lootForClears } from "./economy";
import {
  generatePuzzle,
  isLegalPick,
  legalPicks,
  nextAxis,
  matrixFromFixed,
} from "./matrix";
import {
  startSession,
  tryPick,
  starsFor,
  tickTimer,
} from "./session";
import { LEVELS } from "./levels";
import type { DatamineProgress, Token } from "./types";

const emptyDeck = {
  bufferBonus: 0,
  timeBonus: 0,
  almostIn: false,
  compTime: 0,
};

describe("buffer matching", () => {
  it("matches contiguous subsequence anywhere", () => {
    const buf: Token[] = ["1C", "55", "7A", "BD"];
    expect(sequenceCompleted(buf, ["55", "7A"])).toBe(true);
    expect(sequenceCompleted(buf, ["1C", "BD"])).toBe(false);
  });

  it("tracks suffix progress for UI", () => {
    expect(matchProgress(["1C", "55"], ["55", "7A"])).toBe(1);
    expect(matchProgress(["1C", "55", "7A"], ["55", "7A"])).toBe(2);
  });

  it("sticky costs 2", () => {
    expect(bufferCost("code")).toBe(1);
    expect(bufferCost("sticky")).toBe(2);
  });
});

describe("path rules", () => {
  const m = matrixFromFixed([
    ["1C", "55", "7A"],
    ["BD", "E9", "FF"],
    ["1C", "55", "7A"],
  ]);

  it("first pick top-row only in CP mode", () => {
    expect(
      isLegalPick(m, { c: 1, r: 1 }, null, null, { firstRowOnly: true }),
    ).toBe(false);
    expect(
      isLegalPick(m, { c: 1, r: 0 }, null, null, { firstRowOnly: true }),
    ).toBe(true);
  });

  it("alternates column then row after the top-row opener", () => {
    expect(nextAxis(1)).toBe("col");
    expect(nextAxis(2)).toBe("row");
    expect(nextAxis(3)).toBe("col");
  });

  it("rejects a same-row second pick", () => {
    expect(isLegalPick(m, { c: 2, r: 0 }, { c: 0, r: 0 }, "col")).toBe(false);
    expect(isLegalPick(m, { c: 0, r: 2 }, { c: 0, r: 0 }, "col")).toBe(true);
  });
});

describe("tutorial level 1", () => {
  it("can complete DATAMINE V1 via fixed path", () => {
    const level = LEVELS[0]!;
    let session = startSession(level, emptyDeck);
    let r = tryPick(session, { c: 0, r: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    session = r.session;
    expect(session.matrix[0]![0]!.used).toBe(true);
    r = tryPick(session, { c: 0, r: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    session = r.session;
    expect(session.daemons[0]!.completed).toBe(true);
  });
});

describe("generator", () => {
  it("produces matrix of correct size for each level", () => {
    for (const level of LEVELS) {
      const { matrix } = generatePuzzle(level);
      expect(matrix.length).toBe(level.size);
    }
  });

  it("generated levels have top-row opening picks", () => {
    for (const level of LEVELS.filter((l) => !l.fixed)) {
      const { matrix } = generatePuzzle({
        ...level,
        twists: { ...level.twists, firstRowOnly: true },
      });
      const opens = legalPicks(matrix, null, null, { firstRowOnly: true });
      expect(opens.length).toBeGreaterThan(0);
      expect(opens.every((p) => p.r === 0)).toBe(true);
    }
  });
});

describe("loot", () => {
  it("pays stacking scrap for clears", () => {
    const mines: DatamineProgress[] = [
      {
        id: "v1",
        name: "DATAMINE V1",
        tier: 1,
        sequence: ["1C"],
        matched: 1,
        completed: true,
      },
      {
        id: "v2",
        name: "DATAMINE V2",
        tier: 2,
        sequence: ["55"],
        matched: 1,
        completed: true,
      },
      {
        id: "v3",
        name: "DATAMINE V3",
        tier: 3,
        sequence: ["7A"],
        matched: 1,
        completed: true,
      },
    ];
    const loot = lootForClears(mines);
    expect(loot.scrap).toBe(15 + 25 + 40 + 20);
    expect(loot.components).toBe(0 + 1 + 2);
  });
});

describe("breach timer", () => {
  it("ticks as soon as the matrix is up", () => {
    const level = LEVELS[0]!;
    let session = startSession(level, emptyDeck);
    session = tickTimer(session, 5);
    expect(session.timeLeft).toBe(level.timeLimit - 5);
  });

  it("expires to timeout fail with no loot", () => {
    const level = LEVELS[0]!;
    let session = startSession(level, emptyDeck);
    session = tickTimer(session, level.timeLimit + 0.1);
    expect(session.timedOut).toBe(true);
    expect(session.loot.scrap).toBe(0);
    expect(starsFor(session)).toBe(0);
  });
});

describe("buffer fill ends the breach", () => {
  it("keeps going after a Datamine until the buffer is full", () => {
    const level = LEVELS[0]!;
    let session = startSession(level, emptyDeck);
    const r1 = tryPick(session, { c: 0, r: 0 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    session = r1.session;
    const r2 = tryPick(session, { c: 0, r: 4 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    session = r2.session;
    expect(session.daemons[0]!.completed).toBe(true);
    expect(session.ended).toBe(false);
    expect(session.remaining).toBe(level.buffer - 2);
  });
});

describe("sequence still possible", () => {
  it("disables when remaining slots cannot finish the run", () => {
    expect(sequenceStillPossible(["7A"], 0, ["7A", "BD"], false)).toBe(false);
    expect(sequenceStillPossible(["7A"], 1, ["7A", "BD"], false)).toBe(true);
  });

  it("stays live if already uploaded", () => {
    expect(sequenceStillPossible(["7A", "BD"], 0, ["7A", "BD"], true)).toBe(
      true,
    );
  });
});

describe("refreshDaemons", () => {
  it("marks completed when sequence appears", () => {
    const daemons: DatamineProgress[] = [
      {
        id: "a",
        name: "DATAMINE V1",
        tier: 1,
        sequence: ["1C", "55"],
        matched: 0,
        completed: false,
      },
    ];
    const out = refreshDaemons(["BD", "1C", "55", "FF"], daemons);
    expect(out[0]!.completed).toBe(true);
  });
});

describe("usernames", () => {
  it("rejects short handles", async () => {
    const { isValidHandle, sanitizeRun } = await import("./board");
    expect(isValidHandle("AB")).toBe(false);
    expect(isValidHandle("ACE")).toBe(true);
    expect(sanitizeRun({ name: "x", score: 10, level: 1, stars: 1, time: 1 })).toBeNull();
    expect(sanitizeRun({ name: "ACE", score: 10, level: 1, stars: 1, time: 1 })?.name).toBe("ACE");
  });
});
