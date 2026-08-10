import type { MatchState, PaperEvent, Side } from "../../core/types";
import { CARDS } from "../../core/cards";
import { ensureCardFace, getCachedCardFace, preloadAllCardFaces } from "../cardArt";
import { bakeCardFace } from "../cardBake";
import { effectiveDpr } from "../perf";

const VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform vec2 u_res;
uniform vec4 u_rect;
uniform float u_fold;
uniform float u_z;
out vec2 v_uv;
out float v_fold;
void main() {
  vec2 p = a_pos * u_rect.zw + u_rect.xy;
  float crease = abs(a_pos.x - 0.5) * 2.0;
  p.x += (0.5 - a_pos.x) * u_fold * u_rect.z * 0.5;
  p.y += sin(crease * 3.14159) * u_fold * 12.0;
  vec2 clip = vec2((p.x / u_res.x) * 2.0 - 1.0, 1.0 - (p.y / u_res.y) * 2.0);
  gl_Position = vec4(clip, u_z, 1.0);
  v_uv = a_uv;
  v_fold = u_fold;
}
`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
in float v_fold;
uniform sampler2D u_tex;
uniform vec3 u_tint;
uniform float u_scar;
uniform float u_rip;
out vec4 outColor;
void main() {
  vec4 c = texture(u_tex, v_uv);
  c.rgb = mix(c.rgb, c.rgb * vec3(0.7, 0.78, 1.05), v_fold * 0.35);
  c.rgb *= u_tint;
  if (u_scar > 0.5 && abs(v_uv.x - 0.86) < 0.07 && v_uv.y > 0.22 && v_uv.y < 0.52) {
    c.a *= 0.12;
  }
  float jagged = step(0.55, fract(v_uv.y * 14.0 + v_uv.x * 4.0));
  if (u_rip > 0.01 && v_uv.x > 1.0 - u_rip) {
    c.a *= mix(1.0, jagged * 0.15, clamp(u_rip * 2.0, 0.0, 1.0));
  }
  if (c.a < 0.08) discard;
  outColor = c;
}
`;

const BG_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.95, 1.0);
}
`;

const BG_FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform vec2 u_res;
out vec4 outColor;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
void main() {
  vec2 px = v_uv * u_res;
  float rings = sin(v_uv.x * 38.0 + noise(v_uv * vec2(6.0, 1.2) * 3.0) * 4.0);
  vec3 woodDark = vec3(0.06, 0.05, 0.06);
  vec3 woodMid = vec3(0.14, 0.11, 0.12);
  vec3 woodLite = vec3(0.22, 0.16, 0.15);
  vec3 desk = mix(woodDark, woodMid, v_uv.y);
  desk = mix(desk, woodLite, smoothstep(-0.2, 0.6, rings) * 0.18);
  desk += (noise(px * 0.08) - 0.5) * 0.04;
  float lamp = smoothstep(1.1, 0.15, length((v_uv - vec2(0.5, 0.08)) * vec2(1.1, 1.6)));
  desk += vec3(0.22, 0.06, 0.07) * lamp * 0.28;
  float band = smoothstep(0.17, 0.23, v_uv.y) * smoothstep(0.84, 0.74, v_uv.y);
  vec3 cork = vec3(0.22, 0.16, 0.14);
  cork += (noise(px * 0.12) - 0.5) * 0.08;
  desk = mix(desk, cork, band * 0.85);
  for (int i = 0; i < 3; i++) {
    float cx = (float(i) + 0.5) / 3.0;
    float dx = abs(v_uv.x - cx);
    float jagged = 0.014 * sin(v_uv.y * 70.0 + float(i) * 2.0);
    float pad = smoothstep(0.145 + jagged, 0.095, dx) * band;
    vec3 blot = mix(vec3(0.86, 0.80, 0.72), vec3(0.72, 0.64, 0.56), noise(px * 0.05 + float(i)));
    desk = mix(desk, blot, pad * 0.78);
    float tape = smoothstep(0.12, 0.08, length(vec2(dx - 0.09, (v_uv.y - 0.28) * 2.2)));
    desk = mix(desk, vec3(0.55, 0.08, 0.12), tape * band * 0.45);
  }
  float splat = smoothstep(0.12, 0.0, length((v_uv - vec2(0.12, 0.7)) * vec2(2.5, 3.0)));
  splat += smoothstep(0.1, 0.0, length((v_uv - vec2(0.88, 0.35)) * vec2(3.0, 2.2)));
  desk = mix(desk, desk * vec3(0.7, 0.35, 0.38), splat * 0.3);
  float vig = smoothstep(1.05, 0.3, length(v_uv - 0.5));
  desk *= mix(0.55, 1.0, vig);
  outColor = vec4(desk, 1.0);
}
`;

