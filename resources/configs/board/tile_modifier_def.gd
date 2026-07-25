class_name TileModifierDef
extends Resource
## Data-driven modifier definition. Gameplay systems resolve behavior by `id`.
## Core shift/rotate never hardcodes modifier effects — modes opt in via composition.

@export var id: StringName = &""
@export var display_name: String = ""
@export_multiline var description: String = ""
## Free-form tunables (duration, axis, intensity, …) consumed by mode systems.
@export var params: Dictionary = {}
