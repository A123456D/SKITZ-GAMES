import { describe, it, expect } from "vitest";
import { newGame, findKing, isInNexus } from "./board";
import { canCastAbility, applyCast, abilityTargets, ABILITY_COST } from "./abilities";
import type { GameState } from "./types";

function withMana(s: GameState, mana: number): GameState {
  const players = [{ ...s.players[0], mana }, { ...s.players[1] }] as GameState["players"];
  return { ...s, players };
}

describe("abilities", () => {
  describe("Aegis", () => {
    it("can shield a friendly non-king piece", () => {
      const s = withMana(newGame(), 5);
      expect(canCastAbility(s, { ability: "aegis", target: "e2" })).toBe(true);
    });

    it("cannot shield king in Nexus", () => {
      const s = withMana(newGame(), 5);
      // Move king to nexus
      const king = s.board.get("e1")!;
      s.board.delete("e1");
      s.board.set("d4", { ...king });
      expect(canCastAbility(s, { ability: "aegis", target: "d4" })).toBe(false);
    });

    it("applies shield and deducts mana", () => {
      const s = withMana(newGame(), 5);
      const result = applyCast(s, { ability: "aegis", target: "e2" });
      expect(result).not.toBeNull();
      expect(result!.board.get("e2")!.isShielded).toBe(true);
      expect(result!.players[0].mana).toBe(5 - ABILITY_COST.aegis);
    });

    it("fails without enough mana", () => {
      const s = withMana(newGame(), 2);
      expect(canCastAbility(s, { ability: "aegis", target: "e2" })).toBe(false);
    });
  });

  describe("Overdrive", () => {
    it("can target a non-king piece", () => {
      const s = withMana(newGame(), 5);
      expect(canCastAbility(s, { ability: "overdrive", target: "e2" })).toBe(true);
    });

    it("cannot target king", () => {
      const s = withMana(newGame(), 5);
      expect(canCastAbility(s, { ability: "overdrive", target: "e1" })).toBe(false);
    });

    it("sets overdriveSquare and movesLeft=2", () => {
      const s = withMana(newGame(), 5);
      const result = applyCast(s, { ability: "overdrive", target: "e2" });
      expect(result!.overdriveSquare).toBe("e2");
      expect(result!.overdriveMovesLeft).toBe(2);
      expect(result!.players[0].mana).toBe(5 - ABILITY_COST.overdrive);
    });
  });

  describe("Tactical Swap", () => {
    it("swaps king with a friendly piece", () => {
      const s = withMana(newGame(), 5);
      const result = applyCast(s, { ability: "tacticalSwap", target: "e2" });
      expect(result).not.toBeNull();
      expect(result!.board.get("e2")!.kind).toBe("K");
      expect(result!.board.get("e1")!.kind).toBe("P");
      expect(result!.players[0].mana).toBe(5 - ABILITY_COST.tacticalSwap);
    });

    it("cannot swap king into Nexus", () => {
      const s = withMana(newGame(), 5);
      // Place a pawn in Nexus
      s.board.set("d4", {
        kind: "P",
        color: "w",
        isShielded: false,
        shieldExpiresTurn: -1,
        nexusTurnCount: 0,
        hasMoved: true,
      });
      expect(canCastAbility(s, { ability: "tacticalSwap", target: "d4" })).toBe(false);
    });
  });

  it("abilityTargets returns valid squares", () => {
    const s = withMana(newGame(), 10);
    const targets = abilityTargets(s, "aegis");
    expect(targets.length).toBeGreaterThan(0);
    expect(targets).toContain("e2");
    // King not in nexus, so it should be shieldable (aegis only blocks king IN nexus)
    expect(targets).toContain("e1");
  });
});
