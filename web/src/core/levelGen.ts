import { Dir, Kind, MirrorOri, dirDelta, type Vec2 } from "./cellKind";
import { Channel } from "./cellData";
import { Module as M, makeTable, type TableDef } from "./tableDef";
import { cell, move, flipAt, placeAt, table, type LevelData, type MoveStep } from "./levelData";
import { buildState } from "./levelData";
import { applyPlayerRotation, setTableRotation } from "./rotateOps";
import { cloneGrid } from "./gridState";
import { applySolutionStep, loadLevel, pulse, tryRotate } from "./puzzleSession";
import { entryPortFromIncoming, exitsFrom } from "./portWiring";
import { solve } from "./beamSolver";
import type { CellData } from "./cellData";

const e = cell.empty;
const emit = cell.emit;
const recv = cell.recv;
const wall = cell.wall;

export const DIFFICULTY_COUNT = 20;

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rotForLink(module: number, entry: number, exit: number): number | null {
  for (let r = 0; r < 4; r++) {
    const t = makeTable(0, { x: 0, y: 0 }, module, 0, r);
    if (exitsFrom(t, entry).includes(exit)) return r;
  }
  return null;
}

function rotForTee(entry: number, exitA: number, exitB: number): number | null {
  const want = new Set([exitA, exitB]);
  for (let r = 0; r < 4; r++) {
    const t = makeTable(0, { x: 0, y: 0 }, M.TEE, 0, r);
    const outs = exitsFrom(t, entry);
    if (outs.length === 2 && want.has(outs[0]) && want.has(outs[1])) return r;
  }
  return null;
}

function dirBetween(a: Vec2, b: Vec2): number {
  if (b.x > a.x) return Dir.E;
  if (b.x < a.x) return Dir.W;
  if (b.y > a.y) return Dir.S;
  return Dir.N;
}

function step2(dir: number): Vec2 {
  const d = dirDelta(dir);
  return { x: d.x * 2, y: d.y * 2 };
}

function cellsOnSegment(a: Vec2, b: Vec2): Vec2[] {
  const out: Vec2[] = [];
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  let x = a.x;
  let y = a.y;
  while (x !== b.x || y !== b.y) {
    x += dx;
    y += dy;
    if (x === b.x && y === b.y) break;
    out.push({ x, y });
  }
  return out;
}

function key(p: Vec2): string {
  return `${p.x},${p.y}`;
}

function inInterior(p: Vec2, w: number, h: number): boolean {
  return p.x >= 1 && p.y >= 1 && p.x < w - 1 && p.y < h - 1;
}

export function levelTitle(diff: number): string {
  return `No. ${String(diff).padStart(3, "0")}`;
}

function profile(diff: number) {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, diff));

  // minMoves = proven shortest win in player actions (any quarter set on an
  // independent disc = 1 move; gears follow). Drag makes shortest ≤ DoF, so we
  // never ask for more than ~11 — hardness is the 4^DoF search with scarce pulses,
  // not a padded par number. Generation REJECTS any shorter win.
  //
  // Target: L1 teach, L2+ struggle, L10 ~hour (1 pulse), L20 multi-day cold solve.

  if (d === 1) {
    return {
      diff: d,
      size: 12,
      solidBefore: 2,
      solidAfter: 2,
      keyBefore: 2,
      channels: 2,
      requireChannels: 2,
      structuralLocks: 2,
      doubleChance: 0.75,
      undoLimit: 3,
      pulseLimit: 3,
      falseCorridors: 1,
      mirrors: 0,
      sinks: 1,
      wormPairs: 1,
      requireWorm: true,
      decoyWorms: 0,
      barriers: 2,
      requireBarriers: 2,
      filters: 0,
      minMoves: 6,
      minCritical: 4,
      minMultiChannel: 1,
      minHighInterference: 3,
      maxLocalFree: 3,
      requireSharedThird: false,
      gearPairs: 0,
      openField: true,
      wallClumps: 8,
    };
  }

  if (d <= 3) {
    return {
      diff: d,
      size: 12,
      solidBefore: 2,
      solidAfter: 2,
      keyBefore: 2,
      channels: 2,
      requireChannels: 2,
      structuralLocks: 1,
      doubleChance: 0.85,
      undoLimit: 2,
      pulseLimit: 3,
      falseCorridors: 1,
      mirrors: 0,
      sinks: 1,
      wormPairs: 1,
      requireWorm: true,
      decoyWorms: 0,
      barriers: 2,
      requireBarriers: 2,
      filters: 0,
      minMoves: 7 + (d - 2), // 7..8
      minCritical: 5,
      minMultiChannel: 1,
      minHighInterference: 4,
      maxLocalFree: 2,
      requireSharedThird: false,
      gearPairs: 0,
      openField: true,
      wallClumps: 9,
    };
  }

  if (d <= 7) {
    const j = (d - 4) / 3;
    return {
      diff: d,
      size: 12,
      solidBefore: 2 + Math.floor(j),
      solidAfter: 2,
      keyBefore: 2 + Math.floor(j),
      channels: d <= 5 ? 2 : 3,
      requireChannels: d <= 5 ? 2 : 3,
      structuralLocks: 1,
      doubleChance: 0.9,
      undoLimit: 2,
      pulseLimit: 2,
      falseCorridors: 1,
      mirrors: d >= 6 ? 1 : 0,
      sinks: 1,
      wormPairs: 1,
      requireWorm: true,
      decoyWorms: 0,
      barriers: 2 + Math.floor(j),
      requireBarriers: 2,
      filters: d >= 5 ? 1 : 0,
      minMoves: 8 + Math.floor(j * 2), // 8..10
      minCritical: 5,
      minMultiChannel: d <= 5 ? 1 : 2,
      minHighInterference: 4,
      maxLocalFree: 2,
      requireSharedThird: d >= 6,
      gearPairs: d >= 6 ? 1 : 0,
      openField: true,
      wallClumps: 9,
    };
  }

  if (d <= 10) {
    const a = (d - 8) / 2;
    return {
      diff: d,
      size: 12,
      solidBefore: 3,
      solidAfter: 2 + Math.floor(a),
      keyBefore: 3,
      channels: 3,
      requireChannels: 3,
      structuralLocks: 0,
      doubleChance: 0.95,
      undoLimit: 1,
      pulseLimit: d >= 10 ? 1 : 2,
      falseCorridors: 1,
      mirrors: 1,
      sinks: 1 + Math.floor(a),
      wormPairs: 1,
      requireWorm: true,
      decoyWorms: 0,
      barriers: 3,
      requireBarriers: 3,
      filters: 1,
      minMoves: 9 + Math.floor(a * 2), // 9..11
      minCritical: 6,
      minMultiChannel: 2,
      minHighInterference: 5,
      maxLocalFree: 1,
      requireSharedThird: true,
      gearPairs: 1,
      openField: true,
      wallClumps: 10,
    };
  }

  if (d <= 15) {
    const g = (d - 11) / 4;
    return {
      diff: d,
      size: 12,
      solidBefore: 3,
      solidAfter: 2,
      keyBefore: 3,
      channels: 3,
      requireChannels: 3,
      structuralLocks: 0,
      doubleChance: 0.97,
      undoLimit: 1,
      pulseLimit: 1,
      falseCorridors: 2,
      mirrors: 2,
      sinks: 2,
      wormPairs: 1,
      requireWorm: true,
      decoyWorms: 1,
      barriers: 3,
      requireBarriers: 3,
      filters: 2,
      minMoves: 10 + Math.floor(g * 2), // 10..12
      minCritical: 6,
      minMultiChannel: 2,
      minHighInterference: 5,
      maxLocalFree: 1,
      requireSharedThird: true,
      gearPairs: 2,
      openField: true,
      wallClumps: 10,
    };
  }

  const m = (d - 16) / Math.max(1, DIFFICULTY_COUNT - 16);
  return {
    diff: d,
    size: 12,
    solidBefore: 3,
    solidAfter: 2,
    keyBefore: 3,
    channels: 3,
    requireChannels: 3,
    structuralLocks: 0,
    doubleChance: 1,
    undoLimit: 1,
    pulseLimit: 1,
    falseCorridors: 2,
    mirrors: 2,
    sinks: 2 + Math.floor(m),
    wormPairs: 1,
    requireWorm: true,
    decoyWorms: 1,
    barriers: 4,
    requireBarriers: 3,
    filters: 2,
    minMoves: 11 + Math.floor(m), // 11..12 — near full DoF, one pulse
    minCritical: 7,
    minMultiChannel: 2,
    minHighInterference: 5,
    maxLocalFree: 1,
    requireSharedThird: true,
    gearPairs: 2,
    openField: true,
    wallClumps: 11,
  };
}

type HubSpec = { pos: Vec2; module: number; rot: number; locked: boolean };

type Blueprint = {
  emitA: Vec2;
  dirA: number;
  emitB: Vec2;
  dirB: number;
  emitC?: Vec2;
  dirC?: number;
  hubs: HubSpec[];
  recvA: Vec2;
  recvB: Vec2;
  recvC?: Vec2;
  beamCells: Set<string>;
  size: number;
  /** Table index of the shared CROSS (set after hubs array built). */
  sharedHubIndex: number;
  /** Hub positions that must stay player-controlled (e.g. worm chamber disc). */
  forceFree: Set<string>;
};

function rotForCross(
  entrySolid: number,
  exitSolid: number,
  entryDash: number,
  exitDash: number,
): number | null {
  for (let r = 0; r < 4; r++) {
    const t = makeTable(0, { x: 0, y: 0 }, M.CROSS, 0, r);
    if (
      exitsFrom(t, entrySolid).includes(exitSolid) &&
      exitsFrom(t, entryDash).includes(exitDash)
    )
      return r;
  }
  return null;
}

function wirePipe(prev: Vec2, hub: Vec2, next: Vec2): { module: number; rot: number } | null {
  const entry = entryPortFromIncoming(dirBetween(prev, hub));
  const exit = dirBetween(hub, next);
  const opposite = (entry + 2) % 4 === exit;
  const module = opposite ? M.STRAIGHT : M.ELBOW;
  const rot = rotForLink(module, entry, exit);
  if (rot === null) return null;
  return { module, rot };
}

function growStraight(
  start: Vec2,
  dir: number,
  count: number,
  w: number,
  h: number,
  occupied: Set<string>,
): Vec2[] | null {
  const hubs: Vec2[] = [{ ...start }];
  occupied.add(key(start));
  let cur = { ...start };
  for (let i = 1; i < count; i++) {
    const d = step2(dir);
    const next = { x: cur.x + d.x, y: cur.y + d.y };
    const mid = { x: cur.x + d.x / 2, y: cur.y + d.y / 2 };
    if (!inInterior(next, w, h)) return null;
    if (occupied.has(key(next)) || occupied.has(key(mid))) return null;
    occupied.add(key(mid));
    occupied.add(key(next));
    hubs.push(next);
    cur = next;
  }
  return hubs;
}

