class_name CRCards
extends RefCounted

const CRTypes := preload("res://scripts/core/types.gd")


static func catalog() -> Dictionary:
	var C := {}
	C["n_pulse_n"] = _card("n_pulse_n", "Signal Spike", "neutral", 1, 2, ["up"], "pulse")
	C["n_pulse_cross"] = _card("n_pulse_cross", "Crosswire", "neutral", 2, 3, ["up", "down"], "pulse")
	C["n_pulse_side"] = _card("n_pulse_side", "Lateral Ping", "neutral", 2, 3, ["left", "right"], "pulse")
	C["n_amp"] = _card("n_amp", "Boost Node", "neutral", 3, 2, ["up", "right"], "amplifier")
	C["v_swarm1"] = _card("v_swarm1", "Spark Drone", "volt", 1, 2, ["right"], "pulse")
	C["v_swarm2"] = _card("v_swarm2", "Arc Mite", "volt", 1, 2, ["down"], "pulse")
	C["v_swarm3"] = _card("v_swarm3", "Volt Tick", "volt", 1, 3, ["left", "up"], "pulse")
	C["v_edge"] = _card("v_edge", "Rail Runner", "volt", 2, 3, ["down", "right"], "pulse")
	C["v_split1"] = _card("v_split1", "Fork Bolt", "volt", 2, 2, ["down"], "splitter", true, "Splits incoming beams sideways. Also fires ↓.")
	C["v_split2"] = _card("v_split2", "Scatter Node", "volt", 3, 3, ["left", "right"], "splitter", true, "Splits vertical hits into ←→. Fires ←→.")
	C["v_corner"] = _card("v_corner", "Corner Surge", "volt", 2, 4, ["up", "left"], "pulse")
	C["p_center1"] = _card("p_center1", "Prism Anchor", "prismatic", 2, 4, ["up", "down", "left", "right"], "pulse")
	C["p_center2"] = _card("p_center2", "Lattice Guard", "prismatic", 3, 5, ["up", "down"], "pulse")
	C["p_reflect1"] = _card("p_reflect1", "Mirror Pane", "prismatic", 2, 3, ["right"], "reflector", true, "Bends beams 90° CW and +3 Power. Fires →.")
	C["p_reflect2"] = _card("p_reflect2", "Counter Glass", "prismatic", 3, 3, ["left", "down"], "reflector", false, "Bends beams 90° CCW and +3 Power. Fires ←↓.")
	C["p_amp1"] = _card("p_amp1", "Lens Array", "prismatic", 2, 2, ["up"], "amplifier")
	C["p_amp2"] = _card("p_amp2", "Focus Core", "prismatic", 4, 4, ["left", "right"], "amplifier")
	C["p_wall"] = _card("p_wall", "Hard Light", "prismatic", 3, 6, ["down"], "pulse", true, "Fires ↓. Deals Power on hit. High HP wall.")
	C["o_late1"] = _card("o_late1", "Dark Seed", "void", 1, 2, ["down"], "pulse")
	C["o_late2"] = _card("o_late2", "Null Spike", "void", 2, 3, ["up", "right"], "pulse")
	C["o_nuke1"] = _card("o_nuke1", "Singularity Shell", "void", 4, 7, ["up", "down", "left"], "pulse", true, "Fires ↑↓←. Deals Power on hit. Late nuke.")
	C["o_nuke2"] = _card("o_nuke2", "Collapse Engine", "void", 5, 8, ["up", "down", "left", "right"], "pulse", true, "Fires ↑↓←→. Deals Power on hit. Finisher.")
	C["o_siphon"] = _card("o_siphon", "Drain Lattice", "void", 3, 4, ["left", "right"], "amplifier")
	C["o_heavy"] = _card("o_heavy", "Void Pillar", "void", 4, 6, ["down", "right"], "pulse")
	C["o_split"] = _card("o_split", "Rift Fork", "void", 3, 4, ["up"], "splitter", true, "Splits incoming beams sideways. Also fires ↑.")
	return C


static func get_card(id: String) -> Dictionary:
	var c: Dictionary = catalog().get(id, {})
	assert(not c.is_empty(), "Unknown card %s" % id)
	return c


static func node_title(node: String) -> String:
	match node:
		"pulse":
			return "PULSE"
		"splitter":
			return "SPLITTER"
		"reflector":
			return "REFLECTOR"
		"amplifier":
			return "AMPLIFIER"
		"inverter":
			return "INVERTER"
	return node.to_upper()


static func arrows_hint(def: Dictionary) -> String:
	var out: PackedStringArray = PackedStringArray()
	for d in CRTypes.list_arrows(def["arrows"]):
		match d:
			"up":
				out.append("↑")
			"down":
				out.append("↓")
			"left":
				out.append("←")
			"right":
				out.append("→")
	return " ".join(out)


static func ability_text(def: Dictionary) -> String:
	return str(def.get("ability", ""))


static func _fire_line(dirs: Array[String]) -> String:
	var glyphs: PackedStringArray = PackedStringArray()
	for d in dirs:
		match d:
			"up":
				glyphs.append("↑")
			"down":
				glyphs.append("↓")
			"left":
				glyphs.append("←")
			"right":
				glyphs.append("→")
	return "Fires %s." % "".join(glyphs)


static func _default_ability(node: String, dirs: Array[String]) -> String:
	var fire := _fire_line(dirs)
	match node:
		"amplifier":
			return "%s Beams through +3 Power." % fire
		"splitter":
			return "Splits incoming beams sideways. Also %s" % fire.to_lower()
		"reflector":
			return "Bends beams 90° and +3 Power. %s" % fire
		_:
			return "%s Deals Power on hit." % fire


static func _card(
	id: String,
	name: String,
	faction: String,
	cost: int,
	power: int,
	dirs: Array,
	node: String,
	reflect_cw: bool = true,
	ability: String = "",
) -> Dictionary:
	var ddirs: Array[String] = []
	for d in dirs:
		ddirs.append(str(d))
	var ability_line := ability if ability != "" else _default_ability(node, ddirs)
	return {
		"id": id,
		"name": name,
		"faction": faction,
		"cost": cost,
		"power": power,
		"arrows": CRTypes.arrows_from(ddirs),
		"node": node,
		"reflect_clockwise": reflect_cw,
		"ability": ability_line,
	}
