class_name LeaderboardService
extends RefCounted
## Daily / Endless score submit + fetch with offline local cache.
## Ranking: fewest moves first, then time-to-solve (GDD §6.2).

signal scores_updated(board_id: StringName, entries: Array)

const BOARD_DAILY := &"daily_moves"
const BOARD_ENDLESS := &"endless_score"

var gateway: PlatformGateway = null
var save: SaveService = null
## board_id -> Array[Dictionary]
var _cache: Dictionary = {}


func configure(p_gateway: PlatformGateway, p_save: SaveService) -> void:
	gateway = p_gateway
	save = p_save
	if save and save.profile.has("leaderboard_cache"):
		_cache = save.profile["leaderboard_cache"].duplicate(true)


func submit_daily(moves: int, time_sec: float, seed_label: String = "") -> Error:
	## Lower score is better for daily — encode as moves * 1_000_000 + ms.
	var score := moves * 1_000_000 + int(clampf(time_sec, 0.0, 999.0) * 1000.0)
	var meta := {"moves": moves, "time_sec": time_sec, "seed": seed_label, "mode": "daily"}
	_cache_self(BOARD_DAILY, score, meta)
	_persist_cache()
	if gateway:
		return gateway.submit_score(BOARD_DAILY, score, meta)
	return OK


func submit_endless(score: int, cascade_peak: int = 0, moves: int = 0) -> Error:
	## Higher wave/score ranks first. `cascade_peak` = peak wave; `moves` optional meta.
	var meta := {
		"cascade_peak": cascade_peak,
		"moves": moves,
		"mode": "endless",
	}
	_cache_self(BOARD_ENDLESS, score, meta)
	_persist_cache()
	if gateway:
		return gateway.submit_score(BOARD_ENDLESS, score, meta)
	return OK


## Local rank of the cached self entry (1-based), or -1 if absent.
func self_rank(board_id: StringName) -> int:
	for e in cached(board_id):
		if e is Dictionary and bool(e.get("is_self", false)):
			return int(e.get("rank", -1))
	return -1


func fetch(board_id: StringName, friends_only: bool = false, limit: int = 20) -> Array:
	var remote: Array = []
	if gateway:
		remote = gateway.fetch_scores(board_id, friends_only, limit)
	if remote.is_empty():
		remote = _cache.get(String(board_id), [])
		if remote is Array:
			scores_updated.emit(board_id, remote)
			return remote
		return []
	_cache[String(board_id)] = remote
	_persist_cache()
	scores_updated.emit(board_id, remote)
	return remote


func cached(board_id: StringName) -> Array:
	var v: Variant = _cache.get(String(board_id), [])
	return v if v is Array else []


func _cache_self(board_id: StringName, score: int, meta: Dictionary) -> void:
	var entries: Array = _cache.get(String(board_id), [])
	if not (entries is Array):
		entries = []
	var self_entry := {
		"rank": 0,
		"player_name": "You",
		"score": score,
		"moves": int(meta.get("moves", 0)),
		"time_sec": float(meta.get("time_sec", 0.0)),
		"is_self": true,
		"is_friend": false,
	}
	var filtered: Array = []
	for e in entries:
		if e is Dictionary and not bool(e.get("is_self", false)):
			filtered.append(e)
	filtered.append(self_entry)
	filtered.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		if board_id == BOARD_DAILY:
			return int(a.get("score", 0)) < int(b.get("score", 0))
		return int(a.get("score", 0)) > int(b.get("score", 0))
	)
	for i in range(filtered.size()):
		filtered[i]["rank"] = i + 1
	_cache[String(board_id)] = filtered


func _persist_cache() -> void:
	if save == null:
		return
	save.profile["leaderboard_cache"] = _cache.duplicate(true)
	save.save_local()
