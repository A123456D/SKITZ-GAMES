class_name SampleUiCatalog
extends Resource
## SHIFTR-flavored sample meta data so menus aren't blank lorem.

@export var daily: DailyChallengeDef
@export var chapters: Array[ChapterDef] = []
@export var cosmetics: Array[CosmeticItemDef] = []
@export var achievements: Array[AchievementDef] = []
@export var leaderboard_global: Array[LeaderboardEntryDef] = []
@export var leaderboard_friends: Array[LeaderboardEntryDef] = []
@export var hint_pack: HintPackDef


func ensure_populated() -> void:
	## Always rebuild from code so authored campaign + honest LB stay current
	## (resource .tres may hold older stubs).
	var builtin := make_builtin()
	daily = builtin.daily
	chapters = builtin.chapters
	cosmetics = builtin.cosmetics
	achievements = builtin.achievements
	leaderboard_global = builtin.leaderboard_global
	leaderboard_friends = builtin.leaderboard_friends
	hint_pack = builtin.hint_pack


func chapter_by_id(id: StringName) -> ChapterDef:
	for c in chapters:
		if c and c.id == id:
			return c
	return chapters[0] if not chapters.is_empty() else null


static func make_builtin() -> SampleUiCatalog:
	var cat := SampleUiCatalog.new()
	cat.daily = _make_daily()
	cat.chapters = _make_chapters()
	cat.cosmetics = _make_cosmetics()
	cat.achievements = _make_achievements()
	cat.leaderboard_global = _make_lb_global()
	cat.leaderboard_friends = _make_lb_friends()
	cat.hint_pack = _make_hints()
	return cat


static func _make_daily() -> DailyChallengeDef:
	var d := DailyChallengeDef.new()
	d.seed_label = "2026-07-24"
	d.title = "Signal Drift"
	d.blurb = "Align the lattice before the beam fades. Fewest moves ranks first."
	d.grid_size = "5×5"
	d.soft_par = 11
	d.hard_par = 7
	d.attempts_left = 3
	d.streak = 4
	d.reset_hours = 11
	d.reset_minutes = 42
	d.personal_best_moves = -1
	return d


static func _make_chapters() -> Array[ChapterDef]:
	## Signal Awakening is the authored vertical-slice chapter; later chapters stay stubs.
	var out: Array[ChapterDef] = []
	out.append(CampaignLevelCatalog.make_signal_chapter())
	out.append(CampaignLevelCatalog.make_stub_chapter(
		CampaignLevelCatalog.CHAPTER_LATTICE, "Lattice Depths", "Unlock by clearing Signal", false
	))
	out.append(CampaignLevelCatalog.make_stub_chapter(
		CampaignLevelCatalog.CHAPTER_ANCHOR, "Anchor Protocol", "Cells that refuse to move", false
	))
	return out


## Apply SaveService stars / unlocks onto chapter defs (call when opening World Map / Level Select).
func hydrate_campaign_progress(save: SaveService) -> void:
	if save == null:
		return
	for chapter in chapters:
		if chapter == null or chapter.levels.is_empty():
			continue
		var ids: Array = []
		for lv in chapter.levels:
			if lv:
				ids.append(lv.id)
		var earned := 0
		var cleared := 0
		for i in range(chapter.levels.size()):
			var lv: LevelEntryDef = chapter.levels[i]
			if lv == null:
				continue
			lv.stars = save.get_level_stars(chapter.id, lv.id)
			lv.locked = not save.is_level_unlocked(chapter.id, ids, i)
			earned += lv.stars
			if lv.stars > 0:
				cleared += 1
		chapter.stars_earned = earned
		chapter.stars_total = chapter.levels.size() * 3
		chapter.progress = float(cleared) / float(maxi(1, chapter.levels.size()))
	## Lattice unlocks when Signal is fully cleared.
	var signal_ids: Array = []
	for lid in CampaignLevelCatalog.signal_level_ids():
		signal_ids.append(lid)
	var signal_done := save.is_chapter_complete(CampaignLevelCatalog.CHAPTER_SIGNAL, signal_ids)
	for chapter in chapters:
		if chapter and chapter.id == CampaignLevelCatalog.CHAPTER_LATTICE:
			chapter.unlocked = signal_done
			chapter.subtitle = "Pars get honest" if signal_done else "Unlock by clearing Signal"


