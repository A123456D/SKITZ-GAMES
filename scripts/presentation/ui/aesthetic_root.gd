class_name AestheticRoot
extends Node
## Drop-in composition root: VisualDirector + optional transition layer.
## Parent puzzle/board scenes under Content; aesthetics layer around them.

@export var tokens: DesignTokens
@export var quality: VisualQualityConfig
@export var feel_config: ShiftFeelConfig
@export var auto_apply_on_ready: bool = true

@onready var director: VisualDirector = $VisualDirector
@onready var transition: ScreenTransition = $ScreenTransition


func _ready() -> void:
	if tokens == null:
		tokens = load("res://resources/configs/visual/default_design_tokens.tres") as DesignTokens
	if quality == null:
		quality = (load("res://resources/configs/visual/quality_high.tres") as VisualQualityConfig).duplicate(true) as VisualQualityConfig
	if auto_apply_on_ready:
		apply_aesthetic()


func apply_aesthetic() -> void:
	if director:
		director.configure(tokens, quality, feel_config)
		director.apply_theme_to(self)
	if transition and tokens:
		transition.tokens = tokens
		transition.reduce_motion = quality.reduce_motion if quality else false


func set_tier(tier: VisualQualityConfig.Tier) -> void:
	if director:
		director.set_quality_tier(tier)
		quality = director.quality
	if transition and quality:
		transition.reduce_motion = quality.reduce_motion
