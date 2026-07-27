import sharp from "sharp";
import fs from "node:fs";

const src =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Projects-SHIFTR/assets/logo-riot-cube-cube.png";
const outs = [
  "C:/Users/PC/Projects/SHIFTR/riot-cube/public/logo-riot-cube.png",
  "C:/Users/PC/Projects/SHIFTR/website/public/images/logo-riot-cube.png",
  "C:/Users/PC/Projects/SHIFTR/website/public/images/logo-riot-cube-v3.png",
];

const { data, info } = await sharp(src)
  .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const visited = new Uint8Array(width * height);
const q = [];
const push = (x, y) => {
  const k = y * width + x;
  if (x < 0 || y < 0 || x >= width || y >= height || visited[k]) return;
  visited[k] = 1;
  q.push(k);
};
for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}

const nearLight = (i) => {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum > 210 && sat < 18;
};

let qi = 0;
while (qi < q.length) {
  const k = q[qi++];
  const i = k * channels;
  if (data[i + 3] < 12 || nearLight(i)) {
    data[i + 3] = 0;
  } else {
    visited[k] = 0;
    continue;
  }
  const x = k % width;
  const y = (k / width) | 0;
  push(x - 1, y);
  push(x + 1, y);
  push(x, y - 1);
  push(x, y + 1);
}

for (let i = 0; i < data.length; i += channels) {
  if (data[i + 3] < 8) continue;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  if (sat > 40 && lum > 40) continue;
  if (lum < 160 && sat < 40) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
}

const cubePng = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

const svg = Buffer.from(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <text x="512" y="855" text-anchor="middle"
    font-family="Arial Black, Impact, sans-serif" font-size="96" font-weight="900"
    fill="#ffffff" stroke="#111111" stroke-width="10" paint-order="stroke"
    letter-spacing="6">RIOT CUBE</text>
  <rect x="340" y="878" width="260" height="16" rx="5" fill="#ff2d6a"
    transform="rotate(-2 470 886)"/>
</svg>`);

const textPng = await sharp(svg).png().toBuffer();
const out = await sharp(cubePng)
  .composite([{ input: textPng, top: 0, left: 0 }])
  .png()
  .toBuffer();

for (const o of outs) {
  fs.writeFileSync(o, out);
  console.log("wrote", o, out.length);
}
