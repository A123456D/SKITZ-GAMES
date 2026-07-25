class_name UiSettingsState
extends RefCounted
## Runtime UI / accessibility preferences. Persisted via SaveService / GameServices.

signal changed

var master_volume: float = 1.0
var music_volume: float = 0.72
var sfx_volume: float = 0.9
var ui_volume: float = 0.85

var quality_tier: VisualQualityConfig.Tier = VisualQualityConfig.Tier.HIGH
var reduce_motion: bool = false
var disable_shake: bool = false
var bloom_enabled: bool = true
var battery_saver: bool = false
var haptics_enabled: bool = true
var colorblind_indicators: bool = true
## 1.0 | 1.15 | 1.3
var text_scale: float = 1.0

var sparks: int = 420
var prisms: int = 12
var daily_streak: int = 4
var equipped_cosmetic_id: StringName = &"trail_signal"


func apply_audio(audio: AudioDirector) -> void:
	if audio == null:
		return
	audio.set_category_volume(DynamicMixer.Category.MASTER, master_volume)
	audio.set_category_volume(DynamicMixer.Category.MUSIC, music_volume)
	audio.set_category_volume(DynamicMixer.Category.SFX, sfx_volume)
	audio.set_category_volume(DynamicMixer.Category.UI, ui_volume)


func apply_visual(director: VisualDirector, feel: ShiftFeelConfig, transition: ScreenTransition = null) -> void:
	if feel:
		feel.reduce_motion = reduce_motion
		feel.disable_shake = disable_shake
		feel.haptics_enabled = haptics_enabled
		feel.sfx_volume = sfx_volume
	if director:
		director.feel_config = feel
		director.set_quality_tier(quality_tier)
		if director.quality:
			director.quality.bloom_enabled = bloom_enabled and not reduce_motion
		director.set_reduce_motion(reduce_motion)
		director.set_battery_saver(battery_saver)
	PowerPolicy.set_battery_saver(battery_saver)
	if transition:
		transition.reduce_motion = reduce_motion


func notify() -> void:
	changed.emit()


func scaled_font(base: int) -> int:
	return int(round(float(base) * text_scale))
