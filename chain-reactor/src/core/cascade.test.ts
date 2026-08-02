import { describe, expect, it } from "vitest";
import { resolveCascade } from "./cascade";
import { findFirstHit } from "./board";
import { arrowsFrom, emptyBoard, type BoardCard } from "./types";
import { CARD_CATALOG, getCard } from "./cards";
import { startMatch, playCard, scores, mulligan, startCampaignNode, startDaily } from "./match";
import { chooseAiMove, forecastThreat } from "./ai";

function card(
  defId: string,
  owner: "player" | "enemy",
  power?: number,
): BoardCard {
  const def = CARD_CATALOG[defId];
  return {
    instanceId: defId + owner,
    defId,
    owner,
    power: power ?? def.power,
    activated: false,
  };
}

describe("findFirstHit", () => {
  it("skips empty tiles and misses off-board", () => {
    const board = emptyBoard();
    board[3][1] = card("n_pulse_n", "enemy");
    const hit = findFirstHit(board, { col: 1, row: 0 }, "down");
    expect(hit?.pos).toEqual({ col: 1, row: 3 });
    expect(findFirstHit(board, { col: 0, row: 0 }, "up")).toBeNull();
  });
});

describe("resolveCascade", () => {
  it("damages enemy and captures at <=0 then retriggers", () => {
    const board = emptyBoard();
    board[1][1] = card("n_pulse_n", "player", 4); // fires up
    // n_pulse_n fires up only — place enemy above
    board[0][1] = card("v_swarm1", "enemy", 3);

    const { board: after, events } = resolveCascade(board, { col: 1, row: 1 }, "player");
    expect(events.some((e) => e.type === "damage")).toBe(true);
    expect(events.some((e) => e.type === "capture")).toBe(true);
    expect(after[0][1]?.owner).toBe("player");
    expect(after[0][1]?.power).toBe(1);
  });

  it("relays friendlies without damage", () => {
    const board = emptyBoard();
    board[2][1] = card("n_pulse_cross", "player", 3); // up+down
    board[0][1] = card("v_swarm2", "player", 5); // down

    const { board: after, events } = resolveCascade(board, { col: 1, row: 2 }, "player");
    expect(events.some((e) => e.type === "relay")).toBe(true);
    expect(events.some((e) => e.type === "damage")).toBe(false);
    expect(after[0][1]?.power).toBe(5);
  });

  it("stops at depth 4", () => {
    const board = emptyBoard();
    // Vertical chain of friendlies all firing down/up to chain
    board[0][1] = {
      ...card("n_pulse_cross", "player", 2),
      defId: "n_pulse_cross",
    };
    // Override arrows via custom — use cross which has up+down
    board[1][1] = card("n_pulse_cross", "player", 2);
    board[2][1] = card("n_pulse_cross", "player", 2);
    board[3][1] = card("n_pulse_cross", "player", 2);

    const { events } = resolveCascade(board, { col: 1, row: 0 }, "player");
    const fires = events.filter((e) => e.type === "fire");
    expect(fires.length).toBeLessThanOrEqual(4);
    expect(fires.every((e) => e.type === "fire" && e.step <= 4)).toBe(true);
  });

  it("applies step multipliers at depth 3 and 4", () => {
    const board = emptyBoard();
    // step1 origin → step2 relay → step3 damage (4 * 1.25 = 5)
    board[0][1] = card("n_pulse_cross", "player", 4);
    board[1][1] = card("n_pulse_cross", "player", 4);
    board[2][1] = card("n_pulse_cross", "player", 4);
    board[3][1] = card("n_pulse_cross", "enemy", 100);

    const { events } = resolveCascade(board, { col: 1, row: 0 }, "player");
    const dmg = events.filter((e) => e.type === "damage");
    expect(dmg.some((e) => e.type === "damage" && e.amount === 5)).toBe(true);
  });

  it("reflector bends beam clockwise with +3", () => {
    // Ensure reflector card exists in catalog with expected shape
    expect(CARD_CATALOG.p_reflect1.node).toBe("reflector");
    expect(CARD_CATALOG.p_reflect1.arrows).toEqual(arrowsFrom("right"));

    const board = emptyBoard();
    // Planted fires right into reflector
    board[1][0] = card("v_swarm1", "player", 4); // right
    board[1][1] = card("p_reflect1", "player", 3);
    // After clockwise from right → down; enemy below reflector
    board[3][1] = card("v_swarm2", "enemy", 20);

    const { events } = resolveCascade(board, { col: 0, row: 1 }, "player");
    expect(events.some((e) => e.type === "reflect")).toBe(true);
    expect(events.some((e) => e.type === "damage")).toBe(true);
  });

  it("splitter turns vertical into horizontal", () => {
    const board = emptyBoard();
    board[0][1] = card("v_swarm2", "player", 3); // down
    board[2][1] = card("v_split1", "player", 2); // splitter
    board[2][0] = card("n_pulse_n", "enemy", 10);
    board[2][2] = card("n_pulse_n", "enemy", 10);

    const { events } = resolveCascade(board, { col: 1, row: 0 }, "player");
    expect(events.some((e) => e.type === "split")).toBe(true);
    const damages = events.filter((e) => e.type === "damage");
    expect(damages.length).toBeGreaterThanOrEqual(2);
  });

  it("single activation per card per cascade", () => {
    const board = emptyBoard();
    board[1][1] = card("n_pulse_cross", "player", 2);
    board[0][1] = card("n_pulse_cross", "player", 2);
    board[2][1] = card("n_pulse_cross", "player", 2);

    const { events } = resolveCascade(board, { col: 1, row: 1 }, "player");
    const fires = events.filter((e) => e.type === "fire");
    const positions = fires.map((e) => (e.type === "fire" ? `${e.pos.row},${e.pos.col}` : ""));
    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe("match", () => {
  it("plays a card and advances turn", () => {
    const state = startMatch("volt", "prismatic", () => 0.1);
    const handLen = state.players.player.hand.length;
    expect(handLen).toBe(3);
    expect(state.energy).toBe(2);
    // Find affordable card
    let played = false;
    for (let i = 0; i < state.players.player.hand.length; i++) {
      const r = playCard(state, i, { col: 1, row: 1 });
      if (r.ok) {
        played = true;
        break;
      }
    }
    expect(played).toBe(true);
    expect(state.active).toBe("enemy");
  });

  it("guarantees an affordable opening card", () => {
    const state = startMatch("volt", "prismatic", () => 0.55);
    expect(state.energy).toBe(2);
    expect(
      state.players.player.hand.some((id) => getCard(id).cost <= state.energy),
    ).toBe(true);
  });

  it("allows a one-time mulligan", () => {
    const state = startMatch("volt", "prismatic", () => 0.2);
    expect(state.mulliganAvailable).toBe(true);
    const before = [...state.players.player.hand];
    expect(mulligan(state)).toBe(true);
    expect(state.mulliganAvailable).toBe(false);
    expect(state.players.player.hand).toHaveLength(3);
    expect(mulligan(state)).toBe(false);
    // Hand may reshuffle to same cards; just ensure still affordable
    expect(
      state.players.player.hand.some((id) => getCard(id).cost <= state.energy),
    ).toBe(true);
    void before;
  });

  it("scores controlled power", () => {
    const state = startMatch("volt", "prismatic", () => 0.2);
    state.board[0][0] = card("v_swarm1", "player", 4);
    state.board[0][1] = card("p_wall", "enemy", 6);
    const s = scores(state);
    expect(s.player).toBe(4);
    expect(s.enemy).toBe(6);
  });

  it("starts campaign and daily modes with objectives", () => {
    const camp = startCampaignNode("d1_spark", () => 0.11);
    expect(camp.mode).toBe("campaign");
    expect(camp.objective?.kind).toBe("win_match");
    expect(camp.board[0][1]?.owner).toBe("enemy");

    const daily = startDaily("2099-01-02");
    expect(daily.mode).toBe("daily");
    expect(daily.playsLeft).toBeGreaterThanOrEqual(3);
    expect(daily.playsLeft).toBeLessThanOrEqual(5);
    expect(daily.objective).toBeTruthy();
    expect(daily.players.player.hand).toHaveLength(3);
  });

  it("tracks best cascade for end replay", () => {
    const state = startMatch("volt", "prismatic", () => 0.15);
    expect(state.bestCascade).toEqual([]);
    // Plant anything legal
    for (let i = 0; i < state.players.player.hand.length; i++) {
      const r = playCard(state, i, { col: 0, row: 0 });
      if (r.ok) {
        expect(state.lastCascade.length).toBeGreaterThan(0);
        break;
      }
    }
  });
});

describe("faction verbs", () => {
  it("void overkill boosts captured power", () => {
    const board = emptyBoard();
    // Dark Seed fires ↓ into a 2-power enemy → overkill 0 from power 2 vs 2?
    // Use stronger void card: o_late2 is 3 power up+right — use o_heavy (6) down+right
    board[0][1] = card("o_heavy", "player", 6);
    board[1][1] = card("n_pulse_n", "enemy", 2);
    const { board: after, events } = resolveCascade(board, { col: 1, row: 0 }, "player");
    const capt = events.find((e) => e.type === "capture");
    expect(capt).toBeTruthy();
    if (capt && capt.type === "capture") {
      expect(capt.powerSet).toBeGreaterThan(1);
    }
    expect(after[1][1]?.owner).toBe("player");
    expect(after[1][1]?.power ?? 0).toBeGreaterThan(1);
    expect(events.some((e) => e.type === "overkill")).toBe(true);
  });

  it("volt flood keeps printed arrows on split", () => {
    const board = emptyBoard();
    // Arc Mite fires ↓ into Volt splitter which also keeps ↓ on flood
    board[0][1] = card("v_swarm2", "player", 3);
    board[1][1] = card("v_split1", "player", 2);
    board[2][0] = card("n_pulse_n", "enemy", 10);
    board[2][2] = card("n_pulse_n", "enemy", 10);
    board[3][1] = card("n_pulse_n", "enemy", 10);
    const { events } = resolveCascade(board, { col: 1, row: 0 }, "player");
    const split = events.find((e) => e.type === "split");
    expect(split).toBeTruthy();
    if (split && split.type === "split") {
      expect(split.toDirs).toEqual(expect.arrayContaining(["left", "right", "down"]));
    }
  });
});

describe("ai", () => {
  it("chooses a legal move or pass", () => {
    const state = startMatch("volt", "prismatic", () => 0.3);
    state.active = "enemy";
    state.phase = "ai_thinking";
    state.energy = 3;
    state.energyMax = 3;
    state.players.enemy.hand = ["v_swarm1", "n_pulse_n", "v_edge"];
    const move = chooseAiMove(state, "normal");
    if ("pass" in move) {
      expect(move.pass).toBe(true);
    } else {
      expect(move.handIndex).toBeGreaterThanOrEqual(0);
      expect(move.pos.col).toBeGreaterThanOrEqual(0);
    }
  });

  it("normal finds a capture when available", () => {
    const state = startMatch("volt", "prismatic", () => 0.3);
    state.active = "enemy";
    state.phase = "ai_thinking";
    state.energy = 3;
    state.energyMax = 3;
    state.board = emptyBoard();
    state.board[2][1] = card("n_pulse_n", "player", 1);
    state.players.enemy.hand = ["v_swarm2", "n_pulse_n", "v_edge"];
    const normal = chooseAiMove(state, "normal", () => 0);
    expect("pass" in normal).toBe(false);
  });

  it("forecasts threats without throwing", () => {
    const state = startMatch("volt", "prismatic", () => 0.3);
    state.phase = "playing";
    state.active = "player";
    state.energyMax = 3;
    state.board[2][1] = card("n_pulse_n", "player", 1);
    state.players.enemy.hand = ["v_swarm2", "n_pulse_n", "v_edge"];
    const threat = forecastThreat(state, "normal");
    if (threat) {
      expect(threat.label).toMatch(/Threat:/);
    }
  });
});
