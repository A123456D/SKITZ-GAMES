# Localization

UI strings are externalized via Godot Translation CSV. Puzzle content is mostly non-linguistic (GDD §22).

## Source file

`localization/shiftr.csv`

```text
keys,en,es,fr
UI_SETTINGS,Settings,Ajustes,Réglages
```

- First column: stable **key** (never change after ship without a migration note).
- Additional columns: locale codes (`en`, `es`, `fr`, …).

**Important:** Do **not** put `res://localization/shiftr.csv` in `project.godot` → `[internationalization] locale/translations`. That path makes Godot try to load the CSV as a `Translation` resource and spam `Failed loading resource`. Leave `locale/translations` empty (or list generated `.translation` remaps only).

`LocaleService` registers messages from the CSV at boot (`GameServices.locale.bootstrap`). After editing CSV, restart the game (or editor) — no reimport required for the runtime path. Optional: reimport in the editor to refresh `shiftr.*.translation` remaps (gitignored).

## Runtime

`LocaleService` (`GameServices.locale`):

- Supported: `en`, `es`, `fr` (extend `SUPPORTED` when adding columns).
- Persists preference in `profile.locale`.
- Settings → Language choice calls `set_locale`.
- Screens use `_t("KEY", "English fallback")` so missing translations still show English.

```gdscript
label.text = GameServices.locale.tr_key(&"UI_CONTINUE", "Continue")
# or
label.text = tr("UI_CONTINUE")
```

## Translator workflow

1. Export or copy `localization/shiftr.csv`.
2. Translate only language columns; **do not rename keys**.
3. Keep placeholders intact if we add `{0}` later (Godot `tr` + `format`).
4. Watch length: mobile buttons ~12–18 characters preferred; wrap captions.
5. Return CSV; engineer restarts play and spot-checks Main Menu + Settings + Privacy gate in each locale.
6. Optional: PO workflow — convert with Godot’s CSV↔PO tools if freelancers prefer PO; keep CSV as canonical for this repo.

## Adding a locale

1. Add column to CSV (e.g. `de`).
2. Append code to `LocaleService.SUPPORTED` and a label in `supported_labels()`.
3. Smoke-test Settings language cycle + privacy gate.
4. Update App Store / Play store listing locales separately (not this CSV).

## What not to translate

- Achievement **ids** and analytics event names.
- Puzzle tile identities / seeds.
- Brand wordmark **SHIFTR** (kept identical in sample locales).
