import { fxImage, particleImage } from "./stickers";
import type { TileKind } from "../core/types";

export type BurstStyle =
  | "confetti"
  | "splat"
  | "puff"
  | "star"
  | "bits"
  | "pop"
  | "bolt"
  | "heart"
  | "skull"
  | "bomb";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  spin: number;
  frames: readonly string[];
  frame: number;
  fps: number;
  /** fx: prefix uses match/pop sheets; pt: uses particles */
  source: "pt" | "fx";
};

const STYLE_FRAMES: Record<BurstStyle, { frames: readonly string[]; source: "pt" | "fx" }> = {
  confetti: {
    frames: ["confetti-a", "confetti-b", "confetti-c", "confetti-d", "confetti-e", "confetti-f"],
    source: "pt",
  },
  splat: { frames: ["splat-a", "splat-b", "splat-c"], source: "pt" },
  puff: { frames: ["puff-a", "puff-b", "puff-c", "puff-d", "puff-e"], source: "pt" },
  star: { frames: ["star-a", "star-b", "star-c"], source: "pt" },
  bits: { frames: ["bits", "star-a", "bits", "star-b"], source: "pt" },
  pop: { frames: ["pop-skull", "splat-a", "puff-a"], source: "fx" },
  bolt: { frames: ["match-bolts", "star-a", "bits"], source: "fx" },
  heart: { frames: ["match-hearts", "puff-b", "confetti-a"], source: "fx" },
  skull: { frames: ["match-skulls", "pop-skull", "splat-b"], source: "fx" },
  bomb: { frames: ["match-bomb", "splat-c", "puff-e"], source: "fx" },
};

/** Map matched sticker → particle language from the concept sheets. */
export function styleForTile(kind: TileKind | string): BurstStyle {
  switch (kind) {
    case "heart":
      return "heart";
    case "skull":
      return "skull";
    case "bolt":
      return "bolt";
    case "star":
    case "gem":
      return "star";
    case "flame":
    case "spray":
      return "splat";
    case "ghost":
    case "peace":
      return "puff";
    case "pizza":
    case "soda":
    case "skate":
      return "confetti";
    default:
      return "bits";
  }
}

export function styleForPower(kind: string): BurstStyle {
  if (kind === "bomb") return "bomb";
  if (kind === "disco") return "bomb";
  if (kind === "stapler") return "bits";
  if (kind === "magnet") return "star";
  if (kind === "plane" || kind === "rocket") return "bits";
  return "puff";
}

let particles: Particle[] = [];

function resolveImage(p: Particle) {
  const key = p.frames[Math.floor(p.frame) % p.frames.length]!;
  if (p.source === "fx") {
    return fxImage(key) ?? particleImage(key);
  }
  return particleImage(key) ?? fxImage(key);
}

export function burstAt(
  x: number,
  y: number,
  amount = 10,
  style: BurstStyle = "puff",
): void {
  const pack = STYLE_FRAMES[style] ?? STYLE_FRAMES.puff;
  for (let i = 0; i < amount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd =
      style === "bomb" || style === "splat"
        ? 100 + Math.random() * 220
        : 55 + Math.random() * 160;
    // Mix in a little secondary grit so bursts aren't one-note
    const usePack =
      i % 4 === 0 && style !== "confetti"
        ? STYLE_FRAMES.bits
        : i % 5 === 0 && (style === "heart" || style === "confetti")
          ? STYLE_FRAMES.confetti
          : pack;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 50,
      life: 0,
      max: 0.45 + Math.random() * 0.5,
      size: style === "bomb" || style === "bolt" ? 28 + Math.random() * 40 : 18 + Math.random() * 30,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 10,
      frames: usePack.frames,
      frame: Math.random() * usePack.frames.length,
      fps: 9 + Math.random() * 14,
      source: usePack.source,
    });
  }
}

/** Big stamped FX sticker that pops once at the match center. */
export function stampFx(
  x: number,
  y: number,
  style: BurstStyle,
): void {
  const stamp =
    style === "heart"
      ? "match-hearts"
      : style === "skull"
        ? "match-skulls"
        : style === "bolt"
          ? "match-bolts"
          : style === "star"
            ? "match-stars"
            : style === "bomb"
              ? "match-bomb"
              : style === "pop"
                ? "pop-skull"
                : "swap-star";
  particles.push({
    x,
    y,
    vx: 0,
    vy: -20,
    life: 0,
    max: 0.55,
    size: 110,
    rot: (Math.random() - 0.5) * 0.3,
    spin: (Math.random() - 0.5) * 2,
    frames: [stamp],
    frame: 0,
    fps: 1,
    source: "fx",
  });
  burstAt(x, y, 8, style);
}

export function updateParticles(dt: number): boolean {
  if (!particles.length) return false;
  const next: Particle[] = [];
  for (const p of particles) {
    p.life += dt;
    if (p.life >= p.max) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.source === "fx" && p.frames[0]?.startsWith("match-") ? 40 * dt : 420 * dt;
    p.rot += p.spin * dt;
    p.frame += p.fps * dt;
    next.push(p);
  }
  particles = next;
  return particles.length > 0;
}

export function hasParticles(): boolean {
  return particles.length > 0;
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    const img = resolveImage(p);
    const t = p.life / p.max;
    const a = Math.min(1, (1 - t) * 1.2);
    const pulse = 0.85 + 0.25 * Math.sin(p.frame * 1.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const s = p.size * (0.75 + 0.45 * (1 - t)) * pulse;
    if (img && img.complete) {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    }
    ctx.restore();
  }
}

export function clearParticles(): void {
  particles = [];
}
