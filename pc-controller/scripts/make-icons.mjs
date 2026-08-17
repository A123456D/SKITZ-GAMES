/**
 * Build every Android icon + splash and the web favicon from the Pc Controller
 * logo, so the launcher, splash, and site all show the same mark.
 *
 *   node scripts/make-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOGO = join(root, 'assets', 'pc-controller-logo.png')
const RES = join(root, 'android', 'app', 'src', 'main', 'res')

/** Logo palette — keep in sync with --bg-0 / --accent in src/index.css. */
const BACKDROP = { r: 0x0c, g: 0x0f, b: 0x13 }

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
const SPLASH_PORT = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
const SPLASH_LAND = { mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] }

/** Adaptive icons are masked to a circle ~61% of the canvas — stay inside it. */
const SAFE_ZONE = 0.64

async function write(file, buffer) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, buffer)
}

/**
 * Drop the logo's dark tile so only the bright mouse and its amber halo sit on
 * the adaptive background layer. Ramped rather than hard-cut for clean edges.
 */
async function cutout() {
  const { data, info } = await sharp(LOGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += 4) {
    const brightest = Math.max(out[i], out[i + 1], out[i + 2])
    const alpha = Math.min(1, Math.max(0, (brightest - 65) / 45))
    out[i + 3] = Math.round(out[i + 3] * alpha)
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
    .then((png) => sharp(png).trim().png().toBuffer())
}

function circleMask(size) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  )
}

async function main() {
  const art = await cutout()

  for (const [density, size] of Object.entries(LAUNCHER)) {
    const square = await sharp(LOGO).resize(size, size, { fit: 'cover' }).png().toBuffer()
    await write(join(RES, `mipmap-${density}`, 'ic_launcher.png'), square)

    const round = await sharp(square)
      .composite([{ input: circleMask(size), blend: 'dest-in' }])
      .png()
      .toBuffer()
    await write(join(RES, `mipmap-${density}`, 'ic_launcher_round.png'), round)
  }

  for (const [density, size] of Object.entries(ADAPTIVE)) {
    const inner = Math.round(size * SAFE_ZONE)
    const scaled = await sharp(art).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
    const foreground = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: scaled, gravity: 'centre' }])
      .png()
      .toBuffer()
    await write(join(RES, `mipmap-${density}`, 'ic_launcher_foreground.png'), foreground)
  }

  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
  const colorXml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${hex(BACKDROP).toUpperCase()}</color>\n</resources>\n`
  await write(join(RES, 'values', 'ic_launcher_background.xml'), Buffer.from(colorXml))

  const splashes = [
    ...Object.entries(SPLASH_PORT).map(([d, wh]) => [`drawable-port-${d}`, wh]),
    ...Object.entries(SPLASH_LAND).map(([d, wh]) => [`drawable-land-${d}`, wh]),
    ['drawable', SPLASH_LAND.mdpi],
  ]
  for (const [dir, [w, h]] of splashes) {
    const mark = Math.round(Math.min(w, h) * 0.42)
    const scaled = await sharp(art).resize(mark, mark, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
    const splash = await sharp({
      create: { width: w, height: h, channels: 4, background: { ...BACKDROP, alpha: 1 } },
    })
      .composite([{ input: scaled, gravity: 'centre' }])
      .png()
      .toBuffer()
    await write(join(RES, dir, 'splash.png'), splash)
  }

  for (const size of [192, 512]) {
    const icon = await sharp(LOGO).resize(size, size, { fit: 'cover' }).png().toBuffer()
    await write(join(root, 'public', `icon-${size}.png`), icon)
  }
  await write(join(root, 'public', 'favicon.png'), await sharp(LOGO).resize(64, 64).png().toBuffer())

  // Google Play feature graphic: 1024 x 500.
  const featureW = 1024
  const featureH = 500
  const mark = Math.round(featureH * 0.58)
  const scaled = await sharp(art)
    .resize(mark, mark, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const feature = await sharp({
    create: { width: featureW, height: featureH, channels: 4, background: { ...BACKDROP, alpha: 1 } },
  })
    .composite([{ input: scaled, gravity: 'centre' }])
    .png()
    .toBuffer()
  await write(join(root, 'assets', 'store', 'feature-graphic.png'), feature)
  await write(join(root, 'public', 'feature-graphic.png'), feature)

  console.log('icons + splash + feature graphic written from', LOGO)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
