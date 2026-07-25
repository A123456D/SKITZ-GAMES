class_name FeelAudio
extends Node
## Feel-layer SFX adapter. Routes through Autoload `Audio` (AudioDirector) —
## no parallel audio stack. Local players exist only as offline fallback.

const PATH_WHOOSH := "res://assets/audio/sfx/shift_whoosh.wav"
const PATH_TICK := "res://assets/audio/sfx/shift_tick.wav"
const PATH_LAND := "res://assets/audio/sfx/shift_land.wav"
const PATH_COMBO := "res://assets/audio/sfx/shift_combo.wav"

@export var stream_whoosh: AudioStream
@export var stream_tick: AudioStream
@export var stream_land: AudioStream
@export var stream_combo: AudioStream
@export var stream_sub: AudioStream
@export var stream_ui: AudioStream
@export var stream_solve: AudioStream
@export var stream_error: AudioStream

var feel: ShiftFeelConfig = null
var board_rect := Rect2()

var _whoosh: AudioStreamPlayer
var _tick: AudioStreamPlayer
var _land: AudioStreamPlayer
var _sub: AudioStreamPlayer
var _combo: AudioStreamPlayer
var _ui: AudioStreamPlayer
var _solve: AudioStreamPlayer
var _error: AudioStreamPlayer
var _rng := RandomNumberGenerator.new()
var _fallback_ready: bool = false


func _ready() -> void:
	_rng.randomize()
	if _director() == null:
		_ensure_fallback_players()


func configure(p_feel: ShiftFeelConfig) -> void:
	feel = p_feel
	var d := _director()
	if d:
		d.configure_feel(feel)
		if board_rect.size != Vector2.ZERO:
			d.set_board_rect(board_rect)
	else:
		_apply_volumes()


func set_board_rect(rect: Rect2) -> void:
	board_rect = rect
	var d := _director()
	if d:
		d.set_board_rect(rect)


func play_whoosh(world_pos: Vector2 = Vector2.INF) -> void:
	_route(&"shift_whoosh", world_pos, {"combo": false})


func play_tick(world_pos: Vector2 = Vector2.INF) -> void:
	_route(&"shift_tick", world_pos, {"combo": false})


func play_land(pitch_bias: float = 0.0, world_pos: Vector2 = Vector2.INF) -> void:
	_route(&"shift_land", world_pos, {"pitch_bias": pitch_bias, "combo": true, "combo_hit": true})


func play_sub() -> void:
	_route(&"shift_sub", Vector2.INF, {"combo": false})


func play_combo(world_pos: Vector2 = Vector2.INF) -> void:
	_route(&"shift_combo", world_pos, {"combo": true, "combo_hit": true})


func play_ui() -> void:
	_route(&"ui_click", Vector2.INF, {"combo": false})


func play_solve() -> void:
	_route(&"puzzle_solve", Vector2.INF, {"combo": false})
	var d := _director()
	if d:
		d.music_set_state(AdaptiveMusicPlayer.MusicState.VICTORY)


func play_error() -> void:
	_route(&"ui_error", Vector2.INF, {"combo": false})


func play_laser(world_pos: Vector2 = Vector2.INF) -> void:
	_route(&"laser_fire", world_pos, {"combo": false})


func play_switch() -> void:
	_route(&"switch_toggle", Vector2.INF, {"combo": false})


func play_button() -> void:
	_route(&"button_press", Vector2.INF, {"combo": false})


func play_particle(world_pos: Vector2 = Vector2.INF) -> void:
	_route(&"particle_spark", world_pos, {"combo": false})


## Full land stack: tick + land + optional sub (recipe-driven preference).
func play_land_layers(include_sub: bool = false, world_pos: Vector2 = Vector2.INF) -> void:
	play_tick(world_pos)
	play_land(0.0, world_pos)
	if include_sub:
		play_sub()


func reset_combo() -> void:
	var d := _director()
	if d:
		d.combo_reset()


