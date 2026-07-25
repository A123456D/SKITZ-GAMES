class_name UiRouter
extends Control
## Stack navigator with veil transitions + UiFeel juice.

signal stack_changed(depth: int)

const SCREEN_MAIN := &"main_menu"
const SCREEN_SETTINGS := &"settings"
const SCREEN_ACCESSIBILITY := &"accessibility"
const SCREEN_INVENTORY := &"inventory"
const SCREEN_WORLD_MAP := &"world_map"
const SCREEN_DAILY := &"daily_challenge"
const SCREEN_LEADERBOARDS := &"leaderboards"
const SCREEN_LEVEL_SELECT := &"level_select"
const SCREEN_ACHIEVEMENTS := &"achievements"
const SCREEN_LEVEL_EDITOR := &"level_editor"
const SCREEN_WORLDS := &"worlds_carousel"
const SCREEN_ENDLESS := &"endless"

@export var tokens: DesignTokens
@export var catalog: SampleUiCatalog

var aesthetic: AestheticRoot
var ui_feel: UiFeel
var feel: ShiftFeelConfig
var settings: UiSettingsState
var transition: ScreenTransition

var _stack_host: Control
var _stack: Array[UiScreen] = []
var _busy: bool = false
var _registry: Dictionary = {} # StringName -> PackedScene
var _registry_paths: Dictionary = {} # StringName -> String path
var _loader: AsyncLoader = AsyncLoader.new()
var _hint_sheet: HintSheet


func configure(
	p_aesthetic: AestheticRoot,
	p_feel: UiFeel,
	p_shift_feel: ShiftFeelConfig,
	p_settings: UiSettingsState,
	p_stack_host: Control
) -> void:
	aesthetic = p_aesthetic
	ui_feel = p_feel
	feel = p_shift_feel
	settings = p_settings
	_stack_host = p_stack_host
	if aesthetic:
		transition = aesthetic.transition
		if tokens == null:
			tokens = aesthetic.tokens
	_register_defaults()
	_warm_screens_async()
	if catalog == null:
		catalog = load("res://resources/ui/sample_ui_catalog.tres") as SampleUiCatalog
	if catalog == null:
		catalog = SampleUiCatalog.make_builtin()
	else:
		catalog.ensure_populated()


func _register_defaults() -> void:
	_registry_paths[SCREEN_MAIN] = "res://scenes/ui/screens/main_menu_screen.tscn"
	_registry_paths[SCREEN_SETTINGS] = "res://scenes/ui/screens/settings_screen.tscn"
	_registry_paths[SCREEN_ACCESSIBILITY] = "res://scenes/ui/screens/accessibility_screen.tscn"
	_registry_paths[SCREEN_INVENTORY] = "res://scenes/ui/screens/inventory_screen.tscn"
	_registry_paths[SCREEN_WORLD_MAP] = "res://scenes/ui/screens/world_map_screen.tscn"
	_registry_paths[SCREEN_DAILY] = "res://scenes/ui/screens/daily_challenge_screen.tscn"
	_registry_paths[SCREEN_LEADERBOARDS] = "res://scenes/ui/screens/leaderboards_screen.tscn"
	_registry_paths[SCREEN_LEVEL_SELECT] = "res://scenes/ui/screens/level_select_screen.tscn"
	_registry_paths[SCREEN_ACHIEVEMENTS] = "res://scenes/ui/screens/achievements_screen.tscn"
	_registry_paths[SCREEN_LEVEL_EDITOR] = "res://scenes/ui/screens/level_editor/level_editor_screen.tscn"
	_registry_paths[SCREEN_WORLDS] = "res://scenes/ui/screens/worlds_carousel_screen.tscn"
	_registry_paths[SCREEN_ENDLESS] = "res://scenes/ui/screens/endless_screen.tscn"
	# Critical path: sync-load main menu only.
	_registry[SCREEN_MAIN] = load(_registry_paths[SCREEN_MAIN]) as PackedScene


func _warm_screens_async() -> void:
	## Kick threaded loads for non-critical screens â€” avoids hitch on first navigate.
	for id in _registry_paths.keys():
		if id == SCREEN_MAIN:
			continue
		var path: String = _registry_paths[id]
		_loader.request(path)


func _poll_registry(screen_id: StringName) -> PackedScene:
	if _registry.has(screen_id) and _registry[screen_id] != null:
		return _registry[screen_id] as PackedScene
	var path: String = _registry_paths.get(screen_id, "")
	if path.is_empty():
		return null
	var res := _loader.poll(path)
	if res is PackedScene:
		_registry[screen_id] = res
		return res as PackedScene
	# Fallback sync if thread not ready yet (first open race).
	if ResourceLoader.exists(path):
		var packed := load(path) as PackedScene
		_registry[screen_id] = packed
		return packed
	return null


func get_app_theme() -> Theme:
	if aesthetic and aesthetic.director:
		return aesthetic.director.get_theme()
	return null


