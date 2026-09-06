// Gravity Drift — game state: well occupancy, active piece, aiming/falling,
// ring clears with cascade, combos, stats. Rules ported 1:1 from the shipped build.
import {
  SPOKES, RINGS, CELL, HOLE, WELL_R, PIECES, rotateCells, wrapSpoke,
  gravityInterval, levelFor, SCORE_PER_RING, SCORE_PER_CELL,
} from "./constants.js";

export const Aim = { AIMING: "aiming", FALLING: "falling", GAME_OVER: "gameover" };

// mulberry32 — seeded RNG for the 7-bag
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeBag(rng) {
  const idx = PIECES.map((_, i) => i);
  for (let i = 0; i < idx.length; i++) {
    const j = Math.floor(rng() * (idx.length - i)) + i;
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export class Game {
  constructor(events, rng = Math.random) {
    this.events = events;           // juice sink: (event) => void
    this.reset(rng);
  }

  reset(rng = Math.random) {
    this.rng = rng;
    this.occupied = Array.from({ length: RINGS }, () => Array(SPOKES).fill(false));
    this.colors = Array.from({ length: RINGS }, () => Array.from({ length: SPOKES }, () => [0, 0, 0, 0]));
    this.queue = [];
    this.refill();
    this.piece = null;
    this.phase = Aim.AIMING;
    this.aimSpoke = 0;
    this.score = 0;
    this.lines = 0;
    this.combo = 0;
    this.gravityCd = 0;
    this.elapsed = 0;
    this.events?.({ type: "reset" });
  }

  refill() {
    while (this.queue.length < 6) this.queue.push(...makeBag(this.rng));
  }

  level() { return levelFor(this.lines); }

  upcoming(n = 3) { return this.queue.slice(0, n).map(i => PIECES[i]); }

  /** Spawn at rim on the current aim spoke. Returns false -> core breach. */
  spawn() {
    this.refill();
    const idx = this.queue.shift();
    const def = PIECES[idx];
    const maxRing = Math.max(...def.cells.map(c => c[0]));
    const anchor = RINGS - 1 - maxRing; // top ring of the piece sits on the rim
    this.piece = {
      def,
      cells: def.cells.map(([r, s]) => [r, s]),
      ring: anchor,
      spoke: this.aimSpoke,
    };
    if (this.collides(this.piece)) {
      this.phase = Aim.GAME_OVER;
      this.events?.({ type: "gameover" });
      return false;
    }
    this.phase = Aim.AIMING;
    return true;
  }

  collides(piece) {
    for (const [dr, ds] of piece.cells) {
      const ring = piece.ring + dr;
      const spoke = wrapSpoke(piece.spoke + ds);
      if (ring < 0 || ring >= RINGS) return true;
      if (this.occupied[ring][spoke]) return true;
    }
    return false;
  }

  /** Aim rotation (W/Q): re-anchor the rim-hugging piece, clamped inward. */
  rotateAim() {
    if (this.phase !== Aim.AIMING || !this.piece) return false;
    const next = rotateCells(this.piece.cells);
    const maxRing = Math.max(...next.map(c => c[0]));
    let ring = this.piece.ring + (Math.max(...this.piece.cells.map(c => c[0])) - maxRing);
    const p = { def: this.piece.def, cells: next, ring, spoke: this.piece.spoke };
    while (p.ring > 0 && this.collides(p)) p.ring--; // clamp inward if against stack
    if (this.collides(p)) return false;
    this.piece.cells = next;
    this.piece.ring = p.ring;
    this.events?.({ type: "rotate" });
    return true;
  }

  aimBy(delta) {
    if (this.phase !== Aim.AIMING || !this.piece) return false;
    const next = wrapSpoke(this.aimSpoke + delta);
    const p = { ...this.piece, spoke: next };
    if (this.collides(p)) {
      this.events?.({ type: "blocked" });
      return false;
    }
    this.aimSpoke = next;
    this.piece.spoke = next;
    return true;
  }

  /** Space: detach and let it fall. */
  release() {
    if (this.phase !== Aim.AIMING || !this.piece) return false;
    this.phase = Aim.FALLING;
    this.gravityCd = 0;
    this.events?.({ type: "release" });
    return true;
  }

  /** S: instant drop to landing spot. */
  hardDrop() {
    if (this.phase !== Aim.AIMING || !this.piece) return false;
    while (this.stepDown(true)) { /* fall until blocked */ }
    this.lockPiece();
    this.events?.({ type: "harddrop" });
    return true;
  }

  /** One gravity step inward. Returns false when resting on stack/core. */
  stepDown(silent = false) {
    const p = { ...this.piece, ring: this.piece.ring - 1 };
    if (this.piece.ring <= 0 || this.collides(p)) return false;
    this.piece.ring -= 1;
    if (!silent) this.events?.({ type: "step" });
    return true;
  }

  /** Lowest ring the piece would land on if released now. */
  ghostRing(piece = this.piece) {
    let r = piece.ring;
    while (r > 0 && !this.collides({ ...piece, ring: r - 1 })) r--;
    return r;
  }

  lockPiece() {
    const cellList = this.piece.cells.map(([dr, ds]) => ({
      ring: this.piece.ring + dr,
      spoke: wrapSpoke(this.piece.spoke + ds),
    }));
    const c = this.piece.def.color;
    const colorCss = `rgba(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)},1)`;
    for (const [dr, ds] of this.piece.cells) {
      const ring = this.piece.ring + dr;
      const spoke = wrapSpoke(this.piece.spoke + ds);
      this.occupied[ring][spoke] = true;
      this.colors[ring][spoke] = this.piece.def.color.slice();
    }
    const clearedRings = this.collapseRings();
    const cells = this.piece.cells.length;
    if (clearedRings.length > 0) {
      this.combo += 1;
      this.lines += clearedRings.length;
      const gained = clearedRings.length * SCORE_PER_RING * this.combo * this.level();
      this.score += gained;
      this.events?.({ type: "clear", count: clearedRings.length, combo: this.combo,
        rings: clearedRings, gained, cells: cellList, colorCss });
    } else {
      this.combo = 0;
      this.score += cells * SCORE_PER_CELL;
      this.events?.({ type: "lock", cells: cellList, colorCss });
    }
    this.spawnOrDie();
  }

  /** Clear full rings innermost-first; collapse everything inward; repeat for cascades. */
  collapseRings() {
    const cleared = [];
    for (;;) {
      const full = this.occupied.findIndex(row => row.every(Boolean));
      if (full === -1) break;
      for (let s = 0; s < SPOKES; s++) cleared.push({ ring: full, spoke: s, color: this.colors[full][s].slice() });
      for (let r = full; r < RINGS - 1; r++) {
        this.occupied[r] = this.occupied[r + 1];
        this.colors[r] = this.colors[r + 1];
      }
      this.occupied[RINGS - 1] = Array(SPOKES).fill(false);
      this.colors[RINGS - 1] = Array.from({ length: SPOKES }, () => [0, 0, 0, 0]);
    }
    return cleared;
  }

  spawnOrDie() {
    if (!this.spawn()) return;
    this.events?.({ type: "spawn", piece: this.piece.def.name });
  }

  update(dt) {
    if (this.phase === Aim.GAME_OVER) return;
    this.elapsed += dt;

    if (this.phase === Aim.AIMING) {
      // gentle inward nudge while aiming (legacy feel)
      this.gravityCd -= dt;
      while (this.gravityCd <= 0) {
        this.gravityCd += gravityInterval(this.level());
        if (!this.stepDown()) break;
      }
      return;
    }

    if (this.phase === Aim.FALLING) {
      this.gravityCd -= dt;
      while (this.gravityCd <= 0) {
        this.gravityCd += gravityInterval(this.level());
        if (!this.stepDown()) {
          this.lockPiece();
          break;
        }
      }
    }
  }
}
