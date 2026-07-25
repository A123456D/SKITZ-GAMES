class_name IceComponent
extends PuzzleComponent
## Floor: movables that land with momentum keep sliding until blocked.


func on_query(ctx: PuzzleContext, query_id: StringName, args: Dictionary) -> Variant:
	if query_id == &"is_ice":
		return true
	return null
