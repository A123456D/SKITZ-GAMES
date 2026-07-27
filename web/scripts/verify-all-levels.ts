import { DIFFICULTY_COUNT, generateLevel, phaseOf, levelTitle } from "../src/core/levelGen";
import { loadLevel, applySolutionStep, pulse } from "../src/core/puzzleSession";
import { solve } from "../src/core/networkSolver";

let fails = 0;
for (let d = 1; d <= DIFFICULTY_COUNT; d++) {
  for (const seed of [42, 99, 404, 1000 + d * 17]) {
    try {
      const level = generateLevel(d, seed);
      const startWon = solve(loadLevel(level).state).won;
      if (startWon) {
        console.log("ALREADY WON", levelTitle(d), "seed", seed);
        fails++;
        continue;
      }
      const gears = level.tables.filter((t) => t.link).length / 2;
      const session = loadLevel(level);
      let stepFail = -1;
      for (let i = 0; i < level.solution.length; i++) {
        if (!applySolutionStep(session, level.solution[i]!)) {
          stepFail = i;
          break;
        }
      }
      if (stepFail >= 0) {
        console.log(
          "STEP FAIL",
          levelTitle(d),
          "phase",
          phaseOf(d),
          "seed",
          seed,
          "step",
          stepFail,
          JSON.stringify(level.solution[stepFail]),
        );
        fails++;
        continue;
      }
      if (!pulse(session) || !session.result.won) {
        console.log("PULSE FAIL", levelTitle(d), "phase", phaseOf(d), "seed", seed);
        fails++;
        continue;
      }
      // Also check: after gears, can we reach solved WITHOUT the authored path
      // by only turning free discs? (sanity)
      console.log(
        "OK",
        levelTitle(d),
        "seed",
        seed,
        "size",
        `${level.width}x${level.height}`,
        "gears",
        gears,
        "rowSteps",
        level.solution.filter((s) => s.tableId === -2).length,
        "par",
        level.par,
      );
    } catch (e) {
      console.log("THROW", levelTitle(d), "seed", seed, String(e));
      fails++;
    }
  }
}
console.log("TOTAL FAILS", fails);
process.exit(fails ? 1 : 0);
