# Craft density — spine, not stack

**Charter (locked 2026-08-08):** Densify each live heresy’s *spine* (mode → commit → win/lose) so mis-timing hurts. Do **not** match Motley’s system count. Motley stays the densest; others feel complete, not Motley-clones.

**One-liner:** densify the spine, not the stack — as interesting to mis-time, not as heavy to learn.

| Craft | Spine status |
|-------|----------------|
| Motley | Complete (Stance → Wager → Cash/Bust → Eclipse) |
| Breach | **Overexpose shipped** |
| Ink | **Press shipped** |
| Toll | **Peal shipped** |
| Lumen | **Halo / Blaze / Sustain shipped** |
| Velvet Ruin | **Tempt / Brand / Devour shipped** (Waves 1–4 · **20/20**) |

## Shared pattern (spine only)

| Layer | Motley | Breach | Ink | Toll | Lumen | Ruin |
|-------|--------|--------|-----|------|-------|------|
| Mode | Stance A/B | Veiled vs Open | Mark police | Sticky Toll vs armed Peal | Halo'd torch | Tempted bait |
| Commit | Ante Sight | Open | **Press** (1 Sight) | **Peal** arm (1 Sight) | Witness / Sustain | **Tempt** (once/window) |
| Outcome | Cash / Bust | Breach / Overexpose | Erase pierce / Smother backlash | Peal pay / fizzle | Blaze / Re-Veil | Brand → Devour Will/Sight |
| Closer | Eclipse | Break | Break | Break | Break | Break |

---

## Velvet Ruin — Tempt / Brand / Devour (design lock)

See `docs/RUIN_WAVE1.md`. Spine only:

1. **Tempt** enemy Veiled (−1 Witness/Gaze cost; never force — ≠ Lure).
2. Foe **Witnesses** Tempted → **Brand** + you gain 1 Sight (≠ Stain/Erase).
3. On **your Pass**, Branded enemies **Devour** (1 Will if Witnessed, else +1 Sight) then Brands clear.

Mis-timing: Tempt when they will refuse = wasted action; Brand then they Re-Veil/Fall before Pass = weak Devour.

**Wave 1–4 shipped** to engine (Tempt / Brand / Devour · **20/20**; Teach 2× Waves 1–2, no Veloth).

---

## Scar Breach — Overexpose (shipped)

See engine + `ironBreachWave*.ts`. Shared: Open then lose Resolve while Witnessed → lose 1 Sight (once/side/Resolve).

---

## Ink — Press (locked)

### Shared law

**Press** is an intentional action (once per action window), Ink only:

> Spend **1 Sight**. Target an enemy **Veiled + Stained** Figure. That Figure is **Pressed** (−1 power until Resolve).  
> **Exception:** Press into **Motley Stance B** costs **0 Sight** and does **not** require Stain (still once per window).  
> When you **win Resolve** against that Pressed Figure while it is still Veiled: **Forced Expose + Strain** even if Motley **Stance B** would Hold (Press pierces Trick once).  
> **Smother backlash:** If Resolve ends and that Figure is still Veiled (Press never Erased), you lose **1 Sight** if able and Press clears.

- Requires you to **play Ink** (Ink Figure/Site/Vessel/Relic/Rite on board or in hand).
- Does not add Blind as a Press payload (Bride Blind remains her printed rider only).
- Stain can be cleared before Resolve → Press alone still Erases on your win (Pressed is enough).

### Cards that print Press

| Card | Print |
|------|--------|
| **Blot Herald** | Reminder: Press shared |
| **Pale Bailiff** | When your Press Forces Exposed, draw 1 |
| **Smother Bride** | When your Press Forces Exposed, Blind that altitude this turn |
| **Mire Duelist** | When your Press Forces Exposed a Figure here, gain 1 Sight |
| **Dahaka** | When you Press, if this is Witnessed, deal 1 Will |
| **Ashen Tithe** | After Tithe resolves on a Stained Veiled foe, you may Press it paying 0 Sight (still once/window) |

### Anti-overlap

No Wager/Favor/Breach/Toll. Press ≠ Gaze. Stance B still Holds normal Stain Erase — only Press pierces.

---

## Toll — Peal (locked)

### Shared law

**Peal** is an intentional arm (once per action window), Toll only:

> Spend **1 Sight** on an altitude **you Toll**. That Toll is **Pealed** (armed).  
> When **Resolve spends** that Toll (`tryPayToll` clear on Resolve lose): **Peal pays** — you gain **1 Sight** and **draw 1**, then clear Peal.  
> **Fizzle:** If the Toll clears early (own **Lure**) while Pealed → no Peal pay (arm Sight already spent). Sticky enemy Witness leaves Peal armed.

- Requires you to **play Toll**.
- Thin Resonance unchanged; Peal is the second beat.

### Cards that print Peal

| Card | Print |
|------|--------|
| **Sound the Toll** | Reminder / if you Peal this window after Sound, gain 1 Sight |
| **Ring Out** | If target was already Tolled, you may Peal it paying 0 (still once/window) |
| **Full Peal** | After rite: Peal one altitude you Toll paying 0 |
| **Clapper Cantor** | When Peal pays for you, gain 1 Sight |
| **Carillon** | When Peal pays for you, Blind that altitude this turn |
| **Banner Bellwalk** | Your Lure that clears a Pealed Toll still Peal-pays (no fizzle) |

### Anti-overlap

No Stain/Stance/Breach. Peal ≠ choir win path.

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-08-08 | Spine not stack; Motley densest; Overexpose / Press / Peal |
| 2026-08-08 | Overexpose shipped |
| 2026-08-08 | Press + Peal locked as free actions (Wager-shaped); selective prints; ship for tests |
| 2026-08-08 | **Press + Peal shipped** (engine, CardDefs, UI, AI, tests) |
| 2026-08-11 | **Velvet Ruin** Wave 1 design lock — Tempt → Brand → Devour (`docs/RUIN_WAVE1.md`); engine deferred |
| 2026-08-11 | **Velvet Ruin** Waves 1–2 shipped (`docs/RUIN_WAVE2.md`) |
| 2026-08-11 | **Velvet Ruin** Wave 3 shipped (`docs/RUIN_WAVE3.md`) |
| 2026-08-11 | **Velvet Ruin** Wave 4 shipped — craft **20/20** (`docs/RUIN_WAVE4.md`) |
