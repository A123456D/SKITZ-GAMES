# OCULUM — UI / Chrome Style (v2 — Quiet Premium)

**Hard rule:** Painted images for **world + cards** only (`bg-canyon`, card faces, seal). Non-card chrome is **CSS type + plate** — dark translucent wells, gold hairline, Cinzel/Barlow type. Chrome must not compete with card faces.

Labels (numbers / short text) sit on quiet plates for live game state.

See also: [ART_STYLE.md](./ART_STYLE.md) for card illustration.

## Quiet plate tokens (`src/styles.css`)

| Token | Role |
|-------|------|
| `--plate` | Translucent dark well |
| `--plate-strong` | Stronger overlay (menus, meta) |
| `--plate-line` | Gold hairline inset |
| `--plate-radius` | 7px shared radius |

CTA uses a slightly warmer plate + stronger gold edge. Ghost / HUD / meters share the same language.

## Asset inventory (`public/assets/ui/`)

| File | Role |
|------|------|
| `bg-canyon.jpg` | Full-bleed match board (WebGL texture) |
| `bg-menu.jpg` | Full-bleed title screen (WebGL texture) |
| `seal-eye.png` | Brand seal (menu + topbar) |
| `card-frame.png` | Bake fallback only |
| `card-veil.png` | Veiled mist overlay on full faces |

Retired (quiet CSS replaced): button plates, meter/will/toast/altitude/eclipse chrome, stone wordmark, panel tablet.

## Full card faces (`public/assets/cards/`)

Each finished card is **one generated image** (art + costs + name + rules). Prefer `.jpg`.

## Brand

- Seal above CSS `OCULUM` wordmark (Cinzel) on the menu
- Tagline: `VEIL · WITNESS · ASCEND`
- Live labels: **Cinzel** + **Barlow Condensed**

## Motion

1. Seal breath on menu / brand
2. Subtle parallax on canyon texture in WebGL
3. Quiet pulse on Witness / Law (brightness / edge, not PNG filters)

## Forbidden

- Ornate painted chrome that fights card faces (stone gems, rope banners, shrine pillars)
- Flat purple-on-white UI gradients
- Procedural noise shaders as the world background
- Art-only windows with separate HTML/CSS as the card face
- Copying reference-sheet characters
