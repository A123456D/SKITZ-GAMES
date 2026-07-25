# Audio assets

Importable media for SHIFTR. Design & API: `docs/AUDIO_SYSTEM.md`.

| Folder | Contents |
| --- | --- |
| `music/` | Adaptive stems (`stem_ambient`, `stem_bed`, `stem_tension`) + victory/failure stingers |
| `sfx/` | Gameplay / puzzle one-shots |
| `ui/` | Chrome clicks & errors |
| `voice/` | Reserved for VO / a11y narration |
| `default_bus_layout.tres` | Mixer hierarchy (project setting) |

Regenerate placeholders:

```powershell
powershell -ExecutionPolicy Bypass -File tools/developer/generate_audio_assets.ps1
```

Replace any file in place to swap production audio — no code change required if names match the catalog.
