class_name AdaptiveMusicPlayer
extends Node
## Layered ambient + synthwave bed + tension stems with adaptive states.
## Presentation-only. Crossfades stem gains; stingers duck the bed via DynamicMixer.

signal state_changed(state: MusicState)

enum MusicState { OFF, EXPLORE, THINK, TENSION, VICTORY, FAILURE }

const CROSSFADE_SEC := 0.85
const STEM_BUSES := {
	"ambient": &"Music_Ambient",
	"bed": &"Music_Bed",
	"tension": &"Music_Tension",
}

@export var stream_ambient: AudioStream
@export var stream_bed: AudioStream
@export var stream_tension: AudioStream
@export var stream_victory: AudioStream
@export var stream_failure: AudioStream

var mixer: DynamicMixer = null

var _state: MusicState = MusicState.OFF
var _players: Dictionary = {} # StringName -> AudioStreamPlayer
var _levels: Dictionary = {} # stem -> target linear 0..1
var _current: Dictionary = {} # stem -> current linear
var _stinger: AudioStreamPlayer
var _fade_tween: Tween


func _ready() -> void:
	_ensure_players()
	_resolve_streams()
	for k in ["ambient", "bed", "tension"]:
		_levels[k] = 0.0
		_current[k] = 0.0


func configure(p_mixer: DynamicMixer = null) -> void:
	mixer = p_mixer


func get_state() -> MusicState:
	return _state


func set_state(state: MusicState, immediate: bool = false) -> void:
	if state == _state and not immediate:
		return
	_state = state
	match state:
		MusicState.OFF:
			_levels = {"ambient": 0.0, "bed": 0.0, "tension": 0.0}
		MusicState.EXPLORE:
			_levels = {"ambient": 0.85, "bed": 0.25, "tension": 0.0}
		MusicState.THINK:
			_levels = {"ambient": 0.55, "bed": 0.7, "tension": 0.15}
		MusicState.TENSION:
			_levels = {"ambient": 0.35, "bed": 0.55, "tension": 0.9}
		MusicState.VICTORY:
			_levels = {"ambient": 0.4, "bed": 0.35, "tension": 0.0}
			_play_stinger(true)
		MusicState.FAILURE:
			_levels = {"ambient": 0.5, "bed": 0.2, "tension": 0.25}
			_play_stinger(false)
	_apply_levels(immediate)
	state_changed.emit(state)


func stem_levels(ambient: float, bed: float, tension: float, immediate: bool = false) -> void:
	_levels = {
		"ambient": clampf(ambient, 0.0, 1.0),
		"bed": clampf(bed, 0.0, 1.0),
		"tension": clampf(tension, 0.0, 1.0),
	}
	_apply_levels(immediate)


func stop_all(immediate: bool = false) -> void:
	set_state(MusicState.OFF, immediate)
	if _stinger and _stinger.playing:
		_stinger.stop()


func _apply_levels(immediate: bool) -> void:
	_ensure_players()
	if _fade_tween and _fade_tween.is_valid():
		_fade_tween.kill()
	if immediate:
		for k in _levels.keys():
			_current[k] = float(_levels[k])
			_set_player_level(String(k), float(_current[k]))
		return
	_fade_tween = create_tween()
	_fade_tween.set_parallel(true)
	for k in _levels.keys():
		var key := String(k)
		var from_v := float(_current.get(key, 0.0))
		var to_v := float(_levels[key])
		_fade_tween.tween_method(_make_stem_fader(key), from_v, to_v, CROSSFADE_SEC).set_trans(
			Tween.TRANS_SINE
		).set_ease(Tween.EASE_IN_OUT)


func _make_stem_fader(stem: String) -> Callable:
	return func(v: float) -> void:
		_current[stem] = v
		_set_player_level(stem, v)


func _set_player_level(stem: String, linear: float) -> void:
	var p: AudioStreamPlayer = _players.get(stem)
	if p == null:
		return
	if linear <= 0.001:
		p.volume_db = -80.0
		# OFF / fully faded: stop decode to save battery & CPU (stems restart on demand).
		if _state == MusicState.OFF and p.playing:
			p.stop()
		return
	if not p.playing and p.stream:
		p.play()
	p.volume_db = linear_to_db(clampf(linear, 0.0001, 1.0))


func _play_stinger(victory: bool) -> void:
	_ensure_players()
	if _stinger == null:
		return
	_stinger.stream = stream_victory if victory else stream_failure
	if _stinger.stream == null:
		_stinger.stream = ProceduralMusic.make_stem(
			ProceduralMusic.Stem.VICTORY if victory else ProceduralMusic.Stem.FAILURE
		)
	_stinger.volume_db = 0.0
	_stinger.play()
	if mixer:
		mixer.duck_music(7.0 if victory else 5.0, 900.0 if victory else 700.0)


func _ensure_players() -> void:
	if _players.is_empty():
		_players["ambient"] = _make("StemAmbient", STEM_BUSES["ambient"])
		_players["bed"] = _make("StemBed", STEM_BUSES["bed"])
		_players["tension"] = _make("StemTension", STEM_BUSES["tension"])
	if _stinger == null:
		_stinger = _make("Stinger", &"Music_Stinger")


func _make(node_name: String, bus: StringName) -> AudioStreamPlayer:
	var existing := get_node_or_null(node_name) as AudioStreamPlayer
	if existing:
		existing.bus = String(bus)
		return existing
	var p := AudioStreamPlayer.new()
	p.name = node_name
	p.bus = String(bus)
	p.volume_db = -80.0
	add_child(p)
	return p


func _resolve_streams() -> void:
	stream_ambient = _load_or_make(
		stream_ambient, "res://assets/audio/music/stem_ambient.wav", ProceduralMusic.Stem.AMBIENT
	)
	stream_bed = _load_or_make(
		stream_bed, "res://assets/audio/music/stem_bed.wav", ProceduralMusic.Stem.BED
	)
	stream_tension = _load_or_make(
		stream_tension, "res://assets/audio/music/stem_tension.wav", ProceduralMusic.Stem.TENSION
	)
	stream_victory = _load_or_make(
		stream_victory, "res://assets/audio/music/stinger_victory.wav", ProceduralMusic.Stem.VICTORY
	)
	stream_failure = _load_or_make(
		stream_failure, "res://assets/audio/music/stinger_failure.wav", ProceduralMusic.Stem.FAILURE
	)
	_players["ambient"].stream = stream_ambient
	_players["bed"].stream = stream_bed
	_players["tension"].stream = stream_tension


func _load_or_make(existing: AudioStream, path: String, kind: ProceduralMusic.Stem) -> AudioStream:
	if existing:
		return existing
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is AudioStream:
			var s := res as AudioStream
			if s is AudioStreamWAV:
				var w := (s as AudioStreamWAV).duplicate() as AudioStreamWAV
				if kind == ProceduralMusic.Stem.AMBIENT or kind == ProceduralMusic.Stem.BED or kind == ProceduralMusic.Stem.TENSION:
					w.loop_mode = AudioStreamWAV.LOOP_FORWARD
					w.loop_begin = 0
					w.loop_end = w.data.size() / 2
				return w
			return s
	return ProceduralMusic.make_stem(kind)
