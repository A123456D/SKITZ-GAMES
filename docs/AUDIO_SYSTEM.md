# SHIFTR — Audio System

Production audio architecture for a mobile-first Godot 4.x puzzle game. **Simulation stays pure** — `BoardSim` / `BoardSession` never call audio. All sound is presentation confirmation that supports focus; it never fights puzzle clarity.

**Companions:** GDD §16, `MOVEMENT_FEEL.md`, `SATISFACTION_JUICE.md`, `VISUAL_IDENTITY.md`.

---

## 1. Philosophy

| Pillar | Meaning |
| --- | --- |
| **Premium & sparse** | Soft polymer + glass palette. Confirm intent; escalate only when the board earned it (combo, solve). |
| **Music supports focus** | Ambient / synthwave bed under the puzzle. Tension is a *layer*, not a wall of sound. Victory/failure are short stingers that duck the bed. |
| **Readable beats** | Whoosh → tick → land must stay distinct. No masking UI clicks with music. |
| **One facade** | `Audio` (AudioDirector) owns playback. Feel / Satisfaction / UI call it — no parallel stacks. |
| **Data over code** | New SFX = `AudioEventDef` resource. New stems = drop files under `assets/audio/music/`. |

Anti-patterns we refuse: arcade bleep spam, music louder than settle ticks, sim-driven RNG pitched by seed, unbounded polyphony on mobile.

---

## 2. Bus / mixer hierarchy

```
Master                         ← device / OS master; pause mute on app background
├─ Music (−2 dB headroom)      ← category fader + scripted duck target
│  ├─ Music_Ambient            ← soft pad / room tone stem
│  ├─ Music_Bed                ← synthwave harmonic bed
│  ├─ Music_Tension            ← puzzle-pressure layer
│  └─ Music_Stinger            ← victory / failure one-shots
├─ SFX                         ← gameplay group fader
│  ├─ SFX_Movement             ← whoosh / tick / land
│  ├─ SFX_Puzzle               ← lasers / switches / buttons
│  ├─ SFX_UI                   ← chrome clicks / errors
│  ├─ SFX_Juice                ← combo / sub / solve fanfare
│  ├─ SFX_Particles            ← sparse spark ticks (−1.5 dB)
│  └─ SFX_Game                 ← legacy alias → SFX (Feel compat)
├─ Ambience                    ← optional non-musical room bed
├─ Voice                       ← future VO / a11y narration
└─ Utility                     ← debug meters / editor previews (muted in ship)
```

Layout file: `assets/audio/default_bus_layout.tres` (referenced from `project.godot`).

### Why each bus exists

| Bus | Why |
| --- | --- |
| **Master** | Single OS interruption mute / restore without losing relative balances. |
| **Music** | One fader + duck target so UI modals / stingers can sidechain-duck all stems at once. |
| **Music_*** stems | Independent gains for adaptive layering without swapping whole tracks. |
| **SFX** | Player “SFX volume” slider; children stay relative. |
| **SFX_Movement** | Dense shift spam — isolate so juice/UI never get buried by whoosh polyphony. |
| **SFX_Puzzle** | Mechanic feedback (laser/switch) — distinct from movement so modifiers stay readable. |
| **SFX_UI** | Always audible over music; never ducked by juice. |
| **SFX_Juice** | Escalation / win — can duck music without ducking UI. |
| **SFX_Particles** | Softened so particle spam cannot dominate. |
| **SFX_Game** | Backward-compat send into `SFX` for older Feel wiring. |
| **Ambience** | Non-adaptive room tone when music is off (Zen / settings). |
| **Voice** | Future VO rides above music without competing with SFX groups. |
| **Utility** | Keeps debug tones out of ship mixes. |

Godot has no true compressor sidechain. **DynamicMixer** simulates ducking by temporarily lowering the Music bus dB, then restoring (tokenized so overlapping ducks don’t fight).

---

## 3. Music architecture

### Direction

- **Ambient:** low, slow LFO pads — “signal room.”
- **Synthwave bed:** restrained neon harmonics (not festival EDM) — brand pulse under focus.
- **Tension:** brighter / faster LFO, slightly dissonant interval — fails count, low move budget, near-miss boards.
- **Victory / Failure:** short major / falling stingers on `Music_Stinger`, ducking the bed ~5–8 dB for <1s.

### Adaptive states

