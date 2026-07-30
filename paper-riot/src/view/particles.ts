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
  img: string;
};

const PARTICLE_KEYS = [
  "confetti-a",
  "confetti-b",
  "confetti-c",
  "confetti-d",
  "splat-a",
  "puff-a",
  "star-a",
  "bits",
] as const;

let particles: Particle[] = [];

export function burstAt(x: number, y: number, amount = 10): void {
  for (let i = 0; i < amount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 180;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 40,
      life: 0,
      max: 0.45 + Math.random() * 0.45,
      size: 18 + Math.random() * 28,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 8,
      img: PARTICLE_KEYS[(Math.random() * PARTICLE_KEYS.length) | 0]!,
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
    p.vy += 420 * dt;
    p.rot += p.spin * dt;
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
    const img = particleImage(p.img);
    const t = p.life / p.max;
    const a = 1 - t;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const s = p.size * (0.7 + 0.5 * (1 - t));
    if (img && img.complete) {
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
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
