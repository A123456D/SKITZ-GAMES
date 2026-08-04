# OCULUM — Rules (v1)

**Tagline:** Things only fully exist when Witnessed.

## Resources

| Resource | Use |
|----------|-----|
| **Essence** | Play cards from hand. Gain `turn` Essence at the start of your turn (capped at 8). Unspent Essence does not carry. |
| **Sight** | Witness cards, steal enemy Revelations (via Gaze), play some Rites. Gain **1 base + board Sight** at turn start. Cap carried Sight at 6. |
| **Will** | Starting **20**. Will ≤ 0 → Break loss. |

## Board

Three **Altitudes** (lanes): **High · Mid · Low**

| Altitude | Vision | Combat |
|----------|--------|--------|
| High | +1 Sight while you control a Witnessed Figure or Site here | More exposed — your Figures here deal +1 damage when winning |
| Mid | Default | Default |
| Low | — | Your Veiled Figures here get +1 power |

Each side may occupy an altitude with **one Figure or Site**. Relics **graft** onto Figures. Vessels may hold one Inhabitant.

## Card states

- **Veiled** — half-real. Use `veiledPower`. No Revelation yet. Cheaper to leave this way.
- **Witnessed** — pay the card’s **Witness cost** in Sight. Use `witnessedPower`, gain ongoing Sight yield, fire **Revelation** once.

Sites enter **Witnessed** automatically when played (landmarks are already “seen”).

## Turn structure

1. Start your action window: gain Essence + Sight; draw 1 (hand max 5)
2. Act until Pass: **Play** · **Witness** · **Graft** · **Rite** · **Stance**
3. On Pass, if the opponent has not Passed yet, they get a full action window (resources + draw)
4. When both have Passed: **Resolve** altitudes, then the next round starts with the player
5. Max 10 rounds. Will ≤ 0 → Break loss. Rounds end → highest Will wins (tie = draw).

## Resolve

For each altitude, compare total power (Figure + grafts + Site/altitude modifiers).

- Winner deals damage to loser Will equal to **winning power** (High adds +1).
- Tie: no damage from that altitude.

## Eclipse (alt win)

When the opponent ends their turn with **0 Sight**, gain 1 Eclipse. At **5 Eclipse**, you win by Eclipse.

## Prophecy

Secret track cards (e.g. Unblinking Law). Public progress when conditions met. Completing Ascend threshold can grant Eclipse or Will damage (see card text).

## Schools

Cube · Deal · Many · Graft · Hollow · Coral · Shell · Deep · Ring

Same Eye faith. Different heresy. Infinite set space.

## Teach vs Constructed

| Mode | Deck |
|------|------|
| **Teach** (default Play / First Gaze) | Fixed **30-card** recipe — see `teachDeck()` / CARD_TEXT. Pedagogy first; not bound by Constructed copy caps. |
| **Constructed** | Custom **30** from the full Codex pool, validated below. |
| **AI opponent** | Curated archetype decks (`src/core/decks.ts`) — never a mirror of the player's list. |

The Codex lists the **full collectible pool**. That pool is **not** the default match deck.

### Constructed rules

| Rule | Value |
|------|------:|
| Deck size | **exactly 30** |
| Non-premium copies | **≤ 2** per card id |
| Premium | **≤ 1** copy of that id, and **≤ 1 premium total** in the deck |
| Prophecy | **0 or 1** total (extracted to Law at match start) |
| Card pool | Any shipped card id |

Illegal decks: wrong size, unknown ids, >2 of a non-premium, >1 premium piece, >1 Prophecy.

Validated in code by `validateConstructedDeck()` (`src/core/construct.ts`).
