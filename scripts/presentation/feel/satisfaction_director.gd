class_name SatisfactionDirector
extends Node
## Plays EffectRecipe resources against camera / tile / UI / audio / time layers.
## Shared vocabulary for BoardFeelController and UiFeel.

signal recipe_played(id: StringName, recipe: EffectRecipe)

@export var catalog: SatisfactionCatalog
@export var feel: ShiftFeelConfig
@export var quality: VisualQualityConfig

var juice_camera: JuiceCamera = null
var audio: FeelAudio = null
var haptics: FeelHaptics = null
var hit_stop: HitStopClock = null
var board_view: BoardView = null
var visual_director: VisualDirector = null

## Optional: Callable(positions: Array, amount: int, is_wrap: bool) for particle bursts.
var particle_emitter: Callable = Callable()

var _chain_depth: int = 0


func setup(
	p_feel: ShiftFeelConfig,
	p_catalog: SatisfactionCatalog = null,
	p_quality: VisualQualityConfig = null
) -> void:
	feel = p_feel if p_feel else ShiftFeelConfig.new()
	catalog = p_catalog if p_catalog else SatisfactionCatalog.load_or_builtin()
	quality = p_quality
	_ensure_hit_stop()
	hit_stop.configure(feel)
	if audio:
		audio.configure(feel)
	if haptics:
		haptics.configure(feel)
	if juice_camera:
		juice_camera.configure(feel)


func bind_layers(
	p_camera: JuiceCamera = null,
	p_audio: FeelAudio = null,
	p_haptics: FeelHaptics = null,
	p_board: BoardView = null,
	p_director: VisualDirector = null
) -> void:
	if p_camera:
		juice_camera = p_camera
	if p_audio:
		audio = p_audio
	if p_haptics:
		haptics = p_haptics
	if p_board:
		board_view = p_board
	if p_director:
		visual_director = p_director
		if visual_director.quality:
			quality = visual_director.quality


func set_chain_depth(depth: int) -> void:
	_chain_depth = maxi(0, depth)


func play(id: StringName, ctx: Dictionary = {}) -> EffectRecipe:
	if catalog == null:
		catalog = SatisfactionCatalog.load_or_builtin()
	var recipe := catalog.get_recipe(id)
	if recipe == null:
		return null
	# Deep chains use compressed land path.
	if id == &"land_settle" and _chain_depth >= 2:
		var chain := catalog.get_recipe(&"chain_queue")
		if chain:
			recipe = chain
	_apply(recipe, ctx)
	recipe_played.emit(id, recipe)
	return recipe


func play_recipe(recipe: EffectRecipe, ctx: Dictionary = {}) -> void:
	if recipe == null:
		return
	_apply(recipe, ctx)
	recipe_played.emit(recipe.id, recipe)


func _ensure_hit_stop() -> void:
	if hit_stop and is_instance_valid(hit_stop):
		return
	hit_stop = get_node_or_null("HitStopClock") as HitStopClock
	if hit_stop == null:
		hit_stop = HitStopClock.new()
		hit_stop.name = "HitStopClock"
		add_child(hit_stop)


