import { describe, expect, it } from "vitest";
import { createSolved, faceTurn, F, U } from "./rubik";
import { applyLaneTwist, twistBelt } from "./lane";

describe("applyLaneTwist uses belt for all lanes", () => {
  it("F row 0 amount 1 equals twistBelt, not faceTurn U", () => {
    const cube = createSolved(3);
    const twist = { axis: "row" as const, index: 0, dir: 1 as const, amount: 1 };
    const viaLane = applyLaneTwist(cube, F, twist);
    const viaBelt = twistBelt(cube, F, twist);
    const viaFace = faceTurn(cube, U, 1);

    expect(viaLane).toEqual(viaBelt);
    expect(viaLane).not.toEqual(viaFace);
  });

  it("F bottom row equals twistBelt", () => {
    const cube = createSolved(3);
    const twist = { axis: "row" as const, index: 2, dir: -1 as const, amount: 1 };
    expect(applyLaneTwist(cube, F, twist)).toEqual(twistBelt(cube, F, twist));
  });

  it("middle row still equals twistBelt", () => {
    const cube = createSolved(3);
    const twist = { axis: "row" as const, index: 1, dir: 1 as const, amount: 2 };
    expect(applyLaneTwist(cube, F, twist)).toEqual(twistBelt(cube, F, twist));
  });
});
