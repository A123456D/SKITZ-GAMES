import type { BoardCard, MatchObjective, Pos } from "./types";
import { emptyBoard } from "./types";
import type { AiDifficulty } from "./ai";
import {
  applyCosmeticUnlock,
  unlockCard,
  type Cosmetics,
} from "./meta";

export type CampaignReward = {
  label: string;
  card?: string;
  beamTint?: Cosmetics["beamTint"];
  frame?: Cosmetics["frame"];
};

export type CampaignNode = {
  id: string;
  district: 1 | 2 | 3;
  title: string;
  blurb: string;
  /** Forced player faction (null = player picks). */
  faction: "volt" | "prismatic" | "void" | null;
  enemyFaction: "volt" | "prismatic" | "void";
  objective: Omit<MatchObjective, "progress">;
  /** Optional seeded enemy tiles. */
  seedBoard: Array<{ col: number; row: number; defId: string; power?: number; owner?: "player" | "enemy" }>;
  /** Opening hand override (still draws from deck after). */
  openingHand?: string[];
  /** Max rounds override. */
  maxRounds?: number;
  /** AI pressure for this node. */
  aiDifficulty: AiDifficulty;
  /** Extra energy on round 1 for the player. */
  playerEnergyBonus?: number;
  /** Extra energy on every enemy turn. */
  enemyEnergyBonus?: number;
  /** Optional play budget (null = unlimited). */
  playsLeft?: number;
  /** Short modifier chip on the map. */
  modifierLabel: string;
  reward: CampaignReward;
};