| State | Ambient | Bed | Tension | Notes |
| --- | --- | --- | --- | --- |
| `OFF` | 0 | 0 | 0 | Menus with no bed / explicit mute |
| `EXPLORE` | 0.85 | 0.25 | 0 | Boot, zen, early puzzle |
| `THINK` | 0.55 | 0.70 | 0.15 | Active solving |
| `TENSION` | 0.35 | 0.55 | 0.90 | Budget heat / near fail |
| `VICTORY` | 0.40 | 0.35 | 0 | + victory stinger + duck |
| `FAILURE` | 0.50 | 0.20 | 0.25 | + failure stinger + soft duck |

Crossfade: **0.85s** sine in/out (`AdaptiveMusicPlayer.CROSSFADE_SEC`). Stems keep playing while silenced (−80 dB) so re-rise stays gapless.

### Stem ducking rules

1. UI modal open → duck Music **6 dB** while covered; restore on uncover.
2. Victory / failure stinger → duck Music **5–8 dB** for stinger length.
3. Heavy juice (`SFX_Juice` combo peaks) → optional micro-duck **2–3 dB** via event `duck_music_db` (data).
4. Never duck `SFX_UI`.

Intensity hooks (game code → `Audio.music_set_state` / `stem_levels`): fails count, moves-remaining ratio, cascade heat (GDD §16.4). Zen mode forces `EXPLORE` with tension locked at 0.

---

## 4. SFX taxonomy & naming

```
assets/audio/
├── music/
│   ├── stem_ambient.wav      # loop
│   ├── stem_bed.wav          # loop
│   ├── stem_tension.wav      # loop
│   ├── stinger_victory.wav
│   └── stinger_failure.wav
├── sfx/
│   ├── shift_whoosh.wav
│   ├── shift_tick.wav
│   ├── shift_land.wav
│   ├── shift_combo.wav
│   ├── puzzle_solve.wav
│   ├── laser_fire.wav
│   ├── switch_toggle.wav
│   ├── button_press.wav
│   └── particle_spark.wav
├── ui/
│   ├── ui_click.wav
│   └── ui_error.wav
└── voice/                    # reserved
```

**Convention:** `{domain}_{verb}.wav` — domain ∈ `shift|puzzle|laser|switch|ui|particle|stem|stinger`. Event ids mirror filenames without extension (`shift_whoosh`, `laser_fire`).

`AudioEventDef` fields: `id`, `stream`, `bus`, `volume_db`, `pitch_scale`, `pitch_variance`, `spatial`, `max_polyphony`, `cooldown_ms`, `use_combo_pitch`, `duck_music_*`, `procedural_kind`.

Catalog: `resources/configs/audio/default_audio_catalog.tres` (empty → builtins fill at runtime).

---

## 5. Combo / increasing pitch chains

Owner: `ComboPitchTracker` (via `Audio.combo_pitch` / land events with `use_combo_pitch`).

| Knob | Default | Why |
| --- | --- | --- |
| Window | **0.45s** | Matches gapless shift handoff; longer gaps feel like new phrases |
| Step | **+0.055** / hit | Audible climb without cartoon chipmunk |
| Cap | **1.35** | Mobile speakers distort above this |
| Depth cap | **12** | Prevents unbounded state |

**Reset policy**

- Window expired → depth 0 on next hit.
- Undo / rebuild / puzzle exit → hard `combo_reset()`.
- Invalid input does **not** advance pitch (apology thud only).

Land ticks use combo pitch; whoosh beds do not (keeps travel body stable).

---

## 6. Spatial audio (2D puzzle)

`SpatialAudio2D` maps a board-local point + `board_rect` → gentle **pan (±0.72)** and soft **edge atten (−7 dB max)**.

| Kind | Spatial? |
| --- | --- |
| Movement land / whoosh / laser / particles | Yes (board-relative) |
| UI / voice / music / chrome | Mono (pan 0) |
| Reduce-noise a11y | Force mono |

Implementation: pooled `AudioStreamPlayer2D` placed on X by pan for stereo image; UI stays on mono `AudioStreamPlayer`. No 3D listener complexity on mobile portrait.

---

## 7. Dynamic volume / ducking

`DynamicMixer` owns category linears + mutes + OS pause.

| Category | Bus target |
| --- | --- |
| Master / Music / SFX / UI / Juice / Ambience / Voice | Matching buses |

**Mobile OS interruptions:** on `APPLICATION_PAUSE` / focus out, mute Master and stash prior linear; on resume, restore. Prevents blast-after-call and respects iOS/Android audio session handoff.

**Reduce-noise:** softens juice + ambience + music; keeps UI confirmation readable.

---

## 8. Integration map

