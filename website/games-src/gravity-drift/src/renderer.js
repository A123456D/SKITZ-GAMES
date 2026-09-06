// Gravity Drift — WebGPU renderer. Single fullscreen-tri background shader
// (nebula, parallax stars, plasma core, well grid) + CPU-built fans for cells.
export const BG_SHADER = /* wgsl */ `
const TAU: f32 = 6.28318530718;
const CELL: f32 = 0.11;
const HOLE: f32 = 0.11;
const SPOKES: f32 = 10.0;
const RINGS: f32 = 12.0;

struct Uniforms {
  resolution: vec2<f32>,
  camera: vec2<f32>,
  time: f32,
  zoom: f32,
  pulse: f32,
  origin_y: f32,
  danger: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VOut { @builtin(position) clip: vec4<f32>, }

@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2<f32>, 3>(vec2(-1., -1.), vec2(3., -1.), vec2(-1., 3.));
  var o: VOut;
  o.clip = vec4(p[i], 0., 1.);
  return o;
}

fn aa(d: f32, w: f32) -> f32 { return 1.0 - smoothstep(0.0, max(w, 1e-5), d); }
fn hash(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

@fragment fn fs(in: VOut) -> @location(0) vec4<f32> {
  let res = max(u.resolution, vec2(1., 1.));
  let min_axis = min(res.x, res.y);
  let origin = vec2(0.5 * res.x, u.origin_y * res.y);
  let px = in.clip.xy;

  // --- deep space: layered radial falloff + two drifting nebula smudges
  let grad_r = length(px - origin) / (max(res.x, res.y) * 0.7);
  var color = mix(vec3(0.085, 0.030, 0.190), vec3(0.020, 0.012, 0.090), clamp(grad_r / 0.42, 0., 1.));
  color = mix(color, vec3(0.004, 0.003, 0.030), smoothstep(0.42, 1.0, grad_r));
  let neb1 = exp(-length(px - origin - vec2(sin(u.time * 0.11) * 260., cos(u.time * 0.07) * 150.)) / 300.);
  let neb2 = exp(-length(px - origin - vec2(cos(u.time * 0.09 + 2.) * 320., sin(u.time * 0.06 + 1.) * 220.)) / 380.);
  color += vec3(0.16, 0.05, 0.28) * neb1 * 0.45 + vec3(0.03, 0.09, 0.22) * neb2 * 0.40;

  // --- view space (y down, camera drift)
  var view = (px - origin) / min_axis;
  view.y = -view.y;
  view = view / max(u.zoom, 0.05);
  let p = view + u.camera;
  let radius = length(p);
  let angle = atan2(p.y, p.x);
  let well_r = HOLE + RINGS * CELL;
  let pulse = u.pulse;
  let ring_px = fwidth(radius);

  // --- 3-layer parallax starfield (twinkle)
  for (var layer: f32 = 1.0; layer < 4.0; layer += 1.0) {
    let par = u.camera * layer * 0.35;
    let g = floor((px + par * min_axis * 0.2) * (0.16 - layer * 0.03));
    let f = fract((px + par * min_axis * 0.2) * (0.16 - layer * 0.03));
    let sn = hash(g + vec2(layer * 17.3, layer * 9.1));
    let tw = 0.55 + 0.45 * sin(u.time * (1.1 + layer * 0.5) + sn * 40.);
    let star = step(0.988 - layer * 0.002, sn) * (1.0 - smoothstep(0.0, 0.30, length(f - 0.5)));
    color += vec3(0.85, 0.92, 1.0) * star * tw * (0.50 - layer * 0.09);
  }

  // --- grid fade: lines brighter near the core, fading toward the rim
  let depth = clamp((radius - HOLE) / (well_r - HOLE), 0., 1.);
  let fade = mix(1.0, 0.35, depth);

  let in_well = radius >= HOLE * 0.92 && radius <= well_r + 0.004;
  let ring_field = abs(fract((radius - HOLE) / CELL + 1.0) - 0.5) * CELL;
  let ring_line = aa(ring_field, 1.15 * ring_px) * select(0.0, 1.0, in_well);
  let sector = TAU / SPOKES;
  let ang = abs(fract((angle + TAU * 0.25) / sector + 0.5) - 0.5) * sector;
  let spoke_field = ang * max(radius, 1e-4);
  let spoke_line = aa(spoke_field, 1.15 * fwidth(spoke_field))
    * smoothstep(HOLE * 0.9, HOLE, radius)
    * (1.0 - smoothstep(well_r, well_r + 0.02, radius));

  color += vec3(0.31, 0.86, 1.0) * ring_line * (0.10 + 0.22 * fade);
  color += vec3(0.31, 0.86, 1.0) * spoke_line * (0.10 + 0.20 * fade);

  // --- rims: crisp outer + soft inner, pulse on play
  let rim = aa(abs(radius - well_r), (2.0 + pulse * 3.0) * ring_px);
  let rim_soft = aa(abs(radius - well_r + 0.012), 5.0 * ring_px);
  let inner = aa(abs(radius - HOLE), 1.4 * ring_px);
  color += vec3(0.47, 1.0, 1.0) * rim * (0.50 + pulse * 0.45);
  color += vec3(0.20, 0.45, 0.70) * rim_soft * 0.30;
  color += vec3(0.31, 0.86, 1.0) * inner * 0.26;

  // --- danger tint: rim and grid blush red as the stack climbs
  let danger = clamp(u.danger, 0., 1.);
  let dzone = smoothstep(well_r - CELL * 2.6, well_r, radius);
  color += vec3(0.9, 0.15, 0.25) * dzone * danger * (0.35 + 0.25 * sin(u.time * 6.0));

  // --- magenta gravity core: plasma bands + glow + hot disc
  let core_r = HOLE * (1.15 + pulse * 0.55);
  let core_t = radius / max(core_r * 3.8, 1e-4);
  let glow = 1.0 - smoothstep(0.0, 1.0, core_t);
  let core_col = mix(vec3(1.0, 0.35, 1.0), vec3(1.0, 0.30, 0.45), danger);
  color += core_col * glow * (0.55 + pulse * 0.25);
  color += vec3(0.71, 0.16, 1.0) * exp(-radius / max(core_r * 1.1, 1e-4)) * 0.75;
  let plasma = 0.5 + 0.5 * sin(radius * 60.0 - u.time * 5.0 + angle * 3.0);
  let disc = 1.0 - smoothstep(core_r * 0.72, core_r * 0.72 + ring_px * 2.0, radius);
  color = mix(color, core_col * (0.75 + 0.25 * plasma), disc * 0.95);
  color += vec3(1.0, 0.30, 0.95) * disc * (0.35 + pulse * 0.5);

  // --- vignette
  let vig = smoothstep(1.35, 0.45, length((px - origin) / min_axis * 1.2));
  color *= mix(0.72, 1.0, vig);

  return vec4(color, 1.0);
}
`;

