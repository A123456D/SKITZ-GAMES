# OCULUM — Rules (v1)

**Tagline:** Things only fully exist when Witnessed.

## Resources

| Resource | Use |
|----------|-----|
| **Essence** | Play cards from hand. Gain `turn` Essence at the start of your turn (capped at 8). Unspent Essence does not carry. |
| **Sight** | Witness cards, steal enemy Revelations (via Gaze), play some Rites. Gain **1 base + board Sight** at turn start. Cap carried Sight at 6. |
| **Will** | Starting **30**. Will ≤ 0 → Break loss. |
| **Eclipse** | Reach **10** to win without Breaking Will. |

## Board

Three **Altitudes** (lanes): **High · Mid · Low** — each has a standing Reveal rule.

| Altitude | Sight / Gaze | Combat |
|----------|--------------|--------|
| **HIGH** | +1 Sight while you control a Witnessed Figure or Site here. **Gaze Witness costs 1 less Sight** (min 0). | Win damage +1 before soft Resolve |
| **MID** | **Own Witness here: gain 1 Sight** | Default |
| **LOW** | **Own Witness and Gaze cost +1 Sight** | Veiled Figures +1 power |

Each side may occupy an altitude with **one Figure or Site**. Relics **graft** onto Figures. Vessels may hold one Inhabitant.

## Card states

- **Veiled** — half-real. Use `veiledPower`. **Veiled abilities** are active. No Revelation yet.
- **Witnessed** — pay the card’s **Witness cost** in Sight. Use `witnessedPower`, gain ongoing Sight yield, fire **Revelation once** per board life.
- **Re-Veil** — pay the same Witness cost in Sight to return a friendly Witnessed Figure/Vessel to Veiled (once per turn). Revelation does **not** fire again. Strain and Scrutiny persist.
- **Overwrite** — play a Figure/Vessel into your occupied altitude: the old unit returns to hand (no Fall).
- **Scrutiny** — each Veiled **Hold** adds 1 Scrutiny. At **2**, Forced Exposed (no Revelation) + Strained. Voluntary Witness clears Scrutiny. Re-Veil does not. Motley Stance B does not block Scrutiny.

Sites enter **Witnessed** automatically when played (landmarks are already “seen”).

Figures print **Veiled:** and **Revelation:** lines (dual-mode).

## Turn structure

1. Start your action window: gain Essence + Sight; draw 1 (hand max 5)
2. Act until Pass: **Play** · **Witness** · **Re-Veil** · **Graft** · **Rite** · **Stance**
3. On Pass, if the opponent has not Passed yet, they get a full action window (resources + draw)
4. When both have Passed: **Resolve** altitudes, then the next round starts with the player
5. Max **10** rounds. Will ≤ 0 → Break loss. Rounds end → highest Will wins (tie = draw).

## Resolve

For each altitude, compare total power (Figure + grafts + Site/altitude modifiers).

- Winner deals Will damage equal to **ceil((winning power + High bonus) / 3)**, minimum 1. High still adds +1 before that divide.
- **Veiled** loser — **Holds** (stays; cannot Fall while Veiled). Stain / Press / False Hold can Forced Expose + Strain instead.
- **Witnessed** loser — **Falls** (dies): figure destroyed; grafts return to hand; Fall-release Vessels refill the lane; Sites/Sigils stay.
- **Witnessed** winner clears Strain on that unit.
- Tie: no damage, no Fall.
- Blinded lanes skip Resolve combat.

## Eclipse (alt win)

Eclipse is gained from **card effects**, heresy payoffs, and Motley paid-ante Trick wins (not from passing at 0 Sight). At **10 Eclipse**, you win by Eclipse.

## Prophecy

Secret track cards (e.g. Unblinking Law). Public progress when conditions met. Completing Ascend threshold can grant Eclipse or Will damage (see card text).

## Crafts (Heresies)

See **[CRAFTS.md](./CRAFTS.md)** — heresies are **crafts** (private kits), not single archetypes. Archetypes live *inside* crafts.

Same Eye faith. Different craft. Each owns a **verb**, kit, and board relationship to Veil / Witness / Unmake.

