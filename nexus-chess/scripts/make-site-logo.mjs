/**
 * Build website cover: Nexus logo + CHESS wordmark on dark field.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const sharp = require(join(root, "..", "riot-cube", "node_modules", "sharp"));

const src = join(root, "public", "logo.png");
const out = join(root, "..", "website", "public", "images", "nexus-chess-logo.png");

const W = 1024;
const H = 1024;
const logoMaxW = 820;

const logo = await sharp(src)
  .resize({ width: logoMaxW, withoutEnlargement: true })
  .ensureAlpha()
  .png()
  .toBuffer({ resolveWithObject: true });

const lw = logo.info.width;
const lh = logo.info.height;
const logoLeft = Math.round((W - lw) / 2);
const logoTop = Math.round(H * 0.34 - lh / 2);
const chessY = Math.round(H * 0.78);

const svg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="100%" height="100%" fill="#03050a"/>` +
    `<text x="50%" y="${chessY}" text-anchor="middle" ` +
    `font-family="Segoe UI, Arial, sans-serif" font-size="68" font-weight="600" ` +
    `letter-spacing="16" fill="#eef7ff">CHESS</text>` +
    `</svg>`,
);

await sharp(svg)
  .composite([{ input: logo.data, left: logoLeft, top: logoTop }])
  .png()
  .toFile(out);

console.log("wrote", out);
