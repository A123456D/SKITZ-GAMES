class_name LeaderboardEntryDef
extends Resource

@export var rank: int = 1
@export var player_name: String = ""
@export var moves: int = 0
@export var time_sec: float = 0.0
@export var is_self: bool = false
@export var is_friend: bool = false


func time_label() -> String:
	var m := int(time_sec) / 60
	var s := int(time_sec) % 60
	var ms := int((time_sec - floor(time_sec)) * 100.0)
	if m > 0:
		return "%d:%02d.%02d" % [m, s, ms]
	return "%d.%02ds" % [s, ms]
