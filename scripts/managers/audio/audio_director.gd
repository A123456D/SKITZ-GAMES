class_name AudioDirector
extends Node
## Single presentation facade for SHIFTR audio.
## Autoload as `Audio` so music / mixer survive scene changes (see docs/AUDIO_SYSTEM.md).
## Never called from BoardSim — feel / UI / puzzle presentation only.

signal event_played(id: StringName)
signal music_state_changed(state: AdaptiveMusicPlayer.MusicState)

const POOL_SIZE := 16
const MAX_VOICES := 24

@export var catalog: AudioCatalog

var mixer: DynamicMixer
var music: AdaptiveMusicPlayer
var combo: ComboPitchTracker

var _pool: Array[AudioStreamPlayer] = []
var _spatial_pool: Array[AudioStreamPlayer2D] = []
var _spatial_root: Node2D = null
var _cooldown_until: Dictionary = {} # StringName -> float sec
var _voice_count: int = 0
var _board_rect := Rect2()
var _feel: ShiftFeelConfig = null
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	process_mode = Node.PROCESS_MODE_ALWAYS
	if catalog == null:
		catalog = AudioCatalog.load_or_builtin()
	else:
		catalog.rebuild_index()
	mixer = get_node_or_null("DynamicMixer") as DynamicMixer
	if mixer == null:
		mixer = DynamicMixer.new()
		mixer.name = "DynamicMixer"
		add_child(mixer)
	music = get_node_or_null("AdaptiveMusic") as AdaptiveMusicPlayer
	if music == null:
		music = AdaptiveMusicPlayer.new()
		music.name = "AdaptiveMusic"
		add_child(music)
	music.configure(mixer)
	if not music.state_changed.is_connected(_on_music_state):
		music.state_changed.connect(_on_music_state)
	combo = ComboPitchTracker.new()
	_ensure_pools()
	mixer.apply_all()


func configure_feel(feel: ShiftFeelConfig) -> void:
	_feel = feel
	if feel == null:
		return
	if mixer:
		mixer.sfx_linear = feel.sfx_volume
		mixer.apply_all()


func set_board_rect(rect: Rect2) -> void:
	_board_rect = rect


func play_one_shot(id: StringName, opts: Dictionary = {}) -> void:
	_play(id, opts, false)


func play_spatial(id: StringName, world_pos: Vector2, opts: Dictionary = {}) -> void:
	opts = opts.duplicate()
	opts["world_pos"] = world_pos
	opts["force_spatial"] = true
	_play(id, opts, true)


func play_event(id: StringName, opts: Dictionary = {}) -> void:
	var force_spatial := bool(opts.get("force_spatial", false)) or opts.has("world_pos")
	_play(id, opts, force_spatial)


func music_set_state(state: AdaptiveMusicPlayer.MusicState, immediate: bool = false) -> void:
	if music:
		music.set_state(state, immediate)


func stem_levels(ambient: float, bed: float, tension: float, immediate: bool = false) -> void:
	if music:
		music.stem_levels(ambient, bed, tension, immediate)


func combo_pitch(hit: bool = true) -> float:
	if hit:
		return combo.hit()
	return combo.peek_pitch()


func combo_reset() -> void:
	combo.on_interrupt()


func duck(amount_db: float, duration_ms: float) -> void:
	if mixer:
		mixer.duck_music(amount_db, duration_ms)


func set_category_volume(cat: DynamicMixer.Category, linear: float) -> void:
	if mixer:
		mixer.set_category_linear(cat, linear)


func set_mute(cat: DynamicMixer.Category, muted: bool) -> void:
	if mixer:
		mixer.set_mute(cat, muted)


func set_reduce_noise(on: bool) -> void:
	if mixer:
		mixer.set_reduce_noise(on)


func is_audio_enabled() -> bool:
	return _feel == null or _feel.audio_enabled


