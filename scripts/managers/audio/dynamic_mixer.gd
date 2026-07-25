class_name DynamicMixer
extends Node
## Category volumes, music ducking, and mobile interruption restore.
## Sidechain-style duck is scripted (Godot buses lack true sidechain compressors).

signal volumes_changed

enum Category { MASTER, MUSIC, SFX, UI, JUICE, AMBIENCE, VOICE }

const BUS_MASTER := &"Master"
const BUS_MUSIC := &"Music"
const BUS_SFX := &"SFX"
const BUS_UI := &"SFX_UI"
const BUS_JUICE := &"SFX_Juice"
const BUS_AMBIENCE := &"Ambience"
const BUS_VOICE := &"Voice"

@export_range(0.0, 1.0, 0.01) var master_linear: float = 1.0
@export_range(0.0, 1.0, 0.01) var music_linear: float = 0.72
@export_range(0.0, 1.0, 0.01) var sfx_linear: float = 0.9
@export_range(0.0, 1.0, 0.01) var ui_linear: float = 0.85
@export_range(0.0, 1.0, 0.01) var juice_linear: float = 0.88
@export_range(0.0, 1.0, 0.01) var ambience_linear: float = 0.55
@export_range(0.0, 1.0, 0.01) var voice_linear: float = 1.0

@export var mute_music: bool = false
@export var mute_sfx: bool = false
@export var mute_ui: bool = false
@export var reduce_noise: bool = false

var _duck_music_db: float = 0.0
var _duck_token: int = 0
var _paused_by_os: bool = false
var _pre_pause_master: float = 1.0


func _ready() -> void:
	apply_all()


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_APPLICATION_FOCUS_OUT:
			_on_os_pause()
		NOTIFICATION_APPLICATION_RESUMED, NOTIFICATION_APPLICATION_FOCUS_IN:
			_on_os_resume()


func set_category_linear(cat: Category, linear: float) -> void:
	linear = clampf(linear, 0.0, 1.0)
	match cat:
		Category.MASTER:
			master_linear = linear
		Category.MUSIC:
			music_linear = linear
		Category.SFX:
			sfx_linear = linear
		Category.UI:
			ui_linear = linear
		Category.JUICE:
			juice_linear = linear
		Category.AMBIENCE:
			ambience_linear = linear
		Category.VOICE:
			voice_linear = linear
	apply_all()


func set_mute(cat: Category, muted: bool) -> void:
	match cat:
		Category.MUSIC:
			mute_music = muted
		Category.SFX:
			mute_sfx = muted
		Category.UI:
			mute_ui = muted
		_:
			pass
	apply_all()


func set_reduce_noise(on: bool) -> void:
	reduce_noise = on
	# Soften juice + ambience; keep UI confirmation readable.
	if on:
		juice_linear = minf(juice_linear, 0.45)
		ambience_linear = minf(ambience_linear, 0.25)
		music_linear = minf(music_linear, 0.5)
	apply_all()


## Temporary music duck (victory / modal / heavy juice). Restores after duration.
func duck_music(amount_db: float, duration_ms: float) -> void:
	if amount_db <= 0.0 or duration_ms <= 0.0:
		return
	_duck_token += 1
	var token := _duck_token
	_duck_music_db = maxf(_duck_music_db, amount_db)
	_apply_music()
	var tree := get_tree()
	if tree == null:
		return
	tree.create_timer(duration_ms * 0.001).timeout.connect(
		func() -> void:
			if token != _duck_token:
				return
			_duck_music_db = 0.0
			_apply_music()
	)


func clear_duck() -> void:
	_duck_token += 1
	_duck_music_db = 0.0
	_apply_music()


func apply_all() -> void:
	_set_bus(BUS_MASTER, master_linear, false)
	_apply_music()
	_set_bus(BUS_SFX, sfx_linear, mute_sfx)
	_set_bus(BUS_UI, ui_linear, mute_ui or mute_sfx)
	_set_bus(BUS_JUICE, juice_linear * (0.55 if reduce_noise else 1.0), mute_sfx)
	_set_bus(BUS_AMBIENCE, ambience_linear * (0.4 if reduce_noise else 1.0), mute_music)
	_set_bus(BUS_VOICE, voice_linear, false)
	# Child movement/puzzle buses inherit SFX parent; keep them flat.
	_set_bus(&"SFX_Movement", 1.0, mute_sfx)
	_set_bus(&"SFX_Puzzle", 1.0, mute_sfx)
	_set_bus(&"SFX_Particles", 1.0, mute_sfx)
	_set_bus(&"SFX_Game", 1.0, mute_sfx)
	volumes_changed.emit()


func _apply_music() -> void:
	var lin := 0.0 if mute_music else music_linear
	var db := linear_to_db(clampf(lin, 0.0001, 1.0)) - _duck_music_db
	_set_bus_db(BUS_MUSIC, db, mute_music)


func _set_bus(bus_name: StringName, linear: float, muted: bool) -> void:
	var db := -80.0 if muted or linear <= 0.0001 else linear_to_db(clampf(linear, 0.0001, 1.0))
	_set_bus_db(bus_name, db, muted)


func _set_bus_db(bus_name: StringName, db: float, muted: bool) -> void:
	var idx := AudioServer.get_bus_index(String(bus_name))
	if idx < 0:
		return
	AudioServer.set_bus_mute(idx, muted)
	AudioServer.set_bus_volume_db(idx, db)


func _on_os_pause() -> void:
	if _paused_by_os:
		return
	_paused_by_os = true
	_pre_pause_master = master_linear
	_set_bus(BUS_MASTER, 0.0, true)


func _on_os_resume() -> void:
	if not _paused_by_os:
		return
	_paused_by_os = false
	master_linear = _pre_pause_master
	apply_all()