func _apply(recipe: EffectRecipe, ctx: Dictionary) -> void:
	var reduce := feel != null and feel.reduce_motion
	var dir: Vector2 = ctx.get("direction", Vector2.RIGHT)
	var targets: Array = ctx.get("targets", [])
	var positions: Array = ctx.get("positions", [])
	var scale := recipe.intensity_scale()
	var queue_busy := bool(ctx.get("queue_busy", false))

	# --- Time ---
	if not reduce and recipe.hit_stop_ms > 0.0 and hit_stop:
		var ms := recipe.hit_stop_ms
		if _chain_depth >= 2:
			ms *= 0.45
		hit_stop.request(ms * 0.001, recipe.hit_stop_time_scale)

	# --- Camera ---
	if juice_camera and feel:
		if recipe.nudge_opposite_first and recipe.anticipation and not reduce and not queue_busy:
			juice_camera.nudge(-dir, maxf(2.0, feel.nudge_pixels * 0.55))
		if recipe.nudge_pixels != 0.0:
			var n := feel.nudge_pixels if recipe.nudge_pixels < 0.0 else recipe.nudge_pixels
			if n > 0.0 and not reduce:
				juice_camera.nudge(dir, n * scale)
		if recipe.trauma > 0.0:
			juice_camera.add_trauma(recipe.trauma * scale, dir)
		if recipe.zoom_pulse > 0.0 and not reduce and (feel == null or not feel.disable_zoom_pulse):
			if _chain_depth < 2:
				juice_camera.pulse_zoom(recipe.zoom_pulse * scale, recipe.zoom_pulse_sec())

	# --- Motion deform on targets ---
	if not reduce:
		for t in targets:
			if not (t is CanvasItem):
				continue
			var item := t as CanvasItem
			if recipe.anticipation and not queue_busy:
				var ant := recipe.anticipation_scale
				if ctx.has("direction"):
					ant = MotionDeform.axis_anticipation(dir, 0.03)
				MotionDeform.play_anticipation(item, ant, recipe.anticipation_sec())
			if recipe.squash:
				var sq := recipe.squash_scale
				if ctx.has("direction") and recipe.squash_scale == Vector2(1.05, 0.95):
					sq = MotionDeform.axis_squash(dir, 0.05)
				MotionDeform.play_squash(
					item,
					sq,
					recipe.squash_sec(),
					recipe.follow_through,
					recipe.follow_through_sec()
				)
			if recipe.secondary_motion and item is BoardTileView:
				var tile := item as BoardTileView
				tile.set_meta("last_move_dir", dir)
				tile.pulse_secondary(dir)
			if recipe.glow_pulse:
				GlowPulse.pulse_modulate(item, recipe.glow_strength * scale, recipe.glow_sec())

	# Board-wide glow when no explicit targets (solve / achievement).
	if recipe.glow_pulse and targets.is_empty() and board_view and not reduce:
		for child in board_view.get_children():
			if child is BoardTileView:
				GlowPulse.pulse_modulate(child, recipe.glow_strength * 0.55 * scale, recipe.glow_sec())

	# --- Particles ---
	var wants_fx := feel == null or feel.wants_particles()
	if quality and quality.tier == VisualQualityConfig.Tier.LOW:
		wants_fx = wants_fx and recipe.intensity == EffectRecipe.Intensity.HEAVY
	if recipe.particles and wants_fx:
		var screen_pos: Vector2 = ctx.get("screen_pos", Vector2.ZERO)
		if not positions.is_empty() and particle_emitter.is_valid():
			var amount := recipe.particle_amount
			if amount < 0 and feel:
				amount = feel.wrap_burst_amount if recipe.wrap_particles else feel.land_burst_amount
			if amount < 0:
				amount = 12
			amount = int(round(float(amount) * scale))
			particle_emitter.call(positions, amount, recipe.wrap_particles or bool(ctx.get("any_wrap", false)))
		elif visual_director and screen_pos != Vector2.ZERO:
			visual_director.spawn_ui_confirm(screen_pos)

	# --- Audio (FeelAudio → AudioDirector; presentation only) ---
	if audio and (feel == null or feel.audio_enabled):
		var world_pos := _audio_anchor(positions, ctx)
		if recipe.audio_whoosh:
			audio.play_whoosh(world_pos)
		if recipe.audio_tick:
			audio.play_tick(world_pos)
		if recipe.audio_land:
			audio.play_land(float(ctx.get("pitch_bias", 0.0)), world_pos)
		if recipe.audio_sub:
			audio.play_sub()
		if recipe.audio_combo:
			audio.play_combo(world_pos)
		if recipe.audio_ui:
			audio.play_ui()
		if recipe.audio_solve:
			audio.play_solve()
		if recipe.audio_error:
			audio.play_error()

	# --- Haptics ---
	if haptics:
		match recipe.haptic:
			1:
				haptics.pulse_light()
			2:
				haptics.pulse_medium()
			3:
				haptics.pulse_heavy()
			_:
				pass


func _audio_anchor(positions: Array, ctx: Dictionary) -> Vector2:
	if ctx.has("world_pos") and ctx["world_pos"] is Vector2:
		return ctx["world_pos"] as Vector2
	if positions.is_empty():
		return Vector2.INF
	var sum := Vector2.ZERO
	var n := 0
	for p in positions:
		if p is Vector2:
			sum += p as Vector2
			n += 1
	if n == 0:
		return Vector2.INF
	return sum / float(n)