type Anim = {
  fold: number;
  foldTarget: number;
  rip: number;
  ripTarget: number;
};

type TexEntry = { tex: WebGLTexture; w: number; h: number };

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

function uploadCanvas(gl: WebGL2RenderingContext, c: HTMLCanvasElement): TexEntry {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
  return { tex, w: c.width, h: c.height };
}

export type StageLayout = {
  cssW: number;
  cssH: number;
  laneRects: { x: number; y: number; w: number; h: number }[];
};

export class PaperStage {
  readonly gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private cardProg: WebGLProgram;
  private bgProg: WebGLProgram;
  private quad: WebGLBuffer;
  private bgQuad: WebGLBuffer;
  private anims = new Map<string, Anim>();
  private texCache = new Map<string, TexEntry>();
  private dprCap = 2;
  layout: StageLayout = { cssW: 1, cssH: 1, laneRects: [] };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      desynchronized: true,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.canvas = canvas;
    this.gl = gl;
    this.cardProg = program(gl, VERT, FRAG);
    this.bgProg = program(gl, BG_VERT, BG_FRAG);
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
  }

  setDprCap(cap: number): void {
    this.dprCap = cap;
  }

  resize(): void {
    const parent = this.canvas.parentElement!;
    const cssW = parent.clientWidth;
    const cssH = parent.clientHeight;
    const dpr = effectiveDpr(this.dprCap);
    const bw = Math.max(1, Math.floor(cssW * dpr));
    const bh = Math.max(1, Math.floor(cssH * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.gl.viewport(0, 0, bw, bh);

    const marginX = cssW * 0.05;
    const laneGap = cssW * 0.025;
    const usable = cssW - marginX * 2 - laneGap * 2;
    const laneW = usable / 3;
    const laneTop = cssH * 0.2;
    const laneH = cssH * 0.5;
    this.layout = {
      cssW,
      cssH,
      laneRects: [0, 1, 2].map((i) => ({
        x: marginX + i * (laneW + laneGap),
        y: laneTop,
        w: laneW,
        h: laneH,
      })),
    };
  }

  private texFor(cardId: string, folded: boolean): TexEntry {
    const face = folded ? "ink" : "front";
    const key = `${cardId}:${face}`;
    let t = this.texCache.get(key);
    if (t) return t;
    const baked = getCachedCardFace(cardId, face) ?? bakeCardFace(cardId, face, null);
    t = uploadCanvas(this.gl, baked);
    this.texCache.set(key, t);
    // refresh when art finishes loading
    void ensureCardFace(cardId, face).then((c) => {
      const gl = this.gl;
      const existing = this.texCache.get(key);
      if (existing) {
        gl.bindTexture(gl.TEXTURE_2D, existing.tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
        existing.w = c.width;
        existing.h = c.height;
      }
    });
    return t;
  }

  async preloadKnownArt(): Promise<void> {
    await preloadAllCardFaces(CARDS.map((c) => c.id));
    for (const def of CARDS) {
      for (const face of ["front", "ink"] as const) {
        const baked = getCachedCardFace(def.id, face);
        if (!baked) continue;
        const key = `${def.id}:${face}`;
        const existing = this.texCache.get(key);
        if (existing) {
          this.gl.bindTexture(this.gl.TEXTURE_2D, existing.tex);
          this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
          this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            baked,
          );
          this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
        } else {
          this.texCache.set(key, uploadCanvas(this.gl, baked));
        }
      }
    }
  }

  onEvents(events: PaperEvent[]): void {
    for (const ev of events) {
      if (ev.type === "fold") {
        const id = `${ev.side}-${ev.lane}-${ev.target}`;
        const a = this.anims.get(id) ?? { fold: 0, foldTarget: 0, rip: 0, ripTarget: 0 };
        a.foldTarget = 1;
        this.anims.set(id, a);
      }
      if (ev.type === "rip") {
        const id = `enemy-${ev.lane}-body`;
        const a = this.anims.get(id) ?? { fold: 0, foldTarget: 0, rip: 0, ripTarget: 0 };
        a.ripTarget = ev.result === "scar" ? 0.25 : 1;
        this.anims.set(id, a);
      }
    }
  }

  private tickAnims(dt: number): void {
    for (const a of this.anims.values()) {
      a.fold += (a.foldTarget - a.fold) * Math.min(1, dt * 8);
      a.rip += (a.ripTarget - a.rip) * Math.min(1, dt * 6);
    }
  }

  hitLane(cssX: number, cssY: number): number | null {
    for (let i = 0; i < this.layout.laneRects.length; i++) {
      const r = this.layout.laneRects[i];
      if (cssX >= r.x && cssX <= r.x + r.w && cssY >= r.y && cssY <= r.y + r.h) return i;
    }
    return null;
  }

  draw(state: MatchState, dt: number): void {
    this.tickAnims(dt);
    const gl = this.gl;
    const { cssW, laneRects } = this.layout;
    const dpr = this.canvas.width / Math.max(1, cssW);

    gl.clearColor(0.14, 0.11, 0.16, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.bgProg);
    const bgPos = gl.getAttribLocation(this.bgProg, "a_pos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgQuad);
    gl.enableVertexAttribArray(bgPos);
    gl.vertexAttribPointer(bgPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(this.bgProg, "u_res"), this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(this.cardProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const aPos = gl.getAttribLocation(this.cardProg, "a_pos");
    const aUv = gl.getAttribLocation(this.cardProg, "a_uv");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
    gl.uniform2f(gl.getUniformLocation(this.cardProg, "u_res"), this.canvas.width, this.canvas.height);

    for (let i = 0; i < 3; i++) {
      const lane = state.lanes[i];
      this.drawStack("enemy", i, lane.enemy, laneRects[i], true, dpr);
      this.drawStack("player", i, lane.player, laneRects[i], false, dpr);
    }
  }

  private drawStack(
    side: Side,
    lane: number,
    stack: MatchState["lanes"][0]["player"],
    laneRect: { x: number; y: number; w: number; h: number },
    isEnemy: boolean,
    dpr: number,
  ): void {
    if (!stack) return;
    const cardW = laneRect.w * 0.78;
    const cardH = cardW * 1.4;
    const cx = laneRect.x + laneRect.w * 0.5 - cardW * 0.5;
    const baseY = isEnemy
      ? laneRect.y + laneRect.h * 0.04
      : laneRect.y + laneRect.h - cardH - laneRect.h * 0.04;

    const drawOne = (
      card: { cardId: string; folded: boolean; scarred: boolean },
      y: number,
      z: number,
      target: "body" | "sticker",
    ) => {
      const animKey = `${side}-${lane}-${target}`;
      const anim = this.anims.get(animKey) ?? {
        fold: card.folded ? 1 : 0,
        foldTarget: card.folded ? 1 : 0,
        rip: 0,
        ripTarget: 0,
      };
      if (card.folded && anim.foldTarget < 1) anim.foldTarget = 1;
      this.anims.set(animKey, anim);

      const tex = this.texFor(card.cardId, card.folded);
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.tex);
      gl.uniform1i(gl.getUniformLocation(this.cardProg, "u_tex"), 0);
      gl.uniform4f(
        gl.getUniformLocation(this.cardProg, "u_rect"),
        cx * dpr,
        y * dpr,
        cardW * dpr,
        cardH * dpr,
      );
      gl.uniform1f(gl.getUniformLocation(this.cardProg, "u_fold"), anim.fold);
      gl.uniform1f(gl.getUniformLocation(this.cardProg, "u_z"), z);
      gl.uniform3f(
        gl.getUniformLocation(this.cardProg, "u_tint"),
        1,
        isEnemy ? 0.94 : 1,
        isEnemy ? 0.94 : 1,
      );
      gl.uniform1f(gl.getUniformLocation(this.cardProg, "u_scar"), card.scarred ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(this.cardProg, "u_rip"), side !== "player" ? anim.rip : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    drawOne(stack.body, baseY, 0.2, "body");
    if (stack.sticker) drawOne(stack.sticker, baseY - cardH * 0.1, 0.1, "sticker");
  }
}
