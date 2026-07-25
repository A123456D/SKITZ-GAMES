class_name TweenUtil
extends Object
## Kill-and-replace tweens on a host. Avoids stacking parallel tweens that fight
## modulate/scale and leak until scene free.

static func replace(host: Node, existing: Tween) -> Tween:
	if existing != null and existing.is_valid():
		existing.kill()
	if host == null or not is_instance_valid(host):
		return null
	return host.create_tween()


static func kill(existing: Tween) -> void:
	if existing != null and existing.is_valid():
		existing.kill()
