/**
 * Quick live-craft matrix @ 50/matchup (mirrors + both seats).
 * Opt-in: BOT_SIM=1 npx vitest run src/core/botSimQuick50.test.ts --testTimeout=0
 */
import { describe, it } from "vitest";
import { formatBotSimSummary, runBotSim, type MatchupSpec } from "./botSim";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.BOT_SIM === "1";

const N = 50;
const KINDS = ["ink", "motley", "toll", "breach"] as const;

function matrix50(): MatchupSpec[] {
  const out: MatchupSpec[] = [];
  for (const a of KINDS) {
    out.push({ name: `${a}_vs_${a}`, player: a, enemy: a, count: N });
  }
  for (let i = 0; i < KINDS.length; i++) {
    for (let j = i + 1; j < KINDS.length; j++) {
      const a = KINDS[i]!;
      const b = KINDS[j]!;
      out.push({ name: `${a}_vs_${b}`, player: a, enemy: b, count: N });
      out.push({ name: `${b}_vs_${a}`, player: b, enemy: a, count: N });
    }
  }
  return out;
}

describe.skipIf(!RUN)("bot sim quick 50 live crafts", () => {
  it(
    "runs full 4-craft matrix @ 50 and prints summary",
    () => {
      const matchups = matrix50();
      const t0 = Date.now();
      const summary = runBotSim({ matchups, seedBase: 50 });
      const ms = Date.now() - t0;
      // eslint-disable-next-line no-console
      console.log(formatBotSimSummary(summary));
      // eslint-disable-next-line no-console
      console.log(`Elapsed ${(ms / 1000).toFixed(1)}s · ${summary.total} games`);
    },
    0,
  );
});