export const CAMPAIGN_NODES: CampaignNode[] = [
  {
    id: "d1_spark",
    district: 1,
    title: "Spark Gate",
    blurb: "Beat the patrol. Highest Power wins.",
    faction: "volt",
    enemyFaction: "prismatic",
    objective: { kind: "win_match", target: 1, label: "Win the match" },
    seedBoard: [{ col: 1, row: 0, defId: "n_pulse_n", power: 2 }],
    aiDifficulty: "easy",
    modifierLabel: "Training AI",
    reward: { label: "Volt beam tint", beamTint: "volt", card: "v_corner" },
  },
  {
    id: "d1_overthrow",
    district: 1,
    title: "Flip Ward",
    blurb: "Steal 2 tiles before the board locks.",
    faction: "volt",
    enemyFaction: "prismatic",
    objective: { kind: "capture_at_least", target: 2, label: "Capture 2 tiles" },
    seedBoard: [
      { col: 1, row: 2, defId: "n_pulse_n", power: 2 },
      { col: 0, row: 1, defId: "n_pulse_side", power: 2 },
    ],
    openingHand: ["v_swarm2", "v_storm", "n_pulse_n"],
    aiDifficulty: "easy",
    playerEnergyBonus: 1,
    modifierLabel: "+1 open energy · FLOOD hand",
    reward: { label: "Storm frame", frame: "storm", card: "v_storm" },
  },
  {
    id: "d1_relay",
    district: 1,
    title: "Relay Pit",
    blurb: "Survive three enemy turns with a thin play budget.",
    faction: "volt",
    enemyFaction: "void",
    objective: { kind: "survive_rounds", target: 3, label: "Reach round 3" },
    seedBoard: [
      { col: 2, row: 3, defId: "o_late1", power: 2 },
      { col: 0, row: 2, defId: "n_pulse_n", power: 2 },
    ],
    openingHand: ["v_split1", "v_edge", "n_amp"],
    maxRounds: 3,
    playsLeft: 3,
    aiDifficulty: "normal",
    enemyEnergyBonus: 1,
    modifierLabel: "3 plays · enemy +1 energy",
    reward: { label: "Arc Mite pack", card: "v_edge" },
  },
  {
    id: "d2_mirror",
    district: 2,
    title: "Glass Corridor",
    blurb: "Hold 12+ Power with Prism redirects.",
    faction: "prismatic",
    enemyFaction: "void",
    objective: { kind: "score_at_least", target: 12, label: "Reach 12 Power" },
    seedBoard: [
      { col: 2, row: 1, defId: "o_late1", power: 2 },
      { col: 0, row: 2, defId: "o_late2", power: 3 },
    ],
    openingHand: ["p_vector", "p_reflect1", "p_amp1"],
    aiDifficulty: "normal",
    modifierLabel: "REDIRECT kit",
    reward: { label: "Vector frame", frame: "vector", card: "p_vector" },
  },
  {
    id: "d2_chain",
    district: 2,
    title: "Depth Lab",
    blurb: "Push a cascade to depth 3+.",
    faction: "prismatic",
    enemyFaction: "volt",
    objective: { kind: "chain_depth", target: 3, label: "Hit chain depth 3" },
    seedBoard: [
      { col: 1, row: 1, defId: "n_pulse_cross", power: 3 },
      { col: 1, row: 2, defId: "n_pulse_n", power: 2 },
      { col: 1, row: 3, defId: "n_amp", power: 2 },
    ],
    openingHand: ["p_center1", "p_vector", "n_amp"],
    aiDifficulty: "normal",
    playerEnergyBonus: 1,
    modifierLabel: "Pre-built relay column",
    reward: { label: "Prism beam tint", beamTint: "prism", card: "p_wall" },
  },
  {
    id: "d2_siege",
    district: 2,
    title: "Hardlight Siege",
    blurb: "Capture 3 tiles against a fortified wall.",
    faction: "prismatic",
    enemyFaction: "void",
    objective: { kind: "capture_at_least", target: 3, label: "Capture 3 tiles" },
    seedBoard: [
      { col: 1, row: 0, defId: "p_wall", power: 6, owner: "enemy" },
      { col: 0, row: 1, defId: "o_late1", power: 2 },
      { col: 2, row: 1, defId: "o_late2", power: 3 },
      { col: 1, row: 2, defId: "o_siphon", power: 3 },
    ],
    openingHand: ["p_reflect2", "p_amp2", "p_vector"],
    aiDifficulty: "hard",
    playsLeft: 5,
    modifierLabel: "Hard AI · 5 plays",
    reward: { label: "Focus Core", card: "p_amp2" },
  },
  {
    id: "d3_entropy",
    district: 3,
    title: "Entropy Dock",
    blurb: "Survive 4 rounds — Void overkill keeps Power.",
    faction: "void",
    enemyFaction: "prismatic",
    objective: { kind: "survive_rounds", target: 4, label: "Reach round 4" },
    seedBoard: [{ col: 1, row: 3, defId: "p_wall", power: 4 }],
    openingHand: ["o_invert", "o_late1", "o_siphon"],
    maxRounds: 4,
    aiDifficulty: "hard",
    enemyEnergyBonus: 1,
    modifierLabel: "Hard AI · enemy +1 energy",
    reward: { label: "Invert frame", frame: "invert", card: "o_invert" },
  },
  {
    id: "d3_collapse",
    district: 3,
    title: "Core Collapse",
    blurb: "Score 18+ and seal the district.",
    faction: "void",
    enemyFaction: "volt",
    objective: { kind: "score_at_least", target: 18, label: "Reach 18 Power" },
    seedBoard: [
      { col: 0, row: 0, defId: "v_swarm1", power: 2 },
      { col: 2, row: 0, defId: "v_swarm2", power: 2 },
      { col: 1, row: 2, defId: "v_edge", power: 3 },
      { col: 1, row: 1, defId: "v_storm", power: 3 },
    ],
    openingHand: ["o_invert", "o_nuke1", "o_heavy"],
    aiDifficulty: "hard",
    playerEnergyBonus: 1,
    playsLeft: 5,
    modifierLabel: "Boss · 5 plays · +1 energy",
    reward: { label: "District seal · gold beams", beamTint: "gold", card: "o_split" },
  },
];

