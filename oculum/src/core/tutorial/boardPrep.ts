import type { BoardUnit, MatchState } from "../types";
import { START_WILL } from "../types";

export function clearBoardForLesson(state: MatchState): void {
  for (const slot of state.altitudes) {
    slot.player = null;
    slot.enemy = null;
    slot.playerSite = null;
    slot.enemySite = null;
    slot.blinded = false;
  }
  state.tollOwner = [null, null, null];
  state.pealArmed = [false, false, false];
  state.passed = { player: false, enemy: false };
  state.pressUsed = { player: false, enemy: false };
  state.wagerUsed = { player: false, enemy: false };
  state.pealUsed = { player: false, enemy: false };
  state.stanceUsed = { player: false, enemy: false };
}

export function mintTutorUnit(cardId: string, opts: Partial<BoardUnit> = {}): BoardUnit {
  return {
    instanceId: `tut-${cardId}-${Math.random().toString(36).slice(2, 7)}`,
    cardId,
    veiled: true,
    hybridSite: false,
    stanceB: false,
    grafts: [],
    inhabitant: null,
    hasThirdFace: false,
    strained: false,
    stained: false,
    revelationFired: false,
    scrutiny: 0,
    wagered: false,
    wagerAntePaid: false,
    wagerAnteFavor: false,
    openedSinceResolve: false,
    lastBreachOpened: false,
    pressed: false,
    pressedBy: null,
    ...opts,
  };
}

export function resetDemoSeats(state: MatchState): void {
  clearBoardForLesson(state);
  state.hand = [];
  state.enemyHand = [];
  state.essence = 6;
  state.enemyEssence = 6;
  state.sight = 5;
  state.enemySight = 5;
  state.favor = 2;
  state.enemyFavor = 2;
  state.eclipse = 0;
  state.enemyEclipse = 0;
  state.will = START_WILL;
  state.enemyWill = START_WILL;
  state.active = "player";
  state.passed = { player: false, enemy: false };
  state.pressUsed = { player: false, enemy: false };
  state.wagerUsed = { player: false, enemy: false };
  state.pealUsed = { player: false, enemy: false };
  state.stanceUsed = { player: false, enemy: false };
  state.events = [];
}

export function prepBaseLesson(state: MatchState): void {
  state.active = "player";
  state.hand = [];
  state.enemyHand = [];
  state.essence = 5;
  state.enemyEssence = 5;
  state.sight = 4;
  state.enemySight = 4;
  state.will = START_WILL;
  state.enemyWill = START_WILL;
  state.eclipse = 0;
  state.enemyEclipse = 0;
  state.favor = 1;
  state.enemyFavor = 1;
  clearBoardForLesson(state);
}
