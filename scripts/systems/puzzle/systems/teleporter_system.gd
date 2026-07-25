class_name TeleporterSystem
extends RefCounted
## Movables on a pad teleport to the linked pad if cooldown allows.


static func run(ctx: PuzzleContext) -> void:
	var pads := ctx.world.objects_with(&"teleporter")
	## link_id → Array[PuzzleObject]
	var by_link: Dictionary = {}
	for pad in pads:
		var tp: TeleporterComponent = pad.get_component(&"teleporter") as TeleporterComponent
		if tp == null:
			continue
		if not by_link.has(tp.link_id):
			by_link[tp.link_id] = []
		by_link[tp.link_id].append(pad)

	for link_id in by_link.keys():
		var group: Array = by_link[link_id]
		if group.size() < 2:
			continue
		## Deterministic pairing: sort by uid, pair [0]↔[1], [2]↔[3], …
		group.sort_custom(func(a: PuzzleObject, b: PuzzleObject) -> bool: return String(a.uid) < String(b.uid))
		for i in range(0, group.size() - 1, 2):
			var a: PuzzleObject = group[i]
			var b: PuzzleObject = group[i + 1]
			_try_teleport(ctx, a, b)
			var tp_b: TeleporterComponent = b.get_component(&"teleporter") as TeleporterComponent
			if tp_b and tp_b.bidirectional:
				_try_teleport(ctx, b, a)


static func _try_teleport(ctx: PuzzleContext, from_pad: PuzzleObject, to_pad: PuzzleObject) -> void:
	var tp: TeleporterComponent = from_pad.get_component(&"teleporter") as TeleporterComponent
	if tp == null or tp.cooldown_left > 0:
		return
	var occ := ctx.get_object_at(from_pad.cell)
	if occ == null or occ.uid == from_pad.uid:
		return
	if not occ.has_component(&"movable") and not occ.has_component(&"actor") and not occ.has_component(&"presser"):
		return
	## Destination must be free of other occupants (pad itself may be floor).
	var dest_occ := ctx.get_object_at(to_pad.cell)
	if dest_occ != null and dest_occ.uid != to_pad.uid:
		return
	ctx.request_move(occ.uid, to_pad.cell, &"teleport")
	tp.cooldown_left = tp.cooldown_ticks
	var tp_to: TeleporterComponent = to_pad.get_component(&"teleporter") as TeleporterComponent
	if tp_to:
		tp_to.cooldown_left = tp_to.cooldown_ticks
