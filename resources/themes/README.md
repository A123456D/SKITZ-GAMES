# resources/themes/

- `shiftr_theme.tres` — baked Theme (StyleBoxes for Button / Panel / Label / CheckBox)
- `shiftr_theme_factory.tres` — rebuilds Theme from `DesignTokens` via `ShiftrThemeBuilder`

Prefer runtime `ShiftrThemeBuilder.build(tokens)` so palette edits stay single-source.
