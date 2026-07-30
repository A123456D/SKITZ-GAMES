import { DIFFICULTY_COUNT } from "../core/levelCatalog";
import { applyTheme, isThemeId, type ThemeId } from "../view/palette";
import { setMusicVolume } from "../audio/music";
import { setSfxVolume } from "../audio/sfx";

const KEY = "shiftr_web_save_v12";
const LEGACY_KEYS = ["shiftr_web_save_v11", "shiftr_web_save_v10", "shiftr_web_save_v9"];

/** Temporary playtest flag — opens every desk. Set false before release. */
export const UNLOCK_ALL_LEVELS = true;

export type SaveData = {
  unlocked: number;
  bestStars: Record<string, number>;
  bestMoves: Record<string, number>;
  lastLevelIndex: number;
  activeRun: ActiveRunData | null;
  theme: ThemeId;
  musicVol: number;
  sfxVol: number;
  musicMuted: boolean;
  tutorialDone: boolean;
  themePicked: boolean;
};

export type ActiveRunData = {
  levelIndex: number;
  seed: number;
  rotations: number[];
  hubs?: { x: number; y: number }[];
  width?: number;
  height?: number;
  historyRotations: number[][];
  historyHubs?: { x: number; y: number }[][];
  moves: number;
  undosRemaining: number;
  pulsesUsed: number;
  beamsVisible: boolean;
  selectedTable: number;
};

function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function clampUnlocked(n: number): number {
  return Math.max(1, Math.min(DIFFICULTY_COUNT, Math.floor(n)));
}

/**
 * How far the player may go. Cleared diffs unlock the next one.
 * Older builds forced every level open — if we see that, re-derive from clears.
 */
function unlockedFromProgress(d: Partial<SaveData>): number {
  if (UNLOCK_ALL_LEVELS) return DIFFICULTY_COUNT;
  let maxClearedIndex = -1;
  for (const id of Object.keys(d.bestStars ?? {})) {
    const m = /^diff_(\d+)$/.exec(id);
    if (m) maxClearedIndex = Math.max(maxClearedIndex, Number(m[1]) - 1);
  }
  const fromClears = maxClearedIndex >= 0 ? maxClearedIndex + 2 : 1;
  const raw = typeof d.unlocked === "number" && Number.isFinite(d.unlocked) ? d.unlocked : fromClears;
  // Previous builds wrote DIFFICULTY_COUNT into every save — treat that as "recompute".
  if (raw >= DIFFICULTY_COUNT) return clampUnlocked(fromClears);
  return clampUnlocked(Math.max(fromClears, raw));
}

function migrateTheme(raw: unknown): ThemeId {
  if (raw === "synthwave" || raw === "wave") return "retro";
  // Retired boards: vintage → cyber (mono); pastel/dusk → cyber; red/blue → ink.
  if (raw === "vintage" || raw === "pastel" || raw === "dusk") return "mono";
  if (raw === "red" || raw === "blue") return "paper";
  return isThemeId(raw) ? raw : "paper";
}

function freshSave(firstRun: boolean): SaveData {
  return {
    unlocked: UNLOCK_ALL_LEVELS ? DIFFICULTY_COUNT : 1,
    bestStars: {},
    bestMoves: {},
    lastLevelIndex: 0,
    activeRun: null,
    theme: "paper",
    musicVol: 0.7,
    sfxVol: 0.85,
    musicMuted: false,
    tutorialDone: !firstRun,
    themePicked: !firstRun,
  };
}

export function applyAudioFromSave(save: SaveData): void {
  setMusicVolume(save.musicMuted ? 0 : save.musicVol);
  setSfxVolume(save.sfxVol);
}

