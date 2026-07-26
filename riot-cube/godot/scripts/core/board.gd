class_name RiotBoard
extends RefCounted

## Flat Phase-1 board: twist rows/cols, match 3+, cascade.


static func create_empty(size: int) -> Array:
	var board: Array = []
	for _r in size:
		var row: Array = []
		row.resize(size)
		for c in size:
			row[c] = null
		board.append(row)
	return board


static func clone_board(board: Array) -> Array:
	var out: Array = []
	for row in board:
		out.append((row as Array).duplicate())
	return out


static func size_of(board: Array) -> int:
	return board.size()


static func mulberry32(seed: int) -> Callable:
	var state := {"t": seed & 0xFFFFFFFF}
	return func() -> float:
		var t: int = int(state["t"]) + 0x6D2B79F5
		state["t"] = t & 0xFFFFFFFF
		var r: int = (t ^ (t >> 15)) * (1 | t)
		r = (r ^ (r + ((r ^ (r >> 7)) * (61 | r)))) & 0xFFFFFFFF
		return float((r ^ (r >> 14)) & 0xFFFFFFFF) / 4294967296.0


static func random_kind(rng: Callable, banned: PackedStringArray = PackedStringArray()) -> String:
	var pool: Array[String] = []
	for k in TileKind.ALL:
		if not banned.has(k):
			pool.append(k)
	if pool.is_empty():
		return TileKind.ALL[0]
	return pool[int(rng.call() * pool.size())]


static func generate_board(size: int, seed: int) -> Array:
	var rng := mulberry32(seed)
	var board := create_empty(size)
	for r in size:
		for c in size:
			var banned: PackedStringArray = PackedStringArray()
			if c >= 2 and board[r][c - 1] == board[r][c - 2]:
				banned.append(str(board[r][c - 1]))
			if r >= 2 and board[r - 1][c] == board[r - 2][c]:
				banned.append(str(board[r - 1][c]))
			board[r][c] = random_kind(rng, banned)
	return board


## twist: { "axis": "row"|"col", "index": int, "dir": 1|-1 }
static func twist_board(board: Array, twist: Dictionary) -> Array:
	var next := clone_board(board)
	var n := size_of(next)
	var dir: int = int(twist["dir"])
	var index: int = int(twist["index"])
	var shift: int = ((dir % n) + n) % n
	if str(twist["axis"]) == "row":
		var row: Array = next[index]
		var copy: Array = row.duplicate()
		for c in n:
			row[c] = copy[(c - shift + n) % n]
	else:
		var copy: Array = []
		for r in n:
			copy.append(next[r][index])
		for r in n:
			next[r][index] = copy[(r - shift + n) % n]
	return next


static func find_matches(board: Array) -> Array:
	var n := size_of(board)
	var groups: Array = []
	for r in n:
		var c := 0
		while c < n:
			var kind = board[r][c]
			if kind == null:
				c += 1
				continue
			var end := c + 1
			while end < n and board[r][end] == kind:
				end += 1
			if end - c >= 3:
				var cells: Array = []
				for i in range(c, end):
					cells.append({"r": r, "c": i})
				groups.append({"kind": kind, "cells": cells})
			c = end
	for c in n:
		var r := 0
		while r < n:
			var kind = board[r][c]
			if kind == null:
				r += 1
				continue
			var end := r + 1
			while end < n and board[end][c] == kind:
				end += 1
			if end - r >= 3:
				var cells: Array = []
				for i in range(r, end):
					cells.append({"r": i, "c": c})
				groups.append({"kind": kind, "cells": cells})
			r = end
	return groups


static func clear_matches(board: Array, groups: Array) -> Dictionary:
	var next := clone_board(board)
	var counts: Dictionary = {}
	var cell_count := 0
	var seen: Dictionary = {}
	for g in groups:
		for cell in g["cells"]:
			var key := "%d,%d" % [int(cell["r"]), int(cell["c"])]
			if seen.has(key):
				continue
			seen[key] = true
			var r: int = int(cell["r"])
			var c: int = int(cell["c"])
			var kind = next[r][c]
			if kind != null:
				counts[kind] = int(counts.get(kind, 0)) + 1
				next[r][c] = null
				cell_count += 1
	var cleared: Array = []
	for k in counts.keys():
		cleared.append({"kind": k, "count": counts[k]})
	return {"board": next, "cleared": cleared, "cell_count": cell_count}


static func apply_gravity(board: Array) -> Array:
	var n := size_of(board)
	var next := create_empty(n)
	for c in n:
		var stack: Array = []
		for r in range(n - 1, -1, -1):
			if board[r][c] != null:
				stack.append(board[r][c])
		for i in stack.size():
			next[n - 1 - i][c] = stack[i]
	return next


static func refill_board(board: Array, rng: Callable) -> Array:
	var n := size_of(board)
	var next := clone_board(board)
	for r in n:
		for c in n:
			if next[r][c] == null:
				next[r][c] = random_kind(rng)
	return next


static func resolve_board(board: Array, rng: Callable) -> Dictionary:
	var current := clone_board(board)
	var totals: Dictionary = {}
	var score_gain := 0
	var combo := 0
	while true:
		var groups := find_matches(current)
		if groups.is_empty():
			break
		combo += 1
		var cleared := clear_matches(current, groups)
		var gain: int = int(cleared["cell_count"]) * 10 * combo
		score_gain += gain
		for item in cleared["cleared"]:
			var k: String = str(item["kind"])
			totals[k] = int(totals.get(k, 0)) + int(item["count"])
		current = cleared["board"]
		current = apply_gravity(current)
		current = refill_board(current, rng)
	var total_cleared: Array = []
	for k in totals.keys():
		total_cleared.append({"kind": k, "count": totals[k]})
	return {
		"board": current,
		"total_cleared": total_cleared,
		"score_gain": score_gain,
		"combo": combo,
	}
