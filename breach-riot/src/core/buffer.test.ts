import { describe, expect, it } from "vitest";
import {
  matchProgress,
  sequenceCompleted,
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
import { startSession, tryPick, starsFor, tickTimer } from "./session";
import { LEVELS } from "./levels";
import type { DatamineProgress, Token } from "./types";

const emptyDeck = { bufferBonus: 0, timeBonus: 0, almostIn: false };

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
    expect(isLegalPick(m, { c: 1, r: 1 }, null, null, { firstRowOnly: true })).toBe(
      false,
    );
    expect(isLegalPick(m, { c: 1, r: 0 }, null, null, { firstRowOnly: true })).toBe(
      true,
    );
  });

  it("alternates row then col", () => {
    expect(nextAxis(1)).toBe("row");
    expect(nextAxis(2)).toBe("col");
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
    r = tryPick(session, { c: 2, r: 0 });
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
  it("does not tick before first pick", () => {
    const level = LEVELS[0]!;
    let session = startSession(level, emptyDeck);
    session = tickTimer(session, 5);
    expect(session.timeLeft).toBe(level.timeLimit);
  });

  it("expires to timeout fail with no loot", () => {
    const level = LEVELS[0]!;
    let session = startSession(level, emptyDeck);
    const r = tryPick(session, { c: 0, r: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    session = tickTimer(r.session, level.timeLimit + 0.1);
    expect(session.timedOut).toBe(true);
    expect(session.loot.scrap).toBe(0);
    expect(starsFor(session)).toBe(0);
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
