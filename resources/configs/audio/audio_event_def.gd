class_name AudioEventDef
extends Resource
## Data-driven one-shot / layered SFX definition. New sounds = new .tres, not new code.

@export var id: StringName = &""
@export var stream: AudioStream
@export var bus: StringName = &"SFX_Movement"
@export_range(-48.0, 6.0, 0.1) var volume_db: float = 0.0
@export_range(0.5, 2.0, 0.01) var pitch_scale: float = 1.0
@export_range(0.0, 0.35, 0.01) var pitch_variance: float = 0.04
@export var spatial: bool = false
@export_range(1, 12, 1) var max_polyphony: int = 4
@export_range(0.0, 500.0, 1.0) var cooldown_ms: float = 0.0
@export var use_combo_pitch: bool = false
@export_range(0.0, 18.0, 0.5) var duck_music_db: float = 0.0
@export_range(0.0, 2000.0, 10.0) var duck_ms: float = 0.0
@export var category: StringName = &"sfx"
## Optional ProceduralSfx kind name used when stream is null / file missing.
@export var procedural_kind: String = ""
