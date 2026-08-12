import { getCard } from "../../core/cards";
import { printedFacePower, unitPower, witnessCostAt } from "../../core/match";
import type { Altitude, MatchState, OculusEvent, Side } from "../../core/types";
import {
  bakeCardFace,
  bakeLaneToken,
  bakePowerChip,
  bakeWitnessChip,
  type PowerChipMood,
  type WitnessChipMood,
} from "../cardBake";
import { effectiveDpr } from "../perf";

const VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform vec2 u_res;
uniform vec4 u_rect;
uniform float u_z;
uniform float u_veil;
out vec2 v_uv;
out float v_veil;
void main() {
  vec2 p = a_pos * u_rect.zw + u_rect.xy;
  vec2 clip = vec2((p.x / u_res.x) * 2.0 - 1.0, 1.0 - (p.y / u_res.y) * 2.0);
  gl_Position = vec4(clip, u_z, 1.0);
  v_uv = a_uv;
  v_veil = u_veil;
}
`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
in float v_veil;
uniform sampler2D u_tex;
uniform vec3 u_tint;
uniform float u_pulse;
uniform float u_alpha;
uniform vec3 u_fxColor;
out vec4 outColor;
void main() {
  vec4 c = texture(u_tex, v_uv);
  // Soft veiled cool-down — no cyan fringe
  c.rgb = mix(c.rgb, c.rgb * vec3(0.90, 0.91, 0.96), v_veil * 0.18);
  c.rgb *= u_tint;
  // Event pulse — color driven (Witness warm / Gaze coral / play gold)
  float pulse = clamp(u_pulse, 0.0, 1.5);
  c.rgb += u_fxColor * pulse * 0.62 * max(c.a, 0.001);
  c *= u_alpha;
  if (c.a < 0.06) discard;
  outColor = c;
}
`;

const BG_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 1.0 - (a_pos.y * 0.5 + 0.5));
  gl_Position = vec4(a_pos, 0.95, 1.0);
}
`;

const BG_FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_menu;
out vec4 outColor;
void main() {
  vec2 uv = v_uv + vec2(sin(u_time * 0.12) * 0.003, cos(u_time * 0.09) * 0.002);
  vec4 c = texture(u_tex, clamp(uv, 0.0, 1.0));
  float vig = smoothstep(1.2, 0.35, length(v_uv - 0.5));
  c.rgb *= mix(0.68, 1.0, vig);
  // Soft mid-board focus so cards read against the canyon (off on title screen)
  float band = smoothstep(0.18, 0.32, v_uv.y) * (1.0 - smoothstep(0.62, 0.78, v_uv.y));
  c.rgb *= mix(1.0, 0.88, band * 0.55 * (1.0 - u_menu));
  outColor = vec4(c.rgb, 1.0);
}
`;

type TexEntry = { tex: WebGLTexture; w: number; h: number };

type CardLocs = {
  aPos: number;
  aUv: number;
  uRes: WebGLUniformLocation;
  uRect: WebGLUniformLocation;
  uZ: WebGLUniformLocation;
  uVeil: WebGLUniformLocation;
  uTex: WebGLUniformLocation;
  uTint: WebGLUniformLocation;
  uPulse: WebGLUniformLocation;
  uAlpha: WebGLUniformLocation;
  uFxColor: WebGLUniformLocation;
};

type SlotFx = {
  amount: number;
  color: [number, number, number];
  pop: number;
};

type BgLocs = {
  aPos: number;
  uTex: WebGLUniformLocation;
  uTime: WebGLUniformLocation;
  uMenu: WebGLUniformLocation;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(info || "shader compile failed");
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || "link failed");
  }
  return p;
}

