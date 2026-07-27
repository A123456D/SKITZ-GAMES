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

/** Expected gear-train sizes from the generator profile. */
function expectedGroups(diff: number): number[] {
  const phase = phaseOf(diff);
  const slot = phaseSlot(diff);
  if (phase === 1) return [];
  const size = Math.min(8, 3 + slot);
  const interior = Math.max(0, size - 2) * Math.max(0, size - 2);
  const wanted: number[] =
    phase === 2
      ? slot <= 2
        ? [2]
        : slot === 3
          ? [3]
          : slot === 4
            ? [3, 2]
            : [4, 2]
      : slot <= 1
        ? [2]
        : slot === 2
          ? [3]
          : slot === 3
            ? [3, 2]
            : [4, 2];
  const out: number[] = [];
  let left = interior;
  for (const n of wanted) {
    if (n >= 2 && n <= left) {
      out.push(n);
      left -= n;
    }
  }
  return out;
}

function isRim(hub: { x: number; y: number }, w: number, h: number): boolean {
  return hub.x <= 0 || hub.y <= 0 || hub.x >= w - 1 || hub.y >= h - 1;
}

function gearLinksOk(
  level: ReturnType<typeof generateLevel>,
  opts: { requireInterior: boolean; expectGroups?: number[] },
): string | null {
  const byGroup = new Map<number, typeof level.tables>();
  for (const t of level.tables) {
    if (!t.link) continue;
    if (opts.requireInterior && isRim(t.hub, level.width, level.height)) {
      return `gear on rim: ${t.id}@(${t.hub.x},${t.hub.y})`;
    }
    const list = byGroup.get(t.link.group) ?? [];
    list.push(t);
    byGroup.set(t.link.group, list);
  }
  const got = [...byGroup.values()].map((m) => m.length).sort((a, b) => b - a);
  if (opts.expectGroups) {
    const want = [...opts.expectGroups].sort((a, b) => b - a);
    if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
      return `gear groups ${got.join("+")} != expected ${want.join("+")}`;
    }
  }
  if (phaseOf(Number(level.id.replace("diff_", ""))) >= 2 && got.length < 1) {
    return "phase 2+ missing gear trains";
  }
  for (const members of byGroup.values()) {
    if (members.length < 2) return "singleton gear group";
  }
  return null;
}

let fails = 0;
for (let d = 1; d <= DIFFICULTY_COUNT; d++) {
  const seeds = [42, 77, 404, 900 + d * 13];
  const expect = expectedGroups(d);
  for (const seed of seeds) {
    const label = `${levelTitle(d)} seed=${seed}`;
    try {
      const level = generateLevel(d, seed);
      const wantPulse = phaseOf(d) === 1 ? 1 : phaseOf(d) === 2 ? 2 : 3;
      if (level.pulseLimit !== wantPulse) {
        console.log("PULSE FAIL", label, `got ${level.pulseLimit} want ${wantPulse}`);
        fails++;
        continue;
      }
      const gErr = gearLinksOk(level, { requireInterior: true, expectGroups: expect });
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
          { requireInterior: false },
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

      const geared = level.tables.filter((t) => t.link).length;
      const groups = new Set(level.tables.filter((t) => t.link).map((t) => t.link!.group)).size;
      console.log(
        "PLAYED OK",
        label,
        `size=${level.width}`,
        `gears=${geared}`,
        `trains=${groups}`,
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
