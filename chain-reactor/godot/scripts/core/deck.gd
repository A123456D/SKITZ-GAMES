class_name CRDeck
extends RefCounted


static func preset(faction: String) -> Array[String]:
	match faction:
		"volt":
			return [
				"v_swarm1", "v_swarm2", "v_swarm3", "v_edge", "v_split1", "v_split2", "v_corner",
				"n_pulse_n", "n_pulse_cross", "n_amp",
			]
		"prismatic":
			return [
				"p_center1", "p_center2", "p_reflect1", "p_reflect2", "p_amp1", "p_amp2", "p_wall",
				"n_pulse_n", "n_pulse_side", "n_amp",
			]
		"void":
			return [
				"o_late1", "o_late2", "o_nuke1", "o_nuke2", "o_siphon", "o_heavy", "o_split",
				"n_pulse_n", "n_pulse_cross", "n_pulse_side",
			]
	return []


static func faction_label(faction: String) -> String:
	match faction:
		"volt":
			return "Volt Syndicate"
		"prismatic":
			return "Prismatic Order"
		"void":
			return "Void Architects"
	return "Neutral"


static func shuffle(items: Array[String], rng: RandomNumberGenerator) -> Array[String]:
	var a: Array[String] = items.duplicate()
	for i in range(a.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp := a[i]
		a[i] = a[j]
		a[j] = tmp
	return a
