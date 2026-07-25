class_name SpatialAudio2D
extends RefCounted
## Board-relative 2D pan / soft attenuation for puzzle SFX.
## UI and chrome stay mono (pan 0). Board events use gentle stereo without harsh L/R jumps.

const MAX_PAN: float = 0.72
const MIN_ATTEN_DB: float = -7.0


## Returns { "pan": float, "volume_db": float } from a point in board local / world space.
static func from_board_point(
	point: Vector2,
	board_rect: Rect2,
	max_pan: float = MAX_PAN,
	min_atten_db: float = MIN_ATTEN_DB
) -> Dictionary:
	if board_rect.size.x <= 1.0 or board_rect.size.y <= 1.0:
		return {"pan": 0.0, "volume_db": 0.0}
	var center := board_rect.get_center()
	var half := board_rect.size * 0.5
	var nx := clampf((point.x - center.x) / maxf(half.x, 1.0), -1.0, 1.0)
	var ny := clampf((point.y - center.y) / maxf(half.y, 1.0), -1.0, 1.0)
	var pan := clampf(nx * max_pan, -max_pan, max_pan)
	# Soft edge falloff — center of board is loudest; corners slightly quieter.
	var radial := clampf(Vector2(nx, ny).length(), 0.0, 1.0)
	var volume_db := lerpf(0.0, min_atten_db, radial * radial)
	return {"pan": pan, "volume_db": volume_db}


static func from_normalized(nx: float, ny: float = 0.0) -> Dictionary:
	var pan := clampf(nx * MAX_PAN, -MAX_PAN, MAX_PAN)
	var radial := clampf(Vector2(nx, ny).length(), 0.0, 1.0)
	return {"pan": pan, "volume_db": lerpf(0.0, MIN_ATTEN_DB, radial * radial)}


## Prefer mono (no pan) for UI / modal / accessibility reduce-noise.
static func should_spatialize(category: StringName, reduce_noise: bool) -> bool:
	if reduce_noise:
		return false
	match category:
		&"ui", &"voice", &"music":
			return false
		_:
			return true
