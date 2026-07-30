import { particleImage } from "./stickers";

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
};

const SEQUENCES: readonly (readonly string[])[] = [
  ["confetti-a", "confetti-b", "confetti-c", "confetti-d"],
  ["confetti-c", "confetti-d", "confetti-a", "confetti-b"],
  ["splat-a", "splat-b", "splat-c"],
  ["puff-a", "puff-b", "puff-c", "puff-d", "puff-e"],
  ["star-a", "star-b", "star-c"],
  ["bits", "confetti-a", "bits", "confetti-b"],
];

let particles: Particle[] = [];

export function burstAt(x: number, y: number, amount = 10): void {
  for (let i = 0; i < amount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 70 + Math.random() * 200;
    const frames = SEQUENCES[(Math.random() * SEQUENCES.length) | 0]!;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 60,
      life: 0,
      max: 0.5 + Math.random() * 0.55,
      size: 20 + Math.random() * 32,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 10,
      frames,
      frame: Math.random() * frames.length,
      fps: 10 + Math.random() * 14,
    });
  }
}

export function updateParticles(dt: number): boolean {
  if (!particles.length) return false;
  const next: Particle[] = [];
  for (const p of particles) {
    p.life += dt;
    if (p.life >= p.max) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 460 * dt;
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
    const key = p.frames[Math.floor(p.frame) % p.frames.length]!;
    const img = particleImage(key);
    const t = p.life / p.max;
    const a = Math.min(1, (1 - t) * 1.15);
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
    } else {
      ctx.fillStyle = "#ff2d6a";
      ctx.fillRect(-s / 2, -s / 2, s, s);
    }
    ctx.restore();
  }
}

export function clearParticles(): void {
  particles = [];
}
