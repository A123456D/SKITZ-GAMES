import { newGame } from "./core/board";
import type { Color, GameState, Square } from "./core/types";
import { beginTurn, doAbilityPhase, doMovePhase, endTurn, skipAbility } from "./core/turn";
import { aiPlayAsync, aiThinkDelay, type AiDifficulty } from "./core/ai";
import {
  loadProfile,
  recordAiGame,
  setPlayerElo,
  clampElo,
  eloToDifficulty,
  OPPONENT_ELO_OPTIONS,
  ELO_STEP,
  ELO_MIN,
  ELO_MAX,
  type EloProfile,
  type EloResult,
} from "./core/elo";
import {
  loadMatch,
  saveMatch,
  clearMatch,
  loadPrefs,
  savePrefs,
  type PlayerPrefs,
} from "./core/save";
import {
  layout,
  drawBoard,
  drawHud,
  drawAbilityConfirm,
  drawToast,
  squareScreenPos,
  loadLogo,
  loadNexusMark,
  loadAbilityIcons,
  getLogoImage,
  getNexusMarkImage,
  type DrawCtx,
  type ButtonRect,
} from "./view/draw";
import {
  createUiState,
  handleClick,
  applySelect,
  applyAbilityPrompt,
  applyAbilitySelect,
  canAffordAbility,
  clearUi,
  makeAbilityCast,
  type UiState,
} from "./view/input";
import { ABILITY_INFO } from "./core/abilities";
import type { Ability } from "./core/types";
import { isInNexus } from "./core/board";
import {
  drawMoveAnim,
  drawCaptureFlash,
  drawWinCinematic,
  createBoardFx,
  updateBoardFx,
  drawBoardFx,
  spawnLandFx,
  type MoveAnim,
  type CaptureFlash,
  type BoardFx,
  type WinFx,
} from "./view/anim";
import {
  unlockAudio,
  loadSfx,
  reloadSfxForTheme,
  playMoveLift,
  playMoveLand,
  playCapture,
  playUiTap,
  playAbility,
  playSelect,
  playWin,
  playLose,
} from "./view/sfx";
import {
  drawHome,
  drawHub,
  drawSetElo,
  drawAiSelect,
  drawHowTo,
  drawResult,
  hitMenuButton,
  setMenuLogo,
  type Screen,
  type PlayMode,
} from "./view/menu";
import { initTheme, applyTheme, Theme, nextThemeId } from "./view/theme";
import { loadThemePieces } from "./view/pieces";
import { loadThemeArt } from "./view/fx";
import {
  isTutorialCompleted,
  setTutorialCompleted,
  nextStepId,
  stepById,
  type TutorialStepId,
} from "./core/tutorial";
import { drawTutorialCoach, resolveCoachTarget } from "./view/tutorialDraw";

initTheme();

const canvas = document.getElementById("game") as HTMLCanvasElement;

let screen: Screen = "home";
let playMode: PlayMode = "ai";
let aiDifficulty: AiDifficulty = 2;
let prefs: PlayerPrefs = loadPrefs();
let opponentElo = prefs.lastOpponentElo;
let playerColor: Color = prefs.playerColor;
let draftPlayerElo = 1200;
let profile: EloProfile = loadProfile();
let lastEloResult: EloResult | null = null;

let state: GameState = beginTurn(newGame());
let ui: UiState = createUiState();
let buttons: ButtonRect[] = [];
let dc: DrawCtx = layout(canvas);
let moveAnim: MoveAnim | null = null;
let captureFlash: CaptureFlash | null = null;
let boardFx: BoardFx = createBoardFx();
let lastFrame = performance.now();
let animEndTimer: ReturnType<typeof setTimeout> | null = null;
let moveSeqLock = false;
let aiPending = false;
let eloRecorded = false;
let lastMove: { from: Square; to: Square } | null = null;
let toast: { text: string; start: number; duration: number } | null = null;
let canResume = !!loadMatch();
let winFx: WinFx | null = null;

/** First-run interactive tutorial */
let tutorialActive = !isTutorialCompleted();
let tutorialStep: TutorialStepId = "welcome";

function finishTutorial() {
  tutorialActive = false;
  tutorialStep = "done";
  setTutorialCompleted();
  showToast("You're ready — hold the Nexus!");
  if (screen === "play" && state.turnPhase === "resolved" && !state.winner) {
    state = endTurn(state);
    persistMatch();
    if (state.winner) finishIfWon();
    else maybeAiTurn();
  }
}

