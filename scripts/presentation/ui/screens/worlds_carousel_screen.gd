extends UiScreen
## Worlds carousel — Neon Grid / Crystal Caves / Nature's Core / Void.
## Selecting a world applies WorldSkin + persists via SaveService.

var _scaffold: UiScreenScaffold
var _cards: Array = []
var _current: WorldSkin.Id = WorldSkin.Id.NEON_GRID


func _build() -> void:
	screen_id = UiRouter.SCREEN_WORLDS
	title = "Worlds"
	subtitle = "Pick a lattice skin"
	shows_back = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, false)

	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.save:
		_current = WorldSkin.id_from_key(gs.save.get_world_skin_key())

	var blurb := Label.new()
	blurb.text = "Skins tint glass, beams, and shift bands. Change worlds here — Hint only tips puzzles."
	blurb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	blurb.add_theme_color_override("font_color", tokens.ink_muted if tokens else Color(0.6, 0.6, 0.7))
	blurb.add_theme_font_size_override("font_size", scaled(tokens.font_caption if tokens else 13))
	_scaffold.content.add_child(blurb)

	_cards.clear()
	for id in [WorldSkin.Id.NEON_GRID, WorldSkin.Id.CRYSTAL, WorldSkin.Id.NATURE, WorldSkin.Id.VOID]:
		_scaffold.content.add_child(_make_card(id as WorldSkin.Id))

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _make_card(id: WorldSkin.Id) -> NeonGlassCard:
	var accent := _accent_for(id)
	var card := NeonGlassCard.new()
	card.configure(
		tokens,
		WorldSkin.display_name(id),
		WorldSkin.tagline(id),
		accent,
		id == _current
	)
	var captured := id
	card.pressed.connect(func() -> void:
		feel_press(card)
		_select(captured)
	)
	_cards.append({"id": id, "card": card, "accent": accent})
	return card


func _select(id: WorldSkin.Id) -> void:
	_current = id
	for item in _cards:
		var c: NeonGlassCard = item["card"]
		c.set_selected(item["id"] == id, item["accent"])
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.save:
		gs.save.set_world_skin_key(WorldSkin.key_for(id), true)
	if router and router.ui_feel:
		router.ui_feel.confirm()
	## Preview: retint local tokens for this screen chrome.
	if tokens:
		var preview := tokens.duplicate(true) as DesignTokens
		WorldSkin.apply_to_tokens(preview, id)
		tokens = preview


func _accent_for(id: WorldSkin.Id) -> Color:
	match id:
		WorldSkin.Id.CRYSTAL:
			return Color(0.49, 0.83, 0.99)
		WorldSkin.Id.NATURE:
			return Color(0.20, 0.83, 0.60)
		WorldSkin.Id.VOID:
			return Color(0.75, 0.52, 0.99)
		_:
			return tokens.accent_signal if tokens else Color(0.66, 0.33, 0.97)
