class_name CRCascade
extends RefCounted

const CRTypes := preload("res://scripts/core/types.gd")
const CRBoard := preload("res://scripts/core/board_ops.gd")
const CRCards := preload("res://scripts/core/cards.gd")


static func resolve(board_in: Array, origin: Vector2i, firer_owner: String) -> Dictionary:
	var board: Array = CRTypes.clone_board(board_in)
	CRBoard.reset_activations(board)
	var events: Array = []
	var queue: Array = [{"pos": origin, "step": 1, "inbound": null, "inbound_power": null}]

	while not queue.is_empty():
		var job: Dictionary = queue.pop_front()
		var step: int = int(job["step"])
		if step > CRTypes.CASCADE_DEPTH_CAP:
			continue
		var pos: Vector2i = job["pos"]
		var card = CRBoard.get_cell(board, pos.x, pos.y)
		if card == null or bool(card["activated"]):
			continue

		card["activated"] = true
		var def: Dictionary = CRCards.get_card(str(card["def_id"]))
		var base_power := int(card["power"])
		if job["inbound_power"] != null:
			base_power = int(job["inbound_power"])
		var beam_power := int(round(float(base_power) * CRTypes.step_multiplier(step)))

		var out_dirs: Array[String] = []
		var inbound = job["inbound"]

		if inbound != null and str(def["node"]) == "splitter":
			if CRTypes.is_vertical(str(inbound)):
				out_dirs = ["left", "right"]
			else:
				out_dirs = ["up", "down"]
			events.append({"type": "split", "pos": pos, "from": inbound, "to": out_dirs})
		elif inbound != null and str(def["node"]) == "reflector":
			var bent: String
			if bool(def.get("reflect_clockwise", true)):
				bent = CRTypes.turn_clockwise(str(inbound))
			else:
				bent = CRTypes.turn_counter_clockwise(str(inbound))
			out_dirs = [bent]
			events.append({"type": "reflect", "pos": pos, "from": inbound, "to": out_dirs, "bonus": 3})
		else:
			out_dirs = CRTypes.list_arrows(def["arrows"])

		events.append({"type": "fire", "pos": pos, "arrows": out_dirs, "step": step, "power": beam_power})

		for dir in out_dirs:
			var power := beam_power
			if str(def["node"]) == "reflector" and inbound != null:
				power += 3
			if str(def["node"]) == "amplifier":
				power += 3

			var hit = CRBoard.find_first_hit(board, pos, dir)
			if hit == null:
				events.append({
					"type": "beam",
					"from": pos,
					"to": null,
					"dir": dir,
					"power": power,
					"step": step,
					"kind": "miss",
				})
				continue

			var hit_pos: Vector2i = hit["pos"]
			var target: Dictionary = hit["card"]
			events.append({
				"type": "beam",
				"from": pos,
				"to": hit_pos,
				"dir": dir,
				"power": power,
				"step": step,
				"kind": "hit",
			})

			var target_def: Dictionary = CRCards.get_card(str(target["def_id"]))
			var is_enemy := str(target["owner"]) != firer_owner
			var strike := power
			if str(target_def["node"]) == "amplifier":
				strike += 3
			if str(target_def["node"]) == "reflector":
				strike += 3

			var should_trigger := false
			if is_enemy:
				target["power"] = int(target["power"]) - strike
				events.append({
					"type": "damage",
					"pos": hit_pos,
					"amount": strike,
					"remaining": maxi(0, int(target["power"])),
				})
				if int(target["power"]) <= 0:
					target["owner"] = firer_owner
					target["power"] = 1
					events.append({"type": "capture", "pos": hit_pos, "new_owner": firer_owner})
				should_trigger = true
			else:
				events.append({"type": "relay", "pos": hit_pos})
				should_trigger = true

			if should_trigger and not bool(target["activated"]) and step < CRTypes.CASCADE_DEPTH_CAP:
				var use_inbound := str(target_def["node"]) == "splitter" or str(target_def["node"]) == "reflector"
				queue.append({
					"pos": hit_pos,
					"step": step + 1,
					"inbound": dir if use_inbound else null,
					"inbound_power": strike if use_inbound else null,
				})

	return {"board": board, "events": events}
