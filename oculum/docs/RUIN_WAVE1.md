# Velvet Ruin — Wave 1

**Verb:** Devour · **Kit:** Tempt · Brand · Devour · **Heresy id:** `ruin` (Wave 1 in engine)

Tagline: *Desire only fully exists when Witnessed — and Witnessing feeds it.*

**Foil:** Lumen burns you for staying Named; Ruin feeds when **they** look.

**Status:** Wave 1 **in engine** + **faces shipped** (`?v=31`, unique frames).

## Shared craft rules

1. **Tempt** — Mark an **enemy Veiled** Figure as Tempted. Baseline: intentional craft action **once per action window** (Ruin only; requires you play Ruin). While Tempted, that Figure’s controller Witnesses/Gazes it at **−1 Sight (min 0)** (the bait). Tempt is **not** Lure: it never forces Witness. Cards may Tempt as printed riders without spending the once/window action when they say so.
2. **Brand** — When an enemy **Witnesses** a Tempted Figure (**true Witness**, not Gaze), clear Tempt and place a **Brand** on that Figure; you gain **1 Sight**. Cards may Brand other ways. Brand ≠ Stain: no Forced Exposed / Erase path.
3. **Devour** — When **you Pass**, each Branded enemy Figure **Devours**: if **Witnessed**, deal **1 Will**; if still **Veiled**, you gain **1 Sight**. Then Brands clear (unless a card prints sticky). Your own Ruin Figures do **not** auto-Devour in Wave 1.

**Player risk:** bait you set that the foe controls. Mis-Tempt = tempo loss; they take the look → Brand → Devour Will if they stay face-up.

## Anti-overlap (Wave 1)

No Stain / Press / Forced Exposed · no Stance / Wager / Favor · no Toll / Peal / Lure / Resonance · no Open / Breach / Overexpose · no Halo / Blaze / Sustain · no Eclipse seeding.

## Wave 1 cards

| Id | Name | Type | Cost | Power | Role | Cast |
|----|------|------|------|-------|------|------|
| `thorn_liaison` | Thorn Liaison | Figure | 2E / 2W | V2 / W3 | Tempt police / bait tax | ♀ demon (elegant predator) |
| `crimson_vow` | Crimson Vow | Figure | 3E / 2W | V2 / W4 | Mid Brand engine | ♀ near-human succubus |
| `spire_hunger` | Spire Hunger | Figure | 3E / 2W | V2 / W4 | High Devour bully | ♀ fully inhuman demon |
| `desire_altar` | Desire Altar | Site | 2E | — | First Tempt here free | shrine object |
| `unwrite_the_sin` | Unwrite the Sin | Rite | 2E | — | Cash Brand / Blind | rite seal |

## Thorn Liaison — Tempt police / bait tax

- **Veiled:** Enemy Witness into this altitude costs **+1 Sight** unless the target is Tempted.
- **Revelation:** Tempt the enemy Figure here if able (does not spend the once/window Tempt action).
- **Tempt / Brand / Devour:** shared.

*Blackout:* Lane Witness tax that **relaxes** when you Tempted them (bait vs tax fork). Revelation auto-Tempt on reveal — not a generic +1.

## Crimson Vow — Mid Brand engine

- **Veiled:** Whenever an enemy Figure becomes **Branded** anywhere, gain **1 Sight**.
- **Revelation:** Tempt the enemy Figure on Mid if able (does not spend once/window); otherwise Brand a Witnessed enemy Figure here if able.
- **Tempt / Brand / Devour:** shared.

*Blackout:* Global Brand → Sight bank. Revelation Mid-Tempt or fallback Brand on face-up foe — Mid seduction engine, not Liaison’s lane tax.

## Spire Hunger — High Devour bully

- **Veiled:** While this is on **High**, Tempted enemy Figures in **other** altitudes cost **0 Sight** to Witness (stronger bait elsewhere).
- **Revelation:** If on High, Brand a Tempted enemy Figure (any altitude) if able — skips the Witness step.
- **While a Branded enemy is on High:** Your Devour against that Figure deals **+1 Will** (2 Will total if Witnessed).
- **Tempt / Brand / Devour:** shared.

*Blackout:* High-locked free-Witness bait aura + Revelation Brand-without-Witness + High Devour spike. Not Vow’s Sight bank.

## Desire Altar — Tempt bank

- **Site.** The first time each window you Tempt an enemy Figure **here**, that Tempt costs **0** and **does not spend** your once-per-window Tempt action (still only one “free shrine Tempt” per window).

