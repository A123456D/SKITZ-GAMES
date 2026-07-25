class_name PresserComponent
extends PuzzleComponent
## Marker: this object weights pressure plates and can toggle switches.


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"is_presser":
		return true
	return null
