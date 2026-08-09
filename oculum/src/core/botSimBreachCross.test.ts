/**
 * Scar Breach vs each live craft (both seats).
 * Opt-in: BOT_SIM=1 npx vitest run src/core/botSimBreachCross.test.ts --testTimeout=0
 */
import { describe, it, expect } from "vitest";
import { formatBotSimSummary, runBotSim, type MatchupSpec } from "./botSim";

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const RUN = env?.BOT_SIM === "1";
const COUNT = Number(env?.BOT_SIM_COUNT ?? 1000);

const MATCHUPS: MatchupSpec[] = [
  { name: "breach_vs_ink", player: "breach", enemy: "ink", count: COUNT },
  { name: "ink_vs_breach", player: "ink", enemy: "breach", count: COUNT },
  { name: "breach_vs_motley", player: "breach", enemy: "motley", count: COUNT },
  { name: "motley_vs_breach", player: "motley", enemy: "breach", count: COUNT },
  { name: "breach_vs_toll", player: "breach", enemy: "toll", count: COUNT },
  { name: "toll_vs_breach", player: "toll", enemy: "breach", count: COUNT },
  { name: "breach_vs_breach", player: "breach", enemy: "breach", count: COUNT },
];

describe.skipIf(!RUN)("bot sim Scar Breach crosses", () => {
  it(
    `runs Breach vs each live craft @ ${COUNT} (both seats) + mirror`,
    () => {
      const t0 = Date.now();
      const summary = runBotSim({ matchups: MATCHUPS, seedBase: 9100 });
      const ms = Date.now() - t0;
      // eslint-disable-next-line no-console
      console.log(formatBotSimSummary(summary));
      // eslint-disable-next-line no-console
      console.log(`Elapsed ${(ms / 1000).toFixed(1)}s · ${summary.total} games`);
      expect(summary.stalled).toBe(0);
      expect(summary.total).toBe(COUNT * MATCHUPS.length);
    },
    0,
  );
});