function growFrom(
  rng: Rng,
  start: Vec2,
  startDir: number,
  count: number,
  w: number,
  h: number,
  occupied: Set<string>,
): { hubs: Vec2[]; facing: number } | null {
  const hubs: Vec2[] = [{ ...start }];
  occupied.add(key(start));
  let cur = { ...start };
  let facing = startDir;
  for (let i = 1; i < count; i++) {
    let placed = false;
    const ordered = shuffle(
      rng,
      [Dir.N, Dir.E, Dir.S, Dir.W].filter((d) => d !== (facing + 2) % 4),
    );
    for (const nd of ordered) {
      const d = step2(nd);
      const next = { x: cur.x + d.x, y: cur.y + d.y };
      const mid = { x: cur.x + d.x / 2, y: cur.y + d.y / 2 };
      if (!inInterior(next, w, h)) continue;
      if (occupied.has(key(next)) || occupied.has(key(mid))) continue;
      occupied.add(key(mid));
      occupied.add(key(next));
      hubs.push(next);
      cur = next;
      facing = nd;
      placed = true;
      break;
    }
    if (!placed) return null;
  }
  return { hubs, facing };
}

function placeEndpoint(
  from: Vec2,
  prefer: number,
  w: number,
  h: number,
  occupied: Set<string>,
  borderPreferred: boolean,
): Vec2 | null {
  const dirs = [prefer, Dir.E, Dir.S, Dir.N, Dir.W];
  const dists = borderPreferred ? [2, 3, 1, 4] : [1, 2, 3];
  for (const nd of dirs) {
    for (const dist of dists) {
      const d = dirDelta(nd);
      const p = { x: from.x + d.x * dist, y: from.y + d.y * dist };
      if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) continue;
      if (occupied.has(key(p))) continue;
      if (cellsOnSegment(from, p).some((c) => occupied.has(key(c)))) continue;
      if (borderPreferred && !(p.x === 0 || p.y === 0 || p.x === w - 1 || p.y === h - 1)) continue;
      return p;
    }
  }
  // Fall back: any free ray cell
  for (const nd of dirs) {
    for (const dist of [1, 2, 3]) {
      const d = dirDelta(nd);
      const p = { x: from.x + d.x * dist, y: from.y + d.y * dist };
      if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) continue;
      if (occupied.has(key(p))) continue;
      if (cellsOnSegment(from, p).some((c) => occupied.has(key(c)))) continue;
      return p;
    }
  }
  return null;
}

function markBeam(set: Set<string>, a: Vec2, b: Vec2): void {
  set.add(key(a));
  set.add(key(b));
  for (const c of cellsOnSegment(a, b)) set.add(key(c));
}

/**
 * Coupled topology: shared CROSS sits on both solid and dashed paths.
 * Solid travels through CROSS → GATE; dashed crosses the CROSS then opens GATE
 * from the side via a TEE that also feeds recvB.
 */
function tryBlueprint(rng: Rng, opts: ReturnType<typeof profile>): Blueprint | null {
  const w = opts.size;
  const h = opts.size;
  const occupied = new Set<string>();
  const beam = new Set<string>();

  const thru = pick(rng, [Dir.S, Dir.E, Dir.N, Dir.W]);
  const back = (thru + 2) % 4;
  const left = (thru + 3) % 4;
  const right = (thru + 1) % 4;

  const margin = Math.min(
    Math.floor(w / 2) - 1,
    Math.max(5, (Math.max(opts.solidBefore, opts.keyBefore, opts.solidAfter) + 2) * 2),
  );
  const candidates: Vec2[] = [];
  for (let y = margin; y < h - margin; y++) {
    for (let x = margin; x < w - margin; x++) candidates.push({ x, y });
  }
  if (!candidates.length) return null;
  const gate = pick(rng, candidates);

  const dThru = dirDelta(thru);
  const dBack = dirDelta(back);
  const dLeft = dirDelta(left);
  const dRight = dirDelta(right);

  // Shared CROSS immediately before the gate on the solid axis
  const cross = { x: gate.x + dBack.x * 2, y: gate.y + dBack.y * 2 };
  if (!inInterior(cross, w, h)) return null;
  const midCG = { x: gate.x + dBack.x, y: gate.y + dBack.y };

  // TEE on the right side of the gate (dash approaches gate from right)
  const tee = { x: gate.x + dRight.x * 2, y: gate.y + dRight.y * 2 };
  if (!inInterior(tee, w, h)) return null;
  const midTG = { x: gate.x + dRight.x, y: gate.y + dRight.y };

  // Elbow/hub linking CROSS's right exit down to TEE (toward gate side)
  const link = { x: cross.x + dRight.x * 2, y: cross.y + dRight.y * 2 };
  if (!inInterior(link, w, h)) return null;
  const midCL = { x: cross.x + dRight.x, y: cross.y + dRight.y };
  const midLT = { x: tee.x + dBack.x, y: tee.y + dBack.y };
  // link should sit at cross+right*2 and also tee+back*2
  if (link.x !== tee.x + dBack.x * 2 || link.y !== tee.y + dBack.y * 2) return null;

  const gateRot = rotForLink(M.GATE, back, thru);
  if (gateRot === null) return null;
  const crossRot = rotForCross(back, thru, left, right);
  if (crossRot === null) return null;
  // Dash into tee along thru (from link/back), exits left→gate and right→recvB branch
  const teeRot = rotForTee(back, left, right);
  if (teeRot === null) return null;

  occupied.add(key(gate));
  occupied.add(key(cross));
  occupied.add(key(tee));
  occupied.add(key(link));
  occupied.add(key(midCG));
  occupied.add(key(midTG));
  occupied.add(key(midCL));
  occupied.add(key(midLT));

  // Solid BEFORE: optional hubs further back from CROSS (CROSS is the shared near-gate hub)
  const beforeCount = Math.max(0, opts.solidBefore - 1);
  let beforeOrdered: Vec2[] = [];
  let emitA: Vec2;
  let dirA: number;
  if (beforeCount === 0) {
    emitA = placeEndpoint(cross, back, w, h, occupied, false)!;
    if (!emitA) return null;
    occupied.add(key(emitA));
    dirA = dirBetween(emitA, cross);
  } else {
    const beforeStart = { x: cross.x + dBack.x * 2, y: cross.y + dBack.y * 2 };
    if (!inInterior(beforeStart, w, h)) return null;
    occupied.add(key({ x: cross.x + dBack.x, y: cross.y + dBack.y }));
    const beforeHubs = growStraight(beforeStart, back, beforeCount, w, h, occupied);
    if (!beforeHubs) return null;
    beforeOrdered = [...beforeHubs].reverse();
    const ep = placeEndpoint(beforeOrdered[0], back, w, h, occupied, false);
    if (!ep) return null;
    emitA = ep;
    occupied.add(key(emitA));
    dirA = dirBetween(emitA, beforeOrdered[0]);
  }

  // Solid AFTER
  const afterStart = { x: gate.x + dThru.x * 2, y: gate.y + dThru.y * 2 };
  if (!inInterior(afterStart, w, h) || occupied.has(key(afterStart))) return null;
  occupied.add(key({ x: gate.x + dThru.x, y: gate.y + dThru.y }));
  const afterHubs = growStraight(afterStart, thru, opts.solidAfter, w, h, occupied);
  if (!afterHubs) return null;
  const recvA = placeEndpoint(afterHubs[afterHubs.length - 1], thru, w, h, occupied, false);
  if (!recvA) return null;
  if (thru === Dir.N || thru === Dir.S) {
    if (recvA.x !== gate.x) return null;
  } else if (recvA.y !== gate.y) return null;
  occupied.add(key(recvA));

  // Dash key chain approaches CROSS from the left
  const keyStart = { x: cross.x + dLeft.x * 2, y: cross.y + dLeft.y * 2 };
  if (!inInterior(keyStart, w, h) || occupied.has(key(keyStart))) return null;
  occupied.add(key({ x: cross.x + dLeft.x, y: cross.y + dLeft.y }));
  const keyChain = growFrom(rng, keyStart, left, opts.keyBefore, w, h, occupied);
  if (!keyChain) return null;
  const keyOrdered = [...keyChain.hubs].reverse();
  const emitB = placeEndpoint(keyOrdered[0], left, w, h, occupied, false);
  if (!emitB) return null;
  occupied.add(key(emitB));
  const dirB = dirBetween(emitB, keyOrdered[0]);

  // RecvB further right from tee
  const branchStart = { x: tee.x + dRight.x * 2, y: tee.y + dRight.y * 2 };
  if (!inInterior(branchStart, w, h) || occupied.has(key(branchStart))) return null;
  occupied.add(key({ x: tee.x + dRight.x, y: tee.y + dRight.y }));
  const branch = growFrom(
    rng,
    branchStart,
    right,
    Math.max(1, Math.min(2, opts.keyBefore)),
    w,
    h,
    occupied,
  );
  if (!branch) return null;
  const recvB = placeEndpoint(branch.hubs[branch.hubs.length - 1], branch.facing, w, h, occupied, false);
  if (!recvB) return null;
  occupied.add(key(recvB));

  const hubs: HubSpec[] = [];
  const linkWired = wirePipe(cross, link, tee);
  if (!linkWired) return null;

  // Solid before → CROSS
  const solidWay = [emitA, ...beforeOrdered, cross, gate, ...afterHubs, recvA];
  for (let i = 0; i < beforeOrdered.length; i++) {
    const wired = wirePipe(solidWay[i], beforeOrdered[i], solidWay[i + 2]);
    if (!wired) return null;
    hubs.push({ pos: beforeOrdered[i], ...wired, locked: false });
  }
  const sharedHubIndex = hubs.length;
  hubs.push({ pos: cross, module: M.CROSS, rot: crossRot, locked: false });
  hubs.push({ pos: gate, module: M.GATE, rot: gateRot, locked: false });
  for (let i = 0; i < afterHubs.length; i++) {
    const prev = i === 0 ? gate : afterHubs[i - 1];
    const next = i === afterHubs.length - 1 ? recvA : afterHubs[i + 1];
    const wired = wirePipe(prev, afterHubs[i], next);
    if (!wired) return null;
    hubs.push({ pos: afterHubs[i], ...wired, locked: false });
  }

  // Dash → CROSS → link → TEE → branch
  const keyWay = [emitB, ...keyOrdered, cross];
  for (let i = 0; i < keyOrdered.length; i++) {
    const wired = wirePipe(keyWay[i], keyOrdered[i], keyWay[i + 2]);
    if (!wired) return null;
    hubs.push({ pos: keyOrdered[i], ...wired, locked: false });
  }
  hubs.push({ pos: link, ...linkWired, locked: false });
  hubs.push({ pos: tee, module: M.TEE, rot: teeRot, locked: false });
  const branchWay = [tee, ...branch.hubs, recvB];
  for (let i = 0; i < branch.hubs.length; i++) {
    const wired = wirePipe(branchWay[i], branch.hubs[i], branchWay[i + 2]);
    if (!wired) return null;
    hubs.push({ pos: branch.hubs[i], ...wired, locked: false });
  }

  const markChain = (pts: Vec2[]) => {
    for (let i = 0; i < pts.length - 1; i++) markBeam(beam, pts[i], pts[i + 1]);
  };
  markChain([emitA, ...beforeOrdered, cross, gate, ...afterHubs, recvA]);
  markChain([emitB, ...keyOrdered, cross, link, tee, gate]);
  markChain([tee, ...branch.hubs, recvB]);

  let emitC: Vec2 | undefined;
  let dirC: number | undefined;
  let recvC: Vec2 | undefined;
  if (opts.channels >= 3 && afterHubs.length >= 1) {
    // Third channel shares the first after-hub: approach from the left into that hub
    const sharedAfter = afterHubs[0];
    const sideStart = {
      x: sharedAfter.x + dLeft.x * 2,
      y: sharedAfter.y + dLeft.y * 2,
    };
    if (inInterior(sideStart, w, h) && !occupied.has(key(sideStart))) {
      const local = new Set(occupied);
      local.add(key({ x: sharedAfter.x + dLeft.x, y: sharedAfter.y + dLeft.y }));
      const arm = growFrom(rng, sideStart, left, 2, w, h, local);
      if (arm && arm.hubs.length >= 2) {
        const ep = placeEndpoint(arm.hubs[0], left, w, h, local, false);
        const rp = placeEndpoint(arm.hubs[arm.hubs.length - 1], arm.facing, w, h, local, false);
        // Rewire sharedAfter as CROSS: solid back→thru, dotted left→right (or into recv)
        // Simpler: keep dotted as its own 2-hub path that ends at a recv, but force it
        // through sharedAfter by converting sharedAfter to CROSS.
        if (ep && rp) {
          const crossAfterRot = rotForCross(back, thru, left, right);
          if (crossAfterRot !== null) {
            const idx = hubs.findIndex((hh) => hh.pos.x === sharedAfter.x && hh.pos.y === sharedAfter.y);
            if (idx >= 0) {
              hubs[idx] = {
                pos: sharedAfter,
                module: M.CROSS,
                rot: crossAfterRot,
                locked: false,
              };
              const way = [ep, ...arm.hubs];
              // last arm hub connects into sharedAfter
              const lastArm = arm.hubs[arm.hubs.length - 1];
              const toCross = wirePipe(
                arm.hubs.length >= 2 ? arm.hubs[arm.hubs.length - 2] : ep,
                lastArm,
                sharedAfter,
              );
              let ok = true;
              const specs: HubSpec[] = [];
              for (let i = 0; i < arm.hubs.length - 1; i++) {
                const wired = wirePipe(way[i], arm.hubs[i], way[i + 2] ?? sharedAfter);
                if (!wired) {
                  ok = false;
                  break;
                }
                specs.push({ pos: arm.hubs[i], ...wired, locked: false });
              }
              if (ok && toCross) {
                specs.push({ pos: lastArm, ...toCross, locked: false });
                // Dotted receiver beyond sharedAfter to the right
                const recvSide = {
                  x: sharedAfter.x + dRight.x * 2,
                  y: sharedAfter.y + dRight.y * 2,
                };
                if (
                  inInterior(recvSide, w, h) &&
                  !occupied.has(key(recvSide)) &&
                  !local.has(key(recvSide))
                ) {
                  for (const hh of arm.hubs) occupied.add(key(hh));
                  occupied.add(key(ep));
                  occupied.add(key(recvSide));
                  occupied.add(key({ x: sharedAfter.x + dRight.x, y: sharedAfter.y + dRight.y }));
                  emitC = ep;
                  dirC = dirBetween(ep, arm.hubs[0]);
                  recvC = recvSide;
                  hubs.push(...specs);
                  markChain([ep, ...arm.hubs, sharedAfter, recvSide]);
                }
              }
            }
          }
        }
      }
    }
    if (opts.requireChannels >= 3 && !emitC) {
      // Independent third channel is a local-greedy gift (own corridor, own discs).
      // Mid+ tiers require a shared after-hub CROSS; reject rather than decouple.
      if (opts.requireSharedThird) return null;
      for (let attempt = 0; attempt < 40; attempt++) {
        const free: Vec2[] = [];
        for (let y = 2; y < h - 2; y++)
          for (let x = 2; x < w - 2; x++) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
        if (!free.length) break;
        const local = new Set(occupied);
        const s = pick(rng, free);
        const g3 = growFrom(rng, s, pick(rng, [Dir.N, Dir.E, Dir.S, Dir.W]), 2, w, h, local);
        if (!g3 || g3.hubs.length < 2) continue;
        const ep = placeEndpoint(g3.hubs[0], dirBetween(g3.hubs[1], g3.hubs[0]), w, h, local, false);
        const rp = placeEndpoint(g3.hubs[1], g3.facing, w, h, local, false);
        if (!ep || !rp) continue;
        const way = [ep, ...g3.hubs, rp];
        const specs: HubSpec[] = [];
        let ok = true;
        for (let i = 0; i < g3.hubs.length; i++) {
          const wired = wirePipe(way[i], g3.hubs[i], way[i + 2]);
          if (!wired) {
            ok = false;
            break;
          }
          specs.push({ pos: g3.hubs[i], ...wired, locked: false });
        }
        if (!ok) continue;
        for (const hh of g3.hubs) occupied.add(key(hh));
        occupied.add(key(ep));
        occupied.add(key(rp));
        emitC = ep;
        dirC = dirBetween(ep, g3.hubs[0]);
        recvC = rp;
        hubs.push(...specs);
        markChain([ep, ...g3.hubs, rp]);
        break;
      }
      if (!emitC) return null;
    }
  }

  return {
    emitA,
    dirA,
    emitB,
    dirB,
    emitC,
    dirC,
    hubs,
    recvA,
    recvB,
    recvC,
    beamCells: beam,
    size: w,
    sharedHubIndex,
    forceFree: new Set(),
  };
}

