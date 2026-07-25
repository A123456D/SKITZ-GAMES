class_name LaserSystem
extends RefCounted
## Propagate beams O(emitters * path_cap). Mirrors redirect; receivers arm channels.


static func run(ctx: PuzzleContext) -> void:
	## Clear previous receiver hits this pass (ephemeral via channel clear already).
	var receivers := ctx.world.objects_with(&"laser_receiver")
	var hit_uids: Dictionary = {} ## uid → color

	for emitter_obj in ctx.world.objects_with(&"laser_emitter"):
		var emitter: LaserEmitterComponent = emitter_obj.get_component(&"laser_emitter") as LaserEmitterComponent
		if emitter == null or not emitter.is_enabled(ctx):
			continue
		var path: Array = [] ## Array[Vector2i]
		var dir := emitter.dir
		var cell := emitter_obj.cell
		var steps := 0
		var max_len := emitter.max_length
		while steps < max_len:
			var vec := PuzzleEnums.dir_to_vec(dir)
			cell = Vector2i(cell.x + vec.x, cell.y + vec.y)
			if not ctx.in_bounds(cell):
				break
			path.append(cell)
			steps += 1
			var floor_obj := ctx.world.get_floor_at(cell)
			var occ := ctx.get_object_at(cell)
			## Mirror on occupant or floor
			var mirror_host: PuzzleObject = null
			if occ and occ.has_component(&"mirror"):
				mirror_host = occ
			elif floor_obj and floor_obj.has_component(&"mirror"):
				mirror_host = floor_obj
			if mirror_host:
				var mirror: MirrorComponent = mirror_host.get_component(&"mirror") as MirrorComponent
				dir = mirror.reflect(dir)
				continue
			## Receiver
			var recv_host: PuzzleObject = null
			if occ and occ.has_component(&"laser_receiver"):
				recv_host = occ
			elif floor_obj and floor_obj.has_component(&"laser_receiver"):
				recv_host = floor_obj
			if recv_host:
				var recv: LaserReceiverComponent = recv_host.get_component(&"laser_receiver") as LaserReceiverComponent
				if recv and recv.accepts(emitter.beam_color):
					hit_uids[recv_host.uid] = emitter.beam_color
					if recv.absorb:
						break
					continue
			## Blocking?
			if occ and _blocks_laser(ctx, occ):
				break
			if floor_obj and _blocks_laser(ctx, floor_obj):
				break

		ctx.emit(
			PuzzleEvent.make(PuzzleEvent.Kind.LASER_BEAM, emitter_obj.cell)
			.with_uid(emitter_obj.uid)
			.with_payload({
				"color": String(emitter.beam_color),
				"dir": emitter.dir,
				"path": _path_to_array(path),
			})
		)

	for recv_obj in receivers:
		var recv: LaserReceiverComponent = recv_obj.get_component(&"laser_receiver") as LaserReceiverComponent
		if recv == null:
			continue
		var color: StringName = hit_uids.get(recv_obj.uid, &"")
		var is_hit := hit_uids.has(recv_obj.uid)
		recv.set_hit(ctx, is_hit, color)


static func _blocks_laser(ctx: PuzzleContext, obj: PuzzleObject) -> bool:
	var q: Variant = obj.query(ctx, &"blocks_laser", {})
	if q != null:
		return bool(q)
	q = obj.query(ctx, &"blocks_movement", {})
	return bool(q) if q != null else false


static func _path_to_array(path: Array) -> Array:
	var out: Array = []
	for p in path:
		var v: Vector2i = p
		out.append([v.x, v.y])
	return out
