import sharp from "sharp";

async function icon(size, path) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="100%" height="100%" fill="#e8dfc8"/>
    <rect x="12%" y="12%" width="76%" height="76%" rx="8%" fill="#fffaf0" stroke="#1c1714" stroke-width="6"/>
    <text x="50%" y="56%" text-anchor="middle" font-family="Georgia" font-size="${size * 0.28}" font-weight="700" fill="#c43c2c">PC</text>
  </svg>`);
  await sharp(svg).png().toFile(path);
}

await icon(192, "public/icon-192.png");
await icon(512, "public/icon-512.png");
console.log("icons ok");
