# SHIFTR — UI Design System

Commercial mobile-first UI language for menus, meta, and chrome. Complements `VISUAL_IDENTITY.md` (tokens / glass / tiers), `SATISFACTION_JUICE.md` (EffectRecipe / UiFeel), `AUDIO_SYSTEM.md` (SFX_UI / ducking), and `MOVEMENT_FEEL.md` (reduce-motion flags).

**Entry scene:** `scenes/ui/main_shell.tscn` (F6). Navigation: `UiRouter` + `ScreenStack` under the shell.

---

## 1. Design principles

| Principle | Meaning |
| --- | --- |
| **Board > chrome** | In play, the grid is the hero. Menus may brand-lead; never compete with the board during a shift. |
| **One job per screen** | One title, one supporting line, one primary CTA path. Secondary actions are quieter and lower. |
| **Brand-first home** | First viewport of Main Menu: **SHIFTR** as hero signal, one tagline, one CTA cluster. No stats strip, no card collage. |
| **Glass for hierarchy** | Glass panels group *interaction*, not every label. If removing the panel doesn’t hurt scanning, remove it. |
| **Touch-first states** | Press + focus are mandatory. Hover is optional polish only — never the only affordance. |
| **Motion confirms intent** | Enter/exit, press squash, and screen “shift” metaphors reinforce the fantasy verb. Juice never obscures text >50ms. |
| **Sparse dopamine** | Confirm bursts on primary CTAs and unlocks — not on every row hover or slider tick. |
| **Composition over inheritance** | Screens compose `ScreenChrome`, rows, sheets, and router services. Prefer data Resources over hard-coded lists. |

### Visual hierarchy rules (what may compete)

| Rank | Element | May compete with |
| --- | --- | --- |
| 1 | Brand / screen title | Nothing else at same size |
| 2 | Primary CTA | One supporting sentence only |
| 3 | Interactive list / map nodes | Muted metadata (stars, ranks) |
| 4 | Currency / streak chrome | Caption weight only |
| 5 | Decorative BG / ambient | Never ink contrast |

**Don’t** put two display-sized labels in one viewport. **Don’t** wrap every setting in its own card — one scrolling column of rows inside a single elevated surface is enough.

---

## 2. Spacing system (4 / 8pt grid)

Tokens live on `DesignTokens` (`space_xs`…`space_xl`, `touch_min`).

| Token | px | Use |
| --- | --- | --- |
| `space_xs` | 4 | Icon-to-label gaps, tight stacks |
| `space_sm` | 8 | Row internal padding, toggle gaps |
| `space_md` | 16 | Default section rhythm, content margins (compact) |
| `space_lg` | 24 | Between sections, list separation |
| `space_xl` | 40 | Safe outer margins, brand breathing room |
| `touch_min` | 48 | Minimum hit target (height *and* width for icons) |

### Density recipes

| Density | Outer margin | Row height | Section gap | Screens |
| --- | --- | --- | --- | --- |
| **Hero** | 40 / 120 top | CTA 52–56 | 24–48 | Main Menu |
| **Standard** | 24–32 | 56–64 | 16–24 | Settings, Inventory, Achievements |
| **Dense list** | 20–24 | 52–56 | 8–12 | Leaderboards, Level Select grid |
| **Map** | 16 + safe | nodes 64–72 | path 24 | World Map |
| **Sheet** | 16 + bottom inset | rows 48–56 | 12 | Hints modal |

**Safe areas:** `SafeAreaHelper` + `ScreenChrome` / shell / HUD margins pad notch + home indicator (token base + `DisplayServer` insets, converted to viewport coords under stretch). Prefer `MarginContainer` overrides over absolute offsets. Portrait **720×1280** reference; layouts use anchors + size flags, not fixed pixel stages. Full policy: [`RESPONSIVE.md`](./RESPONSIVE.md).

---

## 3. Typography

### Roles

