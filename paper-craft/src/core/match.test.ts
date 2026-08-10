import { describe, expect, it } from "vitest";
import { CARDS, getCard } from "./cards";
import {
  applyIntent,
  createMatch,
  energyForTurn,
  lanePower,
  legalIntents,
  scoreLanes,
  setupTutorialBoard,
} from "./match";

describe("paper craft match", () => {
  it("escalates energy with turn", () => {
    expect(energyForTurn(1)).toBe(1);
    expect(energyForTurn(6)).toBe(6);
  });

  it("plays into empty lane and folds to ink power", () => {
    const m = createMatch({ seed: 1 });
    m.hand = ["scrap_dog", "glue_ghost", "fold_fox"];
    const play = legalIntents(m).find((i) => i.kind === "play" && i.handIndex === 0);
    expect(play).toBeTruthy();
    applyIntent(m, play!);
    expect(m.active).toBe("enemy");
    applyIntent(m, { kind: "pass" });
    expect(m.active).toBe("player");
    expect(m.turn).toBe(2);

    const fold = legalIntents(m).find((i) => i.kind === "fold");
    expect(fold).toBeTruthy();
    const lane = fold!.kind === "fold" ? fold!.lane : 0;
    applyIntent(m, fold!);
    applyIntent(m, { kind: "pass" });
    expect(m.lanes[lane].player!.body.folded).toBe(true);
    expect(lanePower(m, lane, "player")).toBeGreaterThan(0);
  });

  it("stacks then rip peels sticker", () => {
    const m = createMatch({ seed: 2 });
    m.hand = ["scrap_dog", "glue_ghost", "ink_imp"];
    m.enemyHand = ["scrap_dog", "glue_ghost", "ink_imp"];
    applyIntent(m, { kind: "play", handIndex: 0, lane: 0 });
    applyIntent(m, { kind: "play", handIndex: 0, lane: 0 });
    applyIntent(m, { kind: "play", handIndex: 0, lane: 0 });
    expect(m.lanes[0].player!.sticker).toBeTruthy();
    applyIntent(m, { kind: "pass" });
    // ink_imp has no glue — peelable sticker
    m.lanes[0].enemy!.sticker = {
      instanceId: "fake",
      cardId: "ink_imp",
      folded: false,
      scarred: false,
    };
    m.ripAvailable = true;
    const rip = legalIntents(m).find((i) => i.kind === "rip" && i.lane === 0)!;
    expect(rip).toBeTruthy();
    applyIntent(m, rip);
    expect(m.lanes[0].enemy!.sticker).toBeUndefined();
    expect(m.ripAvailable).toBe(false);
  });

  it("destroys folded card on rip", () => {
    const m = createMatch({ seed: 3 });
    setupTutorialBoard(m);
    expect(m.lanes[1].enemy!.body.folded).toBe(true);
    m.hand = ["scrap_dog", "glue_ghost", "ink_imp"];
    applyIntent(m, { kind: "play", handIndex: 0, lane: 2 });
    applyIntent(m, { kind: "pass" });
    m.ripAvailable = true;
    const rip = legalIntents(m).find((i) => i.kind === "rip" && i.lane === 1)!;
    applyIntent(m, rip);
    expect(m.lanes[1].enemy).toBeNull();
    expect(m.ripAvailable).toBe(false);
  });

  it("scores lanes after six turns of passes", () => {
    const m = createMatch({ seed: 4 });
    m.hand = ["scrap_dog", "glue_ghost", "ink_imp"];
    applyIntent(m, { kind: "play", handIndex: 0, lane: 0 });
    applyIntent(m, { kind: "pass" });
    while (m.phase === "play") {
      applyIntent(m, { kind: "pass" });
    }
    expect(m.phase).toBe("end");
    expect(m.laneWinners).toEqual(scoreLanes(m));
    expect(m.winner).toBeTruthy();
  });

  it("opening hand always has a cost-1 play", () => {
    for (let seed = 0; seed < 40; seed++) {
      const m = createMatch({ seed });
      expect(m.hand.some((id) => getCard(id).cost <= 1)).toBe(true);
    }
  });

  it("sting scars enemy on play into contested lane", () => {
    const m = createMatch({ seed: 10 });
    m.hand = ["scrap_dog", "glue_ghost", "ink_imp"];
    // fold_fox has no brace on front
    m.lanes[0].enemy = {
      body: { instanceId: "e1", cardId: "fold_fox", folded: false, scarred: false },
    };
    applyIntent(m, { kind: "play", handIndex: 0, lane: 0 });
    expect(m.lanes[0].enemy!.body.scarred).toBe(true);
  });

  it("brace blocks scar from rip", () => {
    const m = createMatch({ seed: 11 });
    m.lanes[0].enemy = {
      body: { instanceId: "e1", cardId: "tape_troll", folded: false, scarred: false },
    };
    m.hand = ["scrap_dog", "glue_ghost", "ink_imp"];
    m.ripAvailable = true;
    const events = applyIntent(m, { kind: "rip", lane: 0 });
    const rip = events.find((e) => e.type === "rip");
    expect(rip && rip.type === "rip" && rip.result).toBe("blocked");
    expect(m.lanes[0].enemy!.body.scarred).toBe(false);
  });

  it("flash draws on fold from front or ink print", () => {
    const m = createMatch({ seed: 12 });
    m.hand = ["scrap_dog"];
    m.deck = ["glue_ghost", "ink_imp"];
    // fold_fox has FLASH on front — folding must draw
    m.lanes[0].player = {
      body: { instanceId: "p1", cardId: "fold_fox", folded: false, scarred: false },
    };
    applyIntent(m, { kind: "fold", lane: 0 });
    expect(m.lanes[0].player!.body.folded).toBe(true);
    expect(m.hand.length).toBe(2);
  });

  it("ink sting scars enemy when folded", () => {
    const m = createMatch({ seed: 14 });
    m.hand = ["scrap_dog"];
    m.lanes[0].player = {
      body: { instanceId: "p1", cardId: "fold_fox", folded: false, scarred: false },
    };
    m.lanes[0].enemy = {
      body: { instanceId: "e1", cardId: "paper_crane", folded: false, scarred: false },
    };
    // kitsune ink = STING → scar on fold
    applyIntent(m, { kind: "fold", lane: 0 });
    expect(m.lanes[0].enemy!.body.scarred).toBe(true);
  });

  it("every card has a unique front→ink keyword identity", () => {
    const keys = CARDS.map(
      (c) => `${c.frontKeyword ?? "none"}→${c.inkKeyword ?? "none"}`,
    );
    expect(new Set(keys).size).toBe(CARDS.length);
    for (const c of CARDS) {
      expect(c.frontKeyword || c.inkKeyword).toBeTruthy();
      expect(c.frontPower).toBeGreaterThan(0);
      expect(c.inkPower).toBeGreaterThan(0);
    }
  });

  it("glue sticker blocks peel", () => {
    const m = createMatch({ seed: 13 });
    m.lanes[0].enemy = {
      body: { instanceId: "e1", cardId: "scrap_dog", folded: false, scarred: false },
      sticker: { instanceId: "e2", cardId: "glue_ghost", folded: false, scarred: false },
    };
    // glue_ghost front has glue
    m.hand = ["scrap_dog", "ink_imp", "fold_fox"];
    m.ripAvailable = true;
    applyIntent(m, { kind: "rip", lane: 0 });
    expect(m.lanes[0].enemy!.sticker).toBeTruthy();
    expect(m.lanes[0].enemy!.body.scarred).toBe(true);
  });
});