function uploadImage(gl: WebGL2RenderingContext, img: TexImageSource, w: number, h: number): TexEntry {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
  return { tex, w, h };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function snap(n: number): number {
  return Math.round(n);
}

export type StageLayout = {
  cssW: number;
  cssH: number;
  laneRects: { x: number; y: number; w: number; h: number }[];
};

export class OculusStage {
  readonly gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private cardProg: WebGLProgram;
  private bgProg: WebGLProgram;
  private cardLoc: CardLocs;
  private bgLoc: BgLocs;
  private quad: WebGLBuffer;
  private bgQuad: WebGLBuffer;
  private texCache = new Map<string, TexEntry>();
  private bgTex: TexEntry | null = null;
  private bgTexMatchPortrait: TexEntry | null = null;
  private bgTexMatchLandscape: TexEntry | null = null;
  private bgTexMenuPortrait: TexEntry | null = null;
  private bgTexMenuLandscape: TexEntry | null = null;
  private menuBg = true;
  /** true when viewport is taller than wide — mobile board / home plate */
  private matchPortrait = true;
  private dprCap = 2;
  private time = 0;
  private reduceMotion = false;
  private fx: [{ player: SlotFx | null; enemy: SlotFx | null }, { player: SlotFx | null; enemy: SlotFx | null }, { player: SlotFx | null; enemy: SlotFx | null }] = [
    { player: null, enemy: null },
    { player: null, enemy: null },
    { player: null, enemy: null },
  ];
  private resolveFlash = 0;
  /** Brief pop when live power changes (keyed alt*2+side). */
  private powerPulse: [{ player: number; enemy: number }, { player: number; enemy: number }, { player: number; enemy: number }] = [
    { player: 0, enemy: 0 },
    { player: 0, enemy: 0 },
    { player: 0, enemy: 0 },
  ];
  private lastPower: [{ player: number | null; enemy: number | null }, { player: number | null; enemy: number | null }, { player: number | null; enemy: number | null }] = [
    { player: null, enemy: null },
    { player: null, enemy: null },
    { player: null, enemy: null },
  ];
  private lastBw = 0;
  private lastBh = 0;
  /** Pointer hover — subtle lift for Witnessed cards under the cursor. */
  private hoverSlot: { alt: Altitude; side: Side } | null = null;
  layout: StageLayout = { cssW: 1, cssH: 1, laneRects: [] };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      // Avoid compositor tearing (horizontal flash bands on many Windows GPUs)
      desynchronized: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl) {
      const msg =
        "OCULUM needs WebGL2. Update iOS/Safari (iOS 15+) or try another browser.";
      const banner = document.createElement("div");
      banner.setAttribute("role", "alert");
      banner.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:#0e0a12;color:#f6ecd8;font:600 1rem/1.4 system-ui,sans-serif;text-align:center";
      banner.textContent = msg;
      document.body.appendChild(banner);
      throw new Error("WebGL2 unavailable");
    }
    this.canvas = canvas;
    this.gl = gl;
    this.cardProg = program(gl, VERT, FRAG);
    this.bgProg = program(gl, BG_VERT, BG_FRAG);
    this.cardLoc = {
      aPos: gl.getAttribLocation(this.cardProg, "a_pos"),
      aUv: gl.getAttribLocation(this.cardProg, "a_uv"),
      uRes: gl.getUniformLocation(this.cardProg, "u_res")!,
      uRect: gl.getUniformLocation(this.cardProg, "u_rect")!,
      uZ: gl.getUniformLocation(this.cardProg, "u_z")!,
      uVeil: gl.getUniformLocation(this.cardProg, "u_veil")!,
      uTex: gl.getUniformLocation(this.cardProg, "u_tex")!,
      uTint: gl.getUniformLocation(this.cardProg, "u_tint")!,
      uPulse: gl.getUniformLocation(this.cardProg, "u_pulse")!,
      uAlpha: gl.getUniformLocation(this.cardProg, "u_alpha")!,
      uFxColor: gl.getUniformLocation(this.cardProg, "u_fxColor")!,
    };
    this.bgLoc = {
      aPos: gl.getAttribLocation(this.bgProg, "a_pos"),
      uTex: gl.getUniformLocation(this.bgProg, "u_tex")!,
      uTime: gl.getUniformLocation(this.bgProg, "u_time")!,
      uMenu: gl.getUniformLocation(this.bgProg, "u_menu")!,
    };
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    this.bgQuad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    void this.loadBackground();
  }

  private async loadBackground(): Promise<void> {
    try {
      const [matchPortrait, matchLandscape, menuPortrait, menuLandscape] = await Promise.all([
        loadImage("./assets/ui/bg-board-mobile.jpg?v=lanes3"),
        loadImage("./assets/ui/bg-board-desktop.jpg?v=lanes3"),
        loadImage("./assets/ui/bg-menu-mobile.jpg?v=home2"),
        loadImage("./assets/ui/bg-menu-desktop.jpg?v=home2"),
      ]);
      this.bgTexMatchPortrait = uploadImage(
        this.gl,
        matchPortrait,
        matchPortrait.naturalWidth,
        matchPortrait.naturalHeight,
      );
      this.bgTexMatchLandscape = uploadImage(
        this.gl,
        matchLandscape,
        matchLandscape.naturalWidth,
        matchLandscape.naturalHeight,
      );
      this.bgTexMenuPortrait = uploadImage(
        this.gl,
        menuPortrait,
        menuPortrait.naturalWidth,
        menuPortrait.naturalHeight,
      );
      this.bgTexMenuLandscape = uploadImage(
        this.gl,
        menuLandscape,
        menuLandscape.naturalWidth,
        menuLandscape.naturalHeight,
      );
      this.applyBackgroundChoice();
    } catch (e) {
      console.warn(e);
      // Legacy plates if dual assets fail to load
      try {
        const [fallbackBoard, fallbackMenu] = await Promise.all([
          loadImage("./assets/ui/bg-canyon.jpg"),
          loadImage("./assets/ui/bg-menu.jpg").catch(() => loadImage("./assets/ui/bg-canyon.jpg")),
        ]);
        this.bgTexMatchPortrait = uploadImage(this.gl, fallbackBoard, fallbackBoard.naturalWidth, fallbackBoard.naturalHeight);
        this.bgTexMatchLandscape = this.bgTexMatchPortrait;
        this.bgTexMenuPortrait = uploadImage(this.gl, fallbackMenu, fallbackMenu.naturalWidth, fallbackMenu.naturalHeight);
        this.bgTexMenuLandscape = this.bgTexMenuPortrait;
        this.applyBackgroundChoice();
      } catch (e2) {
        console.warn(e2);
      }
    }
  }

  private matchBoardTex(): TexEntry | null {
    return this.matchPortrait
      ? (this.bgTexMatchPortrait ?? this.bgTexMatchLandscape)
      : (this.bgTexMatchLandscape ?? this.bgTexMatchPortrait);
  }

  private homeBgTex(): TexEntry | null {
    return this.matchPortrait
      ? (this.bgTexMenuPortrait ?? this.bgTexMenuLandscape)
      : (this.bgTexMenuLandscape ?? this.bgTexMenuPortrait);
  }

  private applyBackgroundChoice(): void {
    this.bgTex = this.menuBg ? this.homeBgTex() ?? this.matchBoardTex() : this.matchBoardTex() ?? this.homeBgTex();
  }

  /** Home / title screen uses distinct pilgrimage plates from the match canyon. */
  setMenuBackground(on: boolean): void {
    this.menuBg = on;
    this.applyBackgroundChoice();
  }

  setDprCap(cap: number): void {
    if (Math.abs(cap - this.dprCap) < 0.01) return;
    this.dprCap = cap;
  }

  /**
   * Sync lane geometry to DOM altitude columns so pillars frame the cards.
   * Falls back to proportional layout if DOM rects are empty (menu).
   */
  syncLanes(altEls: HTMLElement[]): void {
    const parent = this.canvas.parentElement!;
    const cssW = parent.clientWidth;
    const cssH = parent.clientHeight;
    const portrait = cssH >= cssW;
    if (portrait !== this.matchPortrait) {
      this.matchPortrait = portrait;
      this.applyBackgroundChoice();
    }
    const dpr = effectiveDpr(this.dprCap);
    const bw = Math.max(1, Math.floor(cssW * dpr));
    const bh = Math.max(1, Math.floor(cssH * dpr));
    if (bw !== this.lastBw || bh !== this.lastBh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
      this.lastBw = bw;
      this.lastBh = bh;
    }
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.gl.viewport(0, 0, bw, bh);

    const canvasRect = this.canvas.getBoundingClientRect();
    const fromDom = altEls.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - canvasRect.left,
        y: r.top - canvasRect.top,
        w: r.width,
        h: r.height,
      };
    });
    const usable = fromDom.length === 3 && fromDom.every((r) => r.w > 8 && r.h > 40);

    if (usable) {
      this.layout = { cssW, cssH, laneRects: fromDom };
      return;
    }

    const marginX = cssW * 0.04;
    const gap = cssW * 0.02;
    const usableW = cssW - marginX * 2 - gap * 2;
    const laneW = usableW / 3;
    const laneTop = cssH * 0.24;
    const laneH = Math.max(180, cssH * 0.42);
    this.layout = {
      cssW,
      cssH,
      laneRects: [0, 1, 2].map((i) => ({
        x: marginX + i * (laneW + gap),
        y: laneTop,
        w: laneW,
        h: laneH,
      })),
    };
  }

  /** @deprecated use syncLanes */
  resize(): void {
    this.syncLanes([]);
  }

  private texFor(cardId: string, veiled: boolean): TexEntry {
    const key = `${cardId}:${veiled ? "v" : "w"}`;
    let t = this.texCache.get(key);
    if (t) return t;
    const baked = bakeCardFace(cardId, veiled);
    t = uploadImage(this.gl, baked, baked.width, baked.height);
    this.texCache.set(key, t);
    return t;
  }

  private texForToken(cardId: string): TexEntry {
    const key = `token:${cardId}`;
    let t = this.texCache.get(key);
    if (t) return t;
    const baked = bakeLaneToken(cardId);
    t = uploadImage(this.gl, baked, baked.width, baked.height);
    this.texCache.set(key, t);
    return t;
  }

  private texForPower(power: number, mood: PowerChipMood): TexEntry {
    const key = `power:${power}:${mood}`;
    let t = this.texCache.get(key);
    if (t) return t;
    const baked = bakePowerChip(power, mood);
    t = uploadImage(this.gl, baked, baked.width, baked.height);
    this.texCache.set(key, t);
    return t;
  }

  private texForWitness(cost: number, mood: WitnessChipMood): TexEntry {
    const key = `witness:${cost}:${mood}`;
    let t = this.texCache.get(key);
    if (t) return t;
    const baked = bakeWitnessChip(cost, mood);
    t = uploadImage(this.gl, baked, baked.width, baked.height);
    this.texCache.set(key, t);
    return t;
  }

  private powerMood(live: number, printed: number, veiled: boolean): PowerChipMood {
    if (live > printed) return "up";
    if (live < printed) return "down";
    return veiled ? "veil" : "wit";
  }

  private witnessMood(live: number, printed: number): WitnessChipMood {
    if (live < printed) return "cheap";
    if (live > printed) return "taxed";
    return "base";
  }

  private drawSealChip(
    tex: TexEntry,
    x: number,
    y: number,
    size: number,
    opts: { pulse: number; alpha: number; z: number; fxColor: [number, number, number] },
  ): void {
    const pop = 1 + opts.pulse * 0.35;
    const s = size * pop;
    const ox = x - (s - size) / 2;
    const oy = y - (s - size) / 2;
    this.drawCardQuad(ox + 2, oy + 3, s, s, tex, {
      veil: 0,
      pulse: 0,
      tint: [0, 0, 0],
      alpha: 0.42 * opts.alpha,
      z: opts.z + 0.01,
    });
    this.drawCardQuad(ox, oy, s, s, tex, {
      veil: 0,
      pulse: opts.pulse * 0.85,
      tint: [1, 1, 1],
      alpha: opts.alpha,
      z: opts.z,
      fxColor: opts.fxColor,
    });
  }

  private drawPowerChip(
    live: number,
    mood: PowerChipMood,
    x: number,
    y: number,
    size: number,
    opts: { pulse: number; alpha: number; z: number; fxColor: [number, number, number] },
  ): void {
    this.drawSealChip(this.texForPower(live, mood), x, y, size, opts);
  }

  private drawWitnessChip(
    cost: number,
    mood: WitnessChipMood,
    x: number,
    y: number,
    size: number,
    opts: { pulse: number; alpha: number; z: number; fxColor: [number, number, number] },
  ): void {
    this.drawSealChip(this.texForWitness(cost, mood), x, y, size, opts);
  }

  private drawToken(
    cardId: string,
    x: number,
    y: number,
    size: number,
    opts: { pulse: number; alpha: number; z: number; fxColor: [number, number, number] },
  ): void {
    const tex = this.texForToken(cardId);
    this.drawCardQuad(x + 2, y + 3, size, size, tex, {
      veil: 0,
      pulse: 0,
      tint: [0, 0, 0],
      alpha: 0.4 * opts.alpha,
      z: opts.z + 0.01,
    });
    this.drawCardQuad(x, y, size, size, tex, {
      veil: 0,
      pulse: opts.pulse,
      tint: [1, 1, 1],
      alpha: opts.alpha,
      z: opts.z,
      fxColor: opts.fxColor,
    });
  }

  invalidateCardTextures(): void {
    for (const t of this.texCache.values()) {
      this.gl.deleteTexture(t.tex);
    }
    this.texCache.clear();
  }

  setHoverSlot(alt: Altitude | null, side: Side | null): void {
    if (alt == null || side == null) {
      this.hoverSlot = null;
      return;
    }
    this.hoverSlot = { alt, side };
  }

  clearHoverSlot(): void {
    this.hoverSlot = null;
  }

  /** Hit-test a figure/vessel card quad (CSS canvas coords). */
  hitUnit(
    x: number,
    y: number,
    state: MatchState,
  ): { alt: Altitude; side: Side } | null {
    for (let i = 0; i < this.layout.laneRects.length; i++) {
      const lane = this.layout.laneRects[i];
      const alt = i as Altitude;
      for (const top of [true, false]) {
        const side: Side = top ? "enemy" : "player";
        const slot = state.altitudes[alt];
        const u = side === "player" ? slot.player : slot.enemy;
        if (!u) continue;
        const rect = this.unitQuadRect(lane, top);
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          return { alt, side };
        }
      }
    }
    return null;
  }

  private unitQuadRect(
    lane: { x: number; y: number; w: number; h: number },
    top: boolean,
  ): { x: number; y: number; w: number; h: number } {
    let cardH = Math.min(lane.h * 0.32, lane.w * 1.18);
    let cardW = cardH * (300 / 450);
    const cx = lane.x + (lane.w - cardW) / 2;
    const cy = top ? lane.y + lane.h * 0.08 : lane.y + lane.h - cardH - lane.h * 0.08;
    return { x: cx, y: cy, w: cardW, h: cardH };
  }

  setReduceMotion(on: boolean): void {
    this.reduceMotion = on;
  }

  private bump(
    alt: Altitude,
    side: Side,
    amount: number,
    color: [number, number, number],
    pop = 0,
  ): void {
    const slot = this.fx[alt];
    const next: SlotFx = {
      amount: Math.max(slot[side]?.amount ?? 0, amount),
      color,
      pop: Math.max(slot[side]?.pop ?? 0, pop),
    };
    slot[side] = next;
  }

  onEvents(events: OculusEvent[]): void {
    const soft = this.reduceMotion ? 0.55 : 1;
    for (const ev of events) {
      if (ev.type === "witness") {
        const color: [number, number, number] = ev.enemyTarget
          ? [0.72, 0.32, 0.28]
          : [0.55, 0.4, 0.14];
        this.bump(ev.altitude, ev.enemyTarget ? (ev.side === "player" ? "enemy" : "player") : ev.side, 1.15 * soft, color, 0.08 * soft);
      } else if (ev.type === "play") {
        const amount = (ev.veiled ? 1.05 : 0.85) * soft;
        const pop = (ev.veiled ? 0.16 : 0.12) * soft;
        this.bump(ev.altitude, ev.side, amount, [0.5, 0.42, 0.22], pop);
      } else if (ev.type === "graft") {
        this.bump(ev.altitude, ev.side, 0.7 * soft, [0.45, 0.55, 0.62], 0.06 * soft);
      } else if (ev.type === "stance") {
        this.bump(ev.altitude, ev.side, 0.75 * soft, [0.55, 0.48, 0.28], 0.1 * soft);
      } else if (ev.type === "rite" && ev.altitude != null) {
        this.bump(ev.altitude, "player", 1.05 * soft, [0.4, 0.52, 0.72], 0.12 * soft);
        this.bump(ev.altitude, "enemy", 1.05 * soft, [0.4, 0.52, 0.72], 0.12 * soft);
      } else if (ev.type === "resolve") {
        this.resolveFlash = Math.max(this.resolveFlash, 1.35 * soft);
        for (let a = 0; a < 3; a++) {
          this.bump(a as Altitude, "player", 0.95 * soft, [0.72, 0.38, 0.18], 0.1 * soft);
          this.bump(a as Altitude, "enemy", 0.95 * soft, [0.72, 0.38, 0.18], 0.1 * soft);
        }
      } else if (ev.type === "fall") {
        this.bump(ev.altitude, ev.side, 1.55 * soft, [0.85, 0.18, 0.16], 0.28 * soft);
        this.resolveFlash = Math.max(this.resolveFlash, 0.75 * soft);
      } else if (ev.type === "stain") {
        this.bump(ev.altitude, ev.side, 1.05 * soft, [0.25, 0.55, 0.42], 0.1 * soft);
      } else if (ev.type === "halo") {
        this.bump(ev.altitude, ev.side, 1.1 * soft, [0.95, 0.78, 0.35], 0.14 * soft);
      } else if (ev.type === "blaze") {
        this.bump(ev.altitude, ev.side, 1.25 * soft, [1.0, 0.55, 0.2], 0.16 * soft);
      } else if (ev.type === "sustain") {
        this.bump(ev.altitude, ev.side, 0.85 * soft, [0.85, 0.9, 0.55], 0.08 * soft);
      } else if (ev.type === "strain") {
        this.bump(ev.altitude, ev.side, 1.0 * soft, [0.7, 0.45, 0.2], 0.08 * soft);
      } else if (ev.type === "blind") {
        this.bump(ev.altitude, "player", 0.7 * soft, [0.2, 0.22, 0.35], 0);
        this.bump(ev.altitude, "enemy", 0.7 * soft, [0.2, 0.22, 0.35], 0);
      } else if (ev.type === "press") {
        this.bump(ev.altitude, ev.side === "player" ? "enemy" : "player", 1.2 * soft, [0.85, 0.25, 0.35], 0.14 * soft);
      } else if (ev.type === "toll") {
        this.bump(ev.altitude, "player", 0.85 * soft, [0.55, 0.42, 0.18], 0.08 * soft);
        this.bump(ev.altitude, "enemy", 0.85 * soft, [0.55, 0.42, 0.18], 0.08 * soft);
      } else if (ev.type === "peal" || ev.type === "peal_pay") {
        this.bump(ev.altitude, "player", 0.95 * soft, [0.75, 0.6, 0.25], 0.1 * soft);
        this.bump(ev.altitude, "enemy", 0.95 * soft, [0.75, 0.6, 0.25], 0.1 * soft);
      } else if (ev.type === "wager" || ev.type === "cash" || ev.type === "bust" || ev.type === "wager_flip") {
        this.bump(ev.altitude, ev.side, 0.9 * soft, [0.65, 0.5, 0.85], 0.1 * soft);
      } else if (ev.type === "eclipse") {
        this.resolveFlash = Math.max(this.resolveFlash, 0.55 * soft);
      } else if (ev.type === "law") {
        this.resolveFlash = Math.max(this.resolveFlash, 0.7 * soft);
      } else if (ev.type === "tempt") {
        this.bump(ev.altitude, ev.side === "player" ? "enemy" : "player", 1.0 * soft, [0.62, 0.28, 0.82], 0.1 * soft);
      } else if (ev.type === "brand") {
        this.bump(ev.altitude, ev.side === "player" ? "enemy" : "player", 1.15 * soft, [0.78, 0.22, 0.38], 0.14 * soft);
      } else if (ev.type === "devour") {
        const victim = ev.side === "player" ? "enemy" : "player";
        this.bump(ev.altitude, victim, 1.45 * soft, [0.62, 0.14, 0.28], 0.22 * soft);
        this.bump(ev.altitude, ev.side, 0.85 * soft, [0.48, 0.16, 0.42], 0.08 * soft);
        if (ev.will && ev.will > 0) {
          this.resolveFlash = Math.max(this.resolveFlash, 0.65 * soft);
        }
      }
    }
  }

  hitAltitude(x: number, y: number): Altitude | null {
    for (let i = 0; i < this.layout.laneRects.length; i++) {
      const r = this.layout.laneRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return i as Altitude;
      }
    }
    return null;
  }

  draw(state: MatchState, dt: number): void {
    this.time += dt;
    const decay = this.reduceMotion ? 3.2 : 2.1;
    for (const lane of this.fx) {
      for (const side of ["player", "enemy"] as const) {
        const fx = lane[side];
        if (!fx) continue;
        fx.amount = Math.max(0, fx.amount - dt * decay);
        fx.pop = Math.max(0, fx.pop - dt * decay * 1.4);
        if (fx.amount <= 0.02 && fx.pop <= 0.01) lane[side] = null;
      }
    }
    this.resolveFlash = Math.max(0, this.resolveFlash - dt * 2.4);
    for (const lane of this.powerPulse) {
      lane.player = Math.max(0, lane.player - dt * 2.8);
      lane.enemy = Math.max(0, lane.enemy - dt * 2.8);
    }
    const gl = this.gl;
    const { cssW, cssH, laneRects } = this.layout;
    const L = this.cardLoc;
    const B = this.bgLoc;

    gl.useProgram(this.bgProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgQuad);
    gl.enableVertexAttribArray(B.aPos);
    gl.vertexAttribPointer(B.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(B.uTime, this.time);
    gl.uniform1f(B.uMenu, this.menuBg ? 1 : 0);
    if (this.bgTex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.bgTex.tex);
      gl.uniform1i(B.uTex, 0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(this.cardProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const stride = 4 * 4;
    gl.enableVertexAttribArray(L.aPos);
    gl.vertexAttribPointer(L.aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(L.aUv);
    gl.vertexAttribPointer(L.aUv, 2, gl.FLOAT, false, stride, 8);
    gl.uniform2f(L.uRes, cssW, cssH);

    for (let i = 0; i < 3; i++) {
      const rect = laneRects[i];
      this.drawSide(state, i as Altitude, "enemy", rect, true);
      this.drawSide(state, i as Altitude, "player", rect, false);
    }
  }

  private drawCardQuad(
    cx: number,
    cy: number,
    cardW: number,
    cardH: number,
    tex: TexEntry,
    opts: {
      veil: number;
      pulse: number;
      tint: number[];
      alpha: number;
      z: number;
      fxColor?: [number, number, number];
    },
  ): void {
    const gl = this.gl;
    const L = this.cardLoc;
    const fx = opts.fxColor ?? [0.55, 0.38, 0.14];
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex.tex);
    gl.uniform1i(L.uTex, 0);
    gl.uniform4f(L.uRect, snap(cx), snap(cy), snap(cardW), snap(cardH));
    gl.uniform1f(L.uZ, opts.z);
    gl.uniform1f(L.uVeil, opts.veil);
    gl.uniform1f(L.uPulse, opts.pulse);
    gl.uniform1f(L.uAlpha, opts.alpha);
    gl.uniform3f(L.uTint, opts.tint[0], opts.tint[1], opts.tint[2]);
    gl.uniform3f(L.uFxColor, fx[0], fx[1], fx[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private drawSide(
    state: MatchState,
    alt: Altitude,
    side: Side,
    lane: { x: number; y: number; w: number; h: number },
    top: boolean,
  ): void {
    const slot = state.altitudes[alt];
    const u = side === "player" ? slot.player : slot.enemy;
    const site = side === "player" ? slot.playerSite : slot.enemySite;
    const fx = this.fx[alt][side];
    let pulse = fx?.amount ?? 0;
    const pop = fx?.pop ?? 0;
    let fxColor = fx?.color ?? ([0.55, 0.38, 0.14] as [number, number, number]);
    // Compact heroes leave a mid-lane gutter for power chips + site tokens
    let cardH = Math.min(lane.h * 0.32, lane.w * 1.18);
    let cardW = cardH * (300 / 450);
    if (pop > 0) {
      const s = 1 + pop * 0.55;
      cardW *= s;
      cardH *= s;
    }
    let cx = lane.x + (lane.w - cardW) / 2;
    let cy = top ? lane.y + lane.h * 0.08 : lane.y + lane.h - cardH - lane.h * 0.08;

    if (u?.branded) {
      pulse = Math.min(1.45, pulse + 0.1);
      if (!fx || fx.amount < 0.2) {
        fxColor = [0.72, 0.24, 0.36];
      }
    }
    if (u?.tempted && !u.branded) {
      pulse = Math.min(1.3, pulse + 0.06);
      if (!fx || fx.amount < 0.15) {
        fxColor = [0.58, 0.3, 0.72];
      }
    }

    if (u) {
      const tex = this.texFor(u.cardId, u.veiled);
      const shadowSpread = 3;
      const shadowAlpha = 0.38;
      this.drawCardQuad(cx + shadowSpread * 0.35, cy + shadowSpread, cardW, cardH, tex, {
        veil: 0,
        pulse: 0,
        tint: [0, 0, 0],
        alpha: shadowAlpha,
        z: top ? 0.22 : 0.12,
      });
      const tint = side === "player" ? [1, 1, 1] : [1, 0.94, 0.93];
      const resolveBoost = this.resolveFlash * 0.35;
      this.drawCardQuad(cx, cy, cardW, cardH, tex, {
        veil: u.veiled ? 1 : 0,
        pulse: Math.min(1.4, pulse + resolveBoost),
        tint,
        alpha: 1,
        z: top ? 0.2 : 0.1,
        fxColor,
      });

      // Grafted relics as charm seals — bottom centre of the figure card
      if (u.grafts.length > 0) {
        const ts = Math.min(cardW * 0.34, lane.w * 0.22);
        const maxShow = Math.min(u.grafts.length, 3);
        const step = ts * 0.48;
        const clusterW = ts + (maxShow - 1) * step;
        const baseX = cx + (cardW - clusterW) / 2;
        const gy = cy + cardH - ts * 0.78;
        for (let i = 0; i < maxShow; i++) {
          const g = u.grafts[i];
          const gx = baseX + i * step;
          this.drawToken(g.cardId, gx, gy, ts, {
            pulse: pulse * 0.55,
            alpha: 1,
            z: top ? 0.08 : 0.04,
            fxColor,
          });
        }
      }

      // Live Resolve power — cover the printed top-left power / cost seal (gold pip)
      if (!u.hybridSite && getCard(u.cardId).type !== "site") {
        const live = unitPower(state, alt, side);
        const printed = printedFacePower(u);
        const mood = this.powerMood(live, printed, u.veiled);
        const prev = this.lastPower[alt][side];
        if (prev !== null && prev !== live) {
          this.powerPulse[alt][side] = Math.max(this.powerPulse[alt][side], this.reduceMotion ? 0.45 : 0.85);
        }
        this.lastPower[alt][side] = live;
        const chip = Math.min(cardW * 0.26, lane.w * 0.22, 36);
        // Center on printed top-left gold seal (bake: ~36,36 on 300×450 → 0.12, 0.08)
        const px = cx + cardW * 0.12 - chip * 0.5;
        const py = cy + cardH * 0.08 - chip * 0.5;
        const moodFx: [number, number, number] =
          mood === "up"
            ? [0.85, 0.55, 0.2]
            : mood === "down"
              ? [0.7, 0.28, 0.24]
              : mood === "veil"
                ? [0.35, 0.55, 0.52]
                : [0.55, 0.42, 0.18];
        this.drawPowerChip(live, mood, px, py, chip, {
          pulse: Math.max(pulse * 0.4, this.powerPulse[alt][side]),
          alpha: 1,
          z: top ? 0.055 : 0.025,
          fxColor: moodFx,
        });

        // Live Witness / Gaze Sight cost — stays on the teal pip until Fall / Unmake
        // (Witnessed → show 0; free Witness while Veiled also shows 0)
        const def = getCard(u.cardId);
        if (def.type === "figure" || def.type === "vessel") {
          const liveWit = u.veiled
            ? witnessCostAt(alt, def.witnessCost, side === "enemy")
            : 0;
          const witMood: WitnessChipMood = u.veiled
            ? this.witnessMood(liveWit, def.witnessCost)
            : "spent";
          const ws = Math.min(cardW * 0.26, lane.w * 0.22, 34);
          // Center on printed top-right teal Witness / Sight pip (bake: w-36, 36)
          const wx = cx + cardW * 0.88 - ws * 0.5;
          const wy = cy + cardH * 0.08 - ws * 0.5;
          const witFx: [number, number, number] =
            witMood === "cheap"
              ? [0.4, 0.85, 0.78]
              : witMood === "taxed"
                ? [0.35, 0.5, 0.48]
                : witMood === "spent"
                  ? [0.22, 0.38, 0.36]
                  : [0.25, 0.7, 0.65];
          this.drawWitnessChip(liveWit, witMood, wx, wy, ws, {
            pulse: pulse * 0.35,
            alpha: 1,
            z: top ? 0.05 : 0.02,
            fxColor: witFx,
          });
        }
      }
    } else {
      this.lastPower[alt][side] = null;
    }

    if (site) {
      // Landmark / sigil seal — never a shrunken card
      const size = u
        ? Math.min(cardW * 0.42, lane.w * 0.34) * (1 + pop * 0.2)
        : Math.min(lane.w * 0.48, lane.h * 0.26) * (1 + pop * 0.2);
      const bx = u
        ? lane.x + lane.w - size - Math.max(2, lane.w * 0.02)
        : lane.x + (lane.w - size) / 2;
      const gutterMid = lane.y + lane.h * 0.5;
      const by = u
        ? top
          ? Math.min(cy + cardH + 2, gutterMid - size * 0.55)
          : Math.max(cy - size - 2, gutterMid - size * 0.45)
        : top
          ? lane.y + lane.h * 0.12
          : lane.y + lane.h - size - lane.h * 0.12;
      this.drawToken(site, bx, by, size, {
        pulse: pulse * 0.75,
        alpha: 1,
        z: 0.05,
        fxColor,
      });
    }
  }
}