| Role | Token size | Weight feel | Use |
| --- | --- | --- | --- |
| **Display** | `font_display` (36) / brand +12 | Bold / semi | SHIFTR wordmark, rare hero numerals |
| **Title** | `font_title` (22) | Semi | Screen titles, chapter names |
| **Body** | `font_body` (15) | Regular | Buttons, settings labels, descriptions |
| **Caption** | `font_caption` (13) | Regular | Hints, metadata, legal, streak subtext |
| **Mono** (optional) | caption–body | Tabular | Move counts, ranks, timers, seeds |

### Colour on type

| Role | Token |
| --- | --- |
| Primary ink | `ink_primary` |
| Secondary | `ink_secondary` |
| Muted / disabled | `ink_muted` |
| Signal / CTA text | `accent_signal` / `accent_beam` on focus |
| On accent fills | `ink_on_accent` |
| Danger / budget heat | `accent_warn` |
| Success / unlocked | `accent_signal` |

### Fonts — drop-in + fallback

`assets/fonts/` is the import home. Until custom faces land, Godot’s default UI font is acceptable for layout work.

| Slot | Recommended file | Why |
| --- | --- | --- |
| Display / Title | `Outfit-SemiBold.ttf` or `SpaceGrotesk-Bold.ttf` | Geometric, modern, not Inter/Roboto sludge |
| Body / Caption | `Outfit-Regular.ttf` or `IBMPlexSans-Regular.ttf` | High legibility at 13–15px mobile |
| Mono | `JetBrainsMono-Regular.ttf` | Tabular figures for ranks / pars |

Wire via `ShiftrThemeBuilder` when files exist (`Theme.set_font` / size overrides already driven by tokens). **Do not** ship purple neon display fonts or cream-serif editorial stacks.

**Text scale (a11y):** `UiSettingsState.text_scale` multiplies theme font sizes (1.0 / 1.15 / 1.3). Screens re-apply on change; keep layouts flexible (`SIZE_EXPAND_FILL`, wrap labels).

---

## 4. Colour roles ↔ tokens

| Role | Token(s) | UI meaning |
| --- | --- | --- |
| **Surface / void** | `bg_deep` | Full-screen veil, transition cover |
| **Elevated** | `bg_elevated`, panel StyleBox | Grouped content behind glass |
| **Play wash** | `bg_play` | Reserved for puzzle field (menus use deep + gradient BG) |
| **Glass** | `surface_glass`, `surface_glass_border` | Interactive clusters |
| **Steel** | `surface_steel`, `accent_steel` | Secondary chrome, locked nodes |
| **Signal** | `accent_signal` (purple), `accent_beam` (cyan), `accent_focus` | CTA, brand pulse, focus |
| **Secondary** | `accent_secondary` (blue) | Support accent |
| **Warn / danger** | `accent_warn` | Budgets low, destructive confirm, fail |
| **Stars / success** | `accent_star` / purple signal | Victory stars, unlocks |
| **Muted** | `ink_muted` | Locked, incomplete, footnotes |
| **Glow** | `glow_tint` (purple), bloom | Neon atmosphere + confirmation |

Source of truth: `resources/configs/visual/default_design_tokens.tres`. Fantasy: `docs/CONCEPT_ALIGNMENT.md`. Scripts must not hardcode hex. Purple neon glass is intentional brand — not “AI sludge.”

---

## 5. Motion language

### Durations (tokens)

| Token | Default | Use |
| --- | --- | --- |
| `duration_press` | 80ms | Button squash |
| `duration_focus` | 140ms | Focus scale |
| `duration_panel` | 220ms | Sheet / panel rise |
| `duration_transition` | 320ms | Screen veil (cover/uncover) |
| Icon idle | `duration_icon_idle` | Breathe (disabled under reduce motion) |

### Easings

| Moment | Ease |
| --- | --- |
| Press | OutBack / cubic out (IconMotion) |
| Screen cover SHIFT | TRANS_BACK out (brand metaphor) |
| Screen uncover | Cubic in |
| List enter stagger | Cubic out, 30–45ms delay per row |
| Sheet present | Cubic out from bottom |
| Reduce motion | Snap / 80ms fade only |

