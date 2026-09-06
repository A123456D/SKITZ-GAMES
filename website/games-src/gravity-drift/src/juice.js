// Gravity Drift — juice layer: particles, shake, core pulse, floating text.
// Pure presentation; consumes game events, draws over the well in screen space.
export class Juice {
  constructor() {
    this.reset();
  }

  reset() {
    this.particles = [];   // {x,y,vx,vy,life,ttl,size,color,glow}
    this.pops = [];        // {x,y,text,life,ttl,color,scale}
    this.shake = 0;        // px amplitude
    this.shakeX = 0;
    this.shakeY = 0;
    this.pulse = 0;        // 0..2.2 core pulse fed to the shader
    this.flash = 0;        // 0..1 full-screen flash
    this.flashColor = [1, 1, 1];
    this.shock = [];       // expanding rings {r, ttl, life, color}
    this.time = 0;
  }

  addShake(a) { this.shake = Math.min(18, this.shake + a); }
  addFlash(a, color = [1, 1, 1]) { this.flash = Math.min(0.85, this.flash + a); this.flashColor = color; }
  addPulse(a) { this.pulse = Math.min(2.2, this.pulse + a); }

  spawnParticles(cx, cy, color, count, opts = {}) {
    const {
      speed = 90, spread = Math.PI * 2, dir = 0, size = 3.2,
      ttl = 0.7, ttlJitter = 0.4, glow = true, gravity = 60,
    } = opts;
    for (let i = 0; count > 0 && i < count; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.9);
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0, ttl: ttl * (1 - ttlJitter + Math.random() * ttlJitter * 2),
        size: size * (0.6 + Math.random() * 0.8),
        color, glow,
        gravity,
      });
    }
  }

  pop(x, y, text, color = "#7df9ff", scale = 1) {
    this.pops.push({ x, y, text, color, scale, life: 0, ttl: 1.05 });
  }

  ringShock(cx, cy, r, color = "160,220,255") {
    this.shock.push({ cx, cy, r, life: 0, ttl: 0.55, color });
  }

  /** Consume a game event; ctx converts polar cells to screen px. */
  onEvent(ev, ctx) {
    switch (ev.type) {
      case "lock": {
        if (!ctx) break;
        const [x, y] = ctx.cellCenter(ev.cells[0]);
        this.spawnParticles(x, y, ev.colorCss, 10, { speed: 70, size: 2.6, ttl: 0.5 });
        this.addShake(1.2);
        this.addPulse(0.06);
        break;
      }
      case "clear": {
        const n = ev.cells?.length || 1;
        const [x, y] = ctx.cellCenter(ev.cells?.[0] || null);
        this.spawnParticles(x, y, ev.colorCss, Math.min(90, 26 * n), {
          speed: 130, size: 3.4, ttl: 0.9,
        });
        this.addShake(Math.min(10, 2.5 + n * 1.1));
        this.addFlash(Math.min(0.35, 0.10 + n * 0.05), [0.7, 0.9, 1]);
        this.addPulse(0.5 + 0.35 * n);
        this.pop(x, y, `+${ev.gained}`, "#eaffff", 1.15);
        if (ev.combo > 1) this.pop(x, y - 34, `COMBO ×${ev.combo}`, "#ff9de2", 1.35);
        this.ringShock(x, y, ctx.coreRadiusPx() + 6);
        if (navigator.vibrate) navigator.vibrate(n > 1 ? [18, 40, 28] : 22);
        break;
      }
      case "harddrop": {
        this.addShake(3.2);
        if (navigator.vibrate) navigator.vibrate(12);
        break;
      }
      case "gameover":
        this.addShake(14);
        this.addFlash(0.5, [1, 0.4, 0.85]);
        this.addPulse(2.2);
        if (navigator.vibrate) navigator.vibrate([60, 50, 120]);
        break;
      case "rotate":
        this.addPulse(0.03);
        break;
      case "blocked":
        this.addShake(1.5);
        break;
      case "release":
        this.addPulse(0.05);
        break;
    }
  }

  update(dt) {
    this.time += dt;
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 1.6 * dt;
    }
    this.particles = this.particles.filter(p => p.life < p.ttl);
    for (const t of this.pops) t.life += dt;
    this.pops = this.pops.filter(t => t.life < t.ttl);
    for (const s of this.shock) s.life += dt;
    this.shock = this.shock.filter(s => s.life < s.ttl);
    this.shake *= Math.pow(0.0015, dt);           // fast decay
    this.flash *= Math.pow(0.008, dt);
    this.pulse *= Math.pow(0.25, dt);             // slow core afterglow
    const a = this.shake * (Math.random() - 0.5) * 2;
    this.shakeX = a;
    this.shakeY = this.shake * (Math.random() - 0.5) * 2;
  }

  draw(ctx) {
    // shockwaves
    for (const s of this.shock) {
      const t = s.life / s.ttl;
      ctx.strokeStyle = `rgba(${s.color},${(1 - t) * 0.8})`;
      ctx.lineWidth = 2.5 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r + t * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    // particles
    for (const p of this.particles) {
      const a = 1 - p.life / p.ttl;
      const c = p.color;
      ctx.globalAlpha = a;
      if (p.glow) { ctx.shadowColor = c; ctx.shadowBlur = 9; }
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    // floating pops
    ctx.textAlign = "center";
    for (const t of this.pops) {
      const k = t.life / t.ttl;
      const rise = -46 * k * k;
      const alpha = k < 0.12 ? k / 0.12 : 1 - Math.pow((k - 0.12) / 0.88, 2);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `700 ${Math.round(15 * t.scale + 3 * Math.sin(k * Math.PI))}px "Orbitron", "Segoe UI", sans-serif`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 12;
      ctx.fillText(t.text, t.x, t.y + rise);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
