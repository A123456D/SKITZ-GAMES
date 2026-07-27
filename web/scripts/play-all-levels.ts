/**
 * Play every Pulse Link desk end-to-end:
 * generate → validate gear geometry → solve via player moves (authored path).
 */
import {
  DIFFICULTY_COUNT,
  generateLevel,
  phaseOf,
  levelTitle,
} from "../src/core/levelGen";
import { loadLevel, applySolutionStep, pulse } from "../src/core/puzzleSession";
import { solve } from "../src/core/networkSolver";

function gearPairsOk(level: ReturnType<typeof generateLevel>): string | null {
  const byId = new Map(level.tables.map((t) => [t.id, t]));
  const seen = new Set<number>();
  let pairs = 0;
  for (const t of level.tables) {
    if (!t.link || seen.has(t.id)) continue;
    const p = byId.get(t.link.partner);
    if (!p?.link || p.link.partner !== t.id) return `broken link on ${t.id}`;
    if (t.link.sign !== -1 || p.link.sign !== -1) return `gear sign not opposite on ${t.id}`;
    const dxRaw = Math.abs(t.hub.x - p.hub.x);
    const dyRaw = Math.abs(t.hub.y - p.hub.y);
    // Row shifts wrap the board — same-row gears stay neighbors on a cylinder.
    const dx = Math.min(dxRaw, level.width - dxRaw);
    const dy = Math.min(dyRaw, level.height - dyRaw);
    if (dx + dy !== 1) {
      return `gear pair not adjacent: ${t.id}-${p.id} (${t.hub.x},${t.hub.y})-(${p.hub.x},${p.hub.y})`;
    }
    if (level.allowRowShift && t.hub.y !== p.hub.y) {
      return `phase3 gear not same row: ${t.id}-${p.id}`;
    }
    seen.add(t.id);
    seen.add(p.id);
    pairs++;
  }
  if (phaseOf(Number(level.id.replace("diff_", ""))) >= 2 && pairs < 1) {
    return "phase 2+ missing gear pairs";
  }
  return null;
}

let fails = 0;
for (let d = 1; d <= DIFFICULTY_COUNT; d++) {
  const seeds = [42, 77, 404, 900 + d * 13];
  for (const seed of seeds) {
    const label = `${levelTitle(d)} seed=${seed}`;
    try {
      const level = generateLevel(d, seed);
      const gErr = gearPairsOk(level);
      if (gErr) {
        console.log("GEAR FAIL", label, gErr);
        fails++;
        continue;
      }

      const session = loadLevel(level);
      if (solve(session.state).won) {
        console.log("START WON", label);
        fails++;
        continue;
      }

      let bad = false;
      for (let i = 0; i < level.solution.length; i++) {
        if (!applySolutionStep(session, level.solution[i]!)) {
          console.log("STEP FAIL", label, "i", i, level.solution[i]);
          bad = true;
          break;
        }
        const mid = gearPairsOk({
          ...level,
          tables: session.state.tables.map((t) => ({
            ...t,
            hub: { ...t.hub },
            link: t.link ? { ...t.link } : undefined,
          })),
          width: session.state.width,
          height: session.state.height,
        });
        if (mid) {
          console.log("MID GEAR FAIL", label, "after", i, mid);
          bad = true;
          break;
        }
      }
      if (bad) {
        fails++;
        continue;
      }

      if (!pulse(session) || !session.result.won) {
        console.log("PULSE FAIL", label);
        fails++;
        continue;
      }

      // Play again from scratch: confirm latent closed before pulse too.
      const check = loadLevel(level);
      for (const step of level.solution) applySolutionStep(check, step);
      if (!solve(check.state).won) {
        console.log("LATENT NOT CLOSED", label);
        fails++;
        continue;
      }

      console.log(
        "PLAYED OK",
        label,
        `size=${level.width}`,
        `gears=${level.tables.filter((t) => t.link).length / 2}`,
        `rowSteps=${level.solution.filter((s) => s.tableId === -2).length}`,
        `par=${level.par}`,
      );
    } catch (e) {
      console.log("THROW", label, String(e));
      fails++;
    }
  }
}
console.log(fails ? `FAILED ${fails}` : "ALL LEVELS PLAYABLE");
process.exit(fails ? 1 : 0);
