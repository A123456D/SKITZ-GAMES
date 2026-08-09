import type { MatchState } from "../core/types";

const PROGRESS_KEY = "oculum.progress.v1";
const PROGRESS_VERSION = 1;

export type SavedProgress = {
  v: number;
  match: MatchState | null;
  /** UI targeting mode when the match was saved */
  mode: string | null;
  selectedHand: number | null;
  lastConstructedDeck: string[] | null;
  tutorialCompleted: boolean;
  savedAt: number;
};

function emptyProgress(): SavedProgress {
  return {
    v: PROGRESS_VERSION,
    match: null,
    mode: null,
    selectedHand: null,
    lastConstructedDeck: null,
    tutorialCompleted: false,
    savedAt: 0,
  };
}

function cloneMatch(state: MatchState): MatchState {
  const copy = JSON.parse(JSON.stringify(state)) as MatchState;
  copy.events = [];
  return copy;
}

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    if (parsed.v !== PROGRESS_VERSION) return emptyProgress();
    return {
      ...emptyProgress(),
      ...parsed,
      v: PROGRESS_VERSION,
      match: parsed.match ?? null,
      mode: parsed.mode ?? null,
      selectedHand: parsed.selectedHand ?? null,
      lastConstructedDeck: Array.isArray(parsed.lastConstructedDeck)
        ? parsed.lastConstructedDeck
        : null,
      tutorialCompleted: !!parsed.tutorialCompleted,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return emptyProgress();
  }
}

function writeProgress(p: SavedProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* quota / private mode */
  }
}

export function hasResumableMatch(p: SavedProgress = loadProgress()): boolean {
  const m = p.match;
  return !!m && m.phase === "play" && m.winner == null && !m.tutorial;
}

/** Tutorial mid-run is also resumable (First Gaze). */
export function hasResumableTutorial(p: SavedProgress = loadProgress()): boolean {
  const m = p.match;
  return !!m && m.phase === "play" && m.winner == null && !!m.tutorial && m.tutorialStep !== "done";
}

export function canContinue(p: SavedProgress = loadProgress()): boolean {
  return hasResumableMatch(p) || hasResumableTutorial(p);
}

export function saveMatchProgress(
  state: MatchState,
  opts?: { mode?: string; selectedHand?: number | null },
): void {
  if (state.phase !== "play" || state.winner != null) return;
  const prev = loadProgress();
  writeProgress({
    ...prev,
    match: cloneMatch(state),
    mode: opts?.mode ?? prev.mode,
    selectedHand: opts?.selectedHand !== undefined ? opts.selectedHand : prev.selectedHand,
    savedAt: Date.now(),
  });
}

export function clearMatchProgress(): void {
  const prev = loadProgress();
  writeProgress({
    ...prev,
    match: null,
    mode: null,
    selectedHand: null,
    savedAt: Date.now(),
  });
}

export function saveLastConstructedDeck(deck: string[] | null): void {
  const prev = loadProgress();
  writeProgress({
    ...prev,
    lastConstructedDeck: deck ? [...deck] : null,
    savedAt: Date.now(),
  });
}

export function markTutorialCompleted(): void {
  const prev = loadProgress();
  writeProgress({
    ...prev,
    tutorialCompleted: true,
    savedAt: Date.now(),
  });
}
