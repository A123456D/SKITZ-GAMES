# CHAIN REACTOR

Cyberpunk grid card battler — place nodes, fire beams, overthrow tiles.

Tagline: **PLACE. CHAIN. OVERTHROW.**

## Two runtimes

| Path | Use |
|---|---|
| **Web** (`chain-reactor/` Vite) | Browser + PWA |
| **Godot** (`chain-reactor/godot/`) | Android (priority) + desktop preview |

Same Phase-1 rules in both.

## Web play

```bash
npm install
npm run dev
```

Ship into the site:

```bash
npm run ship
```

Open `/games/chain-reactor/play/` on the website.

## Rules (Phase 1)

- 3×4 shared board · 10-card singleton decks · hand of 3
- 6 rounds · energy scales 1→6 · 15s turns · one card play per turn
- Beams skip empties · capture at ≤0 power (reset to 1) · cascade depth 4
- Win by highest controlled power sum after Round 6 (or board full)

## Godot

Open `godot/` in **Godot 4.7**. See `godot/README.md`.

## Card art

Raw generations live in `scripts/art-raw/` (`*-raw.png`). Cut transparent PNGs:

```bash
npm run art:cut
```

Outputs → `public/assets/cards/` (also copied under `godot/assets/cards/`).