function paintGrid(
  bp: Blueprint,
  rng: Rng,
  falseCorridors: number,
  openField: boolean,
  wallClumps: number,
): {
  grid: CellData[];
  trapEnds: Vec2[];
  trapCells: Set<string>;
} {
  const w = bp.size;
  const h = bp.size;
  const open = new Set(bp.beamCells);
  for (const p of [bp.emitA, bp.emitB, bp.recvA, bp.recvB]) open.add(key(p));
  if (bp.emitC) open.add(key(bp.emitC));
  if (bp.recvC) open.add(key(bp.recvC));
  for (const hh of bp.hubs) open.add(key(hh.pos));

  const trapEnds: Vec2[] = [];
  const trapCells = new Set<string>();
  let carved = 0;
  for (const hh of shuffle(rng, bp.hubs)) {
    if (carved >= falseCorridors) break;
    if (hh.module === M.GATE || hh.module === M.TEE || hh.module === M.CROSS) continue;
    const used = new Set<number>();
    for (const dir of [Dir.N, Dir.E, Dir.S, Dir.W]) {
      const d = dirDelta(dir);
      if (open.has(`${hh.pos.x + d.x},${hh.pos.y + d.y}`)) used.add(dir);
    }
    for (const dir of shuffle(
      rng,
      [Dir.N, Dir.E, Dir.S, Dir.W].filter((d) => !used.has(d)),
    )) {
      const d = dirDelta(dir);
      const cells: Vec2[] = [];
      let x = hh.pos.x;
      let y = hh.pos.y;
      let ok = true;
      for (let s = 0; s < 2 + Math.floor(rng() * 2); s++) {
        x += d.x;
        y += d.y;
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) {
          ok = false;
          break;
        }
        if (open.has(`${x},${y}`)) {
          ok = false;
          break;
        }
        cells.push({ x, y });
      }
      if (!ok || cells.length < 2) continue;
      for (const c of cells) {
        open.add(key(c));
        trapCells.add(key(c));
      }
      trapEnds.push(cells[cells.length - 1]);
      carved++;
      break;
    }
  }

  const grid: CellData[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === bp.emitA.x && y === bp.emitA.y) grid.push(emit(bp.dirA, Channel.SOLID));
      else if (x === bp.emitB.x && y === bp.emitB.y) grid.push(emit(bp.dirB, Channel.DASH));
      else if (bp.emitC && x === bp.emitC.x && y === bp.emitC.y)
        grid.push(emit(bp.dirC!, Channel.DOT));
      else if (x === bp.recvA.x && y === bp.recvA.y) grid.push(recv(Channel.SOLID));
      else if (x === bp.recvB.x && y === bp.recvB.y) grid.push(recv(Channel.DASH));
      else if (bp.recvC && x === bp.recvC.x && y === bp.recvC.y) grid.push(recv(Channel.DOT));
      else if (open.has(`${x},${y}`)) grid.push(e());
      // Open field: off-path cells stay passable so the board no longer paints
      // the solution as the only corridor. Walls become real obstacles instead.
      else grid.push(openField ? e() : wall());
    }
  }

  for (const k of open) {
    const [x, y] = k.split(",").map(Number);
    const i = y * w + x;
    if (grid[i].kind === Kind.WALL) grid[i] = e();
  }

  if (openField && wallClumps > 0) {
    const protectedCells = new Set(open);
    for (const p of [bp.emitA, bp.emitB, bp.recvA, bp.recvB]) protectedCells.add(key(p));
    if (bp.emitC) protectedCells.add(key(bp.emitC));
    if (bp.recvC) protectedCells.add(key(bp.recvC));
    for (const hh of bp.hubs) protectedCells.add(key(hh.pos));

    const free: Vec2[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (!protectedCells.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    let placed = 0;
    for (const seed of shuffle(rng, free)) {
      if (placed >= wallClumps) break;
      if (grid[seed.y * w + seed.x].kind !== Kind.EMPTY) continue;
      // Grow a small blob so obstacles read as intentional, not confetti.
      const size = 2 + Math.floor(rng() * 3);
      let cur = seed;
      for (let s = 0; s < size; s++) {
        if (protectedCells.has(key(cur))) break;
        const i = cur.y * w + cur.x;
        if (grid[i].kind !== Kind.EMPTY) break;
        grid[i] = wall();
        const dir = pick(rng, [Dir.N, Dir.E, Dir.S, Dir.W]);
        const d = dirDelta(dir);
        const next = { x: cur.x + d.x, y: cur.y + d.y };
        if (next.x < 1 || next.y < 1 || next.x >= w - 1 || next.y >= h - 1) break;
        cur = next;
      }
      placed++;
    }
  }
  return { grid, trapEnds, trapCells };
}

function reservedCells(bp: Blueprint): Set<string> {
  const s = new Set<string>();
  for (const p of [bp.emitA, bp.emitB, bp.recvA, bp.recvB]) s.add(key(p));
  if (bp.emitC) s.add(key(bp.emitC));
  if (bp.recvC) s.add(key(bp.recvC));
  for (const hh of bp.hubs) s.add(key(hh.pos));
  return s;
}

function emptyOnBeam(grid: CellData[], w: number, bp: Blueprint): Vec2[] {
  const reserved = reservedCells(bp);
  const out: Vec2[] = [];
  for (const k of bp.beamCells) {
    if (reserved.has(k)) continue;
    const [x, y] = k.split(",").map(Number);
    if (grid[y * w + x].kind === Kind.EMPTY) out.push({ x, y });
  }
  return out;
}

/**
 * Carve an isolated wormhole bypass that still needs a player disc:
 * emitter → shutter → elbow → worm A → walls → worm B → receiver.
 * Without the elbow the chamber would auto-solve on PULSE (free LINKED).
 * Returns the hub so scrambleAndVerify can twist it.
 */
function placeMandatoryWormChamber(
  grid: CellData[],
  bp: Blueprint,
  rng: Rng,
  openField: boolean,
): HubSpec | null {
  const w = bp.size;
  const h = bp.size;
  const idx = (p: Vec2) => p.y * w + p.x;
  const candidates: { cells: Vec2[]; dir: number }[] = [];
  // On an open field there is no wall mass to hollow out, so the chamber must be
  // free-standing: it may sit on empty cells as long as it clears the solution.
  const blocked = new Set(bp.beamCells);
  for (const k of reservedCells(bp)) blocked.add(k);
  const usable = (p: Vec2) =>
    openField
      ? grid[idx(p)].kind === Kind.EMPTY && !blocked.has(key(p))
      : grid[idx(p)].kind === Kind.WALL;

  // 8 cells: emit, barrier, disc, wormA, wall, wall, wormB, recv
  for (const dir of [Dir.E, Dir.S, Dir.W, Dir.N]) {
    const d = dirDelta(dir);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const cells: Vec2[] = [];
        let valid = true;
        for (let n = 0; n < 8; n++) {
          const p = { x: x + d.x * n, y: y + d.y * n };
          if (p.x < 1 || p.y < 1 || p.x >= w - 1 || p.y >= h - 1 || !usable(p)) {
            valid = false;
            break;
          }
          cells.push(p);
        }
        if (valid) candidates.push({ cells, dir });
      }
    }
  }
  if (!candidates.length) return null;

  const { cells, dir } = pick(rng, candidates);
  if (openField) {
    // Shell the tube in so the pair stays mechanically mandatory and stray
    // channels cannot wander in and spill on the chamber's own receiver.
    const inChamber = new Set(cells.map(key));
    for (const c of cells) {
      for (const nd of [Dir.N, Dir.E, Dir.S, Dir.W]) {
        const dd = dirDelta(nd);
        const n = { x: c.x + dd.x, y: c.y + dd.y };
        if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) continue;
        const nk = key(n);
        if (inChamber.has(nk) || blocked.has(nk)) continue;
        if (grid[idx(n)].kind === Kind.EMPTY) grid[idx(n)] = wall();
      }
    }
  }

  const entry = entryPortFromIncoming(dir);
  const exit = dir;
  // Straight corridor through the chamber — still scrambled so PULSE alone
  // cannot free-light the chamber receiver.
  const module = (entry + 2) % 4 === exit ? M.STRAIGHT : M.ELBOW;
  const rot = rotForLink(module, entry, exit);
  if (rot === null) return null;

  grid[idx(cells[0])] = emit(dir, Channel.DOT);
  grid[idx(cells[1])] = cell.barrier(dir);
  // cells[2] is the disc hub (empty cell under the table)
  grid[idx(cells[2])] = e();
  grid[idx(cells[3])] = cell.worm(0);
  // cells 4 and 5 are the solid plug the wormhole must bypass.
  grid[idx(cells[4])] = wall();
  grid[idx(cells[5])] = wall();
  grid[idx(cells[6])] = cell.worm(0);
  grid[idx(cells[7])] = recv(Channel.DOT);

  // Mark chamber beam so later hazard passes don't overwrite it.
  for (const c of cells) {
    if (grid[idx(c)].kind !== Kind.WALL) bp.beamCells.add(key(c));
  }
  bp.forceFree.add(key(cells[2]));

  return { pos: cells[2], module, rot, locked: false };
}