func start(root_id: StringName = SCREEN_MAIN) -> void:
	PowerPolicy.set_menu_idle(true)
	PowerPolicy.set_gameplay_active(false)
	await push(root_id, {}, true)


func push(screen_id: StringName, params: Dictionary = {}, is_root: bool = false) -> void:
	if _busy:
		return
	_busy = true
	var mode := ScreenTransition.Mode.FADE if is_root else ScreenTransition.Mode.SHIFT
	if not is_root and transition:
		play_transition_feel()
		await transition.cover(mode)
	if not _stack.is_empty():
		_stack.back().visible = false
	var screen := await _instantiate_async(screen_id, params)
	if screen == null:
		_busy = false
		if transition and not is_root:
			await transition.uncover(mode)
		return
	_stack.append(screen)
	_stack_host.add_child(screen)
	screen.setup(self, params)
	_wire_screen(screen)
	screen.on_enter()
	_update_power_for_stack()
	if transition:
		if is_root:
			transition.prepare_covered()
		await transition.uncover(mode)
	_busy = false
	stack_changed.emit(_stack.size())


func pop() -> void:
	if _busy or _stack.size() <= 1:
		return
	_busy = true
	play_transition_feel()
	if transition:
		await transition.cover(ScreenTransition.Mode.SHIFT)
	var top: UiScreen = _stack.pop_back()
	await top.play_exit()
	top.on_exit()
	top.queue_free()
	if not _stack.is_empty():
		var prev: UiScreen = _stack.back()
		prev.visible = true
		prev.on_enter()
	_update_power_for_stack()
	if transition:
		await transition.uncover(ScreenTransition.Mode.SHIFT)
	_busy = false
	stack_changed.emit(_stack.size())


func replace(screen_id: StringName, params: Dictionary = {}) -> void:
	if _busy:
		return
	_busy = true
	play_transition_feel()
	if transition:
		await transition.cover(ScreenTransition.Mode.WIPE)
	while not _stack.is_empty():
		var s: UiScreen = _stack.pop_back()
		s.queue_free()
	var screen := await _instantiate_async(screen_id, params)
	if screen:
		_stack.append(screen)
		_stack_host.add_child(screen)
		screen.setup(self, params)
		_wire_screen(screen)
		screen.on_enter()
	_update_power_for_stack()
	if transition:
		await transition.uncover(ScreenTransition.Mode.WIPE)
	_busy = false
	stack_changed.emit(_stack.size())


func open_hint_sheet(params: Dictionary = {}) -> void:
	if _hint_sheet and is_instance_valid(_hint_sheet):
		_hint_sheet.present(params)
		return
	var path := "res://scenes/ui/components/hint_sheet.tscn"
	_loader.request(path)
	var packed: PackedScene = await _loader.await_path(self, path) as PackedScene
	if packed == null:
		packed = load(path) as PackedScene
	if packed == null:
		return
	_hint_sheet = packed.instantiate() as HintSheet
	add_child(_hint_sheet)
	_hint_sheet.configure(self)
	_hint_sheet.present(params)


func play_button_feel(control: Control = null) -> void:
	if ui_feel:
		ui_feel.button_press(control)
	if aesthetic and aesthetic.director and control:
		aesthetic.director.spawn_ui_confirm(control.get_global_rect().get_center())


func play_transition_feel() -> void:
	if ui_feel:
		ui_feel.screen_transition()


func _instantiate_async(screen_id: StringName, _params: Dictionary) -> UiScreen:
	var packed := _poll_registry(screen_id)
	if packed == null:
		var path: String = _registry_paths.get(screen_id, "")
		if not path.is_empty():
			packed = await _loader.await_path(self, path) as PackedScene
			if packed:
				_registry[screen_id] = packed
	if packed == null:
		push_warning("UiRouter: unknown screen %s" % String(screen_id))
		return null
	return packed.instantiate() as UiScreen


func _update_power_for_stack() -> void:
	## Menu idle â†’ low processor OK. Level editor / play-like screens keep full rate.
	var top_id := &""
	if not _stack.is_empty() and _stack.back():
		top_id = _stack.back().screen_id
	var play_like := top_id == SCREEN_LEVEL_EDITOR
	PowerPolicy.set_gameplay_active(play_like)
	PowerPolicy.set_menu_idle(not play_like)


func _wire_screen(screen: UiScreen) -> void:
	if not screen.request_push.is_connected(_on_request_push):
		screen.request_push.connect(_on_request_push)
	if not screen.request_pop.is_connected(_on_request_pop):
		screen.request_pop.connect(_on_request_pop)
	if not screen.request_sheet.is_connected(_on_request_sheet):
		screen.request_sheet.connect(_on_request_sheet)


func _on_request_push(id: StringName, params: Dictionary) -> void:
	push(id, params)


func _on_request_pop() -> void:
	pop()


func _on_request_sheet(id: StringName, params: Dictionary) -> void:
	if id == &"hints":
		open_hint_sheet(params)
