import type { CascadeEvent } from "../core/types";
import { cellCenter, type Layout } from "./draw";
import { Motion } from "./motion";
import { theme } from "./theme";

export type Banner = {
  text: string;
  sub?: string;
  color: string;
  life: number;
  max: number;
};

export type CascadeSfx = {
  beam: (step?: number) => void;
  capture: () => void;
  chain: (step: number) => void;
};

export class CascadePlayer {
  private queue: CascadeEvent[] = [];
  private timer = 0;
  private stepDelay = 0.22;
  playing = false;
  banners: Banner[] = [];
  onComplete: (() => void) | null = null;
  private reduced = false;
  private silent = false;
  private beamColor = theme.player;
  private hideSkip = false;

  start(
    events: CascadeEvent[],
    opts: {
      reduced?: boolean;
      onComplete: () => void;
      beamColor?: string;
      silent?: boolean;
      hideSkip?: boolean;
      stepDelay?: number;
    },
  ): void {
    this.queue = [...events];
    this.timer = 0;
    this.playing = true;
    this.reduced = opts.reduced ?? false;
    this.silent = opts.silent ?? false;
    this.hideSkip = opts.hideSkip ?? false;
    this.beamColor = opts.beamColor ?? theme.player;
    this.stepDelay = opts.stepDelay ?? (this.reduced ? 0.08 : 0.22);
    this.onComplete = opts.onComplete;
    this.banners = [];
  }

  skip(): void {
    if (!this.playing) return;
    this.queue = [];
    this.finish();
  }

  private finish(): void {
    this.playing = false;
    const cb = this.onComplete;
    this.onComplete = null;
    cb?.();
  }

  update(dt: number, layout: Layout, motion: Motion, sfx: CascadeSfx): void {
    for (const b of this.banners) b.life -= dt;
    this.banners = this.banners.filter((b) => b.life > 0);

    if (!this.playing) return;
    this.timer -= dt;
    if (this.timer > 0) return;

    const ev = this.queue.shift();
    if (!ev) {
      this.finish();
      return;
    }

    this.playEvent(ev, layout, motion, sfx);
    this.timer = this.stepDelay;
  }

  private playEvent(
    e: CascadeEvent,
    layout: Layout,
    motion: Motion,
    sfx: CascadeSfx,
  ): void {
    if (e.type === "beam") {
      const from = cellCenter(layout, e.beam.from);
      let to = from;
      if (e.beam.to) {
        to = cellCenter(layout, e.beam.to);
      } else {
        const reach = 160;
        if (e.beam.dir === "up") to = { x: from.x, y: from.y - reach };
        if (e.beam.dir === "down") to = { x: from.x, y: from.y + reach };
        if (e.beam.dir === "left") to = { x: from.x - reach, y: from.y };
        if (e.beam.dir === "right") to = { x: from.x + reach, y: from.y };
      }
      const width = 3 + e.beam.step * 1.5;
      motion.spawnBeam(from.x, from.y, to.x, to.y, this.beamColor, 0.4, width);
      if (!this.silent) sfx.beam(e.beam.step);
      if (e.beam.kind === "hit") {
        this.pushBanner("BEAM", undefined, theme.gridCyan, 0.35);
      }
    }
    if (e.type === "damage") {
      const c = cellCenter(layout, e.pos);
      motion.burst(c.x, c.y, theme.danger, this.reduced ? 4 : 8);
      this.pushBanner(`HIT -${e.amount}`, undefined, theme.danger, 0.45);
    }
    if (e.type === "capture") {
      const c = cellCenter(layout, e.pos);
      motion.captureBlast(c.x, c.y, this.beamColor, this.reduced);
      if (!this.silent) sfx.capture();
      const powerLine =
        e.powerSet > 1 ? `Tile stolen · Power → ${e.powerSet}` : "Tile stolen · Power → 1";
      this.pushBanner("OVERTHROW", powerLine, this.beamColor, 0.95);
    }
    if (e.type === "relay") {
      this.pushBanner("CHAIN", undefined, theme.energy, 0.4);
    }
    if (e.type === "split") {
      this.pushBanner("SPLIT", undefined, theme.energy, 0.4);
    }
    if (e.type === "reflect") {
      this.pushBanner(`REFLECT +${e.bonus}`, undefined, theme.gridPurple, 0.4);
    }
    if (e.type === "overkill") {
      this.pushBanner(`INVERT +${e.bonus}`, "Stolen Power boosted", theme.gridPurple, 0.7);
    }
    if (e.type === "fire") {
      if (e.step >= 3) {
        motion.chainPulse(e.step, this.beamColor);
        if (!this.silent) sfx.chain(e.step);
        this.pushBanner(`CHAIN x${e.step}`, undefined, theme.gridCyan, 0.4);
      }
    }
  }

  private pushBanner(text: string, sub: string | undefined, color: string, life: number): void {
    this.banners.push({ text, sub, color, life, max: life });
  }

  /** External one-shot coach banners (signature moments, etc.). */
  announce(text: string, sub: string | undefined, color: string, life = 1.1): void {
    this.pushBanner(text, sub, color, life);
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, reduced = false): void {
    for (const b of this.banners) {
      const t = b.life / b.max;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = b.color;
      if (!reduced) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 18;
      }
      ctx.font = "800 36px Orbitron, sans-serif";
      ctx.fillText(b.text, W / 2, H * 0.36);
      if (b.sub) {
        ctx.font = "600 14px JetBrains Mono, monospace";
        ctx.fillStyle = "#e8f0ff";
        ctx.fillText(b.sub, W / 2, H * 0.36 + 32);
      }
      ctx.restore();
    }

    if (this.playing && this.queue.length > 0 && !this.hideSkip) {
      ctx.save();
      const bx = W / 2 - 50;
      const by = H * 0.48;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx, by, 100, 28);
      ctx.strokeStyle = "#7a889f";
      ctx.strokeRect(bx, by, 100, 28);
      ctx.fillStyle = "#e8f0ff";
      ctx.font = "700 12px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SKIP", W / 2, by + 14);
      ctx.restore();
    }
  }

  hitSkip(x: number, y: number, W: number, H: number): boolean {
    if (!this.playing || this.hideSkip) return false;
    const bx = W / 2 - 50;
    const by = H * 0.48;
    return x >= bx && x <= bx + 100 && y >= by && y <= by + 28;
  }
}