export function campaignNode(id: string): CampaignNode | undefined {
  return CAMPAIGN_NODES.find((n) => n.id === id);
}

export function nextCampaignNode(id: string): CampaignNode | undefined {
  const idx = CAMPAIGN_NODES.findIndex((n) => n.id === id);
  if (idx < 0 || idx >= CAMPAIGN_NODES.length - 1) return undefined;
  return CAMPAIGN_NODES[idx + 1];
}

export function buildSeedBoard(
  seeds: CampaignNode["seedBoard"],
): (BoardCard | null)[][] {
  const board = emptyBoard();
  let i = 0;
  for (const s of seeds) {
    board[s.row][s.col] = {
      instanceId: `seed_${i++}`,
      defId: s.defId,
      owner: s.owner ?? "enemy",
      power: s.power ?? 2,
      activated: false,
    };
  }
  return board;
}

export type CampaignProgress = {
  cleared: string[];
  /** Per-node star rating 1–3. */
  stars: Record<string, number>;
  unlocks: string[];
};

const PROGRESS_KEY = "cr_campaign_v2";
const LEGACY_KEY = "cr_campaign_v1";

export function loadCampaignProgress(): CampaignProgress {
  try {
    if (typeof localStorage === "undefined") {
      return { cleared: [], stars: {}, unlocks: [] };
    }
    const raw = localStorage.getItem(PROGRESS_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return { cleared: [], stars: {}, unlocks: [] };
    const parsed = JSON.parse(raw) as Partial<CampaignProgress>;
    return {
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared : [],
      stars: parsed.stars && typeof parsed.stars === "object" ? parsed.stars : {},
      unlocks: Array.isArray(parsed.unlocks) ? parsed.unlocks : [],
    };
  } catch {
    return { cleared: [], stars: {}, unlocks: [] };
  }
}

export function saveCampaignProgress(p: CampaignProgress): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Stars: 1 clear, +1 score lead ≥4, +1 chain ≥3. */
export function computeNodeStars(opts: {
  won: boolean;
  playerScore: number;
  enemyScore: number;
  maxChainDepth: number;
}): number {
  if (!opts.won) return 0;
  let stars = 1;
  if (opts.playerScore - opts.enemyScore >= 4) stars += 1;
  if (opts.maxChainDepth >= 3) stars += 1;
  return stars;
}

export function markNodeCleared(
  nodeId: string,
  opts?: { stars?: number },
): CampaignProgress {
  const p = loadCampaignProgress();
  if (!p.cleared.includes(nodeId)) p.cleared.push(nodeId);
  const stars = opts?.stars ?? 1;
  p.stars[nodeId] = Math.max(p.stars[nodeId] ?? 0, stars);
  const node = campaignNode(nodeId);
  if (node) {
    if (!p.unlocks.includes(node.reward.label)) p.unlocks.push(node.reward.label);
    if (node.reward.card) unlockCard(node.reward.card);
    if (node.reward.beamTint || node.reward.frame) {
      applyCosmeticUnlock({
        beamTint: node.reward.beamTint,
        frame: node.reward.frame,
      });
    }
  }
  saveCampaignProgress(p);
  return p;
}

export function isNodeUnlocked(nodeId: string, progress: CampaignProgress): boolean {
  const idx = CAMPAIGN_NODES.findIndex((n) => n.id === nodeId);
  if (idx <= 0) return true;
  const prev = CAMPAIGN_NODES[idx - 1];
  return progress.cleared.includes(prev.id);
}

export function nodeStars(nodeId: string, progress: CampaignProgress): number {
  if (progress.stars[nodeId]) return progress.stars[nodeId];
  return progress.cleared.includes(nodeId) ? 1 : 0;
}

export function totalCampaignStars(progress: CampaignProgress): number {
  return CAMPAIGN_NODES.reduce((sum, n) => sum + nodeStars(n.id, progress), 0);
}

/** Place helper for typed seeds. */
export function seedPos(col: number, row: number): Pos {
  return { col, row };
}
