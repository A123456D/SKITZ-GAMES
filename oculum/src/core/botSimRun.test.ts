/**
 * Heavy bot-vs-bot sim — live Ink / Motley / Toll triangle @ 1k per matchup.
 * Opt-in: BOT_SIM=1 npx vitest run src/core/botSimRun.test.ts --testTimeout=0
 * Timing sample: BOT_SIM=1 BOT_SIM_TIMING=1 npx vitest run src/core/botSimRun.test.ts --testTimeout=0
 */
import { describe, it } from "vitest";
import { formatBotSimSummary, runBotSim, type MatchupSpec } from "./botSim";

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const RUN = env?.BOT_SIM === "1";
const TIMING_ONLY = env?.BOT_SIM_TIMING === "1";

const LIVE_1K: MatchupSpec[] = [
  { name: "ink_vs_ink", player: "ink", enemy: "ink", count: 1_000 },
  { name: "motley_vs_motley", player: "motley", enemy: "motley", count: 1_000 },
  { name: "toll_vs_toll", player: "toll", enemy: "toll", count: 1_000 },
  { name: "ink_vs_motley", player: "ink", enemy: "motley", count: 1_000 },
  { name: "motley_vs_ink", player: "motley", enemy: "ink", count: 1_000 },
  { name: "ink_vs_toll", player: "ink", enemy: "toll", count: 1_000 },
  { name: "toll_vs_ink", player: "toll", enemy: "ink", count: 1_000 },
  { name: "motley_vs_toll", player: "motley", enemy: "toll", count: 1_000 },
  { name: "toll_vs_motley", player: "toll", enemy: "motley", count: 1_000 },
];

describe.skipIf(!RUN)("bot sim 1k live crafts", () => {
  it(
    "runs mirrors + both-seat crosses and prints summary",
    () => {
      const matchups = TIMING_ONLY
        ? LIVE_1K.map((m) => ({ ...m, count: 200 }))
        : LIVE_1K;
      const t0 = Date.now();
      const summary = runBotSim({ matchups, seedBase: 1 });
      const ms = Date.now() - t0;
      // eslint-disable-next-line no-console
      console.log(formatBotSimSummary(summary));
      // eslint-disable-next-line no-console
      console.log(`Elapsed ${(ms / 1000).toFixed(1)}s · ${summary.total} games`);
    },
    0,
  );
});
