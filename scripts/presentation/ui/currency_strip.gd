class_name CurrencyStrip
extends HBoxContainer
## Sparks / Prisms readout — caption weight, signal accents.

var tokens: DesignTokens
var _sparks: Label
var _prisms: Label


func _ready() -> void:
	add_theme_constant_override("separation", 16)
	alignment = BoxContainer.ALIGNMENT_END


func configure(p_tokens: DesignTokens, settings: UiSettingsState) -> void:
	tokens = p_tokens
	if _sparks == null:
		_sparks = _make_label()
		add_child(_sparks)
		_prisms = _make_label()
		add_child(_prisms)
	var scale := settings.text_scale if settings else 1.0
	_sparks.text = "✦ %d" % settings.sparks
	_prisms.text = "◇ %d" % settings.prisms
	_sparks.add_theme_color_override("font_color", tokens.accent_beam)
	_prisms.add_theme_color_override("font_color", tokens.accent_signal)
	_sparks.add_theme_font_size_override("font_size", int(round(tokens.font_caption * scale)))
	_prisms.add_theme_font_size_override("font_size", int(round(tokens.font_caption * scale)))


func _make_label() -> Label:
	var l := Label.new()
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l