*Blackout:* Lane-gated free Tempt that preserves the global Tempt action — not a generic +1 Sight Site.

## Unwrite the Sin — Cash / Blind

- Choose an altitude.
- If an enemy Figure there is **Branded:** clear Brand; gain **2 Sight**.
- Else if an enemy Figure there is **Witnessed** (unbranded): **Blind** that altitude this turn.
- Else: no effect (still spent as Rite).

*Blackout:* Brand cash **or** Blind face-up unbranded — fork on mark state, not Snuff-the-Halo / Ashen Tithe clones.

## Pack sketch

Desire Altar / Liaison Tempt → foe takes the cheap look → Brand + Sight → Vow banks Sight off Brands → Spire Hunger spikes High Devour (or Brands Tempted without Witness) → Unwrite cashes leftover Brands or Blinds Witnessed unbranded foes.

## Art DNA (locked)

**Figures are demons** — mostly **female**, very **sexy / seductive**, and simultaneously **evil / frightening** (beauty that wants to eat you).

| Pillar | Lock |
|--------|------|
| **Subjects** | Demons / succubi / horned predators. Near-human only as uncanny (horns, wrong joints, void mouths) — never plain glamorous mortal women. |
| **Gender** | Wave 1 Figures: **all ♀ demons**. Craft-wide later ~70–80% ♀; sparse incubus/horror in Waves 2–4. |
| **Mood** | Seductive **and** frightening in the same face. Softcore pinup alone = reject; horror alone = reject. |
| **Composition** | **Vary shot type per Figure** — close-up / bust / three-quarter / full / unusual angle. Do **not** stamp every Figure as the same standing full-body. Role should read in crop (Vow = intimate Mid close-up; Spire = towering High scale; Liaison = elegant predator stance; Vespera = Low bait). |
| **Anatomy** | Sexy silhouette / cloth / pose OK. **No exaggerated bust default.** Prefer long limbs, horns, tails, veils, open midriffs, clawed elegance. Natural hands (clear fingers) when shown — match `docs/ref/ruin/` quality, not mitts-by-default. |
| **Frames** | velvet-black · blood-crimson · bone-ivory · violet-ember; **thorned veil + horn-ring** chrome (unique architecture per card, shared family). |
| **Not** | Motley masks/dice · Ink drip · Toll bells · Scar straps · Lumen burnt aureoles · holy light · cute imps |
| **Refs** | Mood only from `docs/ref/ruin/` (when art pass starts); never Motley/Ink/Lumen/Scar JPGs as GenerateImage refs. |

**Read test:** at hand size — *want + dread*, not Motley gala, not Lumen angel, not Scar warband.

## Cast (Wave 1)

| Card | Cast |
|------|------|
| Thorn Liaison | ♀ elegant demon predator |
| Crimson Vow | ♀ near-human succubus (flagship seducer) |
| Spire Hunger | ♀ fully inhuman frightening demon |
| Desire Altar | shrine object |
| Unwrite the Sin | rite seal |

## Printed text (matches engine)

**Thorn Liaison:** Veiled 2 / Witnessed 3. Veiled: Enemy Witness into this altitude costs +1 Sight unless the target is Tempted. Revelation: Tempt the enemy Figure here if able.

**Crimson Vow:** Veiled 2 / Witnessed 4. Veiled: Whenever an enemy Figure becomes Branded anywhere, gain 1 Sight. Revelation: Tempt the enemy Figure on Mid if able; otherwise Brand a Witnessed enemy Figure here if able.

**Spire Hunger:** Veiled 2 / Witnessed 4. Veiled: While on High, Tempted enemy Figures elsewhere cost 0 Sight to Witness. Revelation: If on High, Brand a Tempted enemy Figure if able. While a Branded enemy is on High: your Devour against that Figure deals +1 Will.

**Desire Altar:** Site. The first Tempt you place on an enemy Figure here each window costs 0 and does not spend your once-per-window Tempt action.

**Unwrite the Sin:** Choose an altitude. If an enemy there is Branded: clear Brand; gain 2 Sight. Else if an enemy there is Witnessed: Blind that altitude this turn.

## Status

- Engine: `ruin` heresy, Tempt / Brand / Devour, Waves 1–4 (**20/20**) — **shipped**
- Wave 1 faces — **shipped** (`?v=31`, unique frames)
- Still open: Brand FX sprite

## Next craft passes

- FX sprite for Brand (like Stain / Halo).
- Craft complete **20/20** — all faces unique-framed.
