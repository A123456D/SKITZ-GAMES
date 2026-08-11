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
- **Female glamour:** most female-presenting Figures carry intentional sexiness / allure (pose, silhouette, cloth) — beauty+wrongness, premium CCG, not softcore; skip for horrors, comic underlings, elders when character demands it
- **Lived-in pilgrimage kit:** charms, belts, banners, ofuda-like tags, companion beasts, weathered flags
- Faction feeling via **repeated seal on banners + cloth** (Heresy glyph), not rarity text on the face
- **Frames:** unique architecture per card within craft family — Ink = cream/bone/pale stone; Motley = purple/teal/gold **ornate unique frames** (rich Motley court — not simplified); Bellward = crimson–bone–charcoal ornate filigree with **bells / eye-seals only** (never Motley masks or dice); Scar Breach = **open-wound / strap** frames (scarred bone-ash straps, torn cloth, eye-brands in wound-seams, thin ember slits) — not riveted plate borders (never Motley masks, Ink drip, Toll bells/parasols); Lumen = burnt aureole; Velvet Ruin = **thorned veil + horn-ring** (velvet-black / blood-crimson / bone-ivory / violet-ember); Dusk = copper/charcoal canyon; Bonewick = matte bone-white cracked coastal shrine + royal blue banners (not Delft china)
- **Do not** pass Motley/Ink finished card JPGs as GenerateImage `reference_image_paths` — motif bleed copies wrong craft chrome. Layout language is verbal (gold Essence pip, teal Witness pip, nameplate, parchment rules, **Veiled N / Witnessed M** power line). Palette/mood refs only from that craft’s `docs/ref/` pack.

## Motif kit (from wave-2 refs — remix, don’t copy)

| Motif | Use in original designs |
|-------|-------------------------|
| Four-hole ceramic / wood masks | Heresy seal, Veiled face, Many / Hollow |
| Red branch-runes & hanging ribbons | Essence / ritual cost language |
| Cloak / cloth with perfect circular cutouts | Hollow Heresy, Gaze / Sight yield |
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
| Scar Breach strap / charcoal | `#1a1a1e` – `#3a3a42` leather binding · thin metal straps only |
| Scar Breach rust-blood | `#6b1c14` – `#a83228` wound / brand |
| Scar Breach bone-ash | `#d4cfc4` – `#a8a093` scarred frame |
| Scar Breach ember | `#c45c12` – `#e8a030` thin slits in wounds only |
| Velvet Ruin velvet-black | `#0a0610` – `#1a1020` cloth / void |
| Velvet Ruin blood-crimson | `#6b1020` – `#c42848` thorn / desire |
| Velvet Ruin bone-ivory | `#e8dfd0` – `#cfc4b0` horn / veil bone |
| Velvet Ruin violet-ember | `#5a2080` – `#b050e0` infernal glow |
| Teal / sigil | `#1f8a7a` – `#3ecfc0` |
| Gold metal | `#c9a227` – `#f0d56a` |
| Bone / mask | `#e8dfd0` – `#cfc4b0` |
| Ink line | `#0c0a0f` |

Avoid: flat purple-on-white UI gradients, cute chibi, photoreal 3D, soft watercolor wash, generic medieval knights / full-plate Warhammer sludge (Scar Breach is weird-faith canyon warband — open-wound straps, brands, eye-seals — not stock fantasy plate).

## Composition for cards

**Full-face rule:** Each card is one finished generated image. Art covers the entire card. Name, costs, type, and rules are printed cleanly on that same image (premium CCG layout). Do not ship art-only windows with separate HTML/CSS chrome for the face.

- Portrait 3:4 complete card
- Clear silhouette / subject readable at 108px hand size
- Gold Essence pip top-left, teal Witness/Sight pip top-right when relevant
- Dark nameplate + short rules box, high-contrast type
- **Figures must print power:** first rules line `Veiled N / Witnessed M.` matching `veiledPower` / `witnessedPower` (Motley style) OR clear bottom VEILED / WITNESSED pips — never omit
- **Anatomy QA before install:** Read each generated face; regenerate on extra/wrong-way arms, melted fingers, impossible grips, floating limbs (see card-design rule §0b). Prefer sleeves / mitt grips over bare complex hands.
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

## Per-Craft flavor (subjects stay original)

### Live soft-reboot crafts

