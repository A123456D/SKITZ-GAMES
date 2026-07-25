class_name MagnetComponent
extends PuzzleComponent
## Attracts or repels tagged movables along a row or column within range.

var polarity: int = PuzzleEnums.MagnetPolarity.ATTRACT
var axis: StringName = &"row" ## row | col | both
var range_cells: int = 8
var target_tag: StringName = &"magnetic"
var strength: int = 1 ## steps to pull/push per resolve pass


func _on_setup() -> void:
	polarity = get_param_int("polarity", PuzzleEnums.MagnetPolarity.ATTRACT)
	axis = get_param_string_name("axis", &"row")
	range_cells = get_param_int("range_cells", 8)
	target_tag = get_param_string_name("target_tag", &"magnetic")
	strength = maxi(1, get_param_int("strength", 1))


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"is_magnet":
		return true
	return null
