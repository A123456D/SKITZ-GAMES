# Platform Services

Production architecture for Steam, Google Play, Game Center, and Web without pretending SDKs are linked.

## Why

Store APIs differ wildly (Steamworks vs Play Games vs GameKit vs browser). Gameplay must call one facade. Adapters hold SDK-specific code; **Null + local file backends ship and test today**.

## Layout

```text
scripts/services/
  platform/
    i_platform_services.gd      # Contract
    platform_gateway.gd         # Facade + adapter pick
    feature_flags.gd
    adapters/
      null_adapter.gd
      steam_adapter.gd          # Extension points only until plugin linked
      google_play_adapter.gd
      game_center_adapter.gd
      web_adapter.gd
      local_file_cloud_backend.gd
  save/                         # See SAVE_MIGRATION.md
  achievement_service.gd
  leaderboard_service.gd
  locale_service.gd
  analytics_service.gd
  analytics_events.gd
  crash_service.gd
  privacy_consent.gd
  controller_nav.gd
  input_remap_profile.gd
scripts/singletons/game_services.gd   # Autoload
```

## Bootstrap

`GameServices` autoload (`project.godot`) constructs `PlatformGateway`, loads/migrates save, wires achievements, leaderboards, locale, analytics, crash, privacy.

```gdscript
GameServices.achievements.unlock(&"first_shift")
GameServices.leaderboards.submit_daily(7, 18.4, "2026-07-24")
GameServices.save.sync_cloud()
GameServices.analytics.track(AnalyticsEvents.LEVEL_CLEAR, {"level_id": "ch_signal_01", "moves": 9, "stars": 3})
```

## Adapter selection

| Condition | Adapter |
| --- | --- |
| `OS.has_feature("steam")` | `SteamPlatformAdapter` |
| Android | `GooglePlayPlatformAdapter` |
| iOS | `GameCenterPlatformAdapter` |
| Web / `web` feature | `WebPlatformAdapter` |
| Else / CI | `NullPlatformAdapter` |

Force in tests: `gateway.bootstrap(&"null")`.

## Feature flags

`FeatureFlags.for_current_platform()` gates achievements, leaderboards, cloud, analytics, crash, auth, privacy gate. Export custom feature `steam` enables Steam-oriented flags. Demo builds can disable analytics via `demo` feature.

## Cloud merge

1. Local profile JSON + meta `{ updated_unix, checksum, schema_version, slot }`.
2. Remote download via adapter (or `LocalFileCloudBackend`).
3. `CloudMergePolicy.decide`:
   - identical checksum → keep local
   - newer timestamp wins
   - same time, different checksum → **CONFLICT** → `cloud_conflict` signal (UI hook for keep local / keep remote)

UI: Settings → Cloud save sync. Conflict resolution: `SaveService.resolve_conflict_keep_local()` / `resolve_conflict_keep_remote(payload)`.

## Achievements

- Defs: `AchievementDef` resources / catalog (GDD §12 IDs).
- `AchievementService` owns progress in `profile.achievements`.
- On unlock: persist → `gateway.unlock_achievement` (store mirror when SDK live).
- **Local path always works** even when adapter returns `ERR_UNAVAILABLE`.

### Plugin mapping (when ready)

