/**
 * One-off: 100 Scar Breach vs Scar Breach bot games.
 * Opt-in: BOT_SIM=1 npx vitest run src/core/botSimBreachMirror.test.ts --testTimeout=0
 */
import { describe, it, expect } from "vitest";
import { formatBotSimSummary, runBotSim } from "./botSim";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.BOT_SIM === "1";

describe.skipIf(!RUN)("bot sim Scar Breach mirror", () => {
  it(
    "runs 100 breach_vs_breach and prints summary",
    () => {
      const t0 = Date.now();
      const summary = runBotSim({
        matchups: [{ name: "breach_vs_breach", player: "breach", enemy: "breach", count: 100 }],
        seedBase: 9001,
      });
      const ms = Date.now() - t0;
      // eslint-disable-next-line no-console
      console.log(formatBotSimSummary(summary));
      // eslint-disable-next-line no-console
      console.log(`Elapsed ${(ms / 1000).toFixed(1)}s · ${summary.total} games`);
      expect(summary.total).toBe(100);
      expect(summary.stalled).toBe(0);
    },
    0,
  );
});