static func _make_cosmetics() -> Array[CosmeticItemDef]:
	var out: Array[CosmeticItemDef] = []
	out.append(_cosmetic(&"trail_signal", "Signal Trace", CosmeticItemDef.Kind.SHIFT_TRAIL,
		"Mint streak that follows every wrap.", true, true, 0, 0, Color("2FE0C5")))
	out.append(_cosmetic(&"frame_steel", "Steel Bezel", CosmeticItemDef.Kind.BOARD_FRAME,
		"Quiet charcoal frame with hairline beam.", true, false, 180, 0, Color("7A8FA3")))
	out.append(_cosmetic(&"skin_prism", "Prism Glass", CosmeticItemDef.Kind.TILE_SKIN,
		"Soft edge light on every tile.", false, false, 0, 8, Color("5EEAD4")))
	out.append(_cosmetic(&"fanfare_clear", "Clear Chord", CosmeticItemDef.Kind.WIN_FANFARE,
		"Short major settle when the board locks.", true, false, 240, 0, Color("E8EEF4")))
	out.append(_cosmetic(&"ripple_pulse", "Pulse Ripple", CosmeticItemDef.Kind.TOUCH_RIPPLE,
		"Touch confirmation ring, colorblind-safe.", false, false, 120, 0, Color("4AF0D4")))
	out.append(_cosmetic(&"trail_ember", "Ember Drift", CosmeticItemDef.Kind.SHIFT_TRAIL,
		"Warm warn-tint trail for late chapters.", false, false, 0, 14, Color("FF6A3D")))
	return out


static func _cosmetic(
	id: StringName, name: String, kind: CosmeticItemDef.Kind, blurb: String,
	owned: bool, equipped: bool, sparks: int, prisms: int, accent: Color
) -> CosmeticItemDef:
	var c := CosmeticItemDef.new()
	c.id = id
	c.display_name = name
	c.kind = kind
	c.blurb = blurb
	c.owned = owned
	c.equipped = equipped
	c.spark_cost = sparks
	c.prism_cost = prisms
	c.accent = accent
	return c


static func _make_achievements() -> Array[AchievementDef]:
	var out: Array[AchievementDef] = []
	out.append(_ach(&"first_shift", "Kinetic", "Perform your first shift.", AchievementDef.Tier.BRONZE, 1, 1, true, "Day 1"))
	out.append(_ach(&"par_novice", "On Par", "Earn 10× three-star clears.", AchievementDef.Tier.SILVER, 6, 10, false, ""))
	out.append(_ach(&"optimalist", "Optimalist", "Collect 5 Mastery Medals.", AchievementDef.Tier.GOLD, 2, 5, false, ""))
	out.append(_ach(&"daily_week", "Signal Keeper", "Hold a 7-day daily streak.", AchievementDef.Tier.SILVER, 4, 7, false, ""))
	out.append(_ach(&"cascade_10", "Chain Reaction", "Reach cascade ×10 in Endless.", AchievementDef.Tier.GOLD, 0, 1, false, ""))
	out.append(_ach(&"no_undo_chapter", "Pure", "Finish a chapter with 0 undos.", AchievementDef.Tier.GOLD, 0, 1, false, ""))
	out.append(_ach(&"zen_hour", "Still Mind", "60 minutes in Zen cumulative.", AchievementDef.Tier.BRONZE, 22, 60, false, ""))
	out.append(_ach(&"speed_daily", "Lightning Trace", "Clear a Daily under 20s.", AchievementDef.Tier.GOLD, 0, 1, false, ""))
	out.append(_ach(&"completionist", "Full Spectrum", "100% Campaign stars.", AchievementDef.Tier.PLATINUM, 42, 135, false, ""))
	return out


static func _ach(
	id: StringName, title: String, desc: String, tier: AchievementDef.Tier,
	progress: int, target: int, unlocked: bool, when: String
) -> AchievementDef:
	var a := AchievementDef.new()
	a.id = id
	a.title = title
	a.description = desc
	a.tier = tier
	a.progress = progress
	a.target = target
	a.unlocked = unlocked
	a.unlocked_label = when
	return a


static func _make_lb_global() -> Array[LeaderboardEntryDef]:
	## Empty by default — Leaderboards screen shows local cache only (no fake online ranks).
	return []


static func _make_lb_friends() -> Array[LeaderboardEntryDef]:
	return []


static func _make_hints() -> HintPackDef:
	var pack := HintPackDef.new()
	pack.level_id = &"ch_signal_01"
	pack.level_title = "First Shift"
	var steps: Array[HintStepDef] = []
	steps.append(_hint(1, "Nudge", "The bottom row wants three B tiles — one row swipe does it.", 0, 0))
	steps.append(_hint(2, "Direction", "Swipe row 2 left (or column that completes the band).", 1, 40))
	steps.append(_hint(3, "Stronger", "One optimal move: row 1 toward the empty B seat.", 2, 80))
	pack.steps = steps
	return pack


static func _hint(idx: int, title: String, body: String, spoiler: int, cost: int) -> HintStepDef:
	var h := HintStepDef.new()
	h.step_index = idx
	h.title = title
	h.body = body
	h.spoiler_level = spoiler
	h.spark_cost = cost
	return h