export const CELL_SHADER = /* wgsl */ `
struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) color: vec4<f32>,
}
struct Vin {
  @location(0) pos: vec2<f32>,
  @location(1) color: vec4<f32>,
}
@vertex fn vs(in: Vin) -> VOut {
  var o: VOut;
  o.clip = vec4(in.pos, 0., 1.);
  o.color = in.color;
  return o;
}
@fragment fn fs(in: VOut) -> @location(0) vec4<f32> {
  return vec4(in.color.rgb * in.color.a, in.color.a); // premultiplied
}
`;

function fan(cx, cy, r0, r1, a0, a1, color, out, segments = 10) {
  const cxn = (x, y) => [(x * 2) / out.w - 1, 1 - (y * 2) / out.h];
  for (let i = 0; i < segments; i++) {
    const ta = a0 + ((a1 - a0) * i) / segments;
    const tb = a0 + ((a1 - a0) * (i + 1)) / segments;
    const pts = [
      [cx + r0 * Math.cos(ta), cy + r0 * Math.sin(ta)],
      [cx + r1 * Math.cos(ta), cy + r1 * Math.sin(ta)],
      [cx + r1 * Math.cos(tb), cy + r1 * Math.sin(tb)],
      [cx + r0 * Math.cos(ta), cy + r0 * Math.sin(ta)],
      [cx + r1 * Math.cos(tb), cy + r1 * Math.sin(tb)],
      [cx + r0 * Math.cos(tb), cy + r0 * Math.sin(tb)],
    ];
    for (const [x, y] of pts) {
      const [cx2, cy2] = cxn(x, y);
      out.data.push(cx2, cy2, color[0], color[1], color[2], color[3]);
    }
  }
}

