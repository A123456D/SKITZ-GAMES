class_name DoorSystem
extends RefCounted
## Sync door open state from channels; emit open/close events.


static func run(ctx: PuzzleContext) -> void:
	for obj in ctx.world.objects_with(&"door"):
		var door: DoorComponent = obj.get_component(&"door") as DoorComponent
		if door == null:
			continue
		var was_open := door.open
		if door.sync_from_channels(ctx):
			var kind := PuzzleEvent.Kind.DOOR_OPENED if door.open else PuzzleEvent.Kind.DOOR_CLOSED
			ctx.emit(
				PuzzleEvent.make(kind, obj.cell)
				.with_uid(obj.uid)
				.with_channel(door.channel)
				.with_payload({"open": door.open, "was_open": was_open})
			)
			ctx.emit(
				PuzzleEvent.make(PuzzleEvent.Kind.BLOCKING_CHANGED, obj.cell)
				.with_uid(obj.uid)
				.with_payload({"blocking": door.is_blocking()})
			)
