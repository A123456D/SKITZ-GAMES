import { getCard } from "./cards";
import {
  enemyLegalIntents,
  energyForTurn,
  lanePower,
  stackPower,
} from "./match";
import type { Intent, MatchState } from "./types";

/** Prefer plays that contest losing lanes; fold when ink is a clear upgrade; rip fragile threats. */
export function chooseAiMove(state: MatchState): Intent {
  const intents = enemyLegalIntents(state);
  if (intents.length === 0) return { kind: "pass" };

  let best = intents[0];
  let bestScore = -Infinity;

  for (const intent of intents) {
    const score = scoreIntent(state, intent);
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best;
}

function scoreIntent(state: MatchState, intent: Intent): number {
  switch (intent.kind) {
    case "pass":
      return -1;
    case "play": {
      const cardId = state.enemyHand[intent.handIndex];
      const def = getCard(cardId);
      const lane = state.lanes[intent.lane];
      const stacked = !!lane.enemy;
      const gain = stacked ? def.frontPower : def.frontPower;
      const playerP = lanePower(state, intent.lane, "player");
      const enemyP = lanePower(state, intent.lane, "enemy") + gain;
      let s = gain * 2;
      if (enemyP > playerP) s += 5;
      if (playerP > enemyP && enemyP + gain >= playerP) s += 8;
      if (!lane.enemy) s += 2;
      if (stacked) s += 3;
      if (def.frontKeyword === "sting") s += 2;
      if (def.frontKeyword === "glue") s += stacked ? 3 : 1;
      if (def.frontKeyword === "brace") s += 1.5;
      s += (energyForTurn(state.turn) - def.cost) * 0.2;
      return s;
    }
    case "fold": {
      const stack = state.lanes[intent.lane].enemy!;
      const before = stackPower(stack);
      const folding = stack.sticker && !stack.sticker.folded ? stack.sticker : stack.body;
      const def = getCard(folding.cardId);
      const afterBump = def.inkPower - def.frontPower;
      const playerP = lanePower(state, intent.lane, "player");
      const enemyP = before + afterBump;
      let s = afterBump * 3;
      if (enemyP > playerP) s += 4;
      if (def.frontKeyword === "flash" || def.inkKeyword === "flash") s += 3;
      if (def.inkKeyword === "sting") s += 2;
      if (def.inkKeyword === "glue") s += 1.5;
      if (def.inkKeyword === "brace") s += 1;
      // Folding is fragile — mild penalty unless glue/brace ink
      s -= def.inkKeyword === "glue" || def.inkKeyword === "brace" ? 0.5 : 1.5;
      return s;
    }
    case "rip": {
      const stack = state.lanes[intent.lane].player!;
      let s = 4;
      if (stack.sticker) s += stackPower({ body: stack.sticker }) + 3;
      else if (stack.body.folded) s += stackPower(stack) + 6;
      else s += 2;
      const playerP = lanePower(state, intent.lane, "player");
      const enemyP = lanePower(state, intent.lane, "enemy");
      if (playerP > enemyP) s += 5;
      return s;
    }
  }
}
