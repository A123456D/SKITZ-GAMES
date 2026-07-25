# Exports

Templates live in `export_presets.cfg`. Placeholders use `YOUR_STUDIO` / `YOUR_TEAM_ID`. Secrets go in **gitignored** `export_credentials.cfg` (see `.example`).

## Presets

| Preset | Platform | Notes |
| --- | --- | --- |
| Steam Windows | Windows Desktop | `custom_features=steam`; embed PCK; x86_64 |
| Android | Android | Gradle build; arm64-v8a; INTERNET + VIBRATE |
| iOS | iOS | Bundle id + team placeholders; Game Center in Xcode |
| Web | Web | PWA enabled; portrait orientation; virtual keyboard |

Exclude filters strip `tests/`, `tools/`, `docs/`, `exports/` from release packs.

## Credentials workflow

1. Copy `export_credentials.cfg.example` → `export_credentials.cfg`.
2. Fill keystore paths/passwords, Steam app id, Sentry DSN, etc.
3. Point Godot Android release keystore fields at those values (or CI injects env vars).
4. Never commit `export_credentials.cfg`, `*.keystore`, `google-services.json`, `GoogleService-Info.plist`.

## Mobile project settings (already / to verify)

| Setting | Value | Why |
| --- | --- | --- |
| Orientation | Portrait primary (`window/handheld/orientation=1`) | GDD mobile-first |
| Stretch | `canvas_items` + `expand` + `fractional` | Safe multi-aspect + hiDPI |
| Allow HiDPI | `true` | Retina / Windows DPI-aware |
| Renderer | `mobile` | GPU budget |
| Physics Hz | 20 | No RigidBody gameplay |

See also [RESPONSIVE.md](./RESPONSIVE.md) for breakpoints, safe areas, and touch targets.

iOS / Android: set unique package / bundle id before first store upload; bump `version/code` (Android) and build number (iOS) every upload.

## Plugin wiring (exact steps)

### Steam (Windows / Linux / macOS)

1. Create Steamworks app; note **App ID**.
2. Install GodotSteam (or Steamworks GDExtension) under `addons/` per plugin docs matching Godot **4.3**.
3. Enable plugin; ship `steam_appid.txt` only in local/dev (gitignored) or rely on Steam client.
4. Export with preset **Steam Windows** (`custom_features=steam` → `PlatformGateway` picks Steam adapter).
5. Implement `SteamPlatformAdapter._steam_available` / `_steam_unlock` / cloud file APIs using the plugin’s class API.
6. Upload build via SteamPipe; complete [certification/steam.md](./certification/steam.md).

### Android / Google Play

1. Create Play Console app + Play Games Services project; create achievements / leaderboards matching GDD ids.
2. Generate upload keystore; store outside repo.
3. Export **Android** AAB (`gradle_build/export_format` as needed).
4. Add Play Games plugin; implement `GooglePlayPlatformAdapter._play_*`.
5. Optional: Firebase for Analytics/Crashlytics — add `google-services.json` via CI secret, not git.

### iOS / Game Center

1. Apple Developer app id + Game Center capability.
2. Export **iOS** from Godot → open Xcode project → signing team.
3. Enable Game Center; create leaderboard/achievement IDs in App Store Connect.
4. Implement `GameCenterPlatformAdapter._gc_*` via GodotGameCenter or native bridge.
5. Test on device; TestFlight before review.

### Web / itch / PWA

1. Export **Web** to `exports/web/`.
2. Host on HTTPS (required for PWA / storage persistence).
3. itch.io: upload folder as HTML5 game; set sharedArrayBuffer / COOP headers if Godot version requires threads.
4. Cloud = `user://` via IDBFS — warn players that clearing site data wipes saves unless you add a remote backend later.
5. **SKITZ site (Pulsefold):** rebuild PulseFold (`npm run build` in `PulseFold/`) and copy `dist/*` into `website/public/games/pulsefold/web/`. Pulsefold is **not** a Godot export. See [website/README.md](../website/README.md).

## Icon / splash

| Path | Use |
| --- | --- |
| `assets/icons/app/icon_1024.png` | Project icon (`application/config/icon` in `project.godot`) + desktop export default |
| `assets/icons/app/README.md` | Replace-before-store checklist |

Assign platform-specific icons in each export preset before certification screenshots. Placeholder art is not final store branding.
