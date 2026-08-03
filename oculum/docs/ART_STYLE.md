# OCULUM — Art Style Bible (v1)

Generate **new** card art every time. Never recreate or trace the reference sheet characters. Match **style**, not subjects.

See also: [UI_STYLE.md](./UI_STYLE.md) for game chrome / HUD / menu (no card illustrations).

Mood refs (style only): `docs/ref/` — four-eye pilgrim, windmill keywalker, talisman scarecrow, holecloak witness, parasol red-eye, produce vanguard. Also vibe-check [@enjoyjoey](https://www.instagram.com/enjoyjoey/) (loginwalled; save favorites as local refs when useful).

**Aug 2026 inspo pack** (style only — never copy subjects): `docs/ref/inspo-2026-08/` — ink-maw folk horror, desert scavenger + companion, cliff storm pilgrim, ruin binder + multi-eye shade, street-ritual warmth, cliff-town traveler + beast, dripping-orb manic seer, void-mouth canyon herald, white multi-eye walker (scale), wire-hair graft joy, brain-halo cosmic lever, tag-hand eye titan (POV), black multi-eye jester ruins, many-mouth jungle madman, CRT-face forest titan, melting eye-spine plaza rite.

## Style lock

- High-end graphic novel / premium CCG illustration
- Bold black ink outlines, clean readable silhouettes
- Cel-shade + painterly texture in cloth, stone, skin, straw, weathered metal
- Saturated but weathered color; bright daylight OR vivid sunset/twilight (avoid muddy grey)
- Surreal weird-fantasy: occult geometry, living architecture, grafted bodies, eye faith, folk-horror pilgrimage
- Vertical worlds: cliffs, tiered cities, canyon bridges, windmill plains, shrine paths, jungle ruins
- Recurring **Eye** iconography as religion (banners, seals, masks, cloak apertures) — stylized, not horror spam
- **Scale contrast** is on-brand: tiny pilgrim beside titan; mouse pilot inside giant body; High-altitude walkers
- **Beauty + wrongness:** elegant cloth / calm pose next to maw, void, ink, or graft (premiums especially)
- **Lived-in pilgrimage kit:** charms, belts, banners, ofuda-like tags, companion beasts, weathered flags
- Faction feeling via **repeated seal on banners + cloth** (school glyph), not rarity text on the face

## Motif kit (from wave-2 refs — remix, don’t copy)

| Motif | Use in original designs |
|-------|-------------------------|
| Four-hole ceramic / wood masks | School seal, Veiled face, Many / Hollow |
| Red branch-runes & hanging ribbons | Essence / ritual cost language |
| Cloak / cloth with perfect circular cutouts | Hollow school, Gaze / Sight yield |
| Parasols, ofuda, bells, waypoint stones | Ring / coastal cliff pilgrims |
| Windmill sails, oversized keys, patchwork bodies | Graft / Deal oddity figures |
| Button / coin eyes, straw stuffing, charm belts | Rural folk-horror Sites & Figures |
| Produce-headed solemn warriors | Surreal humor allowed if **serious** treatment |
| Pale ochre sky + blood-red accents | Alternate palette to canyon purple |
| Ink drips, black orbs, liquid halos | Hollow / Deal corruption beats (don’t spam) |
| Multi-eye / multi-mouth / void-face | Many / Deep / Hollow — one strong face idea, readable at hand size |
| Biomechanical walkers, wire-hair chassis, CRT grafts | Graft / Shell scale pieces |
| Companion animal / small shade figures | Soften horror; sell pilgrimage & Witness |
| POV hand / offering / ritual tag | Relic / Rite / Prophecy framing energy |

## Palette anchors

| Role | Hex range |
|------|-----------|
| Sky / water | `#2f6fb5` – `#5ec8e8` |
| Desert / stone / ochre field | `#c4a574` – `#8b5a3c` · pale sky `#e8d9a8` |
| Cloth purple | `#4a2a6e` – `#7b4aaa` |
| Ritual red (ribbons / runes / parasol) | `#b42318` – `#e85a3c` |
| Teal / sigil | `#1f8a7a` – `#3ecfc0` |
| Gold metal | `#c9a227` – `#f0d56a` |
| Bone / mask | `#e8dfd0` – `#cfc4b0` |
| Ink line | `#0c0a0f` |

Avoid: flat purple-on-white UI gradients, cute chibi, photoreal 3D, soft watercolor wash, generic medieval knights.

## Composition for cards

**Full-face rule:** Each card is one finished generated image. Art covers the entire card. Name, costs, type, and rules are printed cleanly on that same image (premium CCG layout). Do not ship art-only windows with separate HTML/CSS chrome for the face.

- Portrait 3:4 complete card
- Clear silhouette / subject readable at 108px hand size
- Gold Essence pip top-left, teal Witness/Sight pip top-right when relevant
- Dark nameplate + short rules box, high-contrast type
- Background sells world: banners, cliff cities, windmills, shrine paths, barren stakes
- Original subjects only — never copy reference sheet characters
- No watermarks, no other-game logos, no readable IP text from refs (e.g. don’t print “TiNG”)

## Prompt template

```
[subject], OCULUM CCG card art, graphic novel ink outlines, cel-shaded with painterly fabric and stone texture,
surreal weird fantasy, eye-faith iconography on banners seals and cloak apertures, [environment],
palette: desert ochre, ritual red ribbons, deep purple or slate cloth, teal sigils, bone masks, vivid sky,
strong silhouette, scale contrast welcome, premium collectible card illustration, no text, no watermark, original character design
```

## Per-school flavor (subjects stay original)

| School | Visual cues |
|--------|-------------|
| Cube | Geometric masks, desert cliff cities, scavenger layers |
| Deal | Cards-as-relics, gambler mystics, canyon sunsets, wind-key oddities |
| Many | Multi-face/stance spirits, four-hole masks, horn chains, tree perches |
| Graft | Wood-through-machine, windmill bodies, forest reclamation, cyan optics |
| Hollow | Hole-glyph clergy, perforated cloaks, void yellow/purple, barren arches |
| Coral | Organic crowns, rune tablets, arid pillars |
| Shell | Cracked ceramic divinity, interior architecture, wing-eyes |
| Deep | Immense scale (titan behind pilgrim), multi-limb seers, jungle ruins, gems |
| Ring | Rotating mechanical eyes, parasol cliff paths, temple sentinels, coastal cliffs |

## Forbidden

- Copying reference characters (cube helmet eye-holder, specific scarecrows, banana knight, etc.)
- Crowding with unreadable micro-eyes
- Soft stationery / sticker-craft Paper Craft look
- Dark muddy sludge lighting as default
- Real celebrity / existing IP likenesses

## Pipeline

1. Generate raw into `scripts/art-raw/{cardId}.png` (or Cursor assets)
2. **Premium / rare layered 3D:** also generate `{id}-bg`, `{id}-subject`, `{id}-fx` then run `node scripts/process-card-layers.mjs`
3. Ship under `public/assets/cards/{cardId}.png` (+ `layers/{id}/` for rares)
4. Until art exists, GPU procedural faces use school colors + glyph (runtime fallback)

### Premium layered art (future skins — currently off)

Set `CARD_SKINS_ENABLED` in `src/view/skins.ts` to enable. Layer assets live under `public/assets/cards/layers/{id}/`.

| Layer | File | Notes |
|-------|------|--------|
| Background | `layers/{id}/bg.jpg` | Scene empty of hero |
| Subject | `layers/{id}/subject.png` | Hero; magenta `#FF00AA` bg preferred for keying |
| FX | `layers/{id}/fx.png` | Sparks/mist on magenta → keyed to alpha |

Process with `node scripts/process-card-layers.mjs`. Until skins ship, rares use the same flat full-face presentation as other cards.

## Mobile readability test

Before accepting art: shrink to **96×128**. If you cannot tell school/mood and silhouette in 0.5s, reject and regenerate.