function advanceTutorial() {
  if (!tutorialActive) return;
  const next = nextStepId(tutorialStep, { hasSetRating: profile.hasSetRating });
  if (next === "done") {
    finishTutorial();
    return;
  }
  tutorialStep = next;
  if (tutorialStep === "start") {
    opponentElo = 400;
    playerColor = "w";
    persistPrefs();
  }
  if (tutorialStep === "color") {
    playerColor = "w";
    persistPrefs();
  }
}

function tutorialAllowsMenuId(id: string): boolean {
  if (!tutorialActive) return true;
  if (id === "tutorial-skip" || id === "tutorial-gotit") return true;
  const step = stepById(tutorialStep);
  if (!step) return true;
  // Elo screen: allow presets / ± while pointing at Continue
  if (tutorialStep === "rating") {
    return (
      id === "elo-save" ||
      id.startsWith("elo-preset-") ||
      id === "elo-minus" ||
      id === "elo-plus"
    );
  }
  if (step.buttonId) return id === step.buttonId;
  if (step.acknowledge) return id === "tutorial-gotit";
  return false;
}

function showToast(text: string, duration = 1800) {
  toast = { text, start: performance.now(), duration };
}

function abilityToast(ability: Ability, square: Square) {
  const info = ABILITY_INFO[ability];
  if (ability === "aegis") showToast(`${info.name} · ${square} shielded`);
  else if (ability === "overdrive") showToast(`${info.name} · ${square} can move twice`);
  else showToast(`${info.name} · king swapped with ${square}`);
}

const PIECE_CHARS: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

function boardFlipped(): boolean {
  if (playMode === "ai") return playerColor === "b";
  return state.activeColor === "b";
}

function modeLabel(): string {
  if (playMode === "local") return "Local";
  const side = playerColor === "w" ? "W" : "B";
  return `${side} vs ${opponentElo}`;
}

