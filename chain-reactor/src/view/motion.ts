type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size?: number;
};

export type BeamFx = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
  max: number;
  width: number;
};

type RingFx = {
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  radius: number;
};

export class Motion {
  particles: Particle[] = [];
  beams: BeamFx[] = [];
  rings: RingFx[] = [];
  shake = 0;
  /** Full-screen flash 0..1 */
  flash = 0;
  flashColor = "#2ef0ff";
  /** Chain depth glow pulse lingering after deep chains */
  chainGlow = 0;
  chainGlowColor = "#2ef0ff";

  spawnBeam(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    dur = 0.45,
    width = 4,
  ): void {
    this.beams.push({ x1, y1, x2, y2, color, life: dur, max: dur, width });
  }

  burst(x: number, y: number, color: string, n = 10, size = 3): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.4,
        max: 0.75,
        color,
        size,
      });
    }
  }

  ring(x: number, y: number, color: string, radius = 40, life = 0.45): void {
    this.rings.push({ x, y, color, radius, life: life, max: life });
  }

  /** Capture spectacle: flash + ring + dense burst. */
  captureBlast(x: number, y: number, color: string, reduced = false): void {
    this.flash = reduced ? 0.35 : 0.7;
    this.flashColor = color;
    this.hitShake(reduced ? 4 : 9);
    this.ring(x, y, color, reduced ? 50 : 90, 0.55);
    this.burst(x, y, color, reduced ? 10 : 28, reduced ? 3 : 5);
  }

  /** Sell deep chains visually. */
  chainPulse(step: number, color: string): void {
    if (step < 3) return;
    this.chainGlow = Math.max(this.chainGlow, step >= 4 ? 0.85 : 0.55);
    this.chainGlowColor = color;
  }

  hitShake(amount = 4): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 18);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.chainGlow = Math.max(0, this.chainGlow - dt * 0.7);
    this.beams = this.beams.filter((b) => {
      b.life -= dt;
      return b.life > 0;
    });
    this.rings = this.rings.filter((r) => {
      r.life -= dt;
      return r.life > 0;
    });
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D, W = 720, H = 1280, reduced = false): void {
    const glow = !reduced;
    if (this.chainGlow > 0.02 && glow) {
      ctx.save();
      ctx.globalAlpha = this.chainGlow * 0.22;
      const g = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, W * 0.55);
      g.addColorStop(0, this.chainGlowColor);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    for (const b of this.beams) {
      const t = b.life / b.max;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.4);
      ctx.strokeStyle = b.color;
      if (glow) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 18 + b.width * 2;
      }
      ctx.lineWidth = b.width + 3 * t;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    }

    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - t) * 0.9);
      ctx.strokeStyle = r.color;
      if (glow) {
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 20;
      }
      ctx.lineWidth = 3 + 4 * (1 - t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (0.35 + t * 1.1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size ?? 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.flash > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.flash * (glow ? 0.45 : 0.25);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