func _play(id: StringName, opts: Dictionary, spatial: bool) -> void:
	if not is_audio_enabled():
		return
	if catalog == null:
		catalog = AudioCatalog.load_or_builtin()
	var ev := catalog.get_event(id)
	if ev == null:
		# Graceful: build ephemeral def from procedural kind aliases.
		ev = _fallback_event(id)
		if ev == null:
			return
	var now := Time.get_ticks_msec() * 0.001
	var until: float = float(_cooldown_until.get(id, 0.0))
	if until > now:
		return
	if ev.cooldown_ms > 0.0:
		_cooldown_until[id] = now + ev.cooldown_ms * 0.001
	if _voice_count >= MAX_VOICES:
		return

	var stream := _resolve_stream(ev)
	if stream == null:
		return

	var pitch := ev.pitch_scale + float(opts.get("pitch_bias", 0.0))
	if ev.use_combo_pitch or bool(opts.get("combo", false)):
		var cp: float
		if bool(opts.get("combo_hit", true)):
			cp = combo.hit(now)
		else:
			cp = combo.peek_pitch(now)
		pitch = cp + float(opts.get("pitch_bias", 0.0))
	var variance := ev.pitch_variance
	if _feel:
		variance = maxf(variance, _feel.pitch_variance * 0.5)
	pitch += _rng.randf_range(-variance, variance)
	pitch = clampf(pitch, 0.5, combo.pitch_cap if combo else 1.5)

	var volume_db := ev.volume_db + float(opts.get("volume_db", 0.0))
	var pan := 0.0
	var use_spatial := spatial or (ev.spatial and SpatialAudio2D.should_spatialize(
		ev.category, mixer.reduce_noise if mixer else false
	))
	if use_spatial and opts.has("world_pos"):
		var sp := SpatialAudio2D.from_board_point(opts["world_pos"] as Vector2, _board_rect)
		pan = float(sp["pan"])
		volume_db += float(sp["volume_db"])
	elif use_spatial and opts.has("normalized"):
		var n: Vector2 = opts["normalized"]
		var sp2 := SpatialAudio2D.from_normalized(n.x, n.y)
		pan = float(sp2["pan"])
		volume_db += float(sp2["volume_db"])

	if use_spatial and absf(pan) > 0.001:
		_play_spatial_voice(stream, String(ev.bus), volume_db, pitch, pan)
	else:
		_play_mono_voice(stream, String(ev.bus), volume_db, pitch)

	if ev.duck_music_db > 0.0 and mixer:
		mixer.duck_music(ev.duck_music_db, ev.duck_ms)
	event_played.emit(id)


func _play_mono_voice(stream: AudioStream, bus: String, volume_db: float, pitch: float) -> void:
	var p := _acquire_mono()
	if p == null:
		return
	p.stream = stream
	p.bus = bus
	p.volume_db = volume_db
	p.pitch_scale = maxf(0.5, pitch)
	p.play()
	_voice_count += 1
	_schedule_release(p, stream)


func _play_spatial_voice(
	stream: AudioStream, bus: String, volume_db: float, pitch: float, pan: float
) -> void:
	var p := _acquire_spatial()
	if p == null:
		_play_mono_voice(stream, bus, volume_db, pitch)
		return
	_ensure_spatial_root()
	var center := _board_rect.get_center() if _board_rect.size != Vector2.ZERO else Vector2.ZERO
	if center == Vector2.ZERO:
		var vp := get_viewport()
		if vp:
			center = vp.get_visible_rect().get_center()
	_spatial_root.global_position = center
	p.stream = stream
	p.bus = bus
	p.volume_db = volume_db
	p.pitch_scale = maxf(0.5, pitch)
	p.position = Vector2(pan * 280.0, 0.0)
	p.max_distance = 1200.0
	p.attenuation = 0.55
	p.play()
	_voice_count += 1
	_schedule_release_spatial(p, stream)


func _schedule_release(p: AudioStreamPlayer, stream: AudioStream) -> void:
	var dur := _stream_length(stream) / maxf(p.pitch_scale, 0.5) + 0.05
	get_tree().create_timer(dur).timeout.connect(
		func() -> void:
			if is_instance_valid(p):
				p.stop()
			_voice_count = maxi(0, _voice_count - 1)
	)


func _schedule_release_spatial(p: AudioStreamPlayer2D, stream: AudioStream) -> void:
	var dur := _stream_length(stream) / maxf(p.pitch_scale, 0.5) + 0.05
	get_tree().create_timer(dur).timeout.connect(
		func() -> void:
			if is_instance_valid(p):
				p.stop()
			_voice_count = maxi(0, _voice_count - 1)
	)


