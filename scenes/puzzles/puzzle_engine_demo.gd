extends Node2D
## Minimal sandbox: laser → mirror → receiver → door, plus a switch.
## Open and F6. Keys: Space = tick, S = toggle switch, R = recompute.

var session: BoardSession
var engine: PuzzleEngine
var _log: Label


func _ready() -> void:
	session = BoardSession.new()
	var cfg := BoardConfig.new()
	cfg.width = 7
	cfg.height = 5
	session.setup_from_config(cfg)

	engine = PuzzleEngine.new()
	engine.bind_session(session)
	engine.setup_catalog(PuzzleCatalog.build_all())
	engine.puzzle_events.connect(_on_puzzle_events)

	## Layout:
	## switch (0,2)    emitter (1,2) → mirror (3,2) reflects N → receiver (3,0)
	## door (5,2) gated by channel "door"
	engine.place(Vector2i(0, 2), &"switch")
	engine.place(Vector2i(1, 2), &"laser_emitter")
	engine.place(Vector2i(3, 2), &"mirror")
	engine.place(Vector2i(3, 0), &"laser_receiver")
	engine.place(Vector2i(5, 2), &"door")
	engine.place(Vector2i(5, 4), &"enemy_patrol")
	engine.bootstrap_from_board()

	_log = Label.new()
	_log.position = Vector2(16, 16)
	_log.add_theme_font_size_override("font_size", 18)
	add_child(_log)
	_refresh_log("boot")


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_SPACE:
				engine.tick(100)
				_refresh_log("tick")
			KEY_S:
				engine.interact_at(Vector2i(0, 2))
				_refresh_log("switch")
			KEY_R:
				engine.recompute()
				_refresh_log("recompute")


func _on_puzzle_events(events: Array) -> void:
	for e in events:
		print("[puzzle] ", e.to_dict())


func _refresh_log(tag: String) -> void:
	var door_open := engine.is_door_open(Vector2i(5, 2))
	var ch := engine.get_channels().is_active(&"door")
	var enemy: PuzzleObject = null
	for obj in engine.world.objects_with(&"actor"):
		enemy = obj
		break
	var ex := enemy.cell.x if enemy else -1
	var ey := enemy.cell.y if enemy else -1
	_log.text = "PUZZLE ENGINE DEMO [%s]\nDoor open: %s | Channel: %s\nEnemy: (%d,%d)\n[S] switch  [Space] tick  [R] recompute" % [
		tag, door_open, ch, ex, ey
	]
