# OCULUM — UI / Chrome Style (v4 — Framed Emboss)

**Hard rule:** Painted images for **world + cards** only (`bg-canyon`, card faces, seal). Interactive chrome stays **CSS embossed plates + SVG ornate frames** — dark metal wells, gold filigree rims, teal eye-seal corners, Cinzel/Barlow type. Frames are **transparent-center borders** so they never compete with card faces (no painted gem / shrine button plates).

Labels (numbers / short text) sit on quiet embossed plates for live game state.

See also: [ART_STYLE.md](./ART_STYLE.md) for card illustration.

## Embossed plate tokens (`src/styles.css`)

| Token | Role |
|-------|------|
| `--plate` / `--plate-strong` | Translucent dark wells |
| `--plate-line` / `--plate-line-strong` | Gold hairline inset |
| `--plate-radius` / `--btn-radius` | Shared radii |
| `--btn-face` / `--btn-face-cta` / `--btn-face-ghost` | Vertical metal face gradients |
| `--btn-depth` / `--btn-depth-cta` / `--btn-depth-press` | Extrusion + press-in shadows |
| `--btn-frame-cta` / `--btn-frame-ghost` / `--btn-frame-mini` | Ornate SVG frame overlays |

CTA uses warmer bronze face + stronger gold filigree frame + Cinzel label. Ghost / HUD / meters / menu links share the same language with quieter frames. Hover lifts; active presses in (`translateY`).

## Asset inventory (`public/assets/ui/`)

| File | Role |
|------|------|
| `bg-board-desktop.jpg` | Match board — landscape / desktop (16:9 · three vertical altitude lanes: High / Mid / Low) |
| `bg-board-mobile.jpg` | Match board — portrait / phone (9:16 · same three-lane arena) |
| `bg-canyon.jpg` | Legacy match fallback if dual boards fail |
| `bg-menu-desktop.jpg` | Home / title screen — landscape / desktop (16:9 pilgrimage plate) |
| `bg-menu-mobile.jpg` | Home / title screen — portrait / phone (9:16 pilgrimage plate) |
| `bg-menu.jpg` | Legacy home fallback if dual home plates fail |
| `seal-eye.png` | Brand seal (menu + topbar) |
| `btn-frame-cta.svg` | Menu / primary CTA gold filigree + eye seals (`public` + `src/assets` for Vite) |
| `btn-frame-ghost.svg` | Secondary / action-row frame |
| `btn-frame-mini.svg` | HUD / menu-link / compact Back frame |
| `card-frame.png` | Bake fallback only |
| `card-veil.png` | Veiled mist overlay on full faces |

Match boards and home plates swap automatically from viewport aspect (`height >= width` → mobile plate).

Retired: painted opaque button plates, meter/will/toast/altitude/eclipse chrome, stone wordmark, panel tablet.

## Full card faces (`public/assets/cards/`)

Each finished card is **one generated image** (art + costs + name + rules). Prefer `.jpg`.

## Brand

- Seal above CSS `OCULUM` wordmark (Cinzel) on the menu
- Tagline: `VEIL · WITNESS · ASCEND`
- Live labels: **Cinzel** (CTA) + **Barlow Condensed** (HUD / secondary)
- Title actions sit in a frosted embossed dock over the canyon

## Motion

1. Seal breath on menu / brand
2. Subtle parallax on canyon texture in WebGL
3. Button hover lift / press sink (disabled under Reduce motion)
4. Quiet pulse on Witness / Law (brightness / edge, not PNG filters)
5. Frame opacity brightens slightly on hover

## Forbidden

- Opaque painted gem / shrine button faces that fight card art
- Flat purple-on-white UI gradients
- Procedural noise shaders as the world background
- Art-only windows with separate HTML/CSS as the card face
- Copying reference-sheet characters