### Live soft-reboot crafts

| Craft | Verb | Private kit | Flagship archetype |
|-------|------|-------------|--------------------|
| **Ink Abyss** | Erase | Stain → **Press** → Forced Exposed; Blind deny | Midrange grind / removal |
| **Motley Masquerade** | Trick | Stance + coin-flip Wager (Heads/Tails); Stance B vs Erase | Midrange flip-tempo |
| **Bellward Toll** | Toll | Sticky Toll + **Peal** arm/pay + Lure | Tempo trap tax / Break |
| **Scar Breach** | Breach | Open → Breach Will on wins; **Overexpose** if you lose while Open | Face-up midrange-aggro |
| **Lumen Host** | Radiance | **Halo** on own Witness; **Blaze** on Pass; **Sustain** or Re-Veil | High-commit midrange torch |
| **Velvet Ruin** | Devour | **Tempt** bait → **Brand** on foe Witness → **Devour** on Pass | Midrange seduction / bait-Break |

**Stance B:** swaps printed Veiled / Witnessed power until switched back — **Motley Figures only while Wagered** (Hold vs Erase still works without ante). Motley Figures may use the Stance action once per turn (no Third Face required). Veiled Motley Figures in Stance B **Hold** against Erase (Stain / False Hold Forced Exposed).

**Motley Wager (coin flip):** Once per action window, ante **1 Sight** to Wager a Motley Figure/Vessel (**Veiled or Witnessed**). The coin flips immediately. **Heads:** steal **1 power** in that lane this Resolve (−1 enemy / +1 you) and you may optionally **Up the Ante** for a free second flip. **Tails:** lose **1 Sight** and **Re-Veil**. If you scored **Heads** this window and then **win Resolve while Witnessed**, gain **+1 Eclipse** (max once per side per Resolve) and spend **1 Favor** if you had Favor going in. Empty-Sight Pass does **not** grant Eclipse.

Legacy Cash/Bust Wager (Veiled win Cash / lose Bust / paid-ante Trick Eclipse) remains behind `motleyKit` flag `cashbust` for rollback.

**Jester risk (Motley):** commitment timing — which face shows when the Eye looks — not RNG. Stance B is Motley's answer to Ink Erase.

**Ink Press:** Once per action window, spend 1 Sight to **Press** an enemy Veiled + Stained Figure (requires playing Ink). Pressed Figures have **−1 power** until Resolve. **Press into Motley Stance B is free and does not require Stain** (still once per window). When you win Resolve against that Pressed Figure while Veiled, Forced Expose + Strain even through Motley Stance B. If Resolve ends and they are still Veiled, **Smother backlash** — you lose 1 Sight. See `docs/CRAFT_DENSITY.md`.

**Bellward Toll (Trap Tax):** Place **Toll** marks on altitudes. While you own Toll on a lane, **your Figures there have +1 power**, and **you may Gaze** enemy Veiled Figures there (the tax cuts both ways). An **opponent** who Witnesses/Gazes into your Toll spends 1 Sight if able; you gain **1 Sight**; thin **Resonance** fires; the mark **stays**. **Resolve** on that lane (either side loses) **spends** the Toll (tax + Resonance, then clear). Own Witness / Gaze on your own Toll leaves the trap. **Your** Lure clears it (no Sight tax) and Resonates. **Lure** forces a **true Witness**. **Peal:** once per window, spend 1 Sight to arm a Toll you own; when Resolve spends that Toll, Peal pays (+1 Sight); Lure clear fizzles Peal unless Banner Bellwalk. Eclipse is a rare rider only.