/** Returns true if a solution-path wormhole pair was placed. */
function placeSolutionWormhole(
  grid: CellData[],
  bp: Blueprint,
  rng: Rng,
): boolean {
  const w = bp.size;
  const reserved = reservedCells(bp);
  const idx = (p: Vec2) => p.y * w + p.x;
  const canPlace = (p: Vec2) =>
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < w &&
    p.y < bp.size &&
    !reserved.has(key(p)) &&
    grid[idx(p)].kind === Kind.EMPTY;

  // Prefer solid corridor empties; fall back to any beam empty
  const solidAxis =
    bp.emitA.x === bp.recvA.x
      ? emptyOnBeam(grid, w, bp).filter((p) => p.x === bp.emitA.x && canPlace(p))
      : bp.emitA.y === bp.recvA.y
        ? emptyOnBeam(grid, w, bp).filter((p) => p.y === bp.emitA.y && canPlace(p))
        : [];
  const candidates = solidAxis.length >= 2 ? solidAxis : emptyOnBeam(grid, w, bp).filter(canPlace);
  candidates.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const tryPairs: [Vec2, Vec2][] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      tryPairs.push([candidates[i], candidates[j]]);
    }
  }
  shuffle(rng, tryPairs);

  for (const [a, b] of tryPairs) {
    if (a.x !== b.x && a.y !== b.y) continue;
    const between = cellsOnSegment(a, b);
    if (between.length < 1) continue;
    if (between.some((p) => reserved.has(key(p)))) continue;
    if (between.some((p) => grid[idx(p)].kind !== Kind.EMPTY)) continue;

    const snapshot: { i: number; c: CellData }[] = [];
    const stamp = (p: Vec2, c: CellData) => {
      const i = idx(p);
      snapshot.push({ i, c: { ...grid[i] } });
      grid[i] = c;
    };
    stamp(a, cell.worm(0));
    stamp(b, cell.worm(0));
    for (const mid of between) stamp(mid, wall());

    const hubs = bp.hubs.map((hh, id) =>
      table(id, hh.pos.x, hh.pos.y, hh.module, hh.rot, 0, hh.locked),
    );
    const trial: LevelData = {
      id: "worm_trial",
      title: "",
      width: bp.size,
      height: bp.size,
      par: 0,
      undoLimit: 1,
      pulseLimit: 3,
      tokenBudget: 0,
      tables: hubs,
      cells: grid,
      solution: [],
    };
    const result = solve(buildState(trial));
    const withoutWorms = {
      ...trial,
      cells: grid.map((c) =>
        c.kind === Kind.WORMHOLE && (c.channel ?? 0) === 0 ? cell.empty() : c,
      ),
    };
    const wormRequired = !solve(buildState(withoutWorms)).won;
    const ok =
      allReceiversGeometricallyReachable(trial) &&
      result.won &&
      allHubsOnBeams(trial, result) &&
      wormRequired;
    if (ok) return true;
    for (const s of snapshot) grid[s.i] = s.c;
  }
  return false;
}

/** Decoy wormhole: trap mouth teleports into a sink — looks useful, eats the beam. */
function placeDecoyWormholes(
  grid: CellData[],
  bp: Blueprint,
  trapEnds: Vec2[],
  rng: Rng,
  count: number,
): void {
  if (count <= 0) return;
  const w = bp.size;
  const h = bp.size;
  const reserved = reservedCells(bp);
  const idx = (p: Vec2) => p.y * w + p.x;
  const used = new Set<string>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[idx({ x, y })].kind === Kind.WORMHOLE) used.add(`${x},${y}`);
    }
  }

  let pairId = 1;
  let placed = 0;
  for (const mouth of shuffle(rng, trapEnds)) {
    if (placed >= count) break;
    if (reserved.has(key(mouth)) || used.has(key(mouth))) continue;
    if (grid[idx(mouth)].kind !== Kind.EMPTY && grid[idx(mouth)].kind !== Kind.SINK) continue;

    // Twin in a dead pocket: adjacent wall-surrounded empty, then sink beyond twin exit
    const free: Vec2[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = { x, y };
        if (reserved.has(key(p)) || used.has(key(p))) continue;
        if (grid[idx(p)].kind !== Kind.EMPTY) continue;
        if (bp.beamCells.has(key(p))) continue;
        free.push(p);
      }
    }
    if (!free.length) break;
    const twin = pick(rng, free);

    // Ensure twin has a neighboring cell we can turn into a sink (exit dump)
    const dumpDirs = shuffle(rng, [Dir.N, Dir.E, Dir.S, Dir.W]);
    let dump: Vec2 | null = null;
    for (const d of dumpDirs) {
      const dd = dirDelta(d);
      const n = { x: twin.x + dd.x, y: twin.y + dd.y };
      if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) continue;
      if (reserved.has(key(n)) || used.has(key(n))) continue;
      if (grid[idx(n)].kind === Kind.EMPTY || grid[idx(n)].kind === Kind.WALL) {
        dump = n;
        break;
      }
    }
    if (!dump) continue;

    grid[idx(mouth)] = cell.worm(pairId);
    grid[idx(twin)] = cell.worm(pairId);
    grid[idx(dump)] = cell.sink();
    // Wall off other exits from twin so the only continuation is the sink
    for (const d of [Dir.N, Dir.E, Dir.S, Dir.W]) {
      const dd = dirDelta(d);
      const n = { x: twin.x + dd.x, y: twin.y + dd.y };
      if (n.x === dump.x && n.y === dump.y) continue;
      if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) continue;
      if (reserved.has(key(n)) || used.has(key(n))) continue;
      if (grid[idx(n)].kind === Kind.EMPTY) grid[idx(n)] = wall();
    }
    used.add(key(mouth));
    used.add(key(twin));
    used.add(key(dump));
    pairId++;
    placed++;
  }
}

/** Place one-way shutters on solved beam segments, retaining only placements that preserve the win. */
function placeSolutionBarriers(
  grid: CellData[],
  bp: Blueprint,
  rng: Rng,
  count: number,
): number {
  if (count <= 0) return 0;
  const w = bp.size;
  const idx = (p: Vec2) => p.y * w + p.x;
  const reserved = reservedCells(bp);
  const hubs = bp.hubs.map((hh, id) =>
    table(id, hh.pos.x, hh.pos.y, hh.module, hh.rot, 0, hh.locked),
  );
  const trial = (): LevelData => ({
    id: "barrier_trial",
    title: "",
    width: bp.size,
    height: bp.size,
    par: 0,
    undoLimit: 1,
    pulseLimit: 3,
    tokenBudget: 0,
    tables: hubs,
    cells: grid,
    solution: [],
  });

  let placed = 0;
  while (placed < count) {
    const result = solve(buildState(trial()));
    if (!result.won) break;
    const candidates: { pos: Vec2; dir: number }[] = [];
    for (const beam of result.beams) {
      for (const seg of beam.segments) {
        const dist = Math.abs(seg.from.x - seg.to.x) + Math.abs(seg.from.y - seg.to.y);
        if (dist !== 1) continue; // Ignore wormhole jump segments.
        const p = seg.to;
        if (reserved.has(key(p)) || grid[idx(p)].kind !== Kind.EMPTY) continue;
        candidates.push({ pos: p, dir: dirBetween(seg.from, seg.to) });
      }
    }
    if (!candidates.length) break;

    let accepted = false;
    for (const candidate of shuffle(rng, candidates)) {
      const i = idx(candidate.pos);
      const before = grid[i];
      grid[i] = cell.barrier(candidate.dir);
      const next = solve(buildState(trial()));
      if (next.won && allHubsOnBeams(trial(), next)) {
        placed++;
        accepted = true;
        break;
      }
      grid[i] = before;
    }
    if (!accepted) break;
  }
  return placed;
}