| Craft | Visual cues |
|-------|-------------|
| **Ink Abyss** | Cream/black drip swamp; **cream/bone/pale stone unique frames** per card; ink-maw folk; glamorous widows/matrons |
| **Motley Masquerade** | Purple/teal/gold/ritual red, bright cliffs; **ornate unique Masquerade frames** (purple/teal/gold filigree); smile/spiral/dice jesters; glamorous court women |
| **Bellward Toll** | Palette/mood from `docs/ref/bellward` only (crimson / white / charcoal, kasa, red parasol bells, cliff banners) — **never copy sheet layouts**. Card chrome = Ink/Motley philosophy: **unique ornate frames per card of cloth + hanging bells + eye-seals** (crimson fabric wraps, white veil cloth, bronze bells) — **not bone**, not Motley masks/dice, not Ink cream-drip. Gold Essence + teal Witness pips; rules must open with `Veiled N / Witnessed M.` Cast: 2♂ human · 1♀ human modest · 2♀ creature; no exaggerated busts. Never use Motley/Ink JPGs as GenerateImage refs (motif bleed). |
| **Scar Breach** | Canyon war camps / cliffs; **unique open-wound frames per card within one DNA family** (same as Ink cream family): shared kit = scarred **bone-ash / torn parchment straps + buckles** + **eye-brands** in border + **ember under the tears** — **each card MUST have distinct strap weave, wound placement, and corner architecture; NEVER duplicate or clone one frame across cards**; **never** riveted iron plate; **never** Motley/Ink/Toll chrome. Bodies: ritual strap harness, brands, exposed skin — not full plate. **Pose:** Ink-style unique characterful portraits. Natural hands (no boxing mitts). Palette charcoal strap · rust-blood · bone-ash · ember. Tone: cool · badass · sexy · aggressive (**not** Motley court glam). Gold Essence + teal Witness pips; `Veiled N / Witnessed M.` Never Motley/Ink/Toll JPGs as GenerateImage refs. Never print meta words (DNA/UNIQUE/architecture) on the face. |
| **Lumen Host** | Burnt aureole frames (nested scorched halo rings, wing-feather filigree, Eye-seal); palette bone-white · sun-gold · ash-char · thin sky cyan; hard metal/chalk radiance (**never** liquid ink halos). Cast: fully inhuman Host creatures **and** near-human uncanny angels (third Eye, gold crackle, wing stubs) — never plain humans. Near-human ♀ may be extra sexy austere. Gold Essence + teal Witness pips; `Veiled N / Witnessed M.` Never Motley/Ink/Toll/Scar JPGs as GenerateImage refs. |
| **Velvet Ruin** | **Thorned veil + horn-ring** frames (unique architecture per card, shared family); palette velvet-black · blood-crimson · bone-ivory · violet-ember. Figures = **demons** (mostly ♀): sexy / seductive **and** evil / frightening in the same face; near-human only as uncanny succubi (horns, wrong joints, void mouths) — never Motley court glam, never plain mortal women. No exaggerated bust default. **Composition:** vary per Figure — close-ups, three-quarter, low/high angles, cropped busts, not a stack of standing full-bodies (e.g. Crimson Vow = lustful close-up; Vespera / Liaison / Spire = different crops & silhouettes). Gold Essence + teal Witness pips; `Veiled N / Witnessed M.` Mood refs from `docs/ref/ruin/` only; never Motley/Ink/Toll/Scar/Lumen JPGs as GenerateImage refs. |
| **Dusk Ledger** (shelved) | Canyon sunsets, copper/charcoal ledger frames, eclipsed sun, debt coins, wind-keys; glamorous widows + holecloak perforated clergy + comic couriers |

### Archive / future

| Heresy | Visual cues |
|--------|-------------|
| Ashlar Veil | Geometric masks, desert cliff cities, scavenger layers |
| Facet Host | Multi-face/stance spirits, four-hole masks, horn chains, tree perches |
| Keywright Join | Wood-through-machine, windmill bodies, forest reclamation, cyan optics |
| Cutwork Pale | Hole-glyph clergy, perforated cloaks, void yellow/purple, barren arches |
| Branch-Rune | Organic crowns, rune tablets, arid pillars |
| Bonewick | Cracked ceramic divinity, interior architecture, wing-eyes |
| Cataract Verdure | Immense scale (titan behind pilgrim), multi-limb seers, jungle ruins, gems |
| Iris Circle | Rotating mechanical eyes, parasol cliff paths, temple sentinels, coastal cliffs |

## Forbidden

- Copying reference characters (cube helmet eye-holder, specific scarecrows, banana knight, etc.)
- Crowding with unreadable micro-eyes
- Soft stationery / sticker-craft Paper Craft look
- Dark muddy sludge lighting as default
- Real celebrity / existing IP likenesses

## Pipeline

1. **Defs + engine + tests** — card ids live in `CARDS`; playtest with **procedural placeholder faces** (heresy colors + glyph in `cardBake.ts`)
2. **User greenlights art** — then GenerateImage finished faces into `scripts/art-raw/` / Cursor assets
3. **Premium / rare layered 3D (optional):** also generate `{id}-bg`, `{id}-subject`, `{id}-fx` then run `node scripts/process-card-layers.mjs`
4. Ship under `public/assets/cards/{cardId}.jpg` (+ `layers/{id}/` for rares); bump cache bust in `cardBake.ts`
5. Do **not** GenerateImage in the same pass as Wave defs unless asked — placeholders first

Until a JPG/PNG exists for an id, GPU procedural faces are the intentional interim — not a permanent substitute after art is greenlit.

### Premium layered art (future skins — currently off)

Set `CARD_SKINS_ENABLED` in `src/view/skins.ts` to enable. Layer assets live under `public/assets/cards/layers/{id}/`.

| Layer | File | Notes |
|-------|------|--------|
| Background | `layers/{id}/bg.jpg` | Scene empty of hero |
| Subject | `layers/{id}/subject.png` | Hero; magenta `#FF00AA` bg preferred for keying |
| FX | `layers/{id}/fx.png` | Sparks/mist on magenta → keyed to alpha |

Process with `node scripts/process-card-layers.mjs`. Until skins ship, rares use the same flat full-face presentation as other cards.

## Mobile readability test

Before accepting art: shrink to **96×128**. If you cannot tell Heresy/mood and silhouette in 0.5s, reject and regenerate.
