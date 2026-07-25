extends SceneTree
## Offline catalog builder.
## Usage:
##   godot --headless -s res://tools/developer/generate_puzzle_catalog.gd
## Optional args after `--`:
##   --count=2000 --difficulty=3 --base-seed=42 --bake=24 --out-dir=res://resources/puzzles/generated

func _initialize() -> void:
	var count := 2000
	var difficulty := 3
	var base_seed := 42
	var bake := 24
	var out_dir := "res://resources/puzzles/generated"

	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--count="):
			count = int(arg.get_slice("=", 1))
		elif arg.begins_with("--difficulty="):
			difficulty = int(arg.get_slice("=", 1))
		elif arg.begins_with("--base-seed="):
			base_seed = int(arg.get_slice("=", 1))
		elif arg.begins_with("--bake="):
			bake = int(arg.get_slice("=", 1))
		elif arg.begins_with("--out-dir="):
			out_dir = arg.get_slice("=", 1)

	print("PuzzleCatalog: generating %d seeds @ difficulty %d (base=%d)" % [count, difficulty, base_seed])
	var builder := PuzzleCatalogBuilder.new()
	var last_pct := -1
	builder.progress.connect(func(done: int, total: int, unique: int) -> void:
		var pct := int(100.0 * float(done) / float(maxi(1, total)))
		if pct != last_pct and pct % 10 == 0:
			last_pct = pct
			print("  %d%% (%d/%d unique=%d)" % [pct, done, total, unique])
	)

	var params := PuzzleGenParams.from_difficulty(difficulty)
	# Catalog builds can skip strict score band retries for throughput; solvability is by construction.
	params.regen_attempts = 4

	var entries: Array = builder.build_seed_catalog(base_seed, count, difficulty, params)
	var catalog_path := out_dir.path_join("catalog_d%d_n%d.json" % [difficulty, entries.size()])
	var err := builder.write_json_catalog(catalog_path, entries)
	if err != OK:
		printerr("Failed writing catalog: ", err)
		quit(1)
		return
	print("Wrote ", catalog_path, " rate=", PuzzleCatalogBuilder.uniqueness_rate(entries))

	if bake > 0:
		var defs := builder.build_puzzle_defs(base_seed + 10000, bake, difficulty, params)
		var bake_path := out_dir.path_join("sample_baked_d%d_n%d.json" % [difficulty, defs.size()])
		err = builder.write_baked_json(bake_path, defs)
		if err != OK:
			printerr("Failed writing baked sample: ", err)
			quit(1)
			return
		print("Wrote ", bake_path)

	print("PuzzleCatalog: done")
	quit(0)
