/** Cap device pixel ratio for mobile GPU budget */
export function effectiveDpr(max = 2): number {
  const raw = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.min(Math.max(1, raw), max);
}

export class FpsSampler {
  private frames = 0;
  private t0 = performance.now();
  fps = 60;

  tick(now = performance.now()): void {
    this.frames++;
    const dt = now - this.t0;
    if (dt >= 500) {
      this.fps = (this.frames * 1000) / dt;
      this.frames = 0;
      this.t0 = now;
    }
  }
}