export class Renderer {
  /** Returns null on failure (caller shows the GPU-required panel). */
  static async create(canvas) {
    try {
      if (!navigator.gpu) return null;
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) return null;
      const device = await adapter.requestDevice();
      const ctx = canvas.getContext("webgpu");
      const format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: "opaque" });
      const r = new Renderer(canvas, device, ctx, format);
      r.resize();
      return r;
    } catch (e) {
      console.warn("GPU init failed:", e?.message || e);
      return null;
    }
  }

  constructor(canvas, device, ctx, format) {
    this.canvas = canvas;
    this.device = device;
    this.ctx = ctx;
    this.format = format;
    this.camera = { x: 0, y: 0 };
    this.t = 0;

    const bgModule = device.createShaderModule({ code: BG_SHADER });
    this.bgPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: bgModule, entryPoint: "vs" },
      fragment: { module: bgModule, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.bgUniforms = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const cellModule = device.createShaderModule({ code: CELL_SHADER });
    this.cellPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: cellModule, entryPoint: "vs",
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 8, format: "float32x4" },
          ],
        }],
      },
      fragment: {
        module: cellModule, entryPoint: "fs",
        targets: [{
          format,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
          },
        }],
      },
      primitive: { topology: "triangle-list" },
    });
    this.cellVerts = device.createBuffer({ size: 256 * 180 * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.w = w; this.h = h;
    this.pxPerUnit = (Math.min(w, h) * 0.5 - 10 * dpr) / (0.11 + 12 * 0.11);
  }

  /** world unit -> pixel. */
  toPx(ring, spoke, ringF = 0.5) {
    const radius = 0.11 + (ring + ringF) * 0.11;
    const a = -Math.PI / 2 + (spoke + 0.5) * ((Math.PI * 2) / 10);
    return [this.w / 2 + radius * this.pxPerUnit * Math.cos(a), this.h * 0.5 + radius * this.pxPerUnit * Math.sin(a)];
  }

  dangerOf(occupied) {
    for (let ring = 11; ring >= 0; ring--) {
      const n = occupied[ring].filter(Boolean).length;
      if (n > 0) {
        const depth = ring / 11;
        return Math.min(1, depth * (0.45 + (n / 10) * 0.75));
      }
    }
    return 0;
  }

  /** Build + submit one frame. world: {occupied, colors, piece, aimSpoke, phase} */
  render(world, dt) {
    this.resize();
    this.t += dt;
    const { occupied, colors, piece } = world;

    // slow camera drift for parallax life
    this.camera.x = Math.sin(this.t * 0.05) * 0.02;
    this.camera.y = Math.cos(this.t * 0.04) * 0.015;

    const enc = this.device.createCommandEncoder();
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: this.ctx.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear", storeOp: "store",
        }],
      });

      // background
      const ub = new Float32Array([
        this.w, this.h, this.camera.x, this.camera.y,
        this.t, this.pxPerUnit / (Math.min(this.w, this.h) * 0.5), world.pulse || 0, 0.5,
        this.dangerOf(occupied), 0, 0, 0,
      ]);
      this.device.queue.writeBuffer(this.bgUniforms, 0, ub);
      pass.setPipeline(this.bgPipeline);
      pass.setBindGroup(0, this.bgBind ||= this.device.createBindGroup({
        layout: this.bgPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: this.bgUniforms } }],
      }));
      pass.draw(3);

      // cells: locked + ghost + active
      const data = [];
      const buf = { data, w: this.w, h: this.h };
      const seg = Math.PI * 2 / 10;
      for (let ring = 0; ring < 12; ring++) {
        for (let spoke = 0; spoke < 10; spoke++) {
          if (!occupied[ring][spoke]) continue;
          const a0 = -Math.PI / 2 + spoke * seg + 0.012;
          const a1 = a0 + seg - 0.024;
          const r0 = 0.11 + ring * 0.11 + 0.004;
          const r1 = r0 + 0.11 - 0.008;
          const c = colors[ring][spoke];
          // subtle depth shading: cells nearer the core glow warmer
          const shade = 0.72 + 0.28 * (1 - ring / 12);
          fan(this.w / 2, this.h * 0.5, r0 * this.pxPerUnit, r1 * this.pxPerUnit, a0, a1,
            [c[0] * shade, c[1] * shade, c[2] * shade, 0.96], buf);
        }
      }
      if (piece) {
        const ghostRing = world.ghostRing(piece);
        for (const [dr, ds] of piece.cells) {
          const a0 = -Math.PI / 2 + ((piece.spoke + ds) % 10 + 10) % 10 * seg + 0.012;
          const a1 = a0 + seg - 0.024;
          const r0 = 0.11 + (ghostRing + dr) * 0.11 + 0.004;
          const r1 = r0 + 0.11 - 0.008;
          const cx = this.w / 2, cy = this.h * 0.5;
          fan(cx, cy, r0 * this.pxPerUnit, r1 * this.pxPerUnit, a0, a1, [0.8, 0.9, 1.0, 0.16], buf);
          const pr0 = 0.11 + (piece.ring + dr) * 0.11 + 0.004;
          const pr1 = pr0 + 0.11 - 0.008;
          const glow = 0.85 + 0.15 * Math.sin(this.t * 6);
          const c = piece.def.color;
          fan(cx, cy, pr0 * this.pxPerUnit, pr1 * this.pxPerUnit, a0, a1, [c[0] * glow, c[1] * glow, c[2] * glow, 1], buf);
        }
      }
      if (data.length) {
        const arr = new Float32Array(data);
        this.device.queue.writeBuffer(this.cellVerts, 0, arr, 0, arr.length);
        pass.setPipeline(this.cellPipeline);
        pass.setVertexBuffer(0, this.cellVerts);
        pass.draw(arr.length / 6);
      }
      pass.end();
    }
    this.device.queue.submit([enc.finish()]);
  }
}
