class_name TileOccupantDef
extends Resource
## Data-driven occupant / tile-type definition. Board cells store `id` only;
## visuals and cascade rules look up this Resource from a catalog.

@export var id: StringName = &""
@export var display_name: String = ""
@export var match_group: StringName = &"" ## Cascade grouping key; empty = use id
@export var blocks_shift: bool = false ## Rare; prefer TileStateFlags.LOCKED on the cell
@export var params: Dictionary = {}
