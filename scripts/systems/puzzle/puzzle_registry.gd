class_name PuzzleRegistry
extends RefCounted
## Maps component_id → PuzzleComponent script. Objects never hardcode class trees.

const BlockingComponentScript := preload("res://scripts/systems/puzzle/components/blocking_component.gd")
const DoorComponentScript := preload("res://scripts/systems/puzzle/components/door_component.gd")
const SwitchComponentScript := preload("res://scripts/systems/puzzle/components/switch_component.gd")
const PressurePlateComponentScript := preload("res://scripts/systems/puzzle/components/pressure_plate_component.gd")
const MirrorComponentScript := preload("res://scripts/systems/puzzle/components/mirror_component.gd")
const LaserEmitterComponentScript := preload("res://scripts/systems/puzzle/components/laser_emitter_component.gd")
const LaserReceiverComponentScript := preload("res://scripts/systems/puzzle/components/laser_receiver_component.gd")
const MagnetComponentScript := preload("res://scripts/systems/puzzle/components/magnet_component.gd")
const TeleporterComponentScript := preload("res://scripts/systems/puzzle/components/teleporter_component.gd")
const GhostComponentScript := preload("res://scripts/systems/puzzle/components/ghost_component.gd")
const GravityComponentScript := preload("res://scripts/systems/puzzle/components/gravity_component.gd")
const IceComponentScript := preload("res://scripts/systems/puzzle/components/ice_component.gd")
const FireComponentScript := preload("res://scripts/systems/puzzle/components/fire_component.gd")
const BurnableComponentScript := preload("res://scripts/systems/puzzle/components/burnable_component.gd")
const TimeComponentScript := preload("res://scripts/systems/puzzle/components/time_component.gd")
const ActorComponentScript := preload("res://scripts/systems/puzzle/components/actor_component.gd")
const PresserComponentScript := preload("res://scripts/systems/puzzle/components/presser_component.gd")
const MovableComponentScript := preload("res://scripts/systems/puzzle/components/movable_component.gd")
const CountdownComponentScript := preload("res://scripts/systems/puzzle/components/countdown_component.gd")
const CloneComponentScript := preload("res://scripts/systems/puzzle/components/clone_component.gd")
const AxisLockComponentScript := preload("res://scripts/systems/puzzle/components/axis_lock_component.gd")

static var _map: Dictionary = {}
static var _bootstrapped: bool = false


static func bootstrap() -> void:
	if _bootstrapped:
		return
	_bootstrapped = true
	register(&"blocking", BlockingComponentScript)
	register(&"door", DoorComponentScript)
	register(&"switch", SwitchComponentScript)
	register(&"pressure_plate", PressurePlateComponentScript)
	register(&"mirror", MirrorComponentScript)
	register(&"laser_emitter", LaserEmitterComponentScript)
	register(&"laser_receiver", LaserReceiverComponentScript)
	register(&"magnet", MagnetComponentScript)
	register(&"teleporter", TeleporterComponentScript)
	register(&"ghost", GhostComponentScript)
	register(&"gravity", GravityComponentScript)
	register(&"ice", IceComponentScript)
	register(&"fire", FireComponentScript)
	register(&"burnable", BurnableComponentScript)
	register(&"time", TimeComponentScript)
	register(&"actor", ActorComponentScript)
	register(&"presser", PresserComponentScript)
	register(&"movable", MovableComponentScript)
	register(&"countdown", CountdownComponentScript)
	register(&"clone", CloneComponentScript)
	register(&"axis_lock", AxisLockComponentScript)


static func register(component_id: StringName, script: Script) -> void:
	_map[component_id] = script


static func create(component_id: StringName, params: Dictionary = {}) -> PuzzleComponent:
	bootstrap()
	if not _map.has(component_id):
		push_error("PuzzleRegistry: unknown component '%s'" % String(component_id))
		return null
	var script: Script = _map[component_id]
	var inst: PuzzleComponent = script.new()
	inst.component_id = component_id
	inst.setup(params)
	return inst


static func create_from_spec(spec: PuzzleComponentSpec) -> PuzzleComponent:
	if spec == null:
		return null
	return create(spec.component_id, spec.params)


static func known_ids() -> Array[StringName]:
	bootstrap()
	var out: Array[StringName] = []
	for k in _map.keys():
		out.append(k)
	out.sort()
	return out