```
BoardSim / BoardSession          ✗ never touches audio
        ↓ events
BoardFeelController              sets board_rect; reset combo on undo
        ↓ recipes
SatisfactionDirector             FeelAudio.play_* with spatial anchor
        ↓
FeelAudio                        thin adapter → Autoload Audio
        ↓
AudioDirector (Audio)            play_one_shot / play_spatial / music_* / duck
   ├─ AdaptiveMusicPlayer
   ├─ DynamicMixer
   ├─ ComboPitchTracker
   └─ voice pools

UiFeel / MainShell / Showcase    Satisfaction recipes → same FeelAudio path
Puzzle presentation (future)     Audio.play_event(&"laser_fire", {world_pos})
```

**Autoload justification:** Music and mixer must survive `change_scene` (shell → feel demo → shell). Folder structure prefers few Autoloads; audio router is explicitly called out as a good candidate. Name: **`Audio`**. Script: `scripts/managers/audio/audio_director.gd`.

Feel does **not** own a second mixer — only delegates.

---

## 9. Asset pipeline

1. Author or generate placeholders:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools/developer/generate_audio_assets.ps1
   ```
2. Drop replacements at the paths in §4 (same names).
3. For stems, set Godot import **loop** on ambient/bed/tension (runtime also forces loop on `AudioStreamWAV` when loaded by `AdaptiveMusicPlayer`).
4. Or assign streams on `AdaptiveMusicPlayer` / `AudioEventDef.stream` in the inspector.
5. Missing file → `ProceduralSfx` / `ProceduralMusic` builds an in-memory WAV so demos never silent.

OGG/Vorbis is preferred for long music beds in shipping builds; WAVs are fine for short SFX and placeholders.

---

## 10. Accessibility

| Setting | Effect |
| --- | --- |
| Mute Music / SFX / UI | Category mutes on `DynamicMixer` |
| Reduce noise | Softens juice/ambience/music; mono spatial |
| `ShiftFeelConfig.audio_enabled` | Hard gate on Feel routes |
| Frequency | Avoid relying on >8 kHz-only cues; land body has low thud for phone speakers / mild hearing loss |
| Visual confirm | Always pair critical SFX with flash / haptic (see satisfaction matrix) |

---

## 11. Performance (mobile)

| Budget | Value |
| --- | --- |
| Voice pool | 16 mono + 8 spatial |
| Hard voice cap | 24 concurrent |
| Event cooldown | Per-def `cooldown_ms` |
| Music | 3 looping stems + 1 stinger (always) |
| Alloc | No per-swipe `Resource` alloc; pools reuse players |

Low quality tier does not strip audio (clarity confirmation stays). Deep shift chains rely on cooldown + voice steal, not new nodes.

---

## 12. Key files

| Piece | Path |
| --- | --- |
| Design (this) | `docs/AUDIO_SYSTEM.md` |
| Bus layout | `assets/audio/default_bus_layout.tres` |
| AudioDirector | `scripts/managers/audio/audio_director.gd` |
| AdaptiveMusicPlayer | `scripts/managers/audio/adaptive_music_player.gd` |
| DynamicMixer | `scripts/managers/audio/dynamic_mixer.gd` |
| ComboPitchTracker | `scripts/managers/audio/combo_pitch_tracker.gd` |
| SpatialAudio2D | `scripts/managers/audio/spatial_audio_2d.gd` |
| ProceduralMusic | `scripts/managers/audio/procedural_music.gd` |
| AudioEventDef / Catalog | `resources/configs/audio/` |
| Feel adapter | `scripts/presentation/feel/feel_audio.gd` |
| Procedural SFX | `scripts/presentation/feel/procedural_sfx.gd` |
| Asset generator | `tools/developer/generate_audio_assets.ps1` |

---

## 13. How to demo

1. Open `res://scenes/puzzles/shift_feel_demo.tscn` → F6 (main scene already points here).
2. Swipe / Q-E / R-F — hear spatial movement SFX; chain quickly for rising pitch.
3. Music row: **Explore / Think / Tension / Fail** — hear stem crossfades + failure stinger.
4. **Solve juice** — fanfare + victory music state.
5. Optional: `res://scenes/ui/main_shell.tscn` boots Explore bed across scene changes.

---

## 14. Why this shape

- **Stem buses under Music** make adaptive intensity a fader problem, not a playlist problem.
- **Single Autoload facade** prevents Feel vs UI drift and keeps music alive across shells.
- **Event resources** match the EffectRecipe philosophy — content expands without orchestration branches.
- **Scripted ducking** is honest about Godot’s mixer limits and stays deterministic for QA.
- **Procedural fallbacks** keep CI / fresh clones demoable before audio production lands.
