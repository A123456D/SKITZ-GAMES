class_name ChannelSystem
extends RefCounted
## Recompute ephemeral channel strengths from plates / pulse switches / prior latches.


static func run(ctx: PuzzleContext) -> void:
	ctx.channels.clear_ephemeral()
	## Restick latches are kept; re-apply switch start latches via component state.
	for obj in ctx.world.objects_with(&"switch"):
		var sw: SwitchComponent = obj.get_component(&"switch") as SwitchComponent
		if sw == null:
			continue
		if sw.toggle and sw.activated:
			ctx.channels.set_latch(sw.channel, true)
		sw.apply_pulse(ctx)
	for obj in ctx.world.objects_with(&"pressure_plate"):
		var plate: PressurePlateComponent = obj.get_component(&"pressure_plate") as PressurePlateComponent
		if plate:
			plate.evaluate(ctx)
