# SHIFTR — Visual Identity

**Art direction:** *Neon glass cyberpunk.* Deep void, purple primary energy, cyan/blue signal accents, emissive puzzle objects. Premium mobile puzzle — soft bloom, frosted chrome, elastic motion. Not charcoal industrial. Not mint-steel.

**Source of truth for product fantasy + gaps:** [`CONCEPT_ALIGNMENT.md`](./CONCEPT_ALIGNMENT.md)  
Concept boards: `assets/reference/concept/`

Aligns with GDD play fantasy (shift → reconnect → react). Dark theme is shipping default.

---

## Palette (design tokens)

Source of truth: `resources/configs/visual/default_design_tokens.tres` (`DesignTokens`).

| Token | Hex / role | Use |
| --- | --- | --- |
| `bg_deep` | `#07060F` | Void / veil |
| `bg_elevated` | `#12101C` | Glass panel fill base |
| `bg_play` | `#0B0A14` | Playfield wash |
| `ink_primary` | `#F2EEFF` | Titles, primary labels |
| `ink_secondary` | lilac ~88% | Hints, secondary |
| `accent_signal` | `#A855F7` | CTA / brand pulse / purple neon |
| `accent_secondary` | `#3B82F6` | Blue support |
| `accent_beam` | `#22D3EE` | Cyan highlight / focus soft |
| `accent_focus` | `#67E8F9` | Focus ring |
| `accent_star` | `#FBBF24` | Victory stars |
| `surface_glass` | purple glass @ ~52% | Glass panels |
| Object glows | red / blue / green / yellow / purple / white / cyan | Puzzle pieces — **always emissive** |
| Glow tint | purple | Soft halo, bloom tint |

**Never ship:** flat non-glowing object fills, charcoal/steel/mint as brand, cream/terracotta serif stacks, broadsheet dense columns, confetti spam.

---

## Lighting model

SHIFTR is **2D / mobile-first**. We do **not** rely on Godot `WorldEnvironment` Glow as the primary path (mobile renderer + canvas readability).

| Layer | Approach |
| --- | --- |
| Ambient | `dynamic_gradient_bg.gdshader` — purple/blue drift + faint shift-grid + light planes |
| Local glow | `soft_glow.gdshader` (`render_mode blend_add`) on tiles / UI |
| Bloom | `canvas_bloom.gdshader` on a full-screen `ColorRect` after `BackBufferCopy` |
| Glass | `glass_panel.gdshader` — screen blur + tint + neon border |
| Lasers | `LaserBeamLayer` — animated `Line2D` from `PuzzleEvent.LASER_BEAM` |

**Readability law:** juice supports, never obscures. If VFX hides tile identity >50ms, it is a bug (GDD §17.4).

---

## Performance tiers

`VisualQualityConfig` presets unchanged in structure:

| Preset | Bloom | Glass blur | Parallax / beams | Ambient particles |
| --- | --- | --- | --- | --- |
| **High** | On | On | On | On |
| **Med** | Soft | On | Dimmer | Fewer |
| **Low** | Off | Tint only | Static | Off |

**Budgets:** ~60 mobile / ~120 desktop. Pool tiles, beams, particles.

**Reduce motion / battery:** same paths via `VisualDirector` + `ShiftFeelConfig`.

---

## Component map

| Piece | Path |
| --- | --- |
| Tokens | `resources/configs/visual/design_tokens.gd` |
| Puzzle color/glyph map | `scripts/presentation/board/puzzle_visuals.gd` |
| Object neon icons | `scripts/presentation/board/object_icon_atlas.gd` |
| Laser overlay | `scripts/presentation/board/laser_beam_layer.gd` |
| Theme builder | `scripts/presentation/ui/shiftr_theme_builder.gd` |
| VisualDirector | `scripts/presentation/ui/visual_director.gd` |
| Play HUD | `scripts/presentation/ui/minimal_hud.gd` + `moves_dial.gd` |
| Victory sheet | `scripts/presentation/ui/victory_sheet.gd` |
| Concept play slice | `scenes/puzzles/concept_play_slice.tscn` |
| Glass kit | `glass_button` / `glass_panel` / `icon_button` |

---

## Clutter rules

1. **Board is the hero** in play — chrome stays sparse.
2. **Brand-first home** — SHIFTR + one tagline + CTA cluster.
3. **Glass for hierarchy** — interactive groups only.
4. **One motion focus** — UI waits while a shift settles.
5. **Touch-first** — press + focus required; hover optional.

---

## How to skin a new screen

1. Instance aesthetic root / `VisualDirector`.
2. Load `default_design_tokens.tres` + quality preset.
3. `theme = director.get_theme()`.
4. Drive colors from tokens — no hardcode hex in screens.
5. Play flow reference: `concept_play_slice.tscn`.

### Open demos

| Scene | Purpose |
| --- | --- |
| `res://scenes/ui/main_shell.tscn` | Full UI (Play → concept slice) |
| `res://scenes/puzzles/concept_play_slice.tscn` | Neon board + HUD + lasers + victory |
| `res://scenes/puzzles/shift_feel_demo.tscn` | Movement feel lab |
| `res://scenes/ui/aesthetic_showcase.tscn` | Kit lab |

Run: `run_game.bat` or F6 current scene.

---

## Motion durations (tokens)

| Token | Default | Use |
| --- | --- | --- |
| `duration_press` | 80ms | Button squash |
| `duration_focus` | 140ms | Focus scale |
| `duration_transition` | 320ms | Screen veil |
| `duration_bg_drift` | ~2.8s | Background wash |
| `duration_icon_idle` | 3.6s | Icon breathe |
