class_name ShiftrThemeFactory
extends Resource
## Saves / rebuilds the SHIFTR Theme from DesignTokens.
## Prefer runtime `ShiftrThemeBuilder.build(tokens)`; this resource documents the pipeline.

@export var tokens: DesignTokens

func build() -> Theme:
	var t := tokens
	if t == null:
		t = load("res://resources/configs/visual/default_design_tokens.tres") as DesignTokens
	if t == null:
		t = DesignTokens.new()
	return ShiftrThemeBuilder.build(t)
