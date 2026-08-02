import type { BoardCard, MatchObjective } from "./types";
import { emptyBoard } from "./types";
import type { AiDifficulty } from "./ai";
import { loadMeta, noteDailyClear } from "./meta";

export type DailyChallenge = {
  key: string;
  title: string;
  blurb: string;
  archetype: string;
  faction: "volt" | "prismatic" | "void";
  enemyFaction: "volt" | "prismatic" | "void";
  objective: Omit<MatchObjective, "progress">;
  seedBoard: Array<{ col: number; row: number; defId: string; power?: number }>;
  openingHand: string[];
  /** Number of player plays allowed. */
  plays: number;
  maxRounds?: number;
  aiDifficulty: AiDifficulty;
  playerEnergyBonus: number;
  enemyEnergyBonus: number;
  rngSeed: number;
};

/** Deterministic 32-bit mix. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const FACTIONS: Array<"volt" | "prismatic" | "void"> = ["volt", "prismatic", "void"];

const ARCHETYPES = [
  "Overthrow Drill",
  "Relay Gauntlet",
  "Glass Pressure",
  "Depth Spike",
  "Budget Siege",
  "Entropy Rush",
] as const;

const SEED_POOLS: Array<Array<{ col: number; row: number; defId: string; power: number }>> = [
  [
    { col: 1, row: 2, defId: "n_pulse_n", power: 2 },
    { col: 0, row: 1, defId: "n_pulse_side", power: 3 },
  ],
  [
    { col: 2, row: 0, defId: "p_reflect1", power: 3 },
    { col: 1, row: 3, defId: "n_pulse_n", power: 2 },
  ],
  [
    { col: 0, row: 0, defId: "o_late1", power: 2 },
    { col: 2, row: 2, defId: "v_swarm1", power: 2 },
    { col: 1, row: 1, defId: "n_amp", power: 2 },
  ],
  [
    { col: 1, row: 0, defId: "p_wall", power: 5 },
    { col: 0, row: 2, defId: "n_pulse_cross", power: 3 },
    { col: 2, row: 2, defId: "n_pulse_n", power: 2 },
  ],
  [
    { col: 0, row: 1, defId: "v_split1", power: 2 },
    { col: 2, row: 1, defId: "v_split2", power: 3 },
    { col: 1, row: 3, defId: "n_pulse_n", power: 2 },
  ],
  [
    { col: 1, row: 1, defId: "n_pulse_cross", power: 3 },
    { col: 1, row: 2, defId: "n_amp", power: 2 },
    { col: 0, row: 3, defId: "o_late2", power: 3 },
    { col: 2, row: 3, defId: "o_late1", power: 2 },
  ],
];

const HAND_POOLS: Record<"volt" | "prismatic" | "void", string[][]> = {
  volt: [
    ["v_storm", "v_swarm2", "n_pulse_n"],
    ["v_split1", "v_edge", "v_swarm1"],
    ["v_corner", "v_storm", "n_amp"],
  ],
  prismatic: [
    ["p_vector", "p_amp1", "n_pulse_n"],
    ["p_reflect1", "p_center1", "p_amp1"],
    ["p_vector", "p_wall", "p_reflect2"],
  ],
  void: [
    ["o_invert", "o_late1", "n_pulse_cross"],
    ["o_siphon", "o_late2", "o_invert"],
    ["o_invert", "o_split", "o_heavy"],
  ],
};

export function buildDailyChallenge(key = todayKey()): DailyChallenge {
  const seed = hashString(`chain-reactor-daily-${key}`);
  const rng = mulberry32(seed);
  const faction = FACTIONS[Math.floor(rng() * FACTIONS.length)];
  const enemyFaction = FACTIONS.filter((f) => f !== faction)[Math.floor(rng() * 2)];
  const board = SEED_POOLS[Math.floor(rng() * SEED_POOLS.length)];
  const hands = HAND_POOLS[faction];
  const openingHand = hands[Math.floor(rng() * hands.length)];
  const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];

  const kinds: Array<Omit<MatchObjective, "progress">> = [
    { kind: "score_at_least", target: 11 + Math.floor(rng() * 8), label: "Hit score target" },
    { kind: "chain_depth", target: 3 + (rng() > 0.7 ? 1 : 0), label: "Reach chain depth" },
    { kind: "capture_at_least", target: 2 + (rng() > 0.55 ? 1 : 0), label: "Capture tiles" },
        { kind: "survive_rounds", target: 3 + Math.floor(rng() * 2), label: "Reach round" },
  ];
  const objective = { ...kinds[Math.floor(rng() * kinds.length)] };
  objective.label =
    objective.kind === "score_at_least"
      ? `Score ${objective.target}+ Power`
      : objective.kind === "chain_depth"
        ? `Chain depth ${objective.target}`
        : objective.kind === "survive_rounds"
          ? `Reach round ${objective.target}`
          : `Capture ${objective.target} tiles`;

  const plays = 3 + Math.floor(rng() * 3); // 3–5
  const aiRoll = rng();
  const aiDifficulty: AiDifficulty = aiRoll > 0.72 ? "hard" : aiRoll > 0.35 ? "normal" : "easy";
  const playerEnergyBonus = rng() > 0.6 ? 1 : 0;
  const enemyEnergyBonus = aiDifficulty === "hard" || rng() > 0.75 ? 1 : 0;
  const maxRounds = objective.kind === "survive_rounds" ? objective.target : rng() > 0.8 ? 5 : undefined;

  const mods: string[] = [`${plays} plays`, `${aiDifficulty} AI`];
  if (playerEnergyBonus) mods.push("+1 energy");
  if (enemyEnergyBonus) mods.push("enemy +1");
  if (maxRounds) mods.push(`${maxRounds} rounds`);

  return {
    key,
    title: archetype,
    blurb: `${key} · ${mods.join(" · ")}`,
    archetype,
    faction,
    enemyFaction,
    objective,
    seedBoard: board,
    openingHand,
    plays,
    maxRounds,
    aiDifficulty,
    playerEnergyBonus,
    enemyEnergyBonus,
    rngSeed: seed,
  };
}

export function buildDailyBoard(
  seeds: DailyChallenge["seedBoard"],
): (BoardCard | null)[][] {
  const board = emptyBoard();
  let i = 0;
  for (const s of seeds) {
    board[s.row][s.col] = {
      instanceId: `daily_${i++}`,
      defId: s.defId,
      owner: "enemy",
      power: s.power ?? 2,
      activated: false,
    };
  }
  return board;
}

export type DailyRecord = {
  key: string;
  bestScore: number;
  bestChain: number;
  cleared: boolean;
  attempts: number;
  shareLine: string;
};

const DAILY_KEY = "cr_daily_v1";

export function loadDailyRecord(key: string): DailyRecord | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, DailyRecord>;
    return all[key] ?? null;
  } catch {
    return null;
  }
}

export function saveDailyRecord(rec: DailyRecord): void {
  if (typeof localStorage === "undefined") return;
  let all: Record<string, DailyRecord> = {};
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) all = JSON.parse(raw) as Record<string, DailyRecord>;
  } catch {
    all = {};
  }
  const prev = all[rec.key];
  if (prev) {
    rec.bestScore = Math.max(prev.bestScore, rec.bestScore);
    rec.bestChain = Math.max(prev.bestChain, rec.bestChain);
    rec.cleared = prev.cleared || rec.cleared;
    rec.attempts = (prev.attempts ?? 0) + 1;
  } else {
    rec.attempts = 1;
  }
  if (rec.cleared) noteDailyClear(rec.key);
  all[rec.key] = rec;
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function formatShareCard(opts: {
  key: string;
  title?: string;
  score: number;
  chain: number;
  cleared: boolean;
  streak?: number;
}): string {
  const streak = opts.streak ?? loadMeta().dailyStreak;
  const title = opts.title ? ` · ${opts.title}` : "";
  return `CHAIN REACTOR DAILY ${opts.key}${title}\nSCORE ${opts.score} · CHAIN ${opts.chain}${opts.cleared ? " · CLEARED" : ""}${streak > 1 ? ` · STREAK ${streak}` : ""}`;
}

export function dailyShareLine(key: string): string | null {
  return loadDailyRecord(key)?.shareLine ?? null;
}
