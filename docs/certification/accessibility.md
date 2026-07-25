# Certification — Accessibility

Cross-check against GDD §15 and in-game Accessibility / Settings screens.

## Sensory

- [ ] Colorblind-safe indicators toggle (dual-code shape + colour)
- [ ] High-contrast / CB palettes available via visual tokens when enabled
- [ ] Critical SFX mirrored by visuals (shift settle, clear, win)
- [ ] Text contrast WCAG AA on primary ink vs backgrounds (spot-check Main / Settings)
- [ ] Tooltips / labels on interactive chrome (`tooltip_text` on CTAs); plan Godot 4.4+ accessibility names

## Motor

- [ ] Full campaign completable without timed presses (Rush optional)
- [ ] Keyboard: Q/E/R/F/Z + arrows (board)
- [ ] Gamepad: D-pad aim, face shifts, X undo
- [ ] UI focus neighbors on Main Menu, Settings, Accessibility, Privacy gate
- [ ] Touch targets ≥ 48 px (`touch_min`)
- [ ] Swipe threshold adjustable via feel config (document in Accessibility note)

## Cognitive / comfort

- [ ] Reduce motion shortens transitions; disables shake / idle breathe
- [ ] Disable screen shake toggle
- [ ] Bloom off toggle
- [ ] Battery saver (thermal / distraction reduction)
- [ ] Text size 100 / 115 / 130% applied via `UiSettingsState.text_scale` → `scaled()` fonts
- [ ] Zen mode available when mode ships (track separately)

## Systemic

- [ ] Settings persist across sessions (`SaveService`)
- [ ] Haptics toggle
- [ ] Remap profile resource exists (`InputRemapProfile`) — in-game remap UI optional for 1.0
- [ ] Dyslexia-friendly font: asset slot documented; enable when font file lands under `assets/fonts/`

## Sign-off

| Build | Tester | Date | Pass |
| --- | --- | --- | --- |
| | | | ☐ |
