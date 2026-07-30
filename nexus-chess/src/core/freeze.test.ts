import { describe, it, expect } from "vitest";
import { newGame, isInNexus } from "./board";
import { beginTurn, skipAbility, doMovePhase, endTurn } from "./turn";
import { aiPlay, evaluatePosition } from "./ai";
import { allMoves } from "./moves";
import type { Color, GameState, PieceKind } from "./types";

function bare(kind: PieceKind, color: Color) {
  return {
    kind,
    color,
    hasMoved: true,
    isShielded: false,
    shieldExpiresTurn: -1,
    nexusTurnCount: 0,
  };
}

function playHumanPly(state: GameState, preferNexus = true): GameState {
  let s = state;
  if (s.turnPhase === "ability") s = skipAbility(s);
  const ms = allMoves(s);
  if (ms.length === 0) return s;
  const caps = ms.filter(
    (m) => s.board.has(m.to) || isInNexus(m.to) || isInNexus(m.from),
  );
  const pool = preferNexus && caps.length ? caps : ms;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  s = doMovePhase(s, pick);
  if (s.winner) return s;
  if (s.turnPhase === "overdrive") {
    const follow = allMoves(s)[0];
    if (follow) s = doMovePhase(s, follow);
  }
  if (s.turnPhase === "resolved") s = endTurn(s);
  return s;
}

describe("capture / nexus freeze probes", () => {
  it("captures a piece inside the Nexus then AI replies quickly", () => {
    let s = beginTurn(newGame());
    s = skipAbility(s);
    // Clear path: white rook on d1, black pawn on d4 (nexus)
    s.board.delete("d2");
    s.board.delete("d7");
    s.board.set("d4", bare("P", "b"));
    const cap = allMoves(s).find((m) => m.from === "d1" && m.to === "d4");
    expect(cap).toBeTruthy();
    const t0 = Date.now();
    s = doMovePhase(s, cap!);
    expect(s.board.get("d4")?.color).toBe("w");
    expect(isInNexus("d4")).toBe(true);
    s = endTurn(s);
    const ai = aiPlay(s, 2);
    const ms = Date.now() - t0;
    expect(ms).toBeLessThan(3500);
    expect(ai.state.turnPhase).not.toBe("overdrive");
    expect(!!ai.state.winner || ai.state.activeColor === "w").toBe(true);
  });

  it("captures outside Nexus then AI replies", () => {
    let s = beginTurn(newGame());
    s = skipAbility(s);
    s.board.set("d5", bare("P", "b"));
    s.board.set("e4", bare("P", "w"));
    const cap = allMoves(s).find((m) => m.from === "e4" && m.to === "d5");
    expect(cap).toBeTruthy();
    const t0 = Date.now();
    s = doMovePhase(s, cap!);
    s = endTurn(s);
    aiPlay(s, 2);
    expect(Date.now() - t0).toBeLessThan(3500);
  });

  it("moves a piece out of the Nexus then AI replies", () => {
    let s = beginTurn(newGame());
    s = skipAbility(s);
    s.board.delete("d2");
    s.board.set("d4", bare("N", "w"));
    const leave = allMoves(s).find((m) => m.from === "d4" && !isInNexus(m.to));
    expect(leave).toBeTruthy();
    const t0 = Date.now();
    s = doMovePhase(s, leave!);
    s = endTurn(s);
    aiPlay(s, 3);
    expect(Date.now() - t0).toBeLessThan(6000);
  });

  it(
    "plays several random games with nexus captures without hanging",
    () => {
      const slow: number[] = [];
      for (let g = 0; g < 4; g++) {
        let s = beginTurn(newGame());
        for (let ply = 0; ply < 24 && !s.winner; ply++) {
          s = playHumanPly(s, true);
          if (s.winner) break;
          const t0 = Date.now();
          const before = s.activeColor;
          s = aiPlay(s, 2).state;
          const dt = Date.now() - t0;
          if (dt > 2500) slow.push(dt);
          expect(dt).toBeLessThan(6000);
          // After AI, turn must not leave the same side stuck mid-phase forever
          if (!s.winner) {
            expect(s.turnPhase).not.toBe("overdrive");
            expect(s.turnPhase).not.toBe("resolved");
            expect(s.activeColor).not.toBe(before);
          }
        }
      }
      // Soft signal — Normal AI should usually be under 2.5s
      expect(slow.filter((t) => t > 4000).length).toBe(0);
    },
    60_000,
  );

  it("AI does not get stuck when no legal moves", () => {
    let s = beginTurn(newGame());
    s.board.clear();
    s.board.set("a1", bare("K", "w"));
    s.board.set("a3", bare("K", "b"));
    // White to move but king blocked by own... only kings, both have moves usually
    s = { ...s, activeColor: "b", turnPhase: "move" };
    // Surround black king with white pawns so black has zero moves? hard.
    // Instead: empty move list path via aiPlay on ability with no pieces of color
    s.board.clear();
    s.board.set("e1", bare("K", "w"));
    s.board.set("e8", bare("K", "b"));
    // Remove black king — illegal but tests null pick
    s.board.delete("e8");
    s = { ...s, activeColor: "b", turnPhase: "ability" };
    const out = aiPlay(s, 2);
    expect(out.state.turnPhase).not.toBe("overdrive");
  });

  it(
    "keeps Expert AI under budget after nexus captures across a short match",
    () => {
      let s = beginTurn(newGame());
      for (let ply = 0; ply < 16 && !s.winner; ply++) {
        s = playHumanPly(s, true);
        if (s.winner) break;
        const t0 = Date.now();
        s = aiPlay(s, 4).state;
        expect(Date.now() - t0).toBeLessThan(500);
        if (!s.winner) {
          expect(s.turnPhase).not.toBe("overdrive");
          expect(s.turnPhase).not.toBe("resolved");
        }
      }
    },
    20_000,
  );

  it("evaluatePosition stays finite after nexus capture", () => {
    let s = beginTurn(newGame());
    s = skipAbility(s);
    s.board.delete("d2");
    s.board.set("d4", bare("Q", "b"));
    const cap = allMoves(s).find((m) => m.from === "d1" && m.to === "d4");
    s = doMovePhase(s, cap!);
    const v = evaluatePosition(s, "w");
    expect(Number.isFinite(v)).toBe(true);
  });
});