/** Seal side-leaks next to solution corridors (never seal intentional trap alleys). */
function sealCorridorLeaks(
  grid: CellData[],
  bp: Blueprint,
  trapCells: Set<string>,
  rng: Rng,
): void {
  const w = bp.size;
  const h = bp.size;
  const reserved = reservedCells(bp);
  const idx = (p: Vec2) => p.y * w + p.x;
  const open = new Set(bp.beamCells);
  for (const p of [bp.emitA, bp.emitB, bp.recvA, bp.recvB]) open.add(key(p));
  if (bp.emitC) open.add(key(bp.emitC));
  if (bp.recvC) open.add(key(bp.recvC));

  for (const k of [...open]) {
    const [x, y] = k.split(",").map(Number);
    for (const d of [Dir.N, Dir.E, Dir.S, Dir.W]) {
      const dd = dirDelta(d);
      const n = { x: x + dd.x, y: y + dd.y };
      if (n.x < 0 || n.y < 0 || n.x >= w || n.y >= h) continue;
      const nk = key(n);
      if (reserved.has(nk) || open.has(nk) || trapCells.has(nk)) continue;
      if (grid[idx(n)].kind === Kind.EMPTY && rng() < 0.9) grid[idx(n)] = wall();
    }
  }
}

/** Place mirrors, sinks, wormholes, filters — structural depth, not garnish. */
function placeHazards(
  grid: CellData[],
  bp: Blueprint,
  trapEnds: Vec2[],
  trapCells: Set<string>,
  rng: Rng,
  opts: ReturnType<typeof profile>,
): boolean {
  const w = bp.size;
  const h = bp.size;
  const reserved = reservedCells(bp);
  const idx = (p: Vec2) => p.y * w + p.x;
  const canPlace = (p: Vec2) => {
    if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) return false;
    if (reserved.has(key(p))) return false;
    return grid[idx(p)].kind === Kind.EMPTY;
  };

  let sinksLeft = opts.sinks;
  for (const end of shuffle(rng, trapEnds)) {
    if (sinksLeft <= 0) break;
    if (!canPlace(end)) continue;
    grid[idx(end)] = cell.sink();
    sinksLeft--;
  }

  let mirrorsLeft = opts.mirrors;
  for (const end of shuffle(rng, trapEnds)) {
    if (mirrorsLeft <= 0) break;
    if (!canPlace(end)) continue;
    grid[idx(end)] = cell.mir(rng() < 0.5 ? MirrorOri.SLASH : MirrorOri.BACKSLASH);
    mirrorsLeft--;
  }

  if (opts.filters > 0) {
    const solidMids = emptyOnBeam(grid, w, bp).filter((p) => {
      if (bp.emitA.x === bp.recvA.x) return p.x === bp.emitA.x;
      if (bp.emitA.y === bp.recvA.y) return p.y === bp.emitA.y;
      return false;
    });
    let filtersLeft = opts.filters;
    for (const p of shuffle(rng, solidMids)) {
      if (filtersLeft <= 0) break;
      if (!canPlace(p)) continue;
      grid[idx(p)] = cell.filter(Channel.SOLID);
      filtersLeft--;
    }
    // Second filter can gate the dashed approach so channel mistakes hurt harder.
    if (filtersLeft > 0 && bp.emitB) {
      const dashMids = emptyOnBeam(grid, w, bp).filter((p) => {
        if (bp.emitB.x === bp.recvB.x) return p.x === bp.emitB.x;
        if (bp.emitB.y === bp.recvB.y) return p.y === bp.emitB.y;
        return false;
      });
      for (const p of shuffle(rng, dashMids)) {
        if (filtersLeft <= 0) break;
        if (!canPlace(p)) continue;
        grid[idx(p)] = cell.filter(Channel.DASH);
        filtersLeft--;
      }
    }
  }

  let wormOk = opts.wormPairs <= 0;
  if (opts.wormPairs > 0) {
    // Prefer a main-path wormhole (forces reasoning about a real channel) over a
    // private chamber. Chamber is the fallback and always includes a free disc.
    wormOk = placeSolutionWormhole(grid, bp, rng);
    if (!wormOk) {
      const chamberDisc = placeMandatoryWormChamber(grid, bp, rng, opts.openField);
      if (chamberDisc) {
        bp.hubs.push(chamberDisc);
        wormOk = true;
      }
    }
  }

  const barriersPlaced = placeSolutionBarriers(grid, bp, rng, opts.barriers);
  placeDecoyWormholes(grid, bp, trapEnds, rng, opts.decoyWorms);
  // Sealing leaks re-outlines the solution path — only do it on guided tiers.
  if (!opts.openField) sealCorridorLeaks(grid, bp, trapCells, rng);

  return (!opts.requireWorm || wormOk) && barriersPlaced >= opts.requireBarriers;
}

/** Flood through non-wall cells; wormholes link their twin. Every receiver must be reachable. */
function allReceiversGeometricallyReachable(level: LevelData): boolean {
  const w = level.width;
  const h = level.height;
  const passable = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return level.cells[y * w + x].kind !== Kind.WALL;
  };
  const twinOf = (x: number, y: number): Vec2 | null => {
    const c = level.cells[y * w + x];
    if (c.kind !== Kind.WORMHOLE) return null;
    const pairId = c.channel ?? 0;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (xx === x && yy === y) continue;
        const o = level.cells[yy * w + xx];
        if (o.kind === Kind.WORMHOLE && (o.channel ?? 0) === pairId) return { x: xx, y: yy };
      }
    }
    return null;
  };
  const starts: Vec2[] = [];
  const recvs: Vec2[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = level.cells[y * w + x];
      if (c.kind === Kind.EMITTER) starts.push({ x, y });
      if (c.kind === Kind.RECEIVER) recvs.push({ x, y });
    }
  }
  if (!starts.length || !recvs.length) return false;
  const seen = new Set<string>();
  const q = [...starts];
  for (const s of starts) seen.add(key(s));
  while (q.length) {
    const p = q.pop()!;
    const twin = twinOf(p.x, p.y);
    if (twin && !seen.has(key(twin))) {
      seen.add(key(twin));
      q.push(twin);
    }
    for (const d of [Dir.N, Dir.E, Dir.S, Dir.W]) {
      const dd = dirDelta(d);
      const n = { x: p.x + dd.x, y: p.y + dd.y };
      const k = key(n);
      if (seen.has(k) || !passable(n.x, n.y)) continue;
      seen.add(k);
      q.push(n);
    }
  }
  return recvs.every((r) => seen.has(key(r)));
}

function allHubsOnBeams(level: LevelData, result: ReturnType<typeof solve>): boolean {
  const visited = new Set<string>();
  for (const beam of result.beams) {
    for (const seg of beam.segments) {
      visited.add(key(seg.from));
      visited.add(key(seg.to));
    }
  }
  return level.tables.every((t) => visited.has(key(t.hub)));
}

function applyLocks(hubs: HubSpec[], count: number, rng: Rng): void {
  if (count <= 0) return;
  for (const h of shuffle(
    rng,
    hubs.filter((x) => x.module === M.ELBOW),
  ).slice(0, count))
    h.locked = true;
}

function gateIsRequired(level: LevelData): boolean {
  const g = buildState(level);
  for (let i = 0; i < g.cells.length; i++) {
    if (g.cells[i].kind === Kind.EMITTER && (g.cells[i].channel ?? 0) !== Channel.SOLID) {
      g.cells[i] = e();
    }
  }
  return !solve(g).won;
}

/** True if disarming every phase switch breaks the win. */
function phaseIsRequired(level: LevelData): boolean {
  const g = buildState(level);
  let any = false;
  for (const c of g.cells) {
    if (c.kind === Kind.PHASE_SWITCH && (c.phase ?? 0) === 1) {
      c.phase = 0;
      any = true;
    }
  }
  if (!any) return false;
  return !solve(g).won;
}

/** True if clearing every token pad breaks the win. */
function tokenIsRequired(level: LevelData): boolean {
  const g = buildState(level);
  let any = false;
  for (const c of g.cells) {
    if (c.kind === Kind.PAD && (c.phase ?? 0) === 1) {
      c.phase = 0;
      any = true;
    }
  }
  if (!any) return false;
  return !solve(g).won;
}

/**
 * Install co-equal systems on the solved board.
 * Phase: mark a solid receiver as phase-locked and arm a switch on its beam —
 * alternate open-field routes still arrive at the wrong polarity, so the switch
 * is load-bearing without needing a geometric choke.
 * Tokens: seal the approach to a dash (else solid) receiver and put a door on
 * the last EMPTY step so the pad/token is required.
 */
function placePhaseTokenKit(
  grid: CellData[],
  bp: Blueprint,
  rng: Rng,
  requirePhase: boolean,
  requireTokens: boolean,
  tokenBudget: number,
): boolean {
  const w = bp.size;
  const h = bp.size;
  const idx = (p: Vec2) => p.y * w + p.x;
  const hubs = bp.hubs.map((h0, i) => table(i, h0.pos.x, h0.pos.y, h0.module, h0.rot, 0, h0.locked));
  const snapshot = grid.map((c) => ({ ...c }));

  const trialLevel = (): LevelData => ({
    id: "kit_trial",
    title: "",
    width: w,
    height: h,
    par: 0,
    undoLimit: 1,
    pulseLimit: 3,
    tokenBudget,
    tables: hubs,
    cells: grid,
    solution: [],
  });

  const canPlace = (p: Vec2) =>
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < w &&
    p.y < h &&
    grid[idx(p)].kind === Kind.EMPTY &&
    !bp.hubs.some((hb) => hb.pos.x === p.x && hb.pos.y === p.y);

  const neighbors4 = (p: Vec2): Vec2[] =>
    [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ].filter((q) => q.x >= 0 && q.y >= 0 && q.x < w && q.y < h);

  const sealApproaches = (target: Vec2, keep: Set<string>): void => {
    for (const n of neighbors4(target)) {
      if (!canPlace(n) || keep.has(key(n))) continue;
      grid[idx(n)] = wall();
    }
  };

  const lightingPaths = (
    channel: number,
  ): { empties: Vec2[]; receiver: Vec2 }[] => {
    const r = solve(buildState(trialLevel()));
    if (!r.won) return [];
    const out: { empties: Vec2[]; receiver: Vec2 }[] = [];
    for (const beam of r.beams) {
      if (beam.channel !== channel || !beam.segments.length) continue;
      const last = beam.segments[beam.segments.length - 1].to;
      const hit = grid[idx(last)];
      if (hit.kind !== Kind.RECEIVER || (hit.channel ?? 0) !== channel) continue;
      const empties: Vec2[] = [];
      const seen = new Set<string>();
      for (const seg of beam.segments) {
        const p = seg.to;
        if (p.x === last.x && p.y === last.y) continue;
        const k = key(p);
        if (seen.has(k)) continue;
        seen.add(k);
        if (canPlace(p)) empties.push(p);
      }
      if (empties.length >= 1) out.push({ empties, receiver: last });
    }
    return shuffle(rng, out);
  };

  const restore = () => {
    for (let i = 0; i < grid.length; i++) grid[i] = { ...snapshot[i] };
  };

  if (requirePhase) {
    const paths = lightingPaths(Channel.SOLID);
    let placed = false;
    for (const { empties, receiver } of paths) {
      // Switch ~1/3 along the path (readable); receiver demands phase B.
      const si = Math.min(empties.length - 1, Math.max(0, Math.floor(empties.length / 3)));
      const sw = empties[si];
      // Optional teaching gate just after the switch when space allows.
      const gi = si + 1 < empties.length ? si + 1 : -1;
      grid[idx(sw)] = cell.phaseSwitch(1);
      if (gi >= 0) grid[idx(empties[gi])] = cell.phaseGate(1);
      const recv = grid[idx(receiver)];
      grid[idx(receiver)] = { ...recv, phase: 1 };
      const lvl = trialLevel();
      if (solve(buildState(lvl)).won && phaseIsRequired(lvl)) {
        placed = true;
        break;
      }
      restore();
    }
    if (!placed) {
      restore();
      return false;
    }
    for (let i = 0; i < grid.length; i++) snapshot[i] = { ...grid[i] };
  }

  if (requireTokens && tokenBudget > 0) {
    const preferDash = lightingPaths(Channel.DASH);
    const paths = preferDash.length ? preferDash : lightingPaths(Channel.SOLID);
    let placed = false;
    for (const { empties, receiver } of paths) {
      // Prefer last empty; skip if phase kit already claimed it.
      let doorSpot: Vec2 | null = null;
      for (let i = empties.length - 1; i >= 0; i--) {
        if (grid[idx(empties[i])].kind === Kind.EMPTY) {
          doorSpot = empties[i];
          break;
        }
      }
      if (!doorSpot) continue;
      const keep = new Set<string>([key(doorSpot)]);
      grid[idx(doorSpot)] = cell.tokenDoor(1);
      sealApproaches(receiver, new Set([key(doorSpot)]));
      sealApproaches(doorSpot, new Set([key(receiver), ...keep]));
      const padPool = shuffle(
        rng,
        trapEndsAround(bp, grid, rng).filter(
          (p) => canPlace(p) && !(p.x === doorSpot!.x && p.y === doorSpot!.y),
        ),
      ).slice(0, 16);
      for (const padPos of padPool) {
        grid[idx(padPos)] = cell.pad(1, 1);
        const lvl = trialLevel();
        if (solve(buildState(lvl)).won && tokenIsRequired(lvl)) {
          placed = true;
          break;
        }
        grid[idx(padPos)] = e();
      }
      if (placed) break;
      restore();
    }
    if (!placed) {
      restore();
      return false;
    }
  }

  if (!solve(buildState(trialLevel())).won) {
    restore();
    return false;
  }
  return true;
}

