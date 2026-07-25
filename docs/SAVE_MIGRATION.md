# Save Migration

Player **profile** saves (progress, settings, achievements, privacy) are versioned separately from board puzzle snapshots (`BoardSerializer` / `BoardEnums.SCHEMA_VERSION`).

## Why

Shipping updates will add fields (privacy, cloud prefs, caches). Players keep progress across versions only if load always migrates forward. Fail closed on unknown future versions rather than silently dropping data.

## Format

```json
{
  "format": "shiftr_profile",
  "schema_version": 4,
  "slot": "0",
  "updated_unix": 1721830000,
  "settings": { "...": "..." },
  "economy": { "sparks": 0, "prisms": 0 },
  "campaign": {
    "chapters": {
      "ch_signal": {
        "levels": {
          "ch_signal_01": { "stars": 3, "best_moves": 1 }
        }
      }
    },
    "last_level_id": "ch_signal_01",
    "world_skin": "neon_grid",
    "resume": {
      "level_id": "ch_signal_01",
      "scene": "res://scenes/puzzles/concept_play_slice.tscn",
      "moves": 3,
      "best": 9,
      "board": {}
    }
  },
  "achievements": {},
  "daily": {
    "streak": 0,
    "last_clear_utc": "",
    "attempts_today": 0,
    "completed_utc_date": "",
    "best_moves": -1
  },
  "endless": { "wave_best": 0, "last_seed": 0 },
  "stats": { "shifts": 0, "three_star_clears": 0, "mastery_medals": 0 },
  "privacy": { "analytics_opt_in": false, "crash_opt_in": true, "consent_version": 1, "age_gate_passed": true },
  "cloud": { "sync_enabled": true, "last_sync_unix": 0 },
  "leaderboard_cache": {},
  "locale": "en"
}
```

Path: `user://saves/profile_<slot>.json`  
Cloud mirror: `user://cloud/<slot>.bin` + `.meta.json`

`SaveSchema.CURRENT_VERSION` is **5**.

## Version history

| Version | Added |
| --- | ---: |
| **1** | settings, economy, campaign stubs |
| **2** | `achievements`, `daily`, `stats` |
| **3** | `privacy`, `cloud`, `leaderboard_cache`, `locale` |
| **4** | `campaign.resume`, `campaign.last_level_id`, `campaign.world_skin` |
| **5** | `daily.completed_utc_date`, `daily.best_moves`, `endless.wave_best` / `last_seed` |

## Migration rules

Implemented in `SaveMigrator`:

1. Reject if `format != shiftr_profile`.
2. Reject if `schema_version < 1` or `> CURRENT`.
3. Apply steps in order: `_v1_to_v2` → `_v2_to_v3` → `_v3_to_v4` until current.
4. Each step is pure (dict in → dict out); never mutate the on-disk file until migrate succeeds and `SaveService` writes.

### Adding v6

1. Bump `SaveSchema.CURRENT_VERSION` to 6.
2. Add `_v5_to_v6(d)` with defaults for new keys only.
3. Add `match 5:` branch in the migrator loop.
4. Extend unit tests with a v5 fixture → v6 assert.
5. Document the new fields in this file.

**Do not** edit historical migrators in ways that change results for already-shipped versions.

## Cloud meta

`CloudMergePolicy.meta_from_profile` derives:

- `updated_unix` from profile
- `checksum` = MD5 of JSON string
- `schema_version`, `slot`

Conflict UI should show both timestamps/checksums and offer Keep this device / Keep cloud.

## Board saves

In-puzzle undo stacks remain `BoardSerializer` (`format: shiftr_board`). Mid-puzzle suspend can live under `user://saves/board_<level>.json` using that serializer; migrate board schema independently when `BoardEnums.SCHEMA_VERSION` changes (today: hard-fail on mismatch — add board migrators when needed).

Continue CTA uses `SaveService.write_resume` / `has_resume` / `get_resume` on `campaign.resume` (board snapshot + moves + world_skin). `GameServices.launch_resume` tells `concept_play_slice` to restore on enter.

## Tests

```bash
godot --headless -s res://tests/unit/platform/run_platform_validation.gd
```

Covers v1→current roundtrip, idempotent migrate, merge decisions, achievement persist.
