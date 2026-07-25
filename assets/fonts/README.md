# Fonts

Drop `.ttf` / `.otf` files here for SHIFTR UI. `ShiftrThemeBuilder` auto-loads when present.
License: `OFL.txt` (SIL Open Font License 1.1).

| Slot | File | License | Role |
| --- | --- | --- | --- |
| Display / Title | `Orbitron-SemiBold.ttf` | OFL | Brand, screen titles (preferred) |
| Display fallbacks | `Orbitron-Bold.ttf`, `Orbitron-Regular.ttf` | OFL | Used if SemiBold missing |
| Body | `Rajdhani-SemiBold.ttf` | OFL | Buttons, nav rows |
| Caption | `Rajdhani-Regular.ttf` | OFL | Meta, hints |

**Shipped weights:** Orbitron Regular + SemiBold + Bold; Rajdhani Regular + SemiBold.
`ShiftrThemeBuilder._orbitron_candidates()` and the main-menu brand loader try
SemiBold → Bold → Medium → Regular. Theme uses a single display face (first hit);
multiple Orbitron files exist so drops/CI can prefer SemiBold without breaking
when only Regular is present.

Variable-font Orbitron (`Orbitron[wght].ttf`) is **not** wired — optional later.

## Drop-in path

1. Place TTF/OTF under `assets/fonts/` using the filenames above.
2. Reimport in Godot (or restart editor) so `.import` sidecars appear.
3. Theme rebuilds on next `VisualDirector` / shell boot.

## Verify

Main menu brand should render in Orbitron; body CTAs in Rajdhani. If files are missing, Godot default UI font is used.
