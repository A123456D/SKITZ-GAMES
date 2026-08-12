import { chooseAiMove } from "./ai";
import {
  aiBellwardTollDeck,
  aiInkAbyssDeck,
  aiIronBreachDeck,
  aiMotleyCourtDeck,
} from "./decks";
import { buildAutoDeck } from "./construct";
import { applyIntent, createMatch } from "./match";
import type { MatchState } from "./types";

export type DeckKind = "ink" | "motley" | "toll" | "breach" | "mixed";

export type MatchupSpec = {
  name: string;
  player: DeckKind;
  enemy: DeckKind;
  count: number;
};

export type BotMatchResult = {
  matchup: string;
  seed: number;
  winner: MatchState["winner"];
  reason: MatchState["endReason"];
  turns: number;
  will: readonly [number, number];
  eclipse: readonly [number, number];
  stalled: boolean;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle — used so every bot match gets a fresh deck order. */
export function shuffleDeckOrder(ids: readonly string[], seed: number): string[] {
  const rng = mulberry32(seed);
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function deckFor(kind: DeckKind, seed: number): string[] {
  if (kind === "ink") return aiInkAbyssDeck();
  if (kind === "motley") return aiMotleyCourtDeck();
  if (kind === "toll") return aiBellwardTollDeck();
  if (kind === "breach") return aiIronBreachDeck();
  return buildAutoDeck({ seed, heresy: "all" });
}

/** Exposed for audit / tooling — same lists the bot sim seats use. */
export function botSimDeck(kind: DeckKind, seed = 0): string[] {
  return deckFor(kind, seed);
}

/** Both seats use the same heuristic AI (`chooseAiMove` for active side). */
export function playBotMatch(opts: {
  seed: number;
  player: DeckKind;
  enemy: DeckKind;
  matchup: string;
  aiDifficulty?: MatchState["aiDifficulty"];
}): BotMatchResult {
  // Reshuffle both seats every match (seed-unique). createMatch shuffles again for draw order.
  const playerDeck = shuffleDeckOrder(deckFor(opts.player, opts.seed), opts.seed ^ 0x3c6ef35f);
  const enemyDeck = shuffleDeckOrder(
    deckFor(opts.enemy, opts.seed ^ 0xa5a5a5a5),
    opts.seed ^ 0x1b873593,
  );

  const s = createMatch({
    seed: opts.seed,
    deck: playerDeck,
    enemyDeck,
    aiDifficulty: opts.aiDifficulty ?? "hard",
  });

  let guard = 800;
  while (s.phase === "play" && guard-- > 0) {
    // Max-strength bots for sim / audit (Hard + deep search).
    s.aiDifficulty = "hard";
    applyIntent(s, chooseAiMove(s, { searchDepth: 2 }));
  }

  return {
    matchup: opts.matchup,
    seed: opts.seed,
    winner: s.winner,
    reason: s.endReason,
    turns: s.turn,
    will: [s.will, s.enemyWill],
    eclipse: [s.eclipse, s.enemyEclipse],
    stalled: s.phase === "play",
  };
}

/** 1_000 games per matchup — live craft mirrors + both-seat crosses. */
export const BOT_SIM_MATCHUPS: MatchupSpec[] = [
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

export type BotSimSummary = {
  total: number;
  finished: number;
  stalled: number;
  byMatchup: Record<
    string,
    {
      n: number;
      playerWins: number;
      enemyWins: number;
      draws: number;
      stalled: number;
      reasons: Record<string, number>;
      avgTurns: number;
    }
  >;
  overall: {
    playerWins: number;
    enemyWins: number;
    draws: number;
    reasons: Record<string, number>;
    avgTurns: number;
  };
  craftCross: Record<string, { wins: number; games: number; rate: number }>;
  results: BotMatchResult[];
};

export function summarizeBotSim(results: BotMatchResult[]): BotSimSummary {
  const byMatchup: BotSimSummary["byMatchup"] = {};
  const overallReasons: Record<string, number> = {};
  let playerWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let finished = 0;
  let stalled = 0;
  let turnSum = 0;

  for (const r of results) {
    turnSum += r.turns;
    const bucket = (byMatchup[r.matchup] ??= {
      n: 0,
      playerWins: 0,
      enemyWins: 0,
      draws: 0,
      stalled: 0,
      reasons: {},
      avgTurns: 0,
    });
    bucket.n += 1;
    bucket.avgTurns += r.turns;
    if (r.stalled) {
      stalled += 1;
      bucket.stalled += 1;
      continue;
    }
    finished += 1;
    const reason = r.reason ?? "unknown";
    overallReasons[reason] = (overallReasons[reason] ?? 0) + 1;
    bucket.reasons[reason] = (bucket.reasons[reason] ?? 0) + 1;
    if (r.winner === "player") {
      playerWins += 1;
      bucket.playerWins += 1;
    } else if (r.winner === "enemy") {
      enemyWins += 1;
      bucket.enemyWins += 1;
    } else {
      draws += 1;
      bucket.draws += 1;
    }
  }

  for (const b of Object.values(byMatchup)) {
    b.avgTurns = b.n ? b.avgTurns / b.n : 0;
  }

  const craftCross: BotSimSummary["craftCross"] = {};
  const addCross = (label: string, wins: number, games: number) => {
    const cur = (craftCross[label] ??= { wins: 0, games: 0, rate: 0 });
    cur.wins += wins;
    cur.games += games;
  };
  for (const [name, b] of Object.entries(byMatchup)) {
    const decided = b.n - b.stalled - b.draws;
    if (name === "ink_vs_motley") addCross("ink_vs_motley", b.playerWins, decided);
    if (name === "motley_vs_ink") addCross("ink_vs_motley", b.enemyWins, decided);
    if (name === "ink_vs_toll") addCross("ink_vs_toll", b.playerWins, decided);
    if (name === "toll_vs_ink") addCross("ink_vs_toll", b.enemyWins, decided);
    if (name === "motley_vs_toll") addCross("motley_vs_toll", b.playerWins, decided);
    if (name === "toll_vs_motley") addCross("motley_vs_toll", b.enemyWins, decided);
    if (name === "breach_vs_ink") addCross("breach_vs_ink", b.playerWins, decided);
    if (name === "ink_vs_breach") addCross("breach_vs_ink", b.enemyWins, decided);
    if (name === "breach_vs_motley") addCross("breach_vs_motley", b.playerWins, decided);
    if (name === "motley_vs_breach") addCross("breach_vs_motley", b.enemyWins, decided);
    if (name === "breach_vs_toll") addCross("breach_vs_toll", b.playerWins, decided);
    if (name === "toll_vs_breach") addCross("breach_vs_toll", b.enemyWins, decided);
  }
  for (const c of Object.values(craftCross)) {
    c.rate = c.games ? c.wins / c.games : 0;
  }

  return {
    total: results.length,
    finished,
    stalled,
    byMatchup,
    overall: {
      playerWins,
      enemyWins,
      draws,
      reasons: overallReasons,
      avgTurns: results.length ? turnSum / results.length : 0,
    },
    craftCross,
    results,
  };
}

export function formatBotSimSummary(summary: BotSimSummary): string {
  const lines: string[] = [];
  lines.push(`Bot-vs-bot: ${summary.finished}/${summary.total} finished (stalled ${summary.stalled})`);
  lines.push(
    `Overall — player ${summary.overall.playerWins} / enemy ${summary.overall.enemyWins} / draw ${summary.overall.draws} · avg turns ${summary.overall.avgTurns.toFixed(2)} · reasons ${JSON.stringify(summary.overall.reasons)}`,
  );
  for (const [name, b] of Object.entries(summary.byMatchup)) {
    const decided = b.n - b.stalled;
    const rate = decided > 0 ? ((b.playerWins / decided) * 100).toFixed(1) : "?";
    lines.push(
      `${name}: n=${b.n} P${b.playerWins}/E${b.enemyWins}/D${b.draws} stall=${b.stalled} playerWin%≈${rate} avgTurns=${b.avgTurns.toFixed(2)} reasons=${JSON.stringify(b.reasons)}`,
    );
  }
  lines.push("Combined craft winrates (both seats, draws excluded):");
  for (const [label, c] of Object.entries(summary.craftCross)) {
    const [a, , b] = label.split("_");
    lines.push(
      `  ${a} vs ${b}: ${a} wins ${(c.rate * 100).toFixed(1)}% (${c.wins}/${c.games})`,
    );
  }
  return lines.join("\n");
}

export function runBotSim(opts?: { matchups?: MatchupSpec[]; seedBase?: number }): BotSimSummary {
  const matchups = opts?.matchups ?? BOT_SIM_MATCHUPS;
  const results: BotMatchResult[] = [];
  let seed = opts?.seedBase ?? 1;
  for (const m of matchups) {
    for (let i = 0; i < m.count; i++) {
      results.push(
        playBotMatch({
          seed: seed++,
          player: m.player,
          enemy: m.enemy,
          matchup: m.name,
        }),
      );
    }
  }
  return summarizeBotSim(results);
}
