/**
 * Focused WR check after Motley soft — both seats @ 200.
 * Opt-in: BOT_SIM_WR=1 npx vitest run src/core/botSimWrCheck.test.ts --testTimeout=0
 */
import { describe, it } from "vitest";
import { formatBotSimSummary, runBotSim, type MatchupSpec } from "./botSim";

const RUN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.BOT_SIM_WR === "1";

const N = 200;
const KINDS = ["ink", "motley", "toll", "breach"] as const;

function matrix(): MatchupSpec[] {
  const out: MatchupSpec[] = [];
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

describe.skipIf(!RUN)("bot sim WR check", () => {
  it(
    "prints live-craft both-seat WR @ 200",
    () => {
      const summary = runBotSim({ matchups: matrix(), seedBase: 77 });
      // eslint-disable-next-line no-console
      console.log(formatBotSimSummary(summary));
    },
    0,
  );
});
