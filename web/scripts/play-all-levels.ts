/**
 * Play every Pulse Link desk end-to-end:
 * generate → validate gear geometry → solve via player moves (authored path).
 */
import {
  DIFFICULTY_COUNT,
  generateLevel,
  phaseOf,
  phaseSlot,
  levelTitle,
} from "../src/core/levelGen";
import { loadLevel, applySolutionStep, pulse } from "../src/core/puzzleSession";
import { solve } from "../src/core/networkSolver";

/** Expected gear-pair count from the generator profile. */
function expectedGears(diff: number): number {
  const phase = phaseOf(diff);
  const slot = phaseSlot(diff);
  if (phase === 1) return 0;
  const size = Math.min(8, 3 + slot);
  const interior = Math.max(0, size - 2) * Math.max(0, size - 2);
  const maxPairs = Math.floor(interior / 2);
  const wanted =
    phase === 2
      ? slot <= 1
        ? 1
        : slot <= 3
          ? 2
          : slot <= 5
            ? 3
            : 4
      : slot <= 2
        ? 2
        : slot <= 4
          ? 3
          : 4;
  return Math.min(wanted, maxPairs);
}

function isRim(hub: { x: number; y: number }, w: number, h: number): boolean {
  return hub.x <= 0 || hub.y <= 0 || hub.x >= w - 1 || hub.y >= h - 1;
}

function gearLinksOk(
  level: ReturnType<typeof generateLevel>,
  opts: { requireDistant: boolean; requireInterior: boolean; expectPairs?: number },
): string | null {
  const byId = new Map(level.tables.map((t) => [t.id, t]));
  const seen = new Set<number>();
  let pairs = 0;
  for (const t of level.tables) {
    if (!t.link || seen.has(t.id)) continue;
    const p = byId.get(t.link.partner);
    if (!p?.link || p.link.partner !== t.id) return `broken link on ${t.id}`;
    if (t.link.sign !== -1 || p.link.sign !== -1) return `gear sign not opposite on ${t.id}`;
    if (opts.requireInterior) {
      if (isRim(t.hub, level.width, level.height) || isRim(p.hub, level.width, level.height)) {
        return `gear on rim: ${t.id}@(${t.hub.x},${t.hub.y}) ${p.id}@(${p.hub.x},${p.hub.y})`;
      }
    }
    const man = Math.abs(t.hub.x - p.hub.x) + Math.abs(t.hub.y - p.hub.y);
    if (opts.requireDistant && man < 2) {
      return `gear pair too close: ${t.id}-${p.id} (${t.hub.x},${t.hub.y})-(${p.hub.x},${p.hub.y}) man=${man}`;
    }
    seen.add(t.id);
    seen.add(p.id);
    pairs++;
  }
  if (opts.expectPairs !== undefined && pairs !== opts.expectPairs) {
    return `gear count ${pairs} != expected ${opts.expectPairs}`;
  }
  if (phaseOf(Number(level.id.replace("diff_", ""))) >= 2 && pairs < 1) {
    return "phase 2+ missing gear pairs";
  }
  return null;
}

let fails = 0;
for (let d = 1; d <= DIFFICULTY_COUNT; d++) {
  const seeds = [42, 77, 404, 900 + d * 13];
  const expect = expectedGears(d);
  for (const seed of seeds) {
    const label = `${levelTitle(d)} seed=${seed}`;
    try {
      const level = generateLevel(d, seed);
      const gErr = gearLinksOk(level, {
        requireDistant: true,
        requireInterior: true,
        expectPairs: expect,
      });
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
        // After row shifts, hubs move — only require link integrity mid-solve.
        const mid = gearLinksOk(
          {
            ...level,
            tables: session.state.tables.map((t) => ({
              ...t,
              hub: { ...t.hub },
              link: t.link ? { ...t.link } : undefined,
            })),
            width: session.state.width,
            height: session.state.height,
          },
          { requireDistant: false, requireInterior: false },
        );
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
