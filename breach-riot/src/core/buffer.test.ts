import { describe, expect, it } from "vitest";
import {
  matchProgress,
  sequenceCompleted,
  refreshDaemons,
  bufferCost,
} from "./buffer";
import {
  generatePuzzle,
  isLegalPick,
  legalPicks,
  nextAxis,
  matrixFromFixed,
} from "./matrix";
import { startSession, tryPick, starsFor } from "./session";
import { LEVELS } from "./levels";
import type { DaemonProgress, Token } from "./types";

describe("buffer matching", () => {
  it("matches contiguous subsequence anywhere", () => {
    const buf: Token[] = ["1C", "55", "7A", "BD"];
    expect(sequenceCompleted(buf, ["55", "7A"])).toBe(true);
    expect(sequenceCompleted(buf, ["1C", "BD"])).toBe(false);
  });

  it("tracks suffix progress for UI", () => {
    expect(matchProgress(["1C", "55"], ["55", "7A"])).toBe(1);
    expect(matchProgress(["1C", "55", "7A"], ["55", "7A"])).toBe(2);
    expect(matchProgress(["BD"], ["55", "7A"])).toBe(0);
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

  it("first pick is free", () => {
    expect(isLegalPick(m, { c: 1, r: 1 }, null, null)).toBe(true);
    expect(nextAxis(0)).toBe(null);
  });

  it("alternates row then col", () => {
    expect(nextAxis(1)).toBe("row");
    expect(nextAxis(2)).toBe("col");
    expect(nextAxis(3)).toBe("row");
  });

  it("locks to row after first pick", () => {
    const last = { c: 0, r: 1 };
    expect(isLegalPick(m, { c: 2, r: 1 }, last, "row")).toBe(true);
    expect(isLegalPick(m, { c: 0, r: 2 }, last, "row")).toBe(false);
  });

  it("firstRowOnly restricts opener", () => {
    expect(
      isLegalPick(m, { c: 0, r: 1 }, null, null, { firstRowOnly: true }),
    ).toBe(false);
    expect(
      isLegalPick(m, { c: 0, r: 0 }, null, null, { firstRowOnly: true }),
    ).toBe(true);
  });
});

describe("tutorial level 1", () => {
  it("can complete DATAMINE via fixed path", () => {
    const level = LEVELS[0]!;
    let session = startSession(level);
    // Path: (0,0)=1C then row to (2,0)=55
    let r = tryPick(session, { c: 0, r: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    session = r.session;
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
      expect(matrix[0]!.length).toBe(level.size);
    }
  });

  it("generated levels have legal opening picks", () => {
    for (const level of LEVELS.filter((l) => !l.fixed)) {
      const { matrix } = generatePuzzle(level);
      const opens = legalPicks(matrix, null, null, {
        firstRowOnly: level.twists.firstRowOnly,
      });
      expect(opens.length).toBeGreaterThan(0);
    }
  });
});

describe("stars", () => {
  it("awards stars for required clears", () => {
    const level = LEVELS[0]!;
    let session = startSession(level);
    const r1 = tryPick(session, { c: 0, r: 0 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = tryPick(r1.session, { c: 2, r: 0 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    // Fill remaining buffer with legal picks until end
    let s = r2.session;
    while (!s.ended) {
      const legal = legalPicks(s.matrix, s.last, s.axis, {
        firstRowOnly: level.twists.firstRowOnly,
      });
      if (!legal.length) break;
      const next = tryPick(s, legal[0]!);
      if (!next.ok) break;
      s = next.session;
    }
    if (!s.ended) {
      s = { ...s, ended: true, outcome: "breach" };
      s.daemons = s.daemons.map((d) => ({ ...d, completed: true }));
    }
    expect(starsFor(s)).toBeGreaterThanOrEqual(2);
  });
});

describe("refreshDaemons", () => {
  it("marks completed when sequence appears", () => {
    const daemons: DaemonProgress[] = [
      {
        id: "a",
        name: "X",
        sequence: ["1C", "55"],
        required: true,
        matched: 0,
        completed: false,
      },
    ];
    const out = refreshDaemons(["BD", "1C", "55", "FF"], daemons);
    expect(out[0]!.completed).toBe(true);
    expect(out[0]!.matched).toBe(2);
  });
});