### Animation catalog

| Id | Layers | Recipe / owner |
| --- | --- | --- |
| **button_press** | Squash, glow, UI SFX, optional particles, haptic | `UiFeel.button_press` → EffectRecipe `button_press` |
| **screen_transition** | Veil + soft whoosh | `ScreenTransition` + `UiFeel.screen_transition` |
| **screen_enter** | Content fade + slide 12–24px | `UiScreen.play_enter` |
| **screen_exit** | Reverse slide / fade | `UiScreen.play_exit` |
| **shared shift** | Horizontal wipe veil between stacks | `ScreenTransition.Mode.SHIFT` |
| **sheet_present** | Bottom sheet rise + dim scrim | `HintSheet` |
| **nav_row_press** | Same as button_press, quieter particles | Glass / ghost row |
| **achievement_pop** | Heavy juice | `UiFeel.achievement` → `achievement_reward` |
| **invalid** | Warn tint + error thud | `UiFeel.invalid` |

**Staging:** cover veil → swap screen → uncover. Never animate board + full-screen UI focus at once.

---

## 6. Screen-by-screen UX

### 6.1 Main Menu

- **Layout:** Brand centered upper third → tagline → flexible spacer → CTA column (Play / Daily / Map / …) → footer ghost links (Settings, A11y).
- **Hierarchy:** Display brand > CTAs > footer.
- **Motion:** Boot uncover FADE; CTA press + confirm burst; push uses SHIFT.

### 6.2 Settings

- **Sections:** Audio (Master / Music / SFX / UI) → Graphics tier (High / Med / Low) → Controls blurb (swipe threshold optional).
- **Layout:** Chrome title + back; single scroll; rows not card-per-setting.
- **Bindings:** `Audio.set_category_volume`; `VisualDirector.set_quality_tier`; persist via `UiSettingsState`.

### 6.3 Accessibility

- **Toggles:** Reduce motion, disable shake, bloom (via quality / reduce), text scale, colorblind dual-coding note, haptics.
- **Bindings:** `VisualDirector.set_reduce_motion`, `ShiftFeelConfig` flags (`disable_shake`, `haptics_enabled`, etc.), transition `reduce_motion`.

### 6.4 Inventory

- **Currency strip:** Sparks + Prisms (GDD §9).
- **Grid / list:** Cosmetic defs (tile skin, frame, trail) — owned / equipped states.
- **Motion:** Equip = signal flash + button_press; locked = muted + invalid feel if tapped.

### 6.5 World Map

- **Vertical or path of chapter nodes** with progress rings / stars.
- **One focal chapter** expanded; others quieter.
- **Motion:** Node focus scale; tap → Level Select push.

### 6.6 Daily Challenge

- **Hero:** Today’s seed label, countdown to UTC reset, streak flame (caption+signal).
- **CTA:** Play Ranked / Practice.
- **Secondary:** Open leaderboard (push).

### 6.7 Leaderboards

- **Tabs or segmented:** Global / Friends (sample data).
- **Rows:** Rank · name · moves · time — mono for numbers.
- **You** row uses signal tint, not a loud card.

### 6.8 Level Select

- **Grid** of level cells: index, stars, locked state.
- Enter from World Map with `chapter_id` param.
- Locked cells use steel/muted; no spammy lock icons.

### 6.9 Achievements

- **List** of defs with tier (Bronze→Platinum), progress bar, unlocked date if any.
- Unlock celebration uses `UiFeel.achievement` sparingly (demo button / first view optional).

### 6.10 Hints (sheet)

- **Modal bottom sheet** over current context (Level Select or future play HUD).
- Progressive non-spoiler steps: nudge → direction → stronger.
- Cost caption (Sparks) — economy may be stubbed.
- Scrim tap or Close dismisses with panel duration.

