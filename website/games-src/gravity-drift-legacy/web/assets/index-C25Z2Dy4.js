(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=t(s);fetch(s.href,i)}})();const Ke="modulepreload",Xe=function(r,e){return new URL(r,e).href},_e={},je=function(e,t,n){let s=Promise.resolve();if(t&&t.length>0){let o=function(h){return Promise.all(h.map(c=>Promise.resolve(c).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const a=document.getElementsByTagName("link"),u=document.querySelector("meta[property=csp-nonce]"),d=(u==null?void 0:u.nonce)||(u==null?void 0:u.getAttribute("nonce"));s=o(t.map(h=>{if(h=Xe(h,n),h in _e)return;_e[h]=!0;const c=h.endsWith(".css"),f=c?'[rel="stylesheet"]':"";if(!!n)for(let m=a.length-1;m>=0;m--){const v=a[m];if(v.href===h&&(!c||v.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${h}"]${f}`))return;const l=document.createElement("link");if(l.rel=c?"stylesheet":Ke,c||(l.as="script"),l.crossOrigin="",l.href=h,d&&l.setAttribute("nonce",d),document.head.appendChild(l),c)return new Promise((m,v)=>{l.addEventListener("load",m),l.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${h}`)))})}))}function i(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return s.then(o=>{for(const a of o||[])a.status==="rejected"&&i(a.reason);return e().catch(i)})},A=10,C=12,D=.11,ce=D,he=.38,Je=.12,Qe=.05,Ae=.75,J=[{name:"I",cells:[[0,0],[0,1],[0,2],[0,3]],color:[.15,1,.95,1]},{name:"O",cells:[[0,0],[0,1],[1,0],[1,1]],color:[1,.88,.2,1]},{name:"T",cells:[[0,0],[0,1],[0,2],[1,1]],color:[.9,.28,1,1]},{name:"S",cells:[[0,1],[0,2],[1,0],[1,1]],color:[.35,1,.4,1]},{name:"Z",cells:[[0,0],[0,1],[1,1],[1,2]],color:[1,.28,.35,1]},{name:"J",cells:[[0,0],[1,0],[1,1],[1,2]],color:[.28,.5,1,1]},{name:"L",cells:[[0,2],[1,0],[1,1],[1,2]],color:[1,.62,.15,1]}],B={Aiming:"aiming",Falling:"falling",GameOver:"gameover"};function qe(r){const e=A;return(r%e+e)%e}function X(r){const e=r.map(([s,i])=>[i,-s]),t=Math.min(...e.map(s=>s[0])),n=Math.min(...e.map(s=>s[1]));return e.map(([s,i])=>[s-t,i-n])}class Q{constructor(e,t,n,s){this.shape=e,this.ring=t,this.spoke=n,this.cells=s}static spawn(e){const t=J[e].cells.map(i=>[...i]),n=Math.max(...t.map(i=>i[0])),s=C-1-n;return s<0?null:new Q(e,s,0,t)}clone(){return new Q(this.shape,this.ring,this.spoke,this.cells.map(e=>[...e]))}color(){return J[this.shape].color.slice()}occupancy(){const e=[];for(const[t,n]of this.cells){const s=this.ring+t;s<0||s>=C||e.push([s,qe(this.spoke+n)])}return e}fits(e){for(const[t]of this.cells){const n=this.ring+t;if(n<0||n>=C)return!1}return this.occupancy().every(([t,n])=>!e[t][n])}rotateCw(){this.cells=X(this.cells)}rotateCcw(){this.cells=X(X(X(this.cells)))}}class Ze{constructor(){this.turnLeft=!1,this.turnRight=!1,this.rotateCw=!1,this.rotateCcw=!1,this.release=!1,this.hardDrop=!1,this.restart=!1}turn(){return(this.turnRight?1:0)-(this.turnLeft?1:0)}takeRotate(){const e=(this.rotateCw?1:0)-(this.rotateCcw?1:0);return this.rotateCw=!1,this.rotateCcw=!1,e}takeRelease(){const e=this.release;return this.release=!1,e}takeHardDrop(){const e=this.hardDrop;return this.hardDrop=!1,e}takeRestart(){const e=this.restart;return this.restart=!1,e}}class et{constructor(){this.reset()}reset(){this.occupied=Array.from({length:C},()=>Array(A).fill(!1)),this.colors=Array.from({length:C},()=>Array.from({length:A},()=>[0,0,0,0])),this.piece=null,this.phase=B.Aiming,this.score=0,this.combo=0,this.lines=0,this.time=0,this.pulseBoost=0,this.queue=[],this.rng=Math.imul(Date.now()&268435455,1664525)+1013904223>>>0,this.gravityCd=he,this.aimCd=Ae,this.dasDir=0,this.dasCd=0,this.events=[],this.refillQueue(),this.spawnOrDie()}refillQueue(){for(;this.queue.length<6;){const e=J.map((t,n)=>n);for(let t=0;t<e.length;t++){this.rng=Math.imul(this.rng,1664525)+1013904223>>>0;const n=this.rng%e.length,s=e[t];e[t]=e[n],e[n]=s}this.queue.push(...e)}}upcoming(){return[this.queue[0]??0,this.queue[1]??1,this.queue[2]??2]}level(){return 1+Math.floor(this.lines/4)}gravityInterval(){return Math.min(he,Math.max(.07,he-(this.level()-1)*.055))}spawnOrDie(){this.refillQueue();const e=this.queue.shift(),t=Q.spawn(e);if(!t){this.piece=null,this.phase=B.GameOver,this.events.push({type:"die"});return}this.rng=Math.imul(this.rng,1664525)+1013904223>>>0;const n=this.rng%A;let s=!1;for(let i=0;i<A;i++)if(t.spoke=(n+i)%A,t.fits(this.occupied)){s=!0;break}if(!s){this.piece=null,this.phase=B.GameOver,this.events.push({type:"die"});return}this.piece=t,this.phase=B.Aiming,this.aimCd=Ae,this.gravityCd=this.gravityInterval()}update(e,t){if(this.pulseBoost=Math.max(0,this.pulseBoost-e*1.8),this.phase!==B.GameOver&&(this.time+=e),t.takeRestart()){this.reset();return}if(this.phase!==B.GameOver){if(this.handleRotate(t),this.handleStrafe(e,t),this.phase===B.Aiming){if(this.aimCd-=e,t.takeHardDrop()){this.phase=B.Falling,this.hardDrop();return}(t.takeRelease()||this.aimCd<=0)&&(this.phase=B.Falling,this.gravityCd=.02,this.events.push({type:"release"}));return}if(t.takeHardDrop()){this.hardDrop();return}this.gravityCd-=e,this.gravityCd<=0&&(this.gravityCd=this.gravityInterval(),this.stepIn())}}handleRotate(e){const t=e.takeRotate();if(!t||!this.piece)return;const n=this.piece.clone();t>0?n.rotateCw():n.rotateCcw(),n.fits(this.occupied)&&(this.piece=n,this.events.push({type:"rotate"}))}handleStrafe(e,t){const n=Math.sign(t.turn());if(!n){this.dasDir=0,this.dasCd=0;return}if(n!==this.dasDir){this.dasDir=n,this.dasCd=Je,this.tryShift(n,!0);return}for(this.dasCd-=e;this.dasCd<=0&&(this.dasCd+=Qe,!!this.tryShift(n)););}tryShift(e,t=!1){if(!this.piece)return!1;const n=this.piece.clone();return n.spoke=qe(this.piece.spoke+e),n.fits(this.occupied)?(this.piece=n,t&&this.events.push({type:"shift"}),!0):!1}stepIn(){if(!this.piece)return;const e=this.piece.clone();e.ring-=1,e.fits(this.occupied)?this.piece=e:this.lock()}hardDrop(){for(this.events.push({type:"hard"});this.piece;){const e=this.piece.clone();if(e.ring-=1,e.fits(this.occupied))this.piece=e;else{this.lock(!0);return}}}lock(e=!1){const t=this.piece;if(!t)return;this.piece=null;const n=t.color(),s=t.occupancy();for(const[o,a]of s)this.occupied[o][a]=!0,this.colors[o][a]=n;this.events.push({type:"lock",cells:s,color:n,hard:e});const i=this.collapseRings();if(i.length>0){this.combo+=1;const o=i.length;this.lines+=o;const a=o*100*this.combo*this.level();this.score+=a,this.pulseBoost=Math.min(2.2,.7+o*.55),this.events.push({type:"clear",count:o,combo:this.combo,burst:i,gained:a})}else this.combo=0;this.spawnOrDie()}collapseRings(){const e=[];for(;;){const t=[...Array(C).keys()].find(n=>this.occupied[n].every(Boolean));if(t===void 0)break;for(let n=0;n<A;n++)e.push({ring:t,spoke:n,color:this.colors[t][n].slice()});for(let n=t;n<C-1;n++)this.occupied[n]=this.occupied[n+1],this.colors[n]=this.colors[n+1];this.occupied[C-1]=Array(A).fill(!1),this.colors[C-1]=Array.from({length:A},()=>[0,0,0,0])}return e}ghostRing(e){const t=e.clone();for(;;)if(t.ring-=1,!t.fits(this.occupied))return t.ring+1}drawCells(){const e=[];for(let s=0;s<C;s++)for(let i=0;i<A;i++)this.occupied[s][i]&&e.push([s,i,this.colors[s][i]]);if(!this.piece)return e;const t=this.piece.clone();if(t.ring=this.ghostRing(this.piece),t.ring!==this.piece.ring){const s=this.piece.color();s[3]=.38,s[0]*=.7,s[1]*=.7,s[2]*=.7;for(const[i,o]of t.occupancy())e.push([i,o,s])}const n=this.piece.color();for(const[s,i]of this.piece.occupancy())e.push([s,i,n]);return e}}const tt=`const TAU: f32 = 6.28318530718;\r
const CELL: f32 = 0.11;\r
const HOLE: f32 = 0.11;\r
const SPOKES: f32 = 10.0;\r
const RINGS: f32 = 12.0;\r
\r
struct Uniforms {\r
    resolution: vec2<f32>,\r
    camera: vec2<f32>,\r
    time: f32,\r
    zoom: f32,\r
    pulse: f32,\r
    origin_y: f32,\r
}\r
\r
@group(0) @binding(0)\r
var<uniform> uniforms: Uniforms;\r
\r
struct VertexOutput {\r
    @builtin(position) clip_position: vec4<f32>,\r
}\r
\r
@vertex\r
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {\r
    var positions = array<vec2<f32>, 3>(\r
        vec2<f32>(-1.0, -1.0),\r
        vec2<f32>(3.0, -1.0),\r
        vec2<f32>(-1.0, 3.0),\r
    );\r
    var out: VertexOutput;\r
    out.clip_position = vec4<f32>(positions[vertex_index], 0.0, 1.0);\r
    return out;\r
}\r
\r
fn aa_line(dist: f32, pixel: f32) -> f32 {\r
    let w = max(pixel, 1e-5);\r
    return 1.0 - smoothstep(0.0, w, dist);\r
}\r
\r
@fragment\r
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {\r
    let res = max(uniforms.resolution, vec2<f32>(1.0, 1.0));\r
    let min_axis = min(res.x, res.y);\r
    let origin = vec2<f32>(0.5 * res.x, uniforms.origin_y * res.y);\r
    let pixel = in.clip_position.xy;\r
\r
    // Same space backdrop as the original canvas radial gradient.\r
    let grad_r = length(pixel - origin) / (max(res.x, res.y) * 0.7);\r
    var color = mix(vec3<f32>(0.102, 0.031, 0.220), vec3<f32>(0.027, 0.016, 0.102), clamp(grad_r / 0.45, 0.0, 1.0));\r
    color = mix(color, vec3<f32>(0.008, 0.004, 0.039), smoothstep(0.45, 1.0, grad_r));\r
\r
    var view = (pixel - origin) / min_axis;\r
    view.y = -view.y;\r
    view = view / max(uniforms.zoom, 0.05);\r
    let p = view + uniforms.camera;\r
\r
    let radius = length(p);\r
    let angle = atan2(p.y, p.x);\r
    let well_r = HOLE + RINGS * CELL;\r
    let pulse = uniforms.pulse;\r
    let ring_px = fwidth(radius);\r
\r
    // Stars (original canvas: sparse white dots).\r
    let sg = floor(pixel * 0.085);\r
    let sf = fract(pixel * 0.085);\r
    let sn = fract(sin(dot(sg, vec2<f32>(127.1, 311.7))) * 43758.5453);\r
    let star = step(0.985, sn) * (1.0 - smoothstep(0.0, 0.28, length(sf - 0.5)));\r
    color += vec3<f32>(0.91, 0.94, 1.0) * star * (0.55 + 0.25 * sin(uniforms.time * 1.4 + sg.x));\r
\r
    // Magenta gravity core — large glow + hot center, same as canvas.\r
    let core_r = HOLE * (1.15 + pulse * 0.55);\r
    let core_t = radius / max(core_r * 3.8, 1e-4);\r
    let glow = (1.0 - smoothstep(0.0, 1.0, core_t));\r
    color += vec3<f32>(1.0, 0.35, 1.0) * glow * (0.55 + pulse * 0.2);\r
    color += vec3<f32>(0.71, 0.16, 1.0) * exp(-radius / max(core_r * 1.1, 1e-4)) * 0.75;\r
    let disc = 1.0 - smoothstep(core_r * 0.72, core_r * 0.72 + ring_px * 2.0, radius);\r
    color = mix(color, vec3<f32>(1.0, 0.42, 1.0), disc * 0.95);\r
    color += vec3<f32>(1.0, 0.30, 0.95) * disc * (0.35 + pulse * 0.45);\r
\r
    // Empty well: line grid only (no checkerboard fill).\r
    let in_well = radius >= HOLE * 0.92 && radius <= well_r + 0.004;\r
    let ring_field = abs(fract((radius - HOLE) / CELL + 1.0) - 0.5) * CELL;\r
    let ring_line = aa_line(ring_field, 1.15 * ring_px) * select(0.0, 1.0, in_well);\r
\r
    let sector = TAU / SPOKES;\r
    let ang = abs(fract((angle + TAU * 0.25) / sector + 0.5) - 0.5) * sector;\r
    let spoke_field = ang * max(radius, 1e-4);\r
    let spoke_line = aa_line(spoke_field, 1.15 * fwidth(spoke_field))\r
        * smoothstep(HOLE * 0.9, HOLE, radius)\r
        * (1.0 - smoothstep(well_r, well_r + 0.02, radius));\r
\r
    let rim = aa_line(abs(radius - well_r), (2.0 + pulse * 3.0) * ring_px);\r
    let inner = aa_line(abs(radius - HOLE), 1.2 * ring_px);\r
\r
    color += vec3<f32>(0.31, 0.86, 1.0) * ring_line * 0.18;\r
    color += vec3<f32>(0.31, 0.86, 1.0) * spoke_line * 0.18;\r
    color += vec3<f32>(0.47, 1.0, 1.0) * rim * (0.45 + pulse * 0.4);\r
    color += vec3<f32>(0.31, 0.86, 1.0) * inner * 0.22;\r
\r
    return vec4<f32>(color, 1.0);\r
}\r
`,rt=`struct ViewUniforms {\r
    resolution: vec2<f32>,\r
    camera: vec2<f32>,\r
    zoom: f32,\r
    origin_y: f32,\r
}\r
\r
@group(0) @binding(0)\r
var<uniform> uniforms: ViewUniforms;\r
\r
struct VertexInput {\r
    @location(0) position: vec2<f32>,\r
    @location(1) color: vec4<f32>,\r
    @location(2) uv: vec2<f32>,\r
}\r
\r
struct VertexOutput {\r
    @builtin(position) clip_position: vec4<f32>,\r
    @location(0) color: vec4<f32>,\r
    @location(1) uv: vec2<f32>,\r
}\r
\r
@vertex\r
fn vs_main(in: VertexInput) -> VertexOutput {\r
    let res = max(uniforms.resolution, vec2<f32>(1.0, 1.0));\r
    let min_axis = min(res.x, res.y);\r
    let view = (in.position - uniforms.camera) * max(uniforms.zoom, 0.05);\r
    let pixel = vec2<f32>(\r
        0.5 * res.x + view.x * min_axis,\r
        uniforms.origin_y * res.y - view.y * min_axis,\r
    );\r
    let ndc = vec2<f32>(\r
        pixel.x / res.x * 2.0 - 1.0,\r
        1.0 - pixel.y / res.y * 2.0,\r
    );\r
\r
    var out: VertexOutput;\r
    out.clip_position = vec4<f32>(ndc.x, ndc.y, 0.0, 1.0);\r
    out.color = in.color;\r
    out.uv = in.uv;\r
    return out;\r
}\r
\r
@fragment\r
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {\r
    let edge = min(min(in.uv.x, 1.0 - in.uv.x), min(in.uv.y, 1.0 - in.uv.y));\r
    let rim = 1.0 - smoothstep(0.0, 0.12, edge);\r
    var rgb = in.color.rgb;\r
    rgb += vec3<f32>(1.0) * rim * 0.35 * in.color.a;\r
    return vec4<f32>(rgb, in.color.a);\r
}\r
`,nt=`struct OverlayIn {\r
    @location(0) ndc: vec2<f32>,\r
    @location(1) color: vec4<f32>,\r
}\r
\r
struct OverlayOut {\r
    @builtin(position) clip_position: vec4<f32>,\r
    @location(0) color: vec4<f32>,\r
}\r
\r
@vertex\r
fn vs_main(in: OverlayIn) -> OverlayOut {\r
    var out: OverlayOut;\r
    out.clip_position = vec4<f32>(in.ndc, 0.0, 1.0);\r
    out.color = in.color;\r
    return out;\r
}\r
\r
@fragment\r
fn fs_main(in: OverlayOut) -> @location(0) vec4<f32> {\r
    return in.color;\r
}\r
`,Ge=8192,Be=16384,Z=8,ee=6,Te=ce+C*D,Se=.5,le=.48/Te;function st(r,e){const t=Math.max(1,r),n=Math.max(1,e),s=Math.min(t,n)*.48;return{originY:Se,zoom:s/(Te*Math.min(t,n))}}class it{constructor({device:e,format:t,queue:n,gridPipeline:s,cellPipeline:i,overlayPipeline:o,gridBg:a,cellBg:u,gridUniforms:d,viewUniforms:h,cellVerts:c,overlayVerts:f}){this.device=e,this.format=t,this.queue=n,this.gridPipeline=s,this.cellPipeline=i,this.overlayPipeline=o,this.gridBg=a,this.cellBg=u,this.gridUniforms=d,this.viewUniforms=h,this.cellVerts=c,this.overlayVerts=f,this.contexts=new Map}attach(e){const t=e.getContext("webgpu");if(!t)throw new Error("canvas rejected WebGPU");return this.contexts.set(e,t),this.configure(e),t}configure(e){const t=this.contexts.get(e);if(!t)return;const n=Math.max(1,e.width),s=Math.max(1,e.height);t.configure({device:this.device,format:this.format,alphaMode:"opaque",usage:GPUTextureUsage.RENDER_ATTACHMENT}),t._size=`${n}x${s}`}ensureSize(e){const t=this.contexts.get(e);if(!t)return;const n=`${e.width}x${e.height}`;t._size!==n&&this.configure(e)}writeGrid(e,t,n,s,i,o,a){this.queue.writeBuffer(this.gridUniforms,0,new Float32Array([e,t,n[0],n[1],s,i,o,a]))}writeView(e,t,n,s,i){this.queue.writeBuffer(this.viewUniforms,0,new Float32Array([e,t,n[0],n[1],s,i,0,0]))}writeCells(e){const t=Math.min(e.length,Ge*Z);return t<=0?0:(this.queue.writeBuffer(this.cellVerts,0,e.subarray(0,t)),t/Z)}writeOverlay(e){const t=Math.min(e.length,Be*ee);return t<=0?0:(this.queue.writeBuffer(this.overlayVerts,0,e.subarray(0,t)),t/ee)}frame(e){const t=e.canvas;this.ensureSize(t);const n=this.contexts.get(t);if(!n)return;const s=Math.max(1,t.width),i=Math.max(1,t.height),o=e.zoom??le,a=e.originY??Se,u=e.camera??[0,0];this.writeGrid(s,i,u,e.time,o,e.pulse??0,a),this.writeView(s,i,u,o,a);const d=this.writeCells(e.cellFloats??new Float32Array),h=this.writeOverlay(e.overlayFloats??new Float32Array);let c;try{c=n.getCurrentTexture()}catch{this.configure(t);return}const f=c.createView(),p=this.device.createCommandEncoder({label:"gravity-drift-frame"}),l=p.beginRenderPass({colorAttachments:[{view:f,loadOp:"clear",storeOp:"store",clearValue:e.clear??{r:5/255,g:5/255,b:16/255,a:1}}]});e.drawGrid!==!1&&(l.setPipeline(this.gridPipeline),l.setBindGroup(0,this.gridBg),l.draw(3)),d>0&&(l.setPipeline(this.cellPipeline),l.setBindGroup(0,this.cellBg),l.setVertexBuffer(0,this.cellVerts),l.draw(d)),h>0&&(l.setPipeline(this.overlayPipeline),l.setVertexBuffer(0,this.overlayVerts),l.draw(h)),l.end(),this.queue.submit([p.finish()])}}function ke(r,e,t){return r.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:t}}]})}async function ot(){if(!navigator.gpu)throw new Error("WebGPU is not available in this browser");const r=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!r)throw new Error("no GPU adapter");const e=await r.requestDevice({label:"gravity-drift"}),t=navigator.gpu.getPreferredCanvasFormat(),n=e.queue,s=e.createShaderModule({label:"grid",code:tt}),i=e.createShaderModule({label:"cell",code:rt}),o=e.createShaderModule({label:"overlay",code:nt}),a=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),u=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),d=e.createBuffer({label:"grid-uniforms",size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=e.createBuffer({label:"view-uniforms",size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=e.createBuffer({label:"cell-verts",size:Ge*Z*4,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),f=e.createBuffer({label:"overlay-verts",size:Be*ee*4,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),p=e.createPipelineLayout({bindGroupLayouts:[a]}),l=e.createPipelineLayout({bindGroupLayouts:[u]}),m={color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}},v=e.createRenderPipeline({label:"grid",layout:p,vertex:{module:s,entryPoint:"vs_main"},fragment:{module:s,entryPoint:"fs_main",targets:[{format:t,blend:m}]},primitive:{topology:"triangle-list"}}),S=e.createRenderPipeline({label:"cell",layout:l,vertex:{module:i,entryPoint:"vs_main",buffers:[{arrayStride:Z*4,attributes:[{shaderLocation:0,offset:0,format:"float32x2"},{shaderLocation:1,offset:8,format:"float32x4"},{shaderLocation:2,offset:24,format:"float32x2"}]}]},fragment:{module:i,entryPoint:"fs_main",targets:[{format:t,blend:m}]},primitive:{topology:"triangle-list"}}),b=e.createRenderPipeline({label:"overlay",layout:"auto",vertex:{module:o,entryPoint:"vs_main",buffers:[{arrayStride:ee*4,attributes:[{shaderLocation:0,offset:0,format:"float32x2"},{shaderLocation:1,offset:8,format:"float32x4"}]}]},fragment:{module:o,entryPoint:"fs_main",targets:[{format:t,blend:m}]},primitive:{topology:"triangle-list"}});return new it({device:e,format:t,queue:n,gridPipeline:v,cellPipeline:S,overlayPipeline:b,gridBg:ke(e,a,d),cellBg:ke(e,u,h),gridUniforms:d,viewUniforms:h,cellVerts:c,overlayVerts:f})}function at(r){const e=document.querySelector("#gpu-error");e&&(e.textContent=`GPU REQUIRED — ${r}`,e.classList.remove("hidden"))}const ct=Math.PI*2,fe=4;function $(r,e,t){return r+(e-r)*t}function U(r,e){return[Math.cos(e)*r,Math.sin(e)*r]}function lt(r){const e=ce+r*D;return[e,e+D]}function ut(r,e,t,n=le){const s=Math.min(e,t),i=n*s;return i<=0?[0,0]:[-r.x/i,r.y/i]}function ht(r,e,t,n,s,i=le,o=Se){const a=Math.min(t,n),u=.5*t+(r-s[0])*i*a,d=o*n-(e-s[1])*i*a;return[u/t*2-1,1-d/n*2]}function ft(r,e=new Set,t=0){const n=ct/A,s=[];for(const[i,o,a]of r){const h=.08-(e.has(`${i},${o}`)?.5+.5*Math.sin(t*.012):0)*.03,[c,f]=lt(i),p=o*n-Math.PI/2,l=p,m=p+n,v=.5*(l+m),S=.5*(c+f),b=$(c,S,h),L=$(f,S,h),M=$(l,v,h),g=$(m,v,h),E=[a[0],a[1],a[2],Math.min(1,a[3]*.92)];for(let _=0;_<fe;_++){const I=_/fe,G=(_+1)/fe,N=$(M,g,I),W=$(M,g,G),Ee=[U(b,N),U(L,N),U(L,W),U(b,W)],Me=[[I,0],[I,1],[G,1],[G,0]];for(const K of[0,1,2,0,2,3])s.push(Ee[K][0],Ee[K][1],...E,Me[K][0],Me[K][1])}}return new Float32Array(s)}function dt(r,e,t,n,s,i){for(const o of[e,t,n,e,n,s])r.push(o[0],o[1],i[0],i[1],i[2],i[3])}function pt(r,e,t){const n=J[r],s=n.cells,i=Math.max(...s.map(g=>g[1])),o=.22,a=.1,u=.48,d=-Math.PI/2-(i+1)*u/2,h=[];for(const[g,E]of s){const _=a+g*o+.012,I=a+(g+1)*o-.012,G=d+E*u+.03,N=d+(E+1)*u-.03;h.push({pts:[U(_,G),U(I,G),U(I,N),U(_,N)],col:[...n.color]})}let c=1/0,f=1/0,p=-1/0,l=-1/0;for(const g of h)for(const[E,_]of g.pts)c=Math.min(c,E),p=Math.max(p,E),f=Math.min(f,_),l=Math.max(l,_);const m=(c+p)*.5,v=(f+l)*.5,S=Math.max(p-c,l-f,1e-6),b=.86*Math.min(e,t)/S,L=(g,E)=>[(g-m)*b/(e*.5),(E-v)*b/(t*.5)],M=[];for(const g of h)dt(M,L(...g.pts[0]),L(...g.pts[1]),L(...g.pts[2]),L(...g.pts[3]),g.col);return new Float32Array(M)}function mt(r,e,t){const s=(ce+r*D+D*.5)*t,i=(e+.5)*Math.PI*2/A-Math.PI/2;return[Math.cos(i)*s,Math.sin(i)*s]}function P(r,{freq:e=440,dur:t=.08,type:n="square",gain:s=.06,slide:i=0}){if(!r)return;const o=r.currentTime,a=r.createOscillator(),u=r.createGain();a.type=n,a.frequency.setValueAtTime(e,o),i&&a.frequency.exponentialRampToValueAtTime(Math.max(40,e+i),o+t),u.gain.setValueAtTime(s,o),u.gain.exponentialRampToValueAtTime(.001,o+t),a.connect(u),u.connect(r.destination),a.start(o),a.stop(o+t+.02)}function gt(r,e=.18,t=.08){if(!r)return;const n=r.createBuffer(1,r.sampleRate*e,r.sampleRate),s=n.getChannelData(0);for(let u=0;u<s.length;u++)s[u]=(Math.random()*2-1)*(1-u/s.length);const i=r.createBufferSource();i.buffer=n;const o=r.createGain(),a=r.createBiquadFilter();a.type="bandpass",a.frequency.value=900,o.gain.setValueAtTime(t,r.currentTime),o.gain.exponentialRampToValueAtTime(.001,r.currentTime+e),i.connect(a),a.connect(o),o.connect(r.destination),i.start()}class vt{constructor(){this.shake=0,this.hitstop=0,this.flash=0,this.particles=[],this.waves=[],this.floats=[],this.audio=null,this.comboEl=document.querySelector("#combo-pop"),this.flashEl=document.querySelector("#screen-flash"),this.scoreEl=document.querySelector("#score"),this.app=document.querySelector("#app")}armAudio(){if(this.audio)return;const e=window.AudioContext||window.webkitAudioContext;e&&(this.audio=new e)}offset(){if(this.shake<=0)return{x:0,y:0};const e=this.shake*11;return{x:(Math.random()-.5)*e,y:(Math.random()-.5)*e}}consume(e){var t;for(const n of e){if(n.type==="rotate"&&P(this.audio,{freq:720,dur:.04,gain:.035,type:"triangle"}),n.type==="shift"&&P(this.audio,{freq:280,dur:.03,gain:.03,type:"square"}),n.type==="release"&&P(this.audio,{freq:180,dur:.09,gain:.05,slide:220,type:"sawtooth"}),n.type==="hard"&&(this.shake=Math.max(this.shake,.18),P(this.audio,{freq:90,dur:.12,gain:.08,slide:-40,type:"square"})),n.type==="lock"){this.shake=Math.max(this.shake,n.hard?.28:.14),this.hitstop=Math.max(this.hitstop,n.hard?.045:.025),this.flash=Math.max(this.flash,.12);for(const[s,i]of n.cells)this.burstCell(s,i,n.color,7);P(this.audio,{freq:140,dur:.07,gain:.06,type:"square"}),P(this.audio,{freq:420,dur:.05,gain:.03,type:"triangle"})}n.type==="clear"&&this.onClear(n),n.type==="die"&&(this.shake=.7,this.flash=.85,this.hitstop=.2,P(this.audio,{freq:220,dur:.45,gain:.1,slide:-180,type:"sawtooth"}),P(this.audio,{freq:90,dur:.5,gain:.1,slide:-50,type:"square"}),(t=this.flashEl)==null||t.classList.add("die"),setTimeout(()=>{var s;return(s=this.flashEl)==null?void 0:s.classList.remove("die")},500))}}onClear(e){var s,i,o,a,u,d;const t=e.count;this.shake=Math.max(this.shake,.35+t*.18),this.hitstop=Math.max(this.hitstop,.07+t*.04),this.flash=Math.max(this.flash,.45+t*.12),(s=this.app)==null||s.classList.remove("cleared"),(i=this.app)==null||i.offsetWidth,(o=this.app)==null||o.classList.add("cleared"),(a=this.scoreEl)==null||a.classList.remove("pop"),(u=this.scoreEl)==null||u.offsetWidth,(d=this.scoreEl)==null||d.classList.add("pop"),this.comboEl&&(this.comboEl.textContent=e.combo>1?`COMBO x${e.combo}`:t>1?`${t} RINGS`:"RING CLEAR",this.comboEl.classList.remove("show"),this.comboEl.offsetWidth,this.comboEl.classList.add("show"));const n=new Set;for(const h of e.burst)this.burstCell(h.ring,h.spoke,h.color,14),!n.has(h.ring)&&(n.add(h.ring),this.waves.push({ring:h.ring,life:.45,max:.45,color:h.color}));this.floats.push({text:`+${e.gained}`,life:.7,max:.7,y:0}),gt(this.audio,.16+t*.05,.07+t*.02),P(this.audio,{freq:520+t*80,dur:.16,gain:.07,slide:400,type:"square"}),P(this.audio,{freq:260,dur:.2,gain:.05,slide:180,type:"triangle"})}burstCell(e,t,n,s){this.particles.push({ring:e,spoke:t,vx:0,vy:0,life:.2,max:.2,color:n,size:10,spark:!1});for(let i=0;i<s;i++){const o=Math.random()*Math.PI*2,a=40+Math.random()*220;this.particles.push({ring:e,spoke:t,vx:Math.cos(o)*a,vy:Math.sin(o)*a,life:.28+Math.random()*.35,max:.5,color:n,size:1.5+Math.random()*3.2,spark:!0})}}update(e){this.shake=Math.max(0,this.shake-e*2.6),this.hitstop=Math.max(0,this.hitstop-e),this.flash=Math.max(0,this.flash-e*2.2),this.flashEl&&(this.flashEl.style.opacity=String(this.flash*.55));for(const t of this.particles)t.life-=e,t.spark&&(t.px=(t.px??0)+t.vx*e,t.py=(t.py??0)+t.vy*e,t.vx*=.92,t.vy*=.92);this.particles=this.particles.filter(t=>t.life>0);for(const t of this.waves)t.life-=e;this.waves=this.waves.filter(t=>t.life>0);for(const t of this.floats)t.life-=e,t.y-=48*e;this.floats=this.floats.filter(t=>t.life>0)}overlayVerts(e,t,n,s=le,i){const o=Math.min(e,t),a=s*o,u=[],d=(c,f)=>ht(c,f,e,t,n,s,i),h=(c,f,p,l,m)=>{const v=d(c-p,f-l),S=d(c+p,f-l),b=d(c+p,f+l),L=d(c-p,f+l);for(const M of[v,S,b,v,b,L])u.push(M[0],M[1],m[0],m[1],m[2],m[3])};for(const c of this.waves){const f=1-c.life/c.max,p=(ce+c.ring*D+D*.5)*(1+f*.35),l=.012*(1-f)/Math.max(p,.05),m=(1-f)*.85,v=[c.color[0],c.color[1],c.color[2],m],S=40;for(let b=0;b<S;b++){const L=b/S*Math.PI*2,M=(b+1)/S*Math.PI*2,g=p-l*.5,E=p+l*.5,_=d(Math.cos(L)*g,Math.sin(L)*g),I=d(Math.cos(L)*E,Math.sin(L)*E),G=d(Math.cos(M)*E,Math.sin(M)*E),N=d(Math.cos(M)*g,Math.sin(M)*g);for(const W of[_,I,G,_,G,N])u.push(W[0],W[1],...v)}}for(const c of this.particles){const[f,p]=mt(c.ring,c.spoke,1),l=f+(c.px??0)/a,m=p-(c.py??0)/a,v=Math.max(0,c.life/c.max),S=(c.spark?c.size:c.size*v)/a;h(l,m,S,S,[c.color[0],c.color[1],c.color[2],v])}return new Float32Array(u)}}const yt=100;function Y(r){return String(r||"").toUpperCase().replace(/[^A-Z0-9 _-]/g,"").trim().slice(0,16)}function F(r){return Y(r).length>=3}function wt(r){const e=Math.floor(Number(r==null?void 0:r.score)),t=Math.floor(Number(r==null?void 0:r.level)),n=Math.floor(Number(r==null?void 0:r.lines)),s=Number(r==null?void 0:r.time),i=Y(r==null?void 0:r.name);return!Number.isFinite(e)||e<0||e>99999999||!Number.isFinite(t)||t<1||t>999||!Number.isFinite(n)||n<0||n>99999||!Number.isFinite(s)||s<0||s>86400||!F(i)?null:{name:i,score:e,level:t,lines:n,time:s,at:Date.now()}}function Ve(r){return[...r].sort((e,t)=>t.score-e.score||t.lines-e.lines||e.at-t.at).slice(0,yt)}function xt(r,e){const t=r.findIndex(n=>n.at===e.at&&n.name===e.name&&n.score===e.score);return t<0?null:t+1}const Ie="gravity-drift-save-v1",St=10;function de(){return{name:"",games:0,totalScore:0,totalLines:0,bestScore:0,bestLevel:1,bestLines:0,scores:[]}}function bt(){try{const r=localStorage.getItem(Ie);if(!r)return de();const e={...de(),...JSON.parse(r)};return e.name=F(e.name)?Y(e.name):"",e}catch{return de()}}function ge(r){return localStorage.setItem(Ie,JSON.stringify(r)),r}function Ue(r,e){return F(e)?ge({...r,name:Y(e)}):ge({...r,name:""})}function Lt(r,e){const t={name:r.name,score:e.score,level:e.level,lines:e.lines,time:e.time,at:Date.now()},n=[...r.scores,t].sort((i,o)=>o.score-i.score||o.lines-i.lines).slice(0,St),s={...r,games:r.games+1,totalScore:r.totalScore+e.score,totalLines:r.totalLines+e.lines,bestScore:Math.max(r.bestScore,e.score),bestLevel:Math.max(r.bestLevel,e.level),bestLines:Math.max(r.bestLines,e.lines),scores:n};return ge(s)}function De(r){const e=Math.floor(r/60),t=Math.floor(r%60);return`${e}:${String(t).padStart(2,"0")}`}const Ne="gravity-drift-pending-v1",Et="/api/gravity-drift/scores";function Fe(){try{return JSON.parse(localStorage.getItem(Ne)||"[]")}catch{return[]}}function $e(r){localStorage.setItem(Ne,JSON.stringify(r))}async function be(r,e){const t=await fetch(Et,{method:r,headers:e?{"Content-Type":"application/json"}:void 0,body:e?JSON.stringify(e):void 0});if(!t.ok)throw new Error(`scores ${t.status}`);return t.json()}async function Mt(){const r=await be("GET");return Ve(r.scores||[])}async function _t(r,e){const t=wt({...r,name:e});if(!t)return{scores:[],rank:null};try{const n=await be("POST",t),s=Ve(n.scores||[]);return{scores:s,rank:n.rank??xt(s,t)}}catch{return $e([...Fe(),t]),{scores:[],rank:null,queued:!0}}}async function ze(){const r=Fe();if(!r.length)return;const e=[];for(const t of r)try{await be("POST",t)}catch{e.push(t)}$e(e)}je(async()=>{const{registerSW:r}=await import("./virtual_pwa-register-Bkbirocl.js");return{registerSW:r}},[],import.meta.url).then(({registerSW:r})=>r({immediate:!0}));const O=document.querySelector("#well"),y=new et,x=new Ze,T=new vt;let q=null;const At=document.querySelector("#score"),kt=document.querySelector("#level"),Ct=document.querySelector("#lines"),Pt=document.querySelector("#time"),We=document.querySelector("#overlay"),pe=document.querySelector("#over-summary"),He=document.querySelector("#over-best"),Le=document.querySelector("#menu"),Ot=document.querySelector("#app"),k=document.querySelector("#pilot-name"),te=document.querySelector("#name-error"),re=document.querySelector("#play-btn"),Rt=document.querySelector("#home-stats"),Ce=document.querySelector("#score-list"),Pe=document.querySelector("#score-status"),ue=[...document.querySelectorAll(".next canvas")];let w=bt(),V="home",ve=!1,ye=!1,ne="world",H=[],se="";function Oe(r,e){const t=r.getBoundingClientRect(),n=Math.max(1,Math.floor(t.width*e)),s=Math.max(1,Math.floor(t.height*e));r.width!==n&&(r.width=n),r.height!==s&&(r.height=s)}function we(){const r=Math.min(window.devicePixelRatio||1,2);Oe(O,r);for(const e of ue)Oe(e,r)}function xe(){if(we(),!!q){q.configure(O);for(const r of ue)q.configure(r)}}function z(){return V==="play"}function j(r){for(const e of Le.querySelectorAll("[data-panel]"))e.classList.toggle("hidden",e.dataset.panel!==r)}function me(r){return r.length?r.map((e,t)=>`
      <li>
        <span class="rank">${t+1}</span>
        <span>${e.name}<br />Lv ${e.level} · ${e.lines} rings · ${De(e.time)}</span>
        <span>${String(e.score).padStart(6,"0")}</span>
      </li>`).join(""):"<li><span></span><span>No runs yet.</span><span></span></li>"}function ie(){document.activeElement!==k&&(k.value=w.name),re.classList.toggle("disabled",!F(k.value||w.name)),te.classList.toggle("hidden",F(k.value||w.name)),Rt.innerHTML=`
    <div>BEST SCORE<b>${String(w.bestScore).padStart(6,"0")}</b></div>
    <div>BEST LEVEL<b>${w.bestLevel}</b></div>
    <div>RUNS<b>${w.games}</b></div>
    <div>RINGS<b>${w.totalLines}</b></div>
  `;for(const r of document.querySelectorAll(".score-tab"))r.classList.toggle("on",r.dataset.board===ne);if(ne==="local"){Pe.textContent="Saved on this device only.",Ce.innerHTML=me(w.scores);return}Pe.textContent=se||(H.length?"Live world board.":"Loading world board…"),Ce.innerHTML=me(se?[]:H)}async function oe(){se="";try{await ze(),H=await Mt()}catch{se="World board unreachable. Local scores still save.",H=[]}(V==="scores"||V==="home")&&ie()}function R(r){V=r;const e=r==="play";Ot.classList.toggle("playing",e),Le.classList.toggle("hidden",e||r==="over"),We.classList.toggle("hidden",r!=="over"),r==="home"&&j("home"),r==="scores"&&(j("scores"),oe()),r==="howto"&&j("howto"),r==="pause"&&j("pause"),ie(),requestAnimationFrame(xe)}function qt(){const r=Y(k.value||w.name);return F(r)?(te.classList.add("hidden"),w=Ue(w,r),k.value=w.name,re.classList.remove("disabled"),!0):(te.classList.remove("hidden"),k.focus(),re.classList.add("disabled"),!1)}function ae(){qt()&&(T.armAudio(),y.reset(),ve=!1,ye=!1,We.classList.add("hidden"),He.classList.add("hidden"),R("play"))}async function Gt(){if(ve)return;ve=!0;const r={score:y.score,level:y.level(),lines:y.lines,time:y.time},e=w.bestScore;w=Lt(w,r),pe.textContent=`${w.name}  ${String(r.score).padStart(6,"0")}  ·  LV ${r.level}  ·  ${r.lines} RINGS`,He.classList.toggle("hidden",r.score<=e||r.score===0),R("over");const t=await _t(r,w.name);t.rank?(pe.textContent+=`  ·  WORLD #${t.rank}`,H=t.scores):t.queued&&(pe.textContent+="  ·  queued for world board")}function Bt(){const r=t=>{if(T.armAudio(),t.code==="Escape"){t.preventDefault(),V==="play"?R("pause"):V==="pause"?R("play"):(V==="scores"||V==="howto")&&R("home");return}if(!z()){(t.code==="Enter"||t.code==="Space")&&V==="home"&&!t.repeat&&t.target!==k&&(t.preventDefault(),ae());return}switch(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(t.code)&&t.preventDefault(),t.code){case"KeyA":case"ArrowLeft":x.turnLeft=!0;break;case"KeyD":case"ArrowRight":x.turnRight=!0;break;case"KeyW":case"ArrowUp":t.repeat||(x.rotateCw=!0);break;case"KeyQ":t.repeat||(x.rotateCcw=!0);break;case"Space":case"Enter":t.repeat||(x.release=!0);break;case"KeyS":case"ArrowDown":t.repeat||(x.hardDrop=!0);break;case"KeyR":t.repeat||ae();break}},e=t=>{switch(t.code){case"KeyA":case"ArrowLeft":x.turnLeft=!1;break;case"KeyD":case"ArrowRight":x.turnRight=!1;break}};window.addEventListener("keydown",r),window.addEventListener("keyup",e)}function Tt(){const r=(e,t,n)=>{const s=document.querySelector(e);if(!s)return;const i=a=>{if(a.preventDefault(),T.armAudio(),a.pointerId!=null)try{s.setPointerCapture(a.pointerId)}catch{}z()&&t()},o=a=>{a.preventDefault(),n==null||n()};s.addEventListener("pointerdown",i,{passive:!1}),s.addEventListener("pointerup",o,{passive:!1}),s.addEventListener("pointercancel",o)};r("#btn-left",()=>x.turnLeft=!0,()=>x.turnLeft=!1),r("#btn-right",()=>x.turnRight=!0,()=>x.turnRight=!1),r("#btn-rot",()=>x.rotateCw=!0),r("#btn-drop",()=>x.release=!0),r("#btn-hard",()=>x.hardDrop=!0)}function Vt(){Le.addEventListener("click",r=>{var n;const e=r.target.closest("[data-board]");if(e){ne=e.dataset.board,ne==="world"?oe():ie();return}const t=(n=r.target.closest("[data-go]"))==null?void 0:n.dataset.go;t&&(T.armAudio(),t==="play"?ae():R(t==="resume"?"play":t))}),document.querySelector("#pause-btn").addEventListener("click",()=>{z()&&R("pause")}),document.querySelector("#retry-btn").addEventListener("click",ae),document.querySelector("#over-menu-btn").addEventListener("click",()=>R("home")),k.addEventListener("change",()=>{w=Ue(w,k.value),ie()}),k.addEventListener("input",()=>{const r=F(k.value);re.classList.toggle("disabled",!r),te.classList.toggle("hidden",r)})}function It(){At.textContent=String(y.score).padStart(6,"0"),kt.textContent=String(y.level()),Ct.textContent=String(y.lines),Pt.textContent=De(y.time),y.upcoming().forEach((r,e)=>{const t=ue[e];!t||!q||q.frame({canvas:t,time:performance.now()/1e3,pulse:0,camera:[0,0],zoom:.9,originY:.58,cellFloats:new Float32Array(0),overlayFloats:pt(r,t.width,t.height),drawGrid:!1,clear:{r:.02,g:.01,b:.06,a:1}})})}let Re=performance.now();function Ye(r){const e=Math.min(.05,(r-Re)/1e3);Re=r;try{z()&&T.hitstop<=0&&y.update(e,x),T.consume(y.events);const t=y.events.some(o=>o.type==="die");y.events.length=0,T.update(e);const n=new Set;if(y.piece)for(const[o,a]of y.piece.occupancy())n.add(`${o},${a}`);const s=st(O.width,O.height),i=ut(T.offset(),O.width,O.height,s.zoom);q&&q.frame({canvas:O,time:r/1e3,pulse:y.pulseBoost,camera:i,zoom:s.zoom,originY:s.originY,cellFloats:ft(y.drawCells(),n,r),overlayFloats:T.overlayVerts(O.width,O.height,i,s.zoom,s.originY)}),z()&&It(),(t||z()&&y.phase==="gameover"&&!ye)&&(ye=!0,Gt())}catch(t){console.error(t)}requestAnimationFrame(Ye)}async function Ut(){var r;we(),Bt(),Tt(),Vt(),R("home"),oe();try{q=await ot(),we(),q.attach(O);for(const e of ue)try{q.attach(e)}catch(t){console.warn("next-piece GPU canvas skipped",t)}}catch(e){at((e==null?void 0:e.message)||String(e))}window.addEventListener("resize",()=>xe()),(r=window.visualViewport)==null||r.addEventListener("resize",()=>xe()),window.addEventListener("online",()=>{ze().then(oe)}),requestAnimationFrame(Ye)}Ut();export{je as _};
