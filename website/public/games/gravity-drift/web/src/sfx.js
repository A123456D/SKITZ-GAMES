// Gravity Drift — procedural audio (WebAudio, zero assets).
// Armed on first user gesture. M mutes. All sounds synthesized.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
    this._noise = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return true;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 6;
      this.master.connect(comp).connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  get t() { return this.ctx.currentTime; }

  noiseBuf() {
    if (this._noise) return this._noise;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 1, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }

  blip(freq, dur = 0.05, type = "square", vol = 0.06, slide = 0) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), this.t + dur);
    g.gain.setValueAtTime(vol, this.t);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    o.connect(g).connect(this.master);
    o.start(); o.stop(this.t + dur + 0.02);
  }

  whoosh(dur = 0.25, vol = 0.1) {
    if (!this.ctx || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf();
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(1400, this.t);
    f.frequency.exponentialRampToValueAtTime(220, this.t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.t);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(); src.stop(this.t + dur + 0.05);
  }

  thud(vol = 0.16) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, this.t);
    o.frequency.exponentialRampToValueAtTime(52, this.t + 0.12);
    g.gain.setValueAtTime(vol, this.t);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + 0.16);
    o.connect(g).connect(this.master);
    o.start(); o.stop(this.t + 0.2);
  }

  // musical notes: A minor pentatonic-ish ladder
  note(freq, when, dur = 0.22, vol = 0.1, type = "triangle") {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.master);
    o.start(when); o.stop(when + dur + 0.05);
  }

  clear(count, combo) {
    if (!this.ctx || this.muted) return;
    const base = [220, 261.63, 329.63, 392, 440]; // A3 C4 E4 G4 A4
    const t0 = this.t + 0.01;
    const step = Math.max(0.05, 0.09 - combo * 0.008);
    const roots = base.slice(0, Math.min(4, 1 + combo));
    roots.forEach((f, i) => {
      this.note(f, t0 + i * step, 0.26, 0.11, "triangle");
      this.note(f * 2, t0 + i * step + 0.012, 0.2, 0.05, "sine");
    });
    // sparkle layer scales with rings cleared
    for (let i = 0; i < Math.min(6, count * 2); i++) {
      this.note(660 + i * 110 + Math.random() * 60, t0 + 0.06 + i * 0.035, 0.14, 0.035, "sine");
    }
    if (count > 1 || combo > 2) this.whoosh(0.35, 0.08);
  }

  levelUp() {
    if (!this.ctx || this.muted) return;
    const t0 = this.t + 0.02;
    [261.63, 329.63, 392, 523.25].forEach((f, i) => this.note(f, t0 + i * 0.07, 0.2, 0.09, "triangle"));
  }

  gameover() {
    if (!this.ctx || this.muted) return;
    const t0 = this.t;
    this.whoosh(0.9, 0.16);
    [220, 174.61, 138.59, 110].forEach((f, i) =>
      this.note(f, t0 + 0.1 + i * 0.16, 0.5, 0.1, "sawtooth"));
    this.thud(0.2);
  }

  ambientStart() {
    if (!this.ctx || this.ambient) return;
    const g = this.ctx.createGain();
    g.gain.value = 0.0;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 240; f.Q.value = 0.7;
    const o1 = this.ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 55;
    const o2 = this.ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = 55.7;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 60;
    lfo.connect(lfoG).connect(f.frequency);
    o1.connect(f); o2.connect(f); f.connect(g).connect(this.master);
    o1.start(); o2.start(); lfo.start();
    g.gain.linearRampToValueAtTime(0.035, this.t + 2.5);
    this.ambient = { nodes: [o1, o2, lfo], gain: g };
  }

  ambientStop() {
    if (!this.ambient) return;
    const { nodes, gain } = this.ambient;
    gain.gain.linearRampToValueAtTime(0, this.t + 0.6);
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch {} }), 700);
    this.ambient = null;
  }
}