**Scar Breach (Open / Breach / Overexpose):** Scar Breach Figures **Breach** only while **Witnessed**. When a Witnessed Scar Breach Figure **wins Resolve against a Witnessed enemy occupant**, after shared soft Resolve Will damage, deal **+1 Will** Breach — **at most twice per side per Resolve**. Riders (Highscar / Full Breach / Skaroth aura) add at most **+1** more on each payout (max **2** Breach Will per payout). Further contested Open wins that Resolve still do soft Resolve + Strain, but no further Breach Will. **Empty-lane** wins and **Veiled** wins do **not** Breach — **exception:** winning into a **Veiled Motley Stance B** Figure still Breaches (agro pierce vs Trick walls) and soft chip is densified (+1). **Veiled Ink** losers take at most **2** soft Will from Open Breach (Hold deny). Paying Sight to Witness is the agro commit (**Open**). **Overexpose** (agro Bust analogue): the first time each Resolve a friendly Scar Breach Figure **loses Resolve while Witnessed**, if it **became Witnessed since the previous Resolve**, its controller **loses 1 Sight** if able and **1 Will**. Cards may print stronger or mitigating Overexpose. High’s shared +1-before-halve still applies separately. Eclipse is a rare rider only. No Stain, Stance/Wager, or Toll marks. See `docs/CRAFT_DENSITY.md`.

**Lumen Host (Halo / Blaze / Sustain):** When you **Witness your own** Lumen Figure, it becomes **Halo’d** (+1 power while Witnessed). When you **Pass**, each Halo’d Figure **Blazes** (1 Will if the lane is contested, else +1 Sight; cards may print more), then **Re-Veils** and loses Halo unless you **Sustained** it this window (1 Sight; Lumen Shrine can make the first Sustain on its lane free). Not Ink Stain/Press, Motley Stance/Wager, Toll/Peal, or Breach Overexpose (Overexpose = lose-while-Open tax; Radiance = voluntary light-rent after you chose to Witness). See `docs/LUMEN_WAVE1.md`.

**Velvet Ruin (Tempt / Brand / Devour):** See `docs/RUIN_WAVE1.md`. **Tempt** an enemy Veiled Figure (once per window baseline): they Witness/Gaze it at **−1 Sight (min 0)** — bait, never forced (≠ Lure). When they **Witness** a Tempted Figure, clear Tempt, place a **Brand**, you gain **1 Sight** (≠ Stain/Erase). On **your Pass**, each Branded enemy **Devours**: **1 Will** if Witnessed, else you gain **1 Sight**; then Brands clear. Risk: they control whether the look feeds you.

### Archive / future crafts (hooks may remain in code)

| Craft | Verb | Board feel | Angle |
|-------|------|------------|--------|
| **Ashlar Veil** | Hold | Veil Banner / Low fortress | Veiled Ashlar losers take at most **1 Will** |
| **Facet Host** | Flip | Third Face, galleries | Fall while **Stance B** → +1 Eclipse |
| **Keywright Join** | Attach | Mills / shrines | Witness with grafts → **gain 1 Sight** |
| **Cutwork Pale** | Blind | Deny Sight | Blinded lanes skip Unmake that Resolve |
| **Branch-Rune** | Colony | Reliquaries + Crown | Crown counts as Branch-Rune Site |
| **Cataract Verdure** | Chain | Matron Mid | Free Witness chains; Site payoffs |
| **Iris Circle** | Gaze | Iris Gaze / Paths | **Iris owns Gaze** — steal Revelations |

## Teach vs Constructed

| Mode | Deck |
|------|------|
| **Teach** (First Gaze) | Fixed curated **20** (`teachDeck*` ) — pedagogy. |
| **Play · Enter Gaze** | Full craft **20** (`fullCraftDeck`) — one of every card in the craft, incl. Sovereigns. |
| **Constructed** | Custom **20** from the full Codex pool, validated below. |
| **AI opponent** | Curated craft decks (`src/core/decks.ts`) — never a mirror of the player's list. |

The Codex lists the **full collectible pool**. That pool is **not** the default match deck.

### Constructed rules

| Rule | Value |
|------|------:|
| Deck size | **exactly 20** |
| Non-Sovereign copies | **≤ 2** per card id |
| Sovereign | **≤ 1** copy of that id, and **≤ 1 Sovereign total** in the deck |
| Prophecy | **0 or 1** total (extracted to Law at match start) |
| Card pool | Any shipped card id |

Illegal decks: wrong size, unknown ids, >2 of a non-Sovereign, >1 Sovereign piece, >1 Prophecy.

Validated in code by `validateConstructedDeck()` (`src/core/construct.ts`).