function trapEndsAround(bp: Blueprint, grid: CellData[], rng: Rng): Vec2[] {
  const w = bp.size;
  const out: Vec2[] = [];
  for (let y = 1; y < bp.size - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y * w + x].kind === Kind.EMPTY) out.push({ x, y });
    }
  }
  return shuffle(rng, out).slice(0, 40);
}

function cropLevel(level: LevelData): LevelData {
  const w = level.width;
  const h = level.height;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = level.cells[y * w + x];
      if (c.kind === Kind.WALL) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  for (const t of level.tables) {
    minX = Math.min(minX, t.hub.x);
    minY = Math.min(minY, t.hub.y);
    maxX = Math.max(maxX, t.hub.x);
    maxY = Math.max(maxY, t.hub.y);
  }
  // One-cell frame so the puzzle doesn't touch the canvas edge
  minX = Math.max(0, minX - 1);
  minY = Math.max(0, minY - 1);
  maxX = Math.min(w - 1, maxX + 1);
  maxY = Math.min(h - 1, maxY + 1);

  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  if (nw >= w && nh >= h) return level;

  const cells = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      cells.push({ ...level.cells[y * w + x] });
    }
  }
  return {
    ...level,
    width: nw,
    height: nh,
    cells,
    tables: level.tables.map((t) => ({
      ...t,
      hub: { x: t.hub.x - minX, y: t.hub.y - minY },
    })),
    solution: level.solution.map((s) =>
      s.x !== undefined && s.y !== undefined
        ? { ...s, x: s.x - minX, y: s.y - minY }
        : { ...s },
    ),
  };
}

/** Shared CROSS carries ≥2 channels; at least one free elbow is critical to the win. */
function sharedHubIsCoupled(level: LevelData, sharedId: number): boolean {
  const baseState = buildState(level);
  const shared = baseState.tables.find((t) => t.id === sharedId);
  if (!shared || shared.module !== M.CROSS) return false;
  const base = solve(baseState);
  if (!base.won) return false;

  const channels = new Set<number>();
  for (const beam of base.beams) {
    for (const seg of beam.segments) {
      if (
        (seg.from.x === shared.hub.x && seg.from.y === shared.hub.y) ||
        (seg.to.x === shared.hub.x && seg.to.y === shared.hub.y)
      ) {
        channels.add(beam.channel);
      }
    }
  }
  if (channels.size < 2) return false;

  let criticalElbow = false;
  for (const t of level.tables) {
    if (t.module !== M.ELBOW || t.locked) continue;
    for (let dq = 1; dq <= 3; dq++) {
      const g = buildState(level);
      g.tables.find((x) => x.id === t.id)!.rotationQ = (t.rotationQ + dq) % 4;
      if (!solve(g).won) {
        criticalElbow = true;
        break;
      }
    }
    if (criticalElbow) break;
  }
  return criticalElbow;
}

/** How many free tables must sit at the solved rotation (any wrong quarter breaks the win). */
function countCriticalTables(solved: LevelData): number {
  let n = 0;
  for (const t of solved.tables) {
    if (t.locked) continue;
    let critical = false;
    for (let dq = 1; dq <= 3; dq++) {
      const g = buildState(solved);
      g.tables.find((x) => x.id === t.id)!.rotationQ = (t.rotationQ + dq) % 4;
      if (!solve(g).won) {
        critical = true;
        break;
      }
    }
    if (critical) n++;
  }
  return n;
}

/** Channels that physically pass through a hub in a solved turn result. */
function channelsThroughHub(
  result: ReturnType<typeof solve>,
  hub: { x: number; y: number },
): Set<number> {
  const ch = new Set<number>();
  for (const beam of result.beams) {
    for (const seg of beam.segments) {
      if (
        (seg.from.x === hub.x && seg.from.y === hub.y) ||
        (seg.to.x === hub.x && seg.to.y === hub.y)
      ) {
        ch.add(beam.channel);
      }
    }
  }
  return ch;
}

/** Free discs that carry ≥2 channels — no locally-correct single-path answer. */
function countMultiChannelTables(
  solved: LevelData,
  result: ReturnType<typeof solve>,
): number {
  let n = 0;
  for (const t of solved.tables) {
    if (t.locked) continue;
    if (channelsThroughHub(result, t.hub).size >= 2) n++;
  }
  return n;
}

/**
 * Receivers that go dark when `tableId` leaves its solved quarter.
 * High interference (≥2) means the disc is a constraint-graph node, not a local match.
 */
function receiverInterference(solved: LevelData, tableId: number): number {
  const base = solve(buildState(solved));
  if (!base.won) return 0;
  const lit = new Set(base.energizedReceivers.map((p) => key(p)));
  let best = 0;
  const t = solved.tables.find((x) => x.id === tableId);
  if (!t || t.locked) return 0;
  for (let dq = 1; dq <= 3; dq++) {
    const g = buildState(solved);
    g.tables.find((x) => x.id === tableId)!.rotationQ = (t.rotationQ + dq) % 4;
    const r = solve(g);
    const still = new Set(r.energizedReceivers.map((p) => key(p)));
    let lost = 0;
    for (const k of lit) if (!still.has(k)) lost++;
    best = Math.max(best, lost);
  }
  return best;
}

function countHighInterference(solved: LevelData, minLost = 2): number {
  let n = 0;
  for (const t of solved.tables) {
    if (t.locked) continue;
    if (receiverInterference(solved, t.id) >= minLost) n++;
  }
  return n;
}

/**
 * Free elbow/straight that only serves one channel and isn't a multi-receiver
 * bottleneck — solvable by reading neighbors. Lock these so the player's free
 * discs are mostly coupled / high-interference. Always leave enough free discs
 * for a real scramble (reasoning depth > padded move count).
 */
function lockLocallyObvious(
  hubs: TableDef[],
  solved: LevelData,
  result: ReturnType<typeof solve>,
  maxKeepFree: number,
  rng: Rng,
  forceFree: Set<string>,
): void {
  const candidates: TableDef[] = [];
  for (const t of hubs) {
    if (t.locked) continue;
    if (forceFree.has(key(t.hub))) continue;
    if (t.module !== M.ELBOW && t.module !== M.STRAIGHT) continue;
    if (channelsThroughHub(result, t.hub).size >= 2) continue;
    if (receiverInterference(solved, t.id) >= 2) continue;
    candidates.push(t);
  }
  const shuffled = shuffle(rng, candidates);
  const alreadyFree = hubs.filter((t) => !t.locked).length;
  // Never lock below 5 free discs — anti-shortcut + scramble need DoF.
  const maxLock = Math.max(0, alreadyFree - 5);
  let locked = 0;
  for (let i = maxKeepFree; i < shuffled.length && locked < maxLock; i++) {
    shuffled[i].locked = true;
    const src = solved.tables.find((x) => x.id === shuffled[i].id);
    if (src) src.locked = true;
    locked++;
  }
}

/**
 * Independent discs a player can act on. Geared pairs share one degree of
 * freedom — acting on either turns both, so only the lower id is expanded.
 */
function actorIds(tables: TableDef[]): number[] {
  return tables
    .filter((t) => !t.locked && !(t.link && t.id > t.link.partner))
    .map((t) => t.id);
}

/**
 * Cheap anti-shortcut gate (runs only on the final candidate, not every attempt).
 *
 * The old failure: open boards had many winning disc configs, so a player could
 * poke a few discs and stumble into a win in 3–5 moves. A full shortest-path BFS
 * is exponential and unusable at runtime, so we combine two bounded checks:
 *
 *  1. Exhaustive depth ≤ `exactDepth` (proves NO win exists that close).
 *  2. Randomized probing: many short action sequences (len 3..`probeLen`) — if any
 *     wins, the board has a stumble-solution and is rejected.
 *
 * Passing means: no win within `exactDepth`, and no lucky short win was found by
 * heavy sampling — i.e. the player must actually plan.
 */