function readLegacyRaw(): string | null {
  for (const k of LEGACY_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

export function loadSave(): SaveData {
  try {
    const v12 = localStorage.getItem(KEY);
    if (!v12) {
      const legacy = readLegacyRaw();
      if (!legacy) {
        const fresh = freshSave(true);
        writeSave(fresh);
        applyAudioFromSave(fresh);
        return fresh;
      }
      // Migrate older saves — skip first-run tutorial/theme gate, restore real unlocks.
      const d = JSON.parse(legacy) as Partial<SaveData>;
      const save: SaveData = {
        unlocked: unlockedFromProgress(d),
        bestStars: d.bestStars ?? {},
        bestMoves: d.bestMoves ?? {},
        lastLevelIndex: Math.max(0, Number(d.lastLevelIndex) || 0),
        activeRun: null,
        theme: migrateTheme(d.theme),
        musicVol: clamp01(d.musicVol, 0.7),
        sfxVol: clamp01(d.sfxVol, 0.85),
        musicMuted: !!d.musicMuted,
        tutorialDone: true,
        themePicked: true,
      };
      writeSave(save);
      applyAudioFromSave(save);
      return save;
    }
    const d = JSON.parse(v12) as Partial<SaveData>;
    const save: SaveData = {
      unlocked: unlockedFromProgress(d),
      bestStars: d.bestStars ?? {},
      bestMoves: d.bestMoves ?? {},
      lastLevelIndex: Math.max(0, Number(d.lastLevelIndex) || 0),
      activeRun: d.activeRun && typeof d.activeRun === "object"
        ? d.activeRun as ActiveRunData
        : null,
      theme: migrateTheme(d.theme),
      musicVol: clamp01(d.musicVol, 0.7),
      sfxVol: clamp01(d.sfxVol, 0.85),
      musicMuted: !!d.musicMuted,
      tutorialDone: !!d.tutorialDone,
      themePicked: !!d.themePicked,
    };
    writeSave(save);
    applyAudioFromSave(save);
    return save;
  } catch {
    const fresh = freshSave(true);
    applyAudioFromSave(fresh);
    return fresh;
  }
}

export function writeSave(save: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function setTheme(save: SaveData, theme: ThemeId): void {
  save.theme = theme;
  save.themePicked = true;
  applyTheme(theme);
  writeSave(save);
}

export function setVolumes(save: SaveData, music: number, sfx: number): void {
  save.musicVol = clamp01(music, save.musicVol);
  save.sfxVol = clamp01(sfx, save.sfxVol);
  applyAudioFromSave(save);
  writeSave(save);
}

export function setMusicMuted(save: SaveData, muted: boolean): void {
  save.musicMuted = muted;
  applyAudioFromSave(save);
  writeSave(save);
}

const MASTER_VOL_STEPS = [0, 0.35, 0.65, 1] as const;

export function masterVolLabel(save: SaveData): string {
  if (save.musicMuted || save.musicVol <= 0.001) return "MUTED";
  if (save.musicVol < 0.5) return "LOW";
  if (save.musicVol < 0.85) return "MED";
  return "HIGH";
}

/** Cycle muted → low → med → high for music + SFX together. */
export function cycleMasterVolume(save: SaveData): string {
  const cur = save.musicMuted ? 0 : save.musicVol;
  let i = MASTER_VOL_STEPS.findIndex((s) => Math.abs(s - cur) < 0.08);
  if (i < 0) {
    i = cur <= 0.001 ? 0 : cur < 0.5 ? 1 : cur < 0.85 ? 2 : 3;
  }
  const next = MASTER_VOL_STEPS[(i + 1) % MASTER_VOL_STEPS.length]!;
  save.musicMuted = next <= 0.001;
  save.musicVol = next <= 0.001 ? 0.7 : next;
  save.sfxVol = next <= 0.001 ? 0 : next;
  applyAudioFromSave(save);
  writeSave(save);
  return masterVolLabel(save);
}

export function storeActiveRun(save: SaveData, run: ActiveRunData): void {
  save.lastLevelIndex = run.levelIndex;
  save.activeRun = run;
  writeSave(save);
}

export function clearActiveRun(save: SaveData): void {
  save.activeRun = null;
  writeSave(save);
}

export function completeTutorial(save: SaveData): void {
  save.tutorialDone = true;
  writeSave(save);
}

export function recordClear(
  save: SaveData,
  levelId: string,
  levelIndex: number,
  stars: number,
  moves: number,
): void {
  const prevS = save.bestStars[levelId] ?? 0;
  if (stars > prevS) save.bestStars[levelId] = stars;
  const prevM = save.bestMoves[levelId] ?? 9999;
  if (moves < prevM) save.bestMoves[levelId] = moves;
  save.lastLevelIndex = levelIndex;
  save.activeRun = null;
  // Unlock the next level only — never open the whole catalog at once.
  save.unlocked = clampUnlocked(Math.max(save.unlocked, levelIndex + 2));
  writeSave(save);
}