func _route(id: StringName, world_pos: Vector2, opts: Dictionary) -> void:
	if feel and not feel.audio_enabled:
		return
	var d := _director()
	if d:
		if world_pos != Vector2.INF:
			d.play_spatial(id, world_pos, opts)
		else:
			d.play_one_shot(id, opts)
		return
	_play_fallback(id, float(opts.get("pitch_bias", 0.0)))


func _director() -> AudioDirector:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return null
	var node := tree.root.get_node_or_null("Audio")
	return node as AudioDirector


func _play_fallback(id: StringName, pitch_bias: float) -> void:
	_ensure_fallback_players()
	match id:
		&"shift_whoosh":
			_play(_whoosh, 1.0)
		&"shift_tick":
			_play(_tick, 1.02)
		&"shift_land":
			_play(_land, 1.0 + pitch_bias)
		&"shift_sub":
			_play(_sub, 0.95)
		&"shift_combo":
			_play(_combo, 1.0)
		&"ui_click", &"button_press":
			_play(_ui, 1.0)
		&"puzzle_solve":
			_play(_solve, 1.0)
		&"ui_error":
			_play(_error, 0.92)
		_:
			pass


func _play(player: AudioStreamPlayer, base_pitch: float) -> void:
	if feel and not feel.audio_enabled:
		return
	if player == null or player.stream == null:
		return
	var variance := feel.pitch_variance if feel else 0.06
	player.pitch_scale = base_pitch + _rng.randf_range(-variance, variance)
	player.play()


func _apply_volumes() -> void:
	var vol := feel.sfx_volume if feel else 0.85
	var db := linear_to_db(clampf(vol, 0.0001, 1.0))
	for p in [_whoosh, _tick, _land, _sub, _combo, _ui, _solve, _error]:
		if p:
			p.volume_db = db
	if _sub:
		_sub.volume_db = db - 2.0
	if _error:
		_error.volume_db = db - 1.5


func _ensure_fallback_players() -> void:
	if _fallback_ready:
		return
	_whoosh = _make_player("Whoosh", &"SFX_Movement")
	_tick = _make_player("Tick", &"SFX_Movement")
	_land = _make_player("Land", &"SFX_Movement")
	_sub = _make_player("Sub", &"SFX_Juice")
	_combo = _make_player("Combo", &"SFX_Juice")
	_ui = _make_player("Ui", &"SFX_UI")
	_solve = _make_player("Solve", &"SFX_Juice")
	_error = _make_player("Error", &"SFX_UI")
	_whoosh.stream = stream_whoosh if stream_whoosh else _load_or_make(PATH_WHOOSH, ProceduralSfx.Kind.WHOOSH)
	_tick.stream = stream_tick if stream_tick else _load_or_make(PATH_TICK, ProceduralSfx.Kind.TICK)
	_land.stream = stream_land if stream_land else _load_or_make(PATH_LAND, ProceduralSfx.Kind.LAND)
	_combo.stream = stream_combo if stream_combo else _load_or_make(PATH_COMBO, ProceduralSfx.Kind.COMBO)
	_sub.stream = stream_sub if stream_sub else ProceduralSfx.make(ProceduralSfx.Kind.SUB)
	_ui.stream = stream_ui if stream_ui else ProceduralSfx.make(ProceduralSfx.Kind.UI)
	_solve.stream = stream_solve if stream_solve else ProceduralSfx.make(ProceduralSfx.Kind.SOLVE)
	_error.stream = stream_error if stream_error else ProceduralSfx.make(ProceduralSfx.Kind.ERROR)
	_fallback_ready = true
	_apply_volumes()


func _load_or_make(path: String, kind: ProceduralSfx.Kind) -> AudioStream:
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is AudioStream:
			return res as AudioStream
	return ProceduralSfx.make(kind)


func _make_player(node_name: String, bus: StringName) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.name = node_name
	p.bus = String(bus)
	add_child(p)
	return p
