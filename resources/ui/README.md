# resources/ui/

Sample / shipping-ready **UI meta Resources** (achievements, cosmetics, chapters, daily, leaderboards, hints).

| File | Role |
| --- | --- |
| `sample_ui_catalog.gd` | Catalog + `make_builtin()` SHIFTR-flavored sample data |
| `*_def.gd` | Typed Resource schemas for screens |

Screens read `UiRouter.catalog` — never hardcode long content lists in scene scripts.
