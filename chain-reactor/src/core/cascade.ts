import { getCard } from "./cards";
import { findFirstHit, getCell, resetActivations } from "./board";
import {
  CASCADE_DEPTH_CAP,
  cloneBoard,
  isVertical,
  listArrows,
  opposite,
  stepMultiplier,
  turnClockwise,
  turnCounterClockwise,
  type BoardCard,
  type CascadeEvent,
  type Direction,
  type Pos,
} from "./types";

type PendingFire = {
  pos: Pos;
  step: number;
  /** Incoming beam direction (for splitter/reflector/inverter). Null = planted self-fire. */
  inbound: Direction | null;
  /** Beam power override when reflecting/amplifying through. */
  inboundPower: number | null;
};

function uniqueDirs(dirs: Direction[]): Direction[] {
  const seen = new Set<Direction>();
  const out: Direction[] = [];
  for (const d of dirs) {
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

/**
 * Resolve a cascade starting from a planted card at `origin`.
 * Mutates a cloned board; returns events + resulting board.
 */
export function resolveCascade(
  boardIn: (BoardCard | null)[][],
  origin: Pos,
  firerOwner: "player" | "enemy",
): { board: (BoardCard | null)[][]; events: CascadeEvent[] } {
  const board = cloneBoard(boardIn);
  resetActivations(board);
  const events: CascadeEvent[] = [];
  const queue: PendingFire[] = [{ pos: origin, step: 1, inbound: null, inboundPower: null }];
  const originCard = getCell(board, origin);
  const voidCascade = originCard ? getCard(originCard.defId).faction === "void" : false;

  while (queue.length > 0) {
    const job = queue.shift()!;
    if (job.step > CASCADE_DEPTH_CAP) continue;

    const card = getCell(board, job.pos);
    if (!card) continue;
    if (card.activated) continue;

    card.activated = true;
    const def = getCard(card.defId);
    const basePower = job.inboundPower ?? card.power;
    const beamPower = Math.round(basePower * stepMultiplier(job.step));

    let outDirs: Direction[] = [];
    let reflectBonus = 3;

    if (job.inbound && (def.node === "splitter" || def.sigil === "flood")) {
      const splitDirs: Direction[] = isVertical(job.inbound)
        ? ["left", "right"]
        : ["up", "down"];
      // Volt Flood: splitters (and Storm Grid) also keep printed arrows.
      const flood =
        def.sigil === "flood" ||
        (def.faction === "volt" && def.node === "splitter");
      outDirs = flood
        ? uniqueDirs([...splitDirs, ...listArrows(def.arrows)])
        : splitDirs;
      events.push({
        type: "split",
        pos: job.pos,
        fromDir: job.inbound,
        toDirs: outDirs,
      });
    } else if (job.inbound && (def.node === "reflector" || def.sigil === "redirect")) {
      let bent: Direction;
      if (def.sigil === "redirect" || def.node === "inverter") {
        bent = opposite(job.inbound);
        reflectBonus = 5;
      } else {
        bent =
          def.reflectClockwise === false
            ? turnCounterClockwise(job.inbound)
            : turnClockwise(job.inbound);
        // Prismatic Order: stronger redirects on their glass.
        if (def.faction === "prismatic") reflectBonus = 5;
      }
      outDirs = [bent];
      events.push({
        type: "reflect",
        pos: job.pos,
        fromDir: job.inbound,
        toDirs: outDirs,
        bonus: reflectBonus,
      });
    } else if (job.inbound && def.node === "inverter") {
      outDirs = [opposite(job.inbound)];
      reflectBonus = 5;
      events.push({
        type: "reflect",
        pos: job.pos,
        fromDir: job.inbound,
        toDirs: outDirs,
        bonus: reflectBonus,
      });
    } else {
      outDirs = listArrows(def.arrows);
    }

    events.push({
      type: "fire",
      pos: job.pos,
      arrows: outDirs,
      step: job.step,
      power: beamPower,
    });

    for (const dir of outDirs) {
      let power = beamPower;
      if (
        (def.node === "reflector" || def.node === "inverter" || def.sigil === "redirect") &&
        job.inbound
      ) {
        power += reflectBonus;
      }
      if (def.node === "amplifier") power += 3;

      const hit = findFirstHit(board, job.pos, dir);
      if (!hit) {
        events.push({
          type: "beam",
          beam: {
            from: job.pos,
            to: null,
            dir,
            power,
            step: job.step,
            kind: "miss",
          },
        });
        continue;
      }

      events.push({
        type: "beam",
        beam: {
          from: job.pos,
          to: hit.pos,
          dir,
          power,
          step: job.step,
          kind: "hit",
        },
      });

      const target = hit.card;
      const targetDef = getCard(target.defId);
      const isEnemy = target.owner !== firerOwner;

      let strikePower = power;
      if (targetDef.node === "amplifier") strikePower += 3;
      if (targetDef.node === "reflector" || targetDef.node === "inverter") {
        strikePower += targetDef.sigil === "redirect" || targetDef.faction === "prismatic" ? 5 : 3;
      }

      let shouldTrigger = false;

      if (isEnemy) {
        const amount = strikePower;
        const before = target.power;
        target.power -= amount;
        events.push({
          type: "damage",
          pos: hit.pos,
          amount,
          remaining: Math.max(0, target.power),
        });

        if (target.power <= 0) {
          const overkill = Math.max(0, amount - before);
          target.owner = firerOwner;
          // Void Invert: overkill excess becomes bonus Power on the stolen tile.
          const invert = voidCascade || def.sigil === "invert" || targetDef.sigil === "invert";
          let setPower = 1;
          if (invert && overkill > 0) {
            setPower = Math.min(5, 1 + overkill);
            events.push({ type: "overkill", pos: hit.pos, bonus: setPower - 1 });
          }
          target.power = setPower;
          events.push({
            type: "capture",
            pos: hit.pos,
            newOwner: firerOwner,
            powerSet: setPower,
          });
          shouldTrigger = true;
        } else {
          shouldTrigger = true;
        }
      } else {
        events.push({ type: "relay", pos: hit.pos });
        shouldTrigger = true;
      }

      if (shouldTrigger && !target.activated && job.step < CASCADE_DEPTH_CAP) {
        const nextStep = job.step + 1;
        const useInbound =
          targetDef.node === "splitter" ||
          targetDef.node === "reflector" ||
          targetDef.node === "inverter" ||
          targetDef.sigil === "flood" ||
          targetDef.sigil === "redirect";
        queue.push({
          pos: hit.pos,
          step: nextStep,
          inbound: useInbound ? dir : null,
          inboundPower: useInbound ? strikePower : null,
        });
      }
    }
  }

  return { board, events };
}