### Shared chrome

- `ScreenChrome`: back (`IconButtonFx`), title, optional subtitle, safe margins.
- Currency strip on meta screens that spend/earn.
- No hamburger forests — back stack is the model.

---

## 7. Accessibility UI patterns

| Pattern | Implementation |
| --- | --- |
| **Focus** | All CTAs `FOCUS_ALL`; focus StyleBox uses `accent_focus` border |
| **Contrast** | Primary ink on deep/elevated only; never signal text on signal fill without `ink_on_accent` |
| **Reduce motion** | Cuts bloom/parallax/shimmer/ambient, shortens transitions, disables idle breathe & shake |
| **Shake / bloom** | Independent toggles where possible; bloom follows quality + reduce |
| **Text scale** | 100 / 115 / 130% via settings |
| **Colorblind** | Dual-code shape + color in puzzle (GDD); UI uses icons + labels, not color alone for rank/lock |
| **Haptics** | Master toggle → `ShiftFeelConfig.haptics_enabled` |
| **Hit targets** | ≥48px; list rows full-width press |
| **Screen reader (future)** | Accessible names on IconButtons; keep text labels beside icon-only where space allows |

---

## 8. Do’s / Don’ts

### Do

- Drive colour, radius, duration from `DesignTokens`.
- Use `GlassButton` / `IconButtonFx` / `GlassPanel` / `ScreenChrome`.
- Fire `UiFeel` + Audio on primary presses.
- Keep Main Menu brand-dominant and sparse.
- Stagger list enters lightly; respect reduce motion.

### Don’t

- Cream/terracotta “AI default” themes or broadsheet newspaper layouts.
- Flat non-glowing puzzle objects (concept requires emissive color).
- Card-wrap every label or setting.
- Hover-only affordances.
- Stat strips / pill clusters in the first viewport of marketing-like menus.
- Confetti on every navigation.
- Hardcode hex in screen scripts.
- Block input without a visible veil/scrim.
- Duplicate router / feel bootstrap per screen — use `UiRouter` context.

---

## 9. Architecture map

| Piece | Path |
| --- | --- |
| Design doc | `docs/UI_DESIGN_SYSTEM.md` |
| Responsive / stretch | `docs/RESPONSIVE.md` |
| Host | `scenes/ui/main_shell.tscn` → `main_shell.gd` |
| Router | `scripts/presentation/ui/ui_router.gd` |
| Screen base | `scripts/presentation/ui/ui_screen.gd` |
| Settings state | `scripts/presentation/ui/ui_settings_state.gd` |
| Chrome / rows / sheet | `scenes/ui/components/*`, `scripts/presentation/ui/*` |
| Screens | `scenes/ui/screens/*.tscn` |
| Sample catalog | `resources/ui/sample_ui_catalog.tres` |
| Tokens / quality | `resources/configs/visual/*` |
| Feel | `ShiftFeelConfig`, `UiFeel`, `SatisfactionDirector` |
| Audio | Autoload `Audio` (`AudioDirector`) |

### How to run

1. Open `res://scenes/ui/main_shell.tscn`.
2. **F6** (Run Current Scene).
3. Navigate: Main Menu → any screen; Back pops with SHIFT/FADE; Hints opens as sheet from Level Select.

### Settings binding summary

| Control | Target |
| --- | --- |
| Master / Music / SFX / UI sliders | `Audio.set_category_volume(DynamicMixer.Category.*)` |
| Graphics tier | `AestheticRoot.set_tier` / `VisualDirector.set_quality_tier` |
| Reduce motion | `VisualDirector.set_reduce_motion` + `ShiftFeelConfig.reduce_motion` + transition flag |
| Disable shake | `ShiftFeelConfig.disable_shake` |
| Bloom off | Quality low path or reduce motion / tier |
| Haptics | `ShiftFeelConfig.haptics_enabled` |
| Text scale | `UiSettingsState.text_scale` → theme font multiply on screens |
