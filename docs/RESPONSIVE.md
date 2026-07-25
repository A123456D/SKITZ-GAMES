# SHIFTR — Responsive layout policy

Honest status: **menus + play shell are mobile-first and mostly solid; authoring tools are desktop-first with a narrow fallback.** This is not “every screen pixel-perfect on every device.”

Reference: [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md) (spacing / touch tokens). Stretch settings live in `project.godot`.

---

## Stretch policy (project.godot)

| Setting | Value | Why |
| --- | --- | --- |
| Viewport | **720 × 1280** | Portrait mobile-first design canvas |
| Window override (editor/PC) | **405 × 720** | Comfortable desktop preview without a tall phone window |
| Stretch mode | `canvas_items` | 2D UI/board scale crisply |
| Aspect | `expand` | Fill odd ratios (notches, ultrawide, short phones) without letterbox bars |
| Scale mode | `fractional` | Smooth hiDPI scaling |
| `allow_hidpi` | `true` | Retina / high-DPI desktop & phones |
| Orientation | Portrait (`handheld/orientation=1`) | Mobile / web primary; desktop can still free-resize |

**Do not** switch to `ignore` aspect or fixed pixel stages for production UI.

---

## Breakpoints (virtual / content pixels)

Use `Control.size` / `Viewport.get_visible_rect().size` after stretch — not raw DisplayServer pixels.

| Name | Width | Behavior |
| --- | --- | --- |
| **Phone** | `< 700` | Hide level-editor analysis rail; feel-lab debug toggles hidden; board fits host |
| **Comfort** | `700–1100` | Standard shell; three-column editor when wide enough |
| **Wide / ultrawide** | `> 1100` | Same layouts; `expand` grows the virtual canvas — prefer anchors + expand flags over centered fixed-width stages |

Portrait vs landscape: product target is **portrait**. Landscape is usable for play (board scales) but chrome density is not reflowed into a landscape-first composition.

---

## Touch targets

| Rule | Value |
| --- | --- |
| Minimum hit size | **≥ 44 px** (Apple HIG); design token `touch_min` = **48** |
| Icon buttons | `IconButtonFx` → `touch_min` × `touch_min` |
| Primary CTAs | height ≥ `touch_min` (often 52) |
| List / settings rows | height ≥ `touch_min + 8` |

Mouse and gamepad are first-class for board input (`BoardInputController`: swipe / keys / pad). Hover is never the only affordance.

---

## Safe areas

`SafeAreaHelper` (`scripts/presentation/ui/safe_area_helper.gd`) maps `DisplayServer.get_display_safe_area()` into **viewport** margins under stretch.

Applied on:

- `ScreenChrome` (notch + base token margins)
- Main Menu outer `MarginContainer`
- `UiScreenScaffold` scroll bottom padding (home indicator)
- `MinimalHud` top/bottom bars

On desktop / editor, insets are typically **0** — token margins still apply.

---

## Board scaling

| Surface | Behavior |
| --- | --- |
| Feel demo / play board | `_fit_board_to_host`: cell size clamped **44–96** so the grid fits `BoardHost` |
| Level editor board | `EditorBoardView` recomputes cell size on resize (already) |

Fixed pixel board hosts are avoided for production play.

---

## Text scale (a11y)

`UiSettingsState.text_scale` (100 / 115 / 130%) multiplies font sizes via `scaled()` / row configure. Screens that rebuild on `settings.changed` (Accessibility, Inventory, …) refresh immediately. Main Menu re-applies font sizes in `_apply_text_scale`. Layouts must stay flexible (`SIZE_EXPAND_FILL`, autowrap, scroll) — do not assume a single line height.

---

## What was fixed (responsive audit)

1. Real safe-area insets (docs previously claimed this; code only used fixed token padding).
2. Feel-demo `BoardHost` full-bleed + board cell fit to viewport; lab toggles hide under 640 px width.
3. Main Menu CTA/ghost hit heights ≥ `touch_min`; text scale re-apply.
4. Minimal HUD margins track safe insets.
5. Level editor hides analysis column under 700 px; brush rows ≥ 44 px on narrow.
6. Project stretch: hiDPI + fractional scale + PC window override for preview.

---

## Remaining gaps (not “ready”)

- **Level editor** remains desktop-first (dense toolbar, side tools). Narrow mode is “usable enough,” not a mobile authoring UX.
- **Hint sheet** still uses a fixed ~420 px panel height — may feel tall on short landscape.
- **Many secondary screens** (world map path, leaderboards) use scroll + anchors but were not re-QA’d at every ratio.
- **Text scale** does not globally rebuild theme; each screen must call `scaled()` / repopulate.
- **Landscape chrome** for menus is not a dedicated layout.

---

## How to verify in editor

1. Open Project → Project Settings → Display → Window: confirm stretch `canvas_items` / `expand`.
2. **Main shell:** run `scenes/ui/main_shell.tscn` (F6).
3. Drag the game window to **~360×640** (phone) and **~1280×720** (landscape / ultrawide-ish).
4. Or Editor → **Emulator / device presets** (if available) / set window override to 360×780.
5. Check: Main Menu CTAs not clipped; Settings scroll; Accessibility text size 130% still scrolls; Feel Lab board stays on-screen with ≥44 px cells.
6. On a device or notch simulator: chrome clears the status bar / home indicator.
