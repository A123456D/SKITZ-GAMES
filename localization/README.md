# localization/

Godot Translation CSV sources for UI strings (en + sample es/fr).

Canonical file: `shiftr.csv` — **do not** register the CSV in `project.godot` `[internationalization] locale/translations` (Godot cannot load CSV as a Translation resource and will spam `Failed loading resource`).

Runtime: `LocaleService` (`GameServices.locale`) parses `shiftr.csv` and registers `Translation` objects for `en` / `es` / `fr`. Optional editor-imported `shiftr.*.translation` remaps are also loaded when present.

See `docs/LOCALIZATION.md`.
