import { describe, it, expect } from "vitest";
import {
  NEXUS_SQUARES,
  isInNexus,
  squareToRC,
  rcToSquare,
  initialBoard,
  newGame,
  findKing,
} from "./board";

describe("board", () => {
  it("NEXUS_SQUARES has the four center squares", () => {
    expect(NEXUS_SQUARES).toEqual(["d4", "d5", "e4", "e5"]);
  });

  it("isInNexus identifies nexus squares", () => {
    expect(isInNexus("d4")).toBe(true);
    expect(isInNexus("e5")).toBe(true);
    expect(isInNexus("a1")).toBe(false);
    expect(isInNexus("h8")).toBe(false);
  });

  it("squareToRC / rcToSquare round-trip", () => {
    expect(squareToRC("a1")).toEqual([0, 0]);
    expect(squareToRC("h8")).toEqual([7, 7]);
    expect(squareToRC("e4")).toEqual([3, 4]);
    expect(rcToSquare(0, 0)).toBe("a1");
    expect(rcToSquare(7, 7)).toBe("h8");
    expect(rcToSquare(3, 4)).toBe("e4");
  });

  it("initialBoard has 32 pieces in standard positions", () => {
    const b = initialBoard();
    expect(b.size).toBe(32);
    expect(b.get("e1")!.kind).toBe("K");
    expect(b.get("e1")!.color).toBe("w");
    expect(b.get("e8")!.kind).toBe("K");
    expect(b.get("e8")!.color).toBe("b");
    expect(b.get("a2")!.kind).toBe("P");
    expect(b.get("a7")!.kind).toBe("P");
    expect(b.get("d4")).toBeUndefined();
  });

  it("findKing locates kings", () => {
    const b = initialBoard();
    expect(findKing(b, "w")).toBe("e1");
    expect(findKing(b, "b")).toBe("e8");
  });

  it("newGame starts with white to move, 0 mana", () => {
    const g = newGame();
    expect(g.activeColor).toBe("w");
    expect(g.players[0].mana).toBe(0);
    expect(g.players[1].mana).toBe(0);
    expect(g.winner).toBeNull();
    expect(g.turnNumber).toBe(1);
  });
});