function hasCheapSolve(
  level: LevelData,
  exactDepth: number,
  probeLen: number,
  probes: number,
  exactNodeCap: number,
): boolean {
  const start = buildState(level);
  if (solve(start).won) return true;
  const acts = actorIds(start.tables);
  const keyOf = (g: ReturnType<typeof buildState>) =>
    g.tables.map((t) => t.rotationQ).join("") +
    "|" +
    g.cells
      .map((c) =>
        c.kind === Kind.PHASE_SWITCH || c.kind === Kind.PAD ? String(c.phase ?? 0) : "",
      )
      .join("");

  type Extra = { kind: "flip" | "place"; x: number; y: number };
  const extrasOf = (g: ReturnType<typeof buildState>): Extra[] => {
    const out: Extra[] = [];
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const c = g.cells[y * g.width + x];
        if (c.kind === Kind.PHASE_SWITCH) out.push({ kind: "flip", x, y });
        if (c.kind === Kind.PAD && (c.phase ?? 0) === 0 && level.tokenBudget > 0)
          out.push({ kind: "place", x, y });
      }
    }
    return out;
  };
  const applyExtra = (g: ReturnType<typeof buildState>, ex: Extra): boolean => {
    const c = g.cells[ex.y * g.width + ex.x];
    if (ex.kind === "flip") {
      if (c.kind !== Kind.PHASE_SWITCH) return false;
      c.phase = (c.phase ?? 0) ^ 1;
      return true;
    }
    if (c.kind !== Kind.PAD || (c.phase ?? 0) === 1) return false;
    let used = 0;
    for (const x of g.cells) if (x.kind === Kind.PAD && (x.phase ?? 0) === 1) used++;
    if (used >= level.tokenBudget) return false;
    c.phase = 1;
    return true;
  };

  if (!acts.length && !extrasOf(start).length) return false;

  // 1) Exhaustive shallow BFS — proves no win at depth 1..exactDepth.
  const seen = new Set<string>([keyOf(start)]);
  let frontier = [start];
  let nodes = 1;
  for (let depth = 0; depth < exactDepth; depth++) {
    const next: typeof frontier = [];
    for (const cur of frontier) {
      for (const id of acts) {
        const table = cur.tables.find((t) => t.id === id)!;
        for (let q = 0; q < 4; q++) {
          if (q === table.rotationQ) continue;
          if (nodes >= exactNodeCap) break;
          const g = cloneGrid(cur);
          if (!applyPlayerRotation(g, id, q)) continue;
          const k = keyOf(g);
          if (seen.has(k)) continue;
          seen.add(k);
          nodes++;
          if (solve(g).won) return true;
          next.push(g);
        }
      }
      for (const ex of extrasOf(cur)) {
        if (nodes >= exactNodeCap) break;
        const g = cloneGrid(cur);
        if (!applyExtra(g, ex)) continue;
        const k = keyOf(g);
        if (seen.has(k)) continue;
        seen.add(k);
        nodes++;
        if (solve(g).won) return true;
        next.push(g);
      }
    }
    if (!next.length) break;
    frontier = next;
  }

  // 2) Randomized deeper probing — catches multi-solution "stumble" boards that
  //    exhaustive shallow search can't reach.
  let rngState = 0x1234abcd ^ (level.par * 2654435761);
  const rand = () => {
    rngState = (Math.imul(rngState ^ (rngState >>> 15), 1 | rngState) + 0x6d2b79f5) | 0;
    return ((rngState >>> 0) % 100000) / 100000;
  };
  for (let p = 0; p < probes; p++) {
    const g = cloneGrid(start);
    const len = 3 + Math.floor(rand() * (probeLen - 2)); // 3..probeLen
    for (let s = 0; s < len; s++) {
      const extras = extrasOf(g);
      const pool = acts.length + extras.length;
      if (!pool) break;
      const pick = Math.floor(rand() * pool);
      if (pick < acts.length) {
        const id = acts[pick];
        const table = g.tables.find((t) => t.id === id)!;
        let q = Math.floor(rand() * 4);
        if (q === table.rotationQ) q = (q + 1) % 4;
        applyPlayerRotation(g, id, q);
      } else {
        applyExtra(g, extras[pick - acts.length]!);
      }
      if (solve(g).won) return true;
    }
  }
  return false;
}

/** Link pairs of free elbows into gears (each turns the other). Prefer cross-channel pairs. */
function assignGears(
  hubs: TableDef[],
  sharedId: number,
  pairs: number,
  rng: Rng,
  result: ReturnType<typeof solve>,
): Set<number> {
  const linked = new Set<number>();
  if (pairs <= 0) return linked;
  const eligible = hubs.filter(
    (t) =>
      !t.locked &&
      (t.module === M.ELBOW || t.module === M.STRAIGHT) &&
      t.id !== sharedId &&
      !t.link,
  );
  // Score: prefer pairing discs that sit on different channels so one twist
  // disturbs two routes at once.
  const channelOf = (t: TableDef) => {
    const ch = [...channelsThroughHub(result, t.hub)];
    return ch.length ? ch[0] : -1;
  };
  const shuffled = shuffle(rng, eligible);
  const used = new Set<number>();
  let made = 0;
  // Pass 1: cross-channel pairs
  for (let i = 0; i < shuffled.length && made < pairs; i++) {
    const a = shuffled[i];
    if (used.has(a.id)) continue;
    const ca = channelOf(a);
    const b = shuffled.find(
      (x) => !used.has(x.id) && x.id !== a.id && channelOf(x) !== ca && channelOf(x) >= 0 && ca >= 0,
    );
    if (!b) continue;
    const sign: 1 | -1 = rng() < 0.5 ? 1 : -1;
    a.link = { partner: b.id, sign };
    b.link = { partner: a.id, sign };
    linked.add(a.id);
    linked.add(b.id);
    used.add(a.id);
    used.add(b.id);
    made++;
  }
  // Pass 2: any remaining elbows if we still need pairs
  const rest = shuffle(
    rng,
    eligible.filter((t) => !used.has(t.id)),
  );
  for (let i = 0; i + 1 < rest.length && made < pairs; i += 2) {
    const a = rest[i];
    const b = rest[i + 1];
    const sign: 1 | -1 = rng() < 0.5 ? 1 : -1;
    a.link = { partner: b.id, sign };
    b.link = { partner: a.id, sign };
    linked.add(a.id);
    linked.add(b.id);
    made++;
  }
  return linked;
}

function scrambleAndVerify(
  bp: Blueprint,
  grid: CellData[],
  rng: Rng,
  opts: ReturnType<typeof profile>,
  difficulty: number,
  extras: { requirePhase: boolean; requireTokens: boolean; tokenBudget: number } = {
    requirePhase: false,
    requireTokens: false,
    tokenBudget: 0,
  },
): LevelData | null {
  applyLocks(bp.hubs, opts.structuralLocks, rng);
  for (const h of bp.hubs) {
    if (h.module === M.GATE || h.module === M.TEE || h.module === M.CROSS) h.locked = false;
    if (bp.forceFree.has(key(h.pos))) h.locked = false;
  }

  const hubs = bp.hubs.map((h, i) => table(i, h.pos.x, h.pos.y, h.module, h.rot, 0, h.locked));
  const solved: LevelData = {
    id: `diff_${difficulty}`,
    title: levelTitle(difficulty),
    width: bp.size,
    height: bp.size,
    par: 1,
    undoLimit: opts.undoLimit,
    pulseLimit: opts.pulseLimit,
    tokenBudget: extras.tokenBudget,
    tables: hubs,
    cells: grid,
    solution: [],
  };

  if (!allReceiversGeometricallyReachable(solved)) return null;

  const solvedResult = solve(buildState(solved));
  if (!solvedResult.won) return null;
  if (solvedResult.spillReceivers.length > 0) return null;
  if (!allHubsOnBeams(solved, solvedResult)) return null;
  if (!gateIsRequired(solved)) return null;
  if (extras.requirePhase && !phaseIsRequired(solved)) return null;
  if (extras.requireTokens && !tokenIsRequired(solved)) return null;
  if (!hubs.some((t) => t.module === M.GATE)) return null;
  if (!hubs.some((t) => t.module === M.TEE)) return null;
  if (!hubs.some((t) => t.module === M.CROSS)) return null;
  if (!sharedHubIsCoupled(solved, bp.sharedHubIndex)) return null;

  // Freeze locally-obvious single-channel elbows so free discs are mostly
  // multi-channel / high-interference — greedy neighbor-matching can't clear the board.
  lockLocallyObvious(hubs, solved, solvedResult, opts.maxLocalFree, rng, bp.forceFree);
  // Locks don't change routing at the solved pose, but re-check win + beam coverage.
  if (!solve(buildState(solved)).won) return null;
  // After locking locals, require the remaining free set to be deep: nearly all
  // critical, enough multi-channel hubs, enough multi-receiver bottlenecks.
  const freeLeft = hubs.filter((t) => !t.locked).length;
  if (freeLeft < 5) return null;
  if (countCriticalTables(solved) < Math.min(opts.minCritical, freeLeft - 1)) return null;
  if (countMultiChannelTables(solved, solvedResult) < opts.minMultiChannel) return null;
  if (countHighInterference(solved) < Math.min(opts.minHighInterference, freeLeft - 1)) return null;

  if (opts.requireWorm) {
    const worms = solved.cells.filter((c) => c.kind === Kind.WORMHOLE).length;
    if (worms < 2) return null;
  }
  const barriers = solved.cells.filter((c) => c.kind === Kind.BARRIER).length;
  if (barriers < opts.requireBarriers) return null;
  if (opts.requireChannels >= 3) {
    const ch = new Set(
      solved.cells.filter((c) => c.kind === Kind.EMITTER).map((c) => c.channel ?? 0),
    );
    if (ch.size < 3) return null;
  }

  // Gears: link free elbow pairs so one action turns both. Prefer cross-channel
  // couples so twisting one disc disturbs two routes.
  const geared = assignGears(hubs, bp.sharedHubIndex, opts.gearPairs, rng, solvedResult);
  if (opts.gearPairs > 0 && geared.size < opts.gearPairs * 2) return null;

  const g = buildState(solved);
  const solution: MoveStep[] = [];
  const scrambled = new Set<number>();

  // Scramble co-equal systems first: disarm switches, clear tokens.
  // Solving requires flipping / placing these before (or with) disc work.
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const c = g.cells[y * g.width + x];
      if (c.kind === Kind.PHASE_SWITCH && (c.phase ?? 0) === 1) {
        c.phase = 0;
        solution.push(flipAt(x, y));
      }
      if (c.kind === Kind.PAD && (c.phase ?? 0) === 1) {
        c.phase = 0;
        solution.push(placeAt(x, y));
      }
    }
  }

  // Geared pairs share one degree of freedom: one offset moves both, and the
  // player solves the pair by turning the lead disc (partner follows via gears).
  for (const t of g.tables) {
    if (t.locked || !t.link || scrambled.has(t.id)) continue;
    const partner = g.tables.find((x) => x.id === t.link!.partner);
    if (!partner) continue;
    scrambled.add(t.id);
    scrambled.add(partner.id);
    const o = 1 + Math.floor(rng() * 3); // 1..3
    setTableRotation(g, t.id, t.rotationQ + o);
    setTableRotation(g, partner.id, partner.rotationQ + o * t.link.sign);
    const steps = o === 3 ? [1] : Array.from({ length: o }, () => -1);
    for (const d of steps) solution.push(move(t.id, d as -1 | 1));
  }

  for (const t of g.tables) {
    if (t.locked || scrambled.has(t.id)) continue;
    // Never scramble the shared CROSS into an accidental still-solved dual axis —
    // always move it, and prefer single steps so undoing stays tractable.
    const isShared = t.id === bp.sharedHubIndex;
    const amount = isShared ? 1 : rng() < opts.doubleChance ? 2 : 1;
    const sign = rng() < 0.5 ? 1 : -1;
    setTableRotation(g, t.id, t.rotationQ + sign * amount);
    for (let k = 0; k < amount; k++) solution.push(move(t.id, (-sign) as -1 | 1));
  }
  for (const t of g.tables) {
    if (t.locked || scrambled.has(t.id)) continue;
    const sol = hubs.find((x) => x.id === t.id)!;
    if (((t.rotationQ % 4) + 4) % 4 === ((sol.rotationQ % 4) + 4) % 4) {
      setTableRotation(g, t.id, t.rotationQ + 1);
      solution.push(move(t.id, -1));
    }
  }
  for (let i = solution.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [solution[i], solution[j]] = [solution[j], solution[i]];
  }
  // After locking locally-obvious discs, DoF shrinks — require a long plan relative
  // to remaining free actors, not the pre-lock profile minMoves.
  const freeDoF = actorIds(hubs).length;
  const moveFloor = Math.min(opts.minMoves, Math.max(6, freeDoF));
  if (solution.length < moveFloor) return null;

  const probe: LevelData = {
    id: `diff_${difficulty}`,
    title: levelTitle(difficulty),
    width: bp.size,
    height: bp.size,
    par: solution.length,
    undoLimit: opts.undoLimit,
    pulseLimit: opts.pulseLimit,
    tokenBudget: extras.tokenBudget,
    tables: g.tables.map((t) => ({ ...t, hub: { ...t.hub }, link: t.link ? { ...t.link } : undefined })),
    cells: g.cells.map((c) => ({ ...c })),
    solution,
  };

  // Anti-shortcut gate (final candidate only, kept cheap so runtime gen stays
  // fast): no win within `exactDepth`, and no lucky short win under random
  // probing. This is what stops the 3–5 move "poke and stumble" solves that made
  // every level trivial. Depth-2 is exhaustive (proves no 1–2 move win); probing
  // catches deeper stumbles. Deeper exact search is unsatisfiable on open boards.
  const exactDepth = 3;
  const probeLen = difficulty >= 8 ? 6 : 5;
  const probes = difficulty >= 8 ? 2000 : 1500;
  if (hasCheapSolve(probe, exactDepth, probeLen, probes, 45_000)) return null;

  const level: LevelData = {
    id: `diff_${difficulty}`,
    title: levelTitle(difficulty),
    width: bp.size,
    height: bp.size,
    par: solution.length,
    undoLimit: opts.undoLimit,
    pulseLimit: opts.pulseLimit,
    tokenBudget: extras.tokenBudget,
    tables: g.tables.map((t) => ({ ...t, hub: { ...t.hub }, link: t.link ? { ...t.link } : undefined })),
    cells: g.cells.map((c) => ({ ...c })),
    solution,
    tutorial: false,
    hint:
      difficulty === 1
        ? "Learn the language. Rings teleport. Shutters pass one way. PULSE only when ready."
        : difficulty === 2
          ? "Phase switches flip polarity. Phase gates only pass the matching phase."
          : difficulty === 3
            ? "Tokens sit on pads. A token door stays shut until its pad holds a token."
            : difficulty === 6
              ? "Cog-toothed discs are geared — turning one turns its partner. Align both at once."
              : undefined,
  };

  if (!allReceiversGeometricallyReachable(level)) return null;
  if (solve(buildState(level)).won) return null;
  const session = loadLevel(level);
  for (const step of solution) {
    if (!applySolutionStep(session, step)) return null;
  }
  if (!pulse(session)) return null;
  if (!session.result.won || session.moves !== level.par) return null;
  if (session.result.spillReceivers.length > 0) return null;
  if (!allHubsOnBeams(level, session.result)) return null;
  // Structural checks need the solved cell state (armed switches / filled pads).
  // Scramble mutates those cells; mixing them with solved hub rotations falsely fails.
  if (!gateIsRequired({ ...level, tables: hubs, cells: solved.cells })) return null;
  if (!sharedHubIsCoupled({ ...level, tables: hubs, cells: solved.cells }, bp.sharedHubIndex))
    return null;

  const cropped = cropLevel(level);
  const check = loadLevel(cropped);
  for (const step of cropped.solution) {
    if (!applySolutionStep(check, step)) return null;
  }
  if (!pulse(check) || !check.result.won) return null;
  if (!allReceiversGeometricallyReachable(cropped)) return null;
  return cropped;
}