func _stream_length(stream: AudioStream) -> float:
	if stream == null:
		return 0.2
	if stream is AudioStreamWAV:
		var w := stream as AudioStreamWAV
		var samples := w.data.size() / (2 if not w.stereo else 4)
		if w.format == AudioStreamWAV.FORMAT_8_BITS:
			samples = w.data.size() / (1 if not w.stereo else 2)
		return float(samples) / float(maxi(1, w.mix_rate))
	if stream.has_method("get_length"):
		var L: float = stream.get_length()
		if L > 0.0:
			return L
	return 0.25


func _resolve_stream(ev: AudioEventDef) -> AudioStream:
	if ev.stream:
		return ev.stream
	if ev.procedural_kind != "":
		var kind := _kind_from_string(ev.procedural_kind)
		if kind >= 0:
			return ProceduralSfx.make(kind as ProceduralSfx.Kind)
	return null


func _kind_from_string(name: String) -> int:
	match name.to_upper():
		"WHOOSH":
			return ProceduralSfx.Kind.WHOOSH
		"TICK":
			return ProceduralSfx.Kind.TICK
		"LAND":
			return ProceduralSfx.Kind.LAND
		"COMBO":
			return ProceduralSfx.Kind.COMBO
		"SUB":
			return ProceduralSfx.Kind.SUB
		"UI":
			return ProceduralSfx.Kind.UI
		"SOLVE":
			return ProceduralSfx.Kind.SOLVE
		"ERROR":
			return ProceduralSfx.Kind.ERROR
		"LASER":
			return ProceduralSfx.Kind.LASER
		"SWITCH":
			return ProceduralSfx.Kind.SWITCH
		"BUTTON":
			return ProceduralSfx.Kind.BUTTON
		"PARTICLE":
			return ProceduralSfx.Kind.PARTICLE
		_:
			return -1


func _fallback_event(id: StringName) -> AudioEventDef:
	# Map feel aliases used before catalog expand.
	var map := {
		&"shift_whoosh": "WHOOSH",
		&"shift_tick": "TICK",
		&"shift_land": "LAND",
		&"shift_combo": "COMBO",
		&"shift_sub": "SUB",
		&"ui_click": "UI",
		&"ui_error": "ERROR",
		&"puzzle_solve": "SOLVE",
	}
	if not map.has(id):
		return null
	var e := AudioEventDef.new()
	e.id = id
	e.procedural_kind = String(map[id])
	e.bus = &"SFX_Movement"
	if id == &"ui_click" or id == &"ui_error":
		e.bus = &"SFX_UI"
	elif id == &"shift_combo" or id == &"puzzle_solve" or id == &"shift_sub":
		e.bus = &"SFX_Juice"
	e.use_combo_pitch = id == &"shift_land" or id == &"shift_combo"
	return e


func _ensure_pools() -> void:
	_ensure_spatial_root()
	while _pool.size() < POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.name = "Voice_%d" % _pool.size()
		p.bus = "SFX_Movement"
		add_child(p)
		_pool.append(p)
	while _spatial_pool.size() < POOL_SIZE / 2:
		var p2 := AudioStreamPlayer2D.new()
		p2.name = "Spatial_%d" % _spatial_pool.size()
		p2.bus = "SFX_Movement"
		_spatial_root.add_child(p2)
		_spatial_pool.append(p2)


func _ensure_spatial_root() -> void:
	if _spatial_root and is_instance_valid(_spatial_root):
		return
	_spatial_root = get_node_or_null("SpatialRoot") as Node2D
	if _spatial_root == null:
		_spatial_root = Node2D.new()
		_spatial_root.name = "SpatialRoot"
		add_child(_spatial_root)


func _acquire_mono() -> AudioStreamPlayer:
	for p in _pool:
		if is_instance_valid(p) and not p.playing:
			return p
	# Steal oldest finished preference — reuse first.
	if not _pool.is_empty():
		return _pool[0]
	return null


func _acquire_spatial() -> AudioStreamPlayer2D:
	for p in _spatial_pool:
		if is_instance_valid(p) and not p.playing:
			return p
	if not _spatial_pool.is_empty():
		return _spatial_pool[0]
	return null


func _on_music_state(state: AdaptiveMusicPlayer.MusicState) -> void:
	music_state_changed.emit(state)