| Platform | Suggested plugin | Wire in |
| --- | --- | --- |
| Steam | [GodotSteam](https://godotsteam.com/) or Steamworks GDExtension | `SteamPlatformAdapter._steam_*` |
| Android | Godot Play Games Services / custom | `GooglePlayPlatformAdapter._play_*` |
| iOS | GodotGameCenter / GameKit bridge | `GameCenterPlatformAdapter._gc_*` |

Map store achievement API names 1:1 to GDD ids (`first_shift`, `par_novice`, …).

## Leaderboards

| Board id | Mode | Score meaning |
| --- | --- | --- |
| `daily_moves` | Daily | `moves * 1_000_000 + ms` (lower better) |
| `endless_score` | Endless | Raw score (higher better) |

**Shipping honesty:** ranks are **device-local** via `LeaderboardService` cache under `profile.leaderboard_cache`. The Leaderboards screen shows Daily / Endless local entries only — **no fake global/friends names**.

### Plugin hook (not implemented online)

When Steam / Play / Game Center plugins are linked, wire submit/fetch in the platform adapters only — gameplay keeps calling `GameServices.leaderboards`:

| Platform | Suggested plugin | Adapter methods |
| --- | --- | --- |
| Steam | [GodotSteam](https://godotsteam.com/) / Steamworks GDExtension | `SteamPlatformAdapter._steam_submit_score` / `_steam_fetch_scores` |
| Android | Play Games Services | `GooglePlayPlatformAdapter` `submit_score` / `fetch_scores` |
| iOS | Game Center bridge | `GameCenterPlatformAdapter` `submit_score` / `fetch_scores` |

Until those return real rows, `fetch` falls back to the local cache (empty until the player submits). Do **not** invent remote leaderboard entries in UI catalogs.

Offline: `LeaderboardService` caches under `profile.leaderboard_cache`. Fetch falls back to cache when remote empty.

## Analytics event taxonomy

Privacy-gated (`PrivacyConsent.analytics_allowed()`). Buffered (`MAX_BUFFER=64`), flushed to `gateway.log_analytics`.

| Event | When | Props (examples) |
| --- | --- | --- |
| `session_start` | After consent / boot | `platform` |
| `session_end` | Quit / background | `duration_sec` |
| `level_start` | Enter puzzle | `level_id`, `mode` |
| `level_clear` | Win | `level_id`, `moves`, `stars` |
| `level_fail` | Soft fail | `level_id`, `moves` |
| `moves` | Optional aggregate | `count` |
| `undo` / `hint` | Player assist | `level_id` |
| `iap_success` | Purchase verified | `sku` |
| `daily_clear` | Daily win | `seed`, `moves`, `time_sec` |
| `endless_over` | Run end | `score`, `cascade_peak` |
| `achievement_unlock` | Unlock | `id` |
| `cloud_sync` | Sync result | `decision` |
| `privacy_consent` | Gate accept | `analytics`, `crash` |
| `locale_changed` | Language pick | `locale` |

No PII in props (no email, device advertising id unless separately consented and documented).

## Crash reporting

`CrashService.breadcrumb(category, message, data)` ring buffer → included when `report()` runs.

### Sentry (recommended desktop/web)

1. Add Sentry Godot SDK / GDExtension when available for your Godot minor.
2. Set DSN via env `SENTRY_DSN` or `export_credentials.cfg` (not in repo).
3. In adapter `report_crash`, call Sentry capture; map breadcrumbs to Sentry scope.

### Firebase Crashlytics (Android / iOS)

1. Add Firebase to Gradle / Xcode after Godot export.
2. `GooglePlayPlatformAdapter.report_crash` / iOS bridge → `FirebaseCrashlytics.recordException`.
3. Keep `crash_opt_in` gate — if false, no-op.

Until plugins land, debug builds print breadcrumbs; `report` pushes errors to Godot output.

## Controller

| Layer | Behavior |
| --- | --- |
| Board | `BoardInputController` D-pad aim, face buttons shift, X undo, shoulders axis toggle |
| UI | `ControllerNav.link_vertical` on Main Menu / Settings / Accessibility |
| Remap | `InputRemapProfile` resource → `apply_to_input_map()` from a future remap screen |
| Glyphs | `ControllerNav.hint_text()` / `UI_CONTROLLER_HINT` translation |

## Auth

`flags.auth` true on mobile adapters; `sign_in()` is an extension point. Cloud sync toggle in Settings does not require auth for local file backend; store Saved Games / Steam Cloud will once `is_signed_in()`.