export function generateLevel(difficulty: number, seed: number): LevelData {
  const d = Math.max(1, Math.min(DIFFICULTY_COUNT, difficulty));
  const rng = mulberry32((seed >>> 0) ^ Math.imul(d, 0x9e3779b9));
  const opts = profile(d);
  const masterpiece = d >= 16;
  const genius = d >= 11;

  // Fallbacks may shed garnish / openField, but never drop below a floor that
  // reintroduces short-cut wins, and never give back pulses on late tiers.
  // Coupling floors can ease slightly on last-resort plans so generation converges.
  const floor = Math.max(5, opts.minMoves - 2);
  const softCouple = {
    minHighInterference: Math.max(2, opts.minHighInterference - 2),
    minMultiChannel: Math.max(1, opts.minMultiChannel - 1),
    maxLocalFree: Math.min(2, opts.maxLocalFree + 1),
    requireSharedThird: false,
  };
  const plans: ReturnType<typeof profile>[] = masterpiece
    ? [
        opts,
        { ...opts, decoyWorms: 0, filters: 1, wallClumps: Math.max(5, opts.wallClumps - 3) },
        {
          ...opts,
          decoyWorms: 0,
          falseCorridors: 1,
          filters: 1,
          sinks: 1,
          mirrors: 1,
          barriers: 3,
          requireBarriers: 3,
          minMoves: floor,
          minCritical: 6,
          wallClumps: 14,
          ...softCouple,
        },
        {
          // Shorter chains so the blueprint always fits, still open + hard gate.
          ...opts,
          decoyWorms: 0,
          filters: 1,
          solidBefore: 2,
          keyBefore: 2,
          solidAfter: 2,
          minMoves: floor,
          minCritical: 5,
          wallClumps: Math.max(5, opts.wallClumps - 3),
          ...softCouple,
        },
          {
            ...opts,
            openField: false,
            decoyWorms: 0,
            filters: 0,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: floor,
            minCritical: 5,
            requireBarriers: 2,
            ...softCouple,
          },
          {
            // Absolute last resort: keep anti-shortcut + shared CROSS, ease coupling.
            ...opts,
            openField: false,
            decoyWorms: 0,
            filters: 0,
            mirrors: 0,
            sinks: 1,
            barriers: 2,
            requireBarriers: 2,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: 6,
            minCritical: 4,
            minHighInterference: 3,
            minMultiChannel: 1,
            maxLocalFree: 3,
            requireSharedThird: false,
            gearPairs: Math.min(1, opts.gearPairs),
            wallClumps: 6,
          },
        ]
      : genius
      ? [
          opts,
          { ...opts, decoyWorms: 0, mirrors: Math.max(1, opts.mirrors - 1) },
          {
            ...opts,
            decoyWorms: 0,
            filters: 1,
            sinks: 1,
            minMoves: floor,
            minCritical: Math.max(5, opts.minCritical - 1),
            wallClumps: Math.max(5, opts.wallClumps - 3),
            ...softCouple,
          },
          {
            // Shorter chains so the blueprint always fits.
            ...opts,
            decoyWorms: 0,
            filters: 1,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: floor,
            minCritical: 5,
            wallClumps: Math.max(5, opts.wallClumps - 3),
            ...softCouple,
          },
          {
            ...opts,
            openField: false,
            decoyWorms: 0,
            filters: 0,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: floor,
            minCritical: 5,
            requireBarriers: 2,
            ...softCouple,
          },
          {
            ...opts,
            openField: false,
            decoyWorms: 0,
            filters: 0,
            mirrors: 0,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: 6,
            minCritical: 4,
            minHighInterference: 3,
            minMultiChannel: 1,
            maxLocalFree: 3,
            requireSharedThird: false,
            gearPairs: Math.min(1, opts.gearPairs),
          },
        ]
      : [
          opts,
          { ...opts, decoyWorms: 0, filters: Math.max(0, opts.filters - 1) },
          {
            // Shorter chains so 3-channel blueprints fit near board center.
            ...opts,
            decoyWorms: 0,
            filters: 0,
            mirrors: 0,
            sinks: Math.min(opts.sinks, 1),
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: floor,
            minCritical: Math.max(3, opts.minCritical - 1),
            wallClumps: Math.max(4, opts.wallClumps - 3),
            ...softCouple,
          },
          {
            // Guided last resort — shorter chains but KEEP the tier's channel
            // count so the 3-channel guarantee holds even on the fallback.
            ...opts,
            openField: false,
            decoyWorms: 0,
            filters: 0,
            mirrors: 0,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            minMoves: Math.max(5, opts.minMoves - 2),
            minCritical: 3,
            ...softCouple,
          },
          {
            ...opts,
            openField: false,
            decoyWorms: 0,
            filters: 0,
            mirrors: 0,
            solidBefore: 2,
            keyBefore: 2,
            solidAfter: 2,
            channels: opts.requireChannels,
            requireChannels: opts.requireChannels,
            minMoves: 5,
            minCritical: 3,
            minHighInterference: 2,
            minMultiChannel: 1,
            maxLocalFree: 4,
            requireSharedThird: false,
            requireBarriers: Math.min(2, opts.requireBarriers),
          },
        ];

  const attempts = masterpiece ? 3000 : genius ? 2200 : 1400;
  // Try full kit first; if it never lands, degrade so a level still ships.
  // Kit placement seals a local corridor, so it lands on most blueprints.
  // Keep kit attempts modest; fall back only if sealing keeps breaking the win.
  const kitPlans: { requirePhase: boolean; requireTokens: boolean; tokenBudget: number; maxAttempts: number }[] =
    d >= 3
      ? [
          { requirePhase: true, requireTokens: true, tokenBudget: d >= 12 ? 2 : 1, maxAttempts: 60 },
          { requirePhase: true, requireTokens: false, tokenBudget: 0, maxAttempts: 40 },
          { requirePhase: false, requireTokens: false, tokenBudget: 0, maxAttempts: attempts },
        ]
      : d >= 2
        ? [
            { requirePhase: true, requireTokens: false, tokenBudget: 0, maxAttempts: 60 },
            { requirePhase: false, requireTokens: false, tokenBudget: 0, maxAttempts: attempts },
          ]
        : [{ requirePhase: false, requireTokens: false, tokenBudget: 0, maxAttempts: attempts }];

  for (const kit of kitPlans) {
    for (const cfg of plans) {
      for (let attempt = 0; attempt < kit.maxAttempts; attempt++) {
        const bp = tryBlueprint(rng, cfg);
        if (!bp) continue;
        const painted = paintGrid(bp, rng, cfg.falseCorridors, cfg.openField, cfg.wallClumps);
        const hazardsOk = placeHazards(
          painted.grid,
          bp,
          painted.trapEnds,
          painted.trapCells,
          rng,
          cfg,
        );
        if (!hazardsOk) continue;
        if (kit.requirePhase || kit.requireTokens) {
          const kitOk = placePhaseTokenKit(
            painted.grid,
            bp,
            rng,
            kit.requirePhase,
            kit.requireTokens,
            kit.tokenBudget,
          );
          if (!kitOk) continue;
        }
        const level = scrambleAndVerify(bp, painted.grid, rng, cfg, d, {
          requirePhase: kit.requirePhase,
          requireTokens: kit.requireTokens,
          tokenBudget: kit.tokenBudget,
        });
        if (level) return level;
      }
    }
  }

  throw new Error(`levelGen failed for difficulty ${d} seed ${seed}`);
}

export function allLevels(): LevelData[] {
  return Array.from({ length: Math.min(8, DIFFICULTY_COUNT) }, (_, i) =>
    generateLevel(i + 1, 1000 + i * 97),
  );
}
