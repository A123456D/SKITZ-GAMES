extends UiScreen
## Cosmetics inventory — Sparks / Prisms, equip stubs.

var _scaffold: UiScreenScaffold


func _build() -> void:
	screen_id = UiRouter.SCREEN_INVENTORY
	title = "Inventory"
	subtitle = "Identity · trails · frames"
	shows_back = true
	shows_currency = true
	_scaffold = UiScreenScaffold.new()
	add_child(_scaffold)
	_scaffold.build(self, true, true)
	_populate()
	if settings and not settings.changed.is_connected(_populate):
		settings.changed.connect(_populate)


func _populate() -> void:
	if _scaffold == null or _scaffold.content == null:
		return
	for c in _scaffold.content.get_children():
		c.queue_free()
	if _scaffold.chrome:
		_scaffold.chrome.configure(tokens, title, subtitle, true, true, settings)

	var intro := Label.new()
	intro.text = "Cosmetics never buy power. Equip a trail or frame — Sparks and Prisms only."
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.add_theme_color_override("font_color", tokens.ink_secondary)
	intro.add_theme_font_size_override("font_size", scaled(tokens.font_caption))
	_scaffold.content.add_child(intro)

	var scale := settings.text_scale if settings else 1.0
	for item in router.catalog.cosmetics:
		if item == null:
			continue
		var meta := item.kind_label()
		if item.equipped:
			meta += "  ·  Equipped"
		elif item.owned:
			meta += "  ·  Owned"
		elif item.prism_cost > 0:
			meta += "  ·  %d Prisms" % item.prism_cost
		elif item.spark_cost > 0:
			meta += "  ·  %d Sparks" % item.spark_cost
		else:
			meta += "  ·  Locked"
		var row := NavRow.new()
		row.configure(tokens, item.display_name, meta, item.accent, scale, not item.owned)
		var captured := item
		row.pressed.connect(func() -> void: _on_item(captured, row))
		_scaffold.content.add_child(row)

	_scaffold.stagger_children(settings.reduce_motion if settings else false)


func _on_item(item: CosmeticItemDef, row: Control) -> void:
	feel_press(row)
	if not item.owned:
		if router.ui_feel:
			router.ui_feel.invalid()
		return
	for other in router.catalog.cosmetics:
		if other and other.kind == item.kind:
			other.equipped = false
	item.equipped = true
	settings.equipped_cosmetic_id = item.id
	settings.notify()
	_populate()
