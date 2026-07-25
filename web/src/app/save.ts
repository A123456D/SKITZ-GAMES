import { DIFFICULTY_COUNT } from "../core/levelCatalog";
import { applyTheme, isThemeId, type ThemeId } from "../view/palette";
import { setMusicVolume } from "../audio/music";
import { setSfxVolume } from "../audio/sfx";

const KEY = "shiftr_web_save_v11";

export type SaveData = {
  unlocked: number;
  bestStars: Record<string, number>;
  bestMoves: Record<string, number>;
  theme: ThemeId;
  musicVol: number;
  sfxVol: number;
  tutorialDone: boolean;
  themePicked: boolean;
};

function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function migrateTheme(raw: unknown): ThemeId {
  return isThemeId(raw) ? raw : "paper";
}

function freshSave(firstRun: boolean): SaveData {
  return {
    unlocked: DIFFICULTY_COUNT,
    bestStars: {},
    bestMoves: {},
    theme: "paper",
    musicVol: 0.7,
    sfxVol: 0.85,
    tutorialDone: !firstRun,
    themePicked: !firstRun,
  };
}

export function applyAudioFromSave(save: SaveData): void {
  setMusicVolume(save.musicVol);
  setSfxVolume(save.sfxVol);
}

export function loadSave(): SaveData {
  try {
    const v11 = localStorage.getItem(KEY);
    if (!v11) {
      const legacy = localStorage.getItem("shiftr_web_save_v10") ?? localStorage.getItem("shiftr_web_save_v9");
      if (!legacy) {
        const fresh = freshSave(true);
        writeSave(fresh);
        applyAudioFromSave(fresh);
        return fresh;
      }
      // Migrate older saves — skip first-run tutorial/theme gate.
      const d = JSON.parse(legacy) as Partial<SaveData>;
      const save: SaveData = {
        unlocked: Math.max(d.unlocked ?? 1, DIFFICULTY_COUNT),
        bestStars: d.bestStars ?? {},
        bestMoves: d.bestMoves ?? {},
        theme: migrateTheme(d.theme),
        musicVol: clamp01(d.musicVol, 0.7),
        sfxVol: clamp01(d.sfxVol, 0.85),
        tutorialDone: true,
        themePicked: true,
      };
      writeSave(save);
      applyAudioFromSave(save);
      return save;
    }
    const d = JSON.parse(v11) as Partial<SaveData>;
    const save: SaveData = {
      unlocked: Math.max(d.unlocked ?? 1, DIFFICULTY_COUNT),
      bestStars: d.bestStars ?? {},
      bestMoves: d.bestMoves ?? {},
      theme: migrateTheme(d.theme),
      musicVol: clamp01(d.musicVol, 0.7),
      sfxVol: clamp01(d.sfxVol, 0.85),
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
  save.unlocked = Math.max(save.unlocked, levelIndex + 2, DIFFICULTY_COUNT);
  writeSave(save);
}
