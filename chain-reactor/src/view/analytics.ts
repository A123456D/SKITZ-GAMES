/**
 * Local funnel instrumentation for Chain Reactor.
 * Aggregates stay in localStorage; nothing is sent off-device unless a
 * host page registers window.__crAnalyticsSink.
 */

export type AnalyticsEvent =
  | "session_open"
  | "tutorial_start"
  | "tutorial_complete"
  | "tutorial_skip"
  | "first_match_start"
  | "faction_pick"
  | "match_start"
  | "match_finish"
  | "rematch"
  | "pass"
  | "daily_start"
  | "campaign_start"
  | "campaign_node_clear";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export type FunnelStats = {
  sessionOpens: number;
  tutorialStarts: number;
  tutorialCompletes: number;
  tutorialSkips: number;
  matchStarts: number;
  matchFinishes: number;
  rematches: number;
  /** Matches where the player's first action was Pass. */
  turn1Passes: number;
  /** Matches where the player made at least one action (for Turn-1 Pass rate denom). */
  matchesWithFirstAction: number;
  chainDepthSum: number;
  chainDepthSamples: number;
  factionPicks: Record<string, number>;
  wins: number;
  losses: number;
  draws: number;
  lastEvents: Array<{ t: number; name: AnalyticsEvent; props?: AnalyticsProps }>;
};

const KEY = "cr_analytics_v1";
const MAX_RECENT = 40;

const emptyStats = (): FunnelStats => ({
  sessionOpens: 0,
  tutorialStarts: 0,
  tutorialCompletes: 0,
  tutorialSkips: 0,
  matchStarts: 0,
  matchFinishes: 0,
  rematches: 0,
  turn1Passes: 0,
  matchesWithFirstAction: 0,
  chainDepthSum: 0,
  chainDepthSamples: 0,
  factionPicks: {},
  wins: 0,
  losses: 0,
  draws: 0,
  lastEvents: [],
});

let enabled = true;
let stats: FunnelStats = loadStats();
/** Per-match: has the player taken their first action yet? */
let firstActionRecorded = false;

function loadStats(): FunnelStats {
  try {
    if (typeof localStorage === "undefined") return emptyStats();
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as Partial<FunnelStats>;
    return {
      ...emptyStats(),
      ...parsed,
      factionPicks: { ...(parsed.factionPicks ?? {}) },
      lastEvents: Array.isArray(parsed.lastEvents) ? parsed.lastEvents.slice(-MAX_RECENT) : [],
    };
  } catch {
    return emptyStats();
  }
}

function persist(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

export function setAnalyticsEnabled(on: boolean): void {
  enabled = on;
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export function resetMatchAnalytics(): void {
  firstActionRecorded = false;
}

export function getFunnelStats(): FunnelStats {
  return {
    ...stats,
    factionPicks: { ...stats.factionPicks },
    lastEvents: [...stats.lastEvents],
  };
}

/** Derived rates for dashboards / debugging. */
export function getFunnelRates(): {
  turn1PassRate: number | null;
  rematchRate: number | null;
  avgChainDepth: number | null;
  tutorialCompleteRate: number | null;
  factionShare: Record<string, number>;
} {
  const turn1PassRate =
    stats.matchesWithFirstAction > 0
      ? stats.turn1Passes / stats.matchesWithFirstAction
      : null;
  const rematchRate =
    stats.matchFinishes > 0 ? stats.rematches / stats.matchFinishes : null;
  const avgChainDepth =
    stats.chainDepthSamples > 0 ? stats.chainDepthSum / stats.chainDepthSamples : null;
  const tutorialCompleteRate =
    stats.tutorialStarts > 0 ? stats.tutorialCompletes / stats.tutorialStarts : null;

  const totalPicks = Object.values(stats.factionPicks).reduce((a, b) => a + b, 0);
  const factionShare: Record<string, number> = {};
  if (totalPicks > 0) {
    for (const [k, v] of Object.entries(stats.factionPicks)) {
      factionShare[k] = v / totalPicks;
    }
  }

  return { turn1PassRate, rematchRate, avgChainDepth, tutorialCompleteRate, factionShare };
}

type AnalyticsSink = (name: AnalyticsEvent, props?: AnalyticsProps) => void;

function externalSink(): AnalyticsSink | null {
  const w = window as unknown as { __crAnalyticsSink?: AnalyticsSink };
  return typeof w.__crAnalyticsSink === "function" ? w.__crAnalyticsSink : null;
}

export function track(name: AnalyticsEvent, props?: AnalyticsProps): void {
  if (!enabled) return;

  stats.lastEvents.push({ t: Date.now(), name, props });
  if (stats.lastEvents.length > MAX_RECENT) {
    stats.lastEvents = stats.lastEvents.slice(-MAX_RECENT);
  }

  switch (name) {
    case "session_open":
      stats.sessionOpens += 1;
      break;
    case "tutorial_start":
      stats.tutorialStarts += 1;
      break;
    case "tutorial_complete":
      stats.tutorialCompletes += 1;
      break;
    case "tutorial_skip":
      stats.tutorialSkips += 1;
      break;
    case "match_start":
      stats.matchStarts += 1;
      firstActionRecorded = false;
      break;
    case "match_finish": {
      stats.matchFinishes += 1;
      const depth = typeof props?.chainDepth === "number" ? props.chainDepth : 0;
      stats.chainDepthSum += depth;
      stats.chainDepthSamples += 1;
      const winner = props?.winner;
      if (winner === "player") stats.wins += 1;
      else if (winner === "enemy") stats.losses += 1;
      else if (winner === "draw") stats.draws += 1;
      break;
    }
    case "rematch":
      stats.rematches += 1;
      break;
    case "pass":
      if (props?.turn1 === true && !firstActionRecorded) {
        stats.turn1Passes += 1;
        stats.matchesWithFirstAction += 1;
        firstActionRecorded = true;
      } else if (!firstActionRecorded && props?.firstAction === true) {
        stats.matchesWithFirstAction += 1;
        firstActionRecorded = true;
      }
      break;
    case "faction_pick": {
      const f = String(props?.faction ?? "unknown");
      stats.factionPicks[f] = (stats.factionPicks[f] ?? 0) + 1;
      break;
    }
    default:
      break;
  }

  persist();

  try {
    externalSink()?.(name, props);
  } catch {
    /* ignore sink errors */
  }

  if (typeof console !== "undefined" && console.debug) {
    console.debug("[cr-analytics]", name, props ?? {});
  }
}

/** Mark a non-pass first action (play card) for Turn-1 Pass denominator. */
export function trackFirstAction(kind: "play" | "pass", round: number): void {
  if (!enabled || firstActionRecorded) return;
  if (kind === "pass" && round === 1) {
    track("pass", { turn1: true, firstAction: true, round });
    return;
  }
  if (kind === "pass") {
    track("pass", { turn1: false, firstAction: true, round });
    return;
  }
  // play
  firstActionRecorded = true;
  stats.matchesWithFirstAction += 1;
  persist();
}
