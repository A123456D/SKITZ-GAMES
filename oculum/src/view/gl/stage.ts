import type { Altitude, MatchState, OculusEvent, Side } from "../../core/types";
import { bakeCardFace, bakeLaneToken } from "../cardBake";
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
  private bgTexMatch: TexEntry | null = null;
  private bgTexMenu: TexEntry | null = null;
  private menuBg = true;
  private dprCap = 2;
  private time = 0;
  private reduceMotion = false;
  private fx: [{ player: SlotFx | null; enemy: SlotFx | null }, { player: SlotFx | null; enemy: SlotFx | null }, { player: SlotFx | null; enemy: SlotFx | null }] = [
    { player: null, enemy: null },
    { player: null, enemy: null },
    { player: null, enemy: null },
  ];
  private resolveFlash = 0;
  private lastBw = 0;
  private lastBh = 0;
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
    if (!gl) throw new Error("WebGL2 unavailable");
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
      const [matchImg, menuImg] = await Promise.all([
        loadImage("./assets/ui/bg-canyon.jpg"),
        loadImage("./assets/ui/bg-menu.jpg"),
      ]);
      this.bgTexMatch = uploadImage(this.gl, matchImg, matchImg.naturalWidth, matchImg.naturalHeight);
      this.bgTexMenu = uploadImage(this.gl, menuImg, menuImg.naturalWidth, menuImg.naturalHeight);
      this.bgTex = this.menuBg ? this.bgTexMenu : this.bgTexMatch;
    } catch (e) {
      console.warn(e);
    }
  }

  /** Title screen uses a distinct world plate from the match canyon. */
  setMenuBackground(on: boolean): void {
    this.menuBg = on;
    this.bgTex = on ? this.bgTexMenu ?? this.bgTexMatch : this.bgTexMatch ?? this.bgTexMenu;
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
        this.bump(ev.altitude, ev.side, 0.85 * soft, [0.5, 0.42, 0.22], 0.12 * soft);
      } else if (ev.type === "graft") {
        this.bump(ev.altitude, ev.side, 0.7 * soft, [0.45, 0.55, 0.62], 0.06 * soft);
      } else if (ev.type === "stance") {
        this.bump(ev.altitude, ev.side, 0.75 * soft, [0.55, 0.48, 0.28], 0.1 * soft);
      } else if (ev.type === "rite" && ev.altitude != null) {
        this.bump(ev.altitude, "player", 0.55 * soft, [0.35, 0.4, 0.55], 0);
        this.bump(ev.altitude, "enemy", 0.55 * soft, [0.35, 0.4, 0.55], 0);
      } else if (ev.type === "resolve") {
        this.resolveFlash = Math.max(this.resolveFlash, 0.9 * soft);
        for (let a = 0; a < 3; a++) {
          this.bump(a as Altitude, "player", 0.55 * soft, [0.5, 0.3, 0.16], 0.04 * soft);
          this.bump(a as Altitude, "enemy", 0.55 * soft, [0.5, 0.3, 0.16], 0.04 * soft);
        }
      } else if (ev.type === "law") {
        this.resolveFlash = Math.max(this.resolveFlash, 0.7 * soft);
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
    const pulse = fx?.amount ?? 0;
    const pop = fx?.pop ?? 0;
    const fxColor = fx?.color ?? ([0.55, 0.38, 0.14] as [number, number, number]);
    // Compact heroes leave a mid-lane gutter for power chips + site tokens
    let cardH = Math.min(lane.h * 0.32, lane.w * 1.18);
    let cardW = cardH * (300 / 450);
    if (pop > 0) {
      const s = 1 + pop * 0.55;
      cardW *= s;
      cardH *= s;
    }
    const cx = lane.x + (lane.w - cardW) / 2;
    const cy = top ? lane.y + lane.h * 0.08 : lane.y + lane.h - cardH - lane.h * 0.08;

    if (u) {
      const tex = this.texFor(u.cardId, u.veiled);
      // Soft contact shadow
      this.drawCardQuad(cx + 3, cy + 5, cardW, cardH, tex, {
        veil: 0,
        pulse: 0,
        tint: [0, 0, 0],
        alpha: 0.38,
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

      // Grafted relics as charm seals on the figure
      if (u.grafts.length > 0) {
        const ts = Math.min(cardW * 0.34, lane.w * 0.22);
        const maxShow = Math.min(u.grafts.length, 3);
        for (let i = 0; i < maxShow; i++) {
          const g = u.grafts[i];
          const gx = cx + cardW - ts - 1 - i * (ts * 0.42);
          const gy = top ? cy + cardH - ts * 0.85 : cy - ts * 0.15;
          this.drawToken(g.cardId, gx, gy, ts, {
            pulse: pulse * 0.55,
            alpha: 1,
            z: top ? 0.08 : 0.04,
            fxColor,
          });
        }
      }
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
