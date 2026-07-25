# SHIFTR — Release Readiness

Master index for commercial multi-platform shipping. Status is honest: **Ready** means the app-facing path works today with local backends; store SDKs are configuration + plugins, not vapor claims.

**Vertical slice (iteration 6):** authored Signal Awakening campaign (7 levels) + localization CSV fix + local-only LB + placeholder app icon. Still not store-submit ready (credentials, real privacy URL, plugins).

| Status | Meaning |
| --- | ---: |
| **Ready** | Implemented and usable in-editor / Null + file backends |
| **Needs credentials** | Code path exists; store keys / team IDs / DSN required |
| **Needs plugin** | Adapter extension points exist; GDExtension / asset library plugin not linked |

---

## Readiness matrix

| # | System | Status | Primary code / docs |
| --- | ---: | --- | --- |
| 1 | Steam | Needs plugin + credentials | `SteamPlatformAdapter`, [EXPORTS.md](./EXPORTS.md), [certification/steam.md](./certification/steam.md) |
| 2 | Android | Needs credentials | `GooglePlayPlatformAdapter`, export preset Android |
| 3 | iOS | Needs credentials | `GameCenterPlatformAdapter`, export preset iOS |
| 4 | Web | Ready (local/IDBFS) | `WebPlatformAdapter`, PWA flags in export preset |
| 5 | Cloud saves | Ready (local file) / Needs plugin for Steam Cloud / Play Saved Games / iCloud | `SaveService`, `LocalFileCloudBackend`, [PLATFORM_SERVICES.md](./PLATFORM_SERVICES.md) |
| 6 | Achievements | Ready (local) / Needs plugin for store mirror | `AchievementService` |
| 7 | Leaderboards | Ready (**local cache only**) / Needs plugin for global ranks | `LeaderboardService`, UI honesty note — no fake online |
| 8 | Controller | Ready (board + UI focus neighbors + glyphs) | `BoardInputController`, `ControllerNav`, `InputRemapProfile` |
| 9 | Localization | Ready (en + es + fr via `LocaleService` CSV) | `localization/shiftr.csv`, `LocaleService`, [LOCALIZATION.md](./LOCALIZATION.md) |
| 10 | Analytics | Ready (buffered, privacy-gated) / Needs credentials for backend | `AnalyticsService`, event taxonomy in PLATFORM_SERVICES |
| 11 | Crash reporting | Ready (breadcrumbs + hook) / Needs plugin (Sentry/Crashlytics) | `CrashService` |
| 12 | Save migration | Ready | `SaveMigrator` v1→v5, [SAVE_MIGRATION.md](./SAVE_MIGRATION.md) |
| 13 | Privacy | Ready (gate + settings toggles) / Needs live policy URL | `PrivacyConsent` still on `example.com` placeholders, [PRIVACY.md](./PRIVACY.md) |
| 14 | Accessibility | Ready (existing toggles + text scale + checklist) | Settings / Accessibility screens, [certification/accessibility.md](./certification/accessibility.md) |
| 15 | Performance testing | Ready (plan + smoke list) | [PERF_TEST_PLAN.md](./PERF_TEST_PLAN.md), [PERFORMANCE.md](./PERFORMANCE.md) |
| 16 | Certification checklists | Ready (docs) | [certification/](./certification/) |
| 17 | App icon | Ready (placeholder) | `assets/icons/app/icon_1024.png` → `project.godot` `config/icon` |
| 18 | Authored campaign | Ready (Signal Awakening 7 levels) | `CampaignLevelCatalog`, Level Select → `GameServices` → concept slice |

---

## How to run local services today

1. Open the project in Godot 4.3+ (autoload `GameServices` boots platform stack).
2. Run **Main Shell** (`scenes/ui/main_shell.tscn`) — first launch shows privacy gate; Settings has language / cloud / analytics.
3. Saves land in `user://saves/profile_0.json`; “cloud” mirrors in `user://cloud/` via `LocalFileCloudBackend`.
4. Achievements unlock locally through `GameServices.achievements.unlock(id)` / `set_progress`.
5. Leaderboards: `GameServices.leaderboards.submit_daily(moves, time_sec)` caches offline ranks — Leaderboards screen shows **local** Daily/Endless only.
6. World Map → Signal Awakening → authored levels unlock in sequence after clears.
7. Headless tests:

```bash
godot --headless -s res://tests/unit/platform/run_platform_validation.gd
godot --headless -s res://tools/developer/smoke_concept_play_modes.gd
```

---

## Still needs before store submission

| Item | Why |
| --- | --- |
| Steam App ID + GodotSteam (or Steamworks GDExtension) | Fill `SteamPlatformAdapter` extension points; set custom feature `steam` |
| Play Games / Firebase project + Android keystore | Sign APK/AAB; map achievement / leaderboard IDs |
| Apple Team ID, certificates, Game Center IDs | Sign IPA; enable Game Center capability in Xcode |
| Hosted privacy policy + terms URLs | Replace `PrivacyConsent.PRIVACY_POLICY_URL` / `TERMS_URL` (`example.com` placeholders) |
| Sentry DSN or Firebase Crashlytics | Wire in adapter `report_crash` / Analytics flush |
| Final app icon + store listing assets | Replace placeholder under `assets/icons/app/` |
| More campaign chapters | Lattice / Anchor are stubs until authored |
| Store listing assets, age ratings, Deck verification | Follow certification checklists |

**Secrets:** copy `export_credentials.cfg.example` → `export_credentials.cfg` (gitignored). Never commit keystores, `steam_appid.txt` with production secrets, or `google-services.json`.

---

## Doc map

| Doc | Purpose |
| --- | --- |
| [PLATFORM_SERVICES.md](./PLATFORM_SERVICES.md) | Architecture, adapters, analytics events, crash setup, LB plugin hook |
| [SAVE_MIGRATION.md](./SAVE_MIGRATION.md) | Schema versions + migration rules |
| [LOCALIZATION.md](./LOCALIZATION.md) | Translator workflow |
| [PRIVACY.md](./PRIVACY.md) | Data inventory, consent, retention |
| [EXPORTS.md](./EXPORTS.md) | Export presets + plugin wiring + icon paths |
| [PERF_TEST_PLAN.md](./PERF_TEST_PLAN.md) | Scripted perf + headless smoke |
| [CONCEPT_ALIGNMENT.md](./CONCEPT_ALIGNMENT.md) | Vertical-slice concept status |
| [certification/](./certification/) | Steam, Android, iOS, Web, A11y, Privacy checklists |

---

## Architecture sketch

```text
Gameplay / UI
    ↓
GameServices (autoload)
    ├─ PlatformGateway → IPlatformServices adapter (Steam / Play / GC / Web / Null)
    ├─ SaveService + SaveMigrator + CloudMergePolicy
    ├─ AchievementService / LeaderboardService (local until plugin)
    ├─ LocaleService (CSV → TranslationServer) / AnalyticsService / CrashService / PrivacyConsent
    ├─ CampaignLevelCatalog (authored chapter layouts)
    └─ LocalFileCloudBackend (works without SDKs)
```

**Why this shape:** shipping becomes “flip feature flags + install plugin + fill credentials,” not a rewrite of achievement or save call sites.
