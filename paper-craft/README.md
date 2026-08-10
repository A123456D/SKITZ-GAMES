# PAPER CRAFT

Colour-pen paper lane battler — fold, stack, rip.

Tagline: **FOLD. STACK. RIP.**

## Play

```bash
npm install
npm run dev
```

Ship into the site:

```bash
npm run ship
```

Open `/games/paper-craft/play/` on the website.

## Phase 1 rules

- 3 lanes · 6 turns · one action per turn
- **Play** into a lane · **Fold** (ink back, fragile) · **Stack** (max height 2) · **Rip** (1/match)
- Energy = turn number · hand of 3 · ~10-card singleton decks
- Win most lanes by power after turn 6

## Art

Colour-pen drawings. Generate raws into `scripts/art-raw/`, then:

```bash
npm run art:cut
```

## GPU

WebGL2 primary renderer. No Canvas 2D board path.