function nearestOppOption(elo: number): number {
  let best: number = OPPONENT_ELO_OPTIONS[0];
  let bestDist = Math.abs(elo - best);
  for (const o of OPPONENT_ELO_OPTIONS) {
    const d = Math.abs(elo - o);
    if (d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}

function persistPrefs() {
  prefs = { playerColor, lastOpponentElo: opponentElo };
  savePrefs(prefs);
}

function persistMatch() {
  if (screen !== "play" && screen !== "hub") return;
  if (state.winner) {
    clearMatch();
    canResume = false;
    return;
  }
  saveMatch({
    playMode,
    opponentElo,
    playerColor,
    eloRecorded,
    lastMove,
    state,
  });
  canResume = true;
}

function openHub() {
  profile = loadProfile();
  if (!profile.hasSetRating) {
    draftPlayerElo = profile.rating;
    screen = "setElo";
    return;
  }
  canResume = !!loadMatch();
  screen = "hub";
}

function startMatch(mode: PlayMode, oppElo = opponentElo, color: Color = playerColor) {
  playMode = mode;
  opponentElo = clampElo(oppElo);
  playerColor = mode === "ai" ? color : "w";
  aiDifficulty = mode === "ai" ? eloToDifficulty(opponentElo) : 0;
  persistPrefs();
  clearMatch();
  canResume = false;
  state = beginTurn(newGame());
  ui = clearUi();
  moveAnim = null;
  captureFlash = null;
  winFx = null;
  boardFx = createBoardFx();
  if (animEndTimer) {
    clearTimeout(animEndTimer);
    animEndTimer = null;
  }
  moveSeqLock = false;
  aiPending = false;
  eloRecorded = false;
  lastEloResult = null;
  lastMove = null;
  screen = "play";
  persistMatch();
  // Tutorial: skip ability phase so the first lesson is a simple pawn move
  if (tutorialActive && state.turnPhase === "ability") {
    state = skipAbility(state);
  }
  maybeAiTurn();
}

function resumeMatch(): boolean {
  const saved = loadMatch();
  if (!saved) {
    canResume = false;
    return false;
  }
  playMode = saved.playMode;
  opponentElo = saved.opponentElo;
  playerColor = saved.playerColor;
  aiDifficulty = playMode === "ai" ? eloToDifficulty(opponentElo) : 0;
  state = saved.state;
  eloRecorded = saved.eloRecorded;
  lastMove = saved.lastMove;
  lastEloResult = null;
  ui = clearUi();
  moveAnim = null;
  captureFlash = null;
  winFx = null;
  boardFx = createBoardFx();
  if (animEndTimer) {
    clearTimeout(animEndTimer);
    animEndTimer = null;
  }
  moveSeqLock = false;
  aiPending = false;
  screen = "play";
  canResume = true;
  persistPrefs();
  maybeAiTurn();
  return true;
}

function goHome() {
  screen = "home";
  aiPending = false;
  ui = clearUi();
  profile = loadProfile();
}

function goToResultScreen() {
  if (!state.winner) return;
  if (!eloRecorded && playMode === "ai") {
    const { profile: next, result } = recordAiGame(
      profile,
      opponentElo,
      state.winner,
      playerColor,
    );
    profile = next;
    lastEloResult = result;
    eloRecorded = true;
  }
  clearMatch();
  canResume = false;
  screen = "result";
}

function finishIfWon() {
  if (!state.winner || screen !== "play") return;
  if (winFx) return;
  winFx = { start: performance.now(), duration: 2400, winner: state.winner };
  if (playMode === "ai" && state.winner !== playerColor) playLose();
  else playWin();
}

function isAiSideToMove(): boolean {
  return playMode === "ai" && aiDifficulty !== 0 && state.activeColor !== playerColor;
}

function maybeAiTurn() {
  if (tutorialActive && (tutorialStep === "select" || tutorialStep === "move" || tutorialStep === "nexus")) {
    return;
  }
  if (!isAiSideToMove() || state.winner || aiPending || screen !== "play" || winFx) return;
  if (moveAnim) return;
  aiPending = true;
  const difficulty = aiDifficulty;
  const delay = aiThinkDelay(difficulty);
  setTimeout(() => {
    void (async () => {
      if (screen !== "play" || state.winner || !isAiSideToMove() || winFx) {
        aiPending = false;
        return;
      }
      try {
        const beforeCount = state.board.size;
        const result = await aiPlayAsync(state, difficulty);
        if (screen !== "play" || winFx) return;
        state = result.state;
        if (result.lastMove) {
          lastMove = { from: result.lastMove.from, to: result.lastMove.to };
          const captured =
            result.state.board.size < beforeCount || !!result.lastMove.isEnPassant;
          if (captured) playCapture();
          else playMoveLand();
        }
        ui = clearUi();
        persistMatch();
        finishIfWon();
      } catch (err) {
        console.error("AI turn failed", err);
        if (isAiSideToMove() && !state.winner) {
          if (state.turnPhase === "ability") state = skipAbility(state);
          state = endTurn({
            ...state,
            turnPhase: "resolved",
            overdriveSquare: null,
            overdriveMovesLeft: 0,
          });
          persistMatch();
        }
      } finally {
        aiPending = false;
      }
      if (screen === "play" && !state.winner && !winFx && isAiSideToMove()) {
        setTimeout(() => maybeAiTurn(), 0);
      }
    })();
  }, delay);
}

function finishMoveSequence() {
  if (moveSeqLock) return;
  moveSeqLock = true;
  try {
    if (animEndTimer) {
      clearTimeout(animEndTimer);
      animEndTimer = null;
    }
    const hadAnim = !!moveAnim;
    moveAnim = null;
    if (!hadAnim && state.turnPhase !== "resolved") return;
    if (state.winner) {
      finishIfWon();
      return;
    }
    if (state.turnPhase === "resolved") {
      if (tutorialActive && tutorialStep === "nexus") {
        persistMatch();
        return;
      }
      state = endTurn(state);
      persistMatch();
      if (state.winner) finishIfWon();
      else maybeAiTurn();
    }
  } finally {
    moveSeqLock = false;
  }
}

function pointerToCanvas(e: PointerEvent): { px: number; py: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = dc.width / Math.max(1, rect.width);
  const scaleY = dc.height / Math.max(1, rect.height);
  return {
    px: (e.clientX - rect.left) * scaleX,
    py: (e.clientY - rect.top) * scaleY,
  };
}

function onMenuClick(id: string) {
  if (id === "tutorial-skip") {
    finishTutorial();
    return;
  }
  if (id === "tutorial-gotit") {
    if (tutorialActive && tutorialStep === "nexus") advanceTutorial();
    return;
  }
  if (tutorialActive && !tutorialAllowsMenuId(id)) return;

  if (id === "home-play") {
    openHub();
    if (tutorialActive && tutorialStep === "welcome") advanceTutorial();
    return;
  }
  if (id === "hub-home") {
    if (tutorialActive) return;
    goHome();
    return;
  }
  if (id === "hub-resume") {
    if (tutorialActive) return;
    if (!resumeMatch()) openHub();
    return;
  }
  if (id === "hub-board" || id === "hub-theme") {
    if (tutorialActive) return;
    const next = nextThemeId(Theme.id);
    applyTheme(next);
    void loadThemeArt();
    void loadThemePieces();
    reloadSfxForTheme();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", Theme.bg);
    return;
  }
  if (id === "hub-setelo") {
    if (tutorialActive) return;
    draftPlayerElo = profile.rating;
    screen = "setElo";
    return;
  }
  if (id.startsWith("elo-preset-")) {
    draftPlayerElo = Number(id.slice("elo-preset-".length));
    return;
  }
  if (id === "elo-minus") {
    draftPlayerElo = clampElo(draftPlayerElo - ELO_STEP);
    return;
  }
  if (id === "elo-plus") {
    draftPlayerElo = clampElo(draftPlayerElo + ELO_STEP);
    return;
  }
  if (id === "elo-save") {
    profile = setPlayerElo(profile, draftPlayerElo);
    screen = "hub";
    if (tutorialActive && tutorialStep === "rating") advanceTutorial();
    return;
  }
  if (id === "menu-vsai") {
    opponentElo = tutorialActive
      ? 400
      : nearestOppOption(prefs.lastOpponentElo || profile.rating);
    playerColor = tutorialActive ? "w" : prefs.playerColor;
    screen = "aiSelect";
    if (tutorialActive && tutorialStep === "hub") advanceTutorial();
    return;
  }
  if (id === "menu-local") {
    if (tutorialActive) return;
    startMatch("local");
    return;
  }
  if (id === "menu-how") {
    if (tutorialActive) return;
    screen = "how";
    return;
  }
  if (id === "menu-back") {
    if (tutorialActive) return;
    screen = "hub";
    return;
  }
  if (id === "color-w") {
    playerColor = "w";
    persistPrefs();
    if (tutorialActive && tutorialStep === "color") advanceTutorial();
    return;
  }
  if (id === "color-b") {
    if (tutorialActive) return;
    playerColor = "b";
    persistPrefs();
    return;
  }
  if (id === "opp-minus") {
    if (tutorialActive) return;
    opponentElo = clampElo(Math.max(ELO_MIN, opponentElo - ELO_STEP));
    return;
  }
  if (id === "opp-plus") {
    if (tutorialActive) return;
    opponentElo = clampElo(Math.min(ELO_MAX, opponentElo + ELO_STEP));
    return;
  }
  if (id.startsWith("opp-") && id !== "opp-start" && id !== "opp-minus" && id !== "opp-plus") {
    if (tutorialActive) return;
    opponentElo = Number(id.slice(4));
    return;
  }
  if (id === "opp-start") {
    if (tutorialActive) {
      opponentElo = 400;
      playerColor = "w";
    }
    startMatch("ai", opponentElo, playerColor);
    if (tutorialActive && tutorialStep === "start") advanceTutorial();
    return;
  }
  if (id === "result-rematch") {
    startMatch(playMode, opponentElo, playerColor);
    return;
  }
  if (id === "result-menu") {
    openHub();
  }
}

function onPointer(e: PointerEvent) {
  unlockAudio();
  if (moveAnim) return;
  // button is 0 for primary click; -1 can appear on some synthetic pointer events
  if (e.button !== undefined && e.button !== 0 && e.button !== -1) return;
  e.preventDefault();

  const { px, py } = pointerToCanvas(e);

  if (screen !== "play") {
    const id = hitMenuButton(buttons, px, py);
    if (id) {
      playUiTap();
      onMenuClick(id);
    }
    return;
  }

  // Tutorial chrome (Skip / Got it) works even during AI think
  {
    const tid = hitMenuButton(buttons, px, py);
    if (tid === "tutorial-skip" || tid === "tutorial-gotit") {
      playUiTap();
      onMenuClick(tid);
      return;
    }
  }

  // During AI think / win cinematic, only allow opening the menu
  if (aiPending || isAiSideToMove() || winFx) {
    if (tutorialActive) return;
    const flipped = boardFlipped();
    const result = handleClick(ui, state, dc, buttons, px, py, flipped);
    if (result.type === "menu") {
      persistMatch();
      playUiTap();
      winFx = null;
      openHub();
    }
    return;
  }

  const flipped = boardFlipped();
  const result = handleClick(ui, state, dc, buttons, px, py, flipped);

  // Tutorial: only the pointed square / Got it
  if (tutorialActive) {
    if (result.type === "menu") return;
    if (tutorialStep === "select") {
      if (result.type === "select" && result.square === "e2") {
        if (state.turnPhase === "ability") state = skipAbility(state);
        ui = applySelect(clearUi(), state, "e2");
        persistMatch();
        advanceTutorial();
      } else if (result.type === "selectAfterSkip" && result.square === "e2") {
        state = skipAbility(state);
        ui = applySelect(clearUi(), state, "e2");
        persistMatch();
        advanceTutorial();
      }
      return;
    }
    if (tutorialStep === "move") {
      if (result.type === "move" && result.move?.from === "e2" && result.move.to === "e4") {
        // fall through to normal move handling, then advance after applying
      } else if (result.type === "select" && result.square === "e2") {
        ui = applySelect(ui, state, "e2");
        return;
      } else {
        return;
      }
    }
    if (tutorialStep === "nexus") {
      // only Got it / Skip (handled above)
      return;
    }
  }

  switch (result.type) {
    case "menu":
      if (tutorialActive) return;
      persistMatch();
      openHub();
      break;

    case "skip":
      if (tutorialActive && (tutorialStep === "select" || tutorialStep === "move")) {
        state = skipAbility(state);
        ui = clearUi();
        persistMatch();
        playUiTap();
        break;
      }
      state = skipAbility(state);
      ui = clearUi();
      persistMatch();
      playUiTap();
      break;

    case "selectAfterSkip":
      state = skipAbility(state);
      if (result.square) ui = applySelect(ui, state, result.square);
      else ui = clearUi();
      persistMatch();
      break;

    case "ability":
      if (result.ability) {
        ui = applyAbilityPrompt(ui, result.ability);
        playUiTap();
      }
      break;

    case "abilityConfirm":
      if (ui.pendingAbility && canAffordAbility(state, ui.pendingAbility)) {
        ui = applyAbilitySelect(ui, state, ui.pendingAbility);
        playUiTap();
        if (ui.abilityTargetSquares.length === 0) {
          showToast("No valid targets");
          ui = clearUi();
        }
      } else if (ui.pendingAbility) {
        showToast(`Need ${ABILITY_INFO[ui.pendingAbility].cost} mana`);
        playUiTap();
      }
      break;

    case "abilityCancel":
      ui = clearUi();
      playUiTap();
      break;

    case "abilityTarget":
      if (result.ability && result.square) {
        state = doAbilityPhase(state, makeAbilityCast(result.ability, result.square));
        abilityToast(result.ability, result.square);
        playAbility();
        if (state.overdriveSquare) {
          ui = applySelect(clearUi(), state, state.overdriveSquare);
        } else {
          ui = clearUi();
        }
        persistMatch();
      }
      break;

    case "select":
      if (result.square) {
        ui = applySelect(ui, state, result.square);
        playSelect();
      }
      break;

    case "deselect":
      ui = clearUi();
      break;

    case "move":
      if (result.move) {
        const hadPiece = state.board.has(result.move.to);
        const nexusCap = hadPiece && isInNexus(result.move.to);
        const [fromX, fromY] = squareScreenPos(dc, result.move.from, flipped);
        const [toX, toY] = squareScreenPos(dc, result.move.to, flipped);
        const piece = state.board.get(result.move.from);
        const moveMs = hadPiece ? 420 : 360;
        lastMove = { from: result.move.from, to: result.move.to };
        moveSeqLock = false;

        if (piece) {
          moveAnim = {
            fromX,
            fromY,
            toX,
            toY,
            startTime: performance.now(),
            duration: moveMs,
            piece: PIECE_CHARS[piece.color + piece.kind] || "?",
            color: piece.color,
            kind: piece.kind,
            toSq: result.move.to,
            isCapture: hadPiece,
            landed: false,
          };
          playMoveLift();
        }

        if (hadPiece) {
          captureFlash = {
            x: toX,
            y: toY,
            size: dc.cellSize,
            startTime: performance.now() + moveMs * 0.82,
            duration: nexusCap ? 420 : 280,
            nexus: nexusCap,
          };
        }

        state = doMovePhase(state, result.move);
        ui = clearUi();
        persistMatch();

        if (tutorialActive && tutorialStep === "move" && result.move.from === "e2" && result.move.to === "e4") {
          advanceTutorial();
        }

        if (animEndTimer) clearTimeout(animEndTimer);
        animEndTimer = setTimeout(() => {
          finishMoveSequence();
        }, moveMs + 80);
      }
      break;
  }
}

canvas.addEventListener("pointerdown", onPointer, { passive: false });
// iOS Safari sometimes synthesizes only touch events in edge cases — mirror to pointer path
canvas.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function relayout() {
  dc = layout(canvas, dc);
}

window.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("resize", relayout);
window.visualViewport?.addEventListener("scroll", relayout);

function frame(now: number) {
  const dt = Math.min(48, now - lastFrame);
  lastFrame = now;
  relayout();
  const time = now / 1000;
  buttons.length = 0;

  if (screen === "home") {
    drawHome(dc, buttons, time);
  } else if (screen === "hub") {
    drawHub(dc, buttons, profile, time, { canResume });
  } else if (screen === "setElo") {
    drawSetElo(dc, buttons, profile, draftPlayerElo, time);
  } else if (screen === "aiSelect") {
    drawAiSelect(dc, buttons, profile, opponentElo, playerColor, time);
  } else if (screen === "how") {
    drawHowTo(dc, buttons, time);
  } else if (screen === "result") {
    drawResult(dc, buttons, {
      winner: state.winner ?? "w",
      mode: playMode,
      playerColor,
      elo: lastEloResult,
      opponentElo,
    }, time);
  } else {
    const flipped = boardFlipped();
    const hideSq = (moveAnim?.toSq as Square | undefined) ?? null;
    drawBoard(
      dc,
      state,
      time,
      ui.selected,
      ui.legalMoves,
      ui.abilityTargetSquares,
      ui.activeAbility,
      flipped,
      hideSq,
      lastMove,
    );

    updateBoardFx(boardFx, dt, now);
    drawBoardFx(dc.ctx, boardFx, now);

    if (moveAnim) {
      const { alive, justLanded } = drawMoveAnim(dc.ctx, moveAnim, now, dc.cellSize);
      if (justLanded) {
        const nexusCap = !!(moveAnim.isCapture && moveAnim.toSq && isInNexus(moveAnim.toSq as Square));
        spawnLandFx(
          boardFx,
          moveAnim.toX,
          moveAnim.toY,
          dc.cellSize,
          now,
          !!moveAnim.isCapture,
          nexusCap,
        );
        if (moveAnim.isCapture) playCapture();
        else playMoveLand();
      }
      if (!alive) {
        finishMoveSequence();
      }
    }

    if (captureFlash) {
      const alive = drawCaptureFlash(dc.ctx, captureFlash, now);
      if (!alive) captureFlash = null;
    }

    if (!winFx) {
      drawHud(dc, state, buttons, modeLabel(), ui.pendingAbility ?? ui.activeAbility);

      if (ui.mode === "abilityConfirm" && ui.pendingAbility) {
        drawAbilityConfirm(
          dc,
          buttons,
          ui.pendingAbility,
          canAffordAbility(state, ui.pendingAbility),
        );
      }

      drawToast(dc, toast, now);
      if (toast && now - toast.start > toast.duration) toast = null;
    }

    if (winFx) {
      drawWinCinematic(dc.ctx, dc.width, dc.height, winFx, now, getNexusMarkImage());
      if (now - winFx.start >= winFx.duration) {
        winFx = null;
        goToResultScreen();
      }
    }
  }

  if (tutorialActive) {
    const step = stepById(tutorialStep);
    if (step) {
      const flipped = boardFlipped();
      const target = resolveCoachTarget(dc, step, buttons, flipped);
      drawTutorialCoach(dc, buttons, step, target, time);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
void loadLogo().then((img) => setMenuLogo(img ?? getLogoImage()));
void loadThemePieces();
void loadThemeArt();
void loadNexusMark();
void loadAbilityIcons();
void loadSfx();
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", Theme.bg);
