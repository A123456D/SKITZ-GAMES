# scripts/services/

Platform-facing production services. Prefer composition via `GameServices` autoload over adding more Autoloads.

| Area | Path |
| --- | --- |
| Gateway + adapters | `platform/` |
| Save + migrator | `save/` |
| Meta | `achievement_service.gd`, `leaderboard_service.gd` |
| Locale / privacy / telemetry | `locale_service.gd`, `privacy_consent.gd`, `analytics_*.gd`, `crash_service.gd` |
| Controller helpers | `controller_nav.gd`, `input_remap_profile.gd` |

See `docs/PLATFORM_SERVICES.md` and `docs/RELEASE_READINESS.md`.
