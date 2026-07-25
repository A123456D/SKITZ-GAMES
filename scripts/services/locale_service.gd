class_name LocaleService
extends RefCounted
## Translation bootstrap + locale preference.
## Registers en/es/fr from localization/shiftr.csv at runtime so we never depend on
## loading the CSV as a Translation resource (that spam "Failed loading resource").

signal locale_changed(locale: String)

const SUPPORTED: Array[String] = ["en", "es", "fr"]
const FALLBACK := "en"
const CSV_PATH := "res://localization/shiftr.csv"

var save: SaveService = null
var current: String = FALLBACK
var _registered: bool = false


func configure(p_save: SaveService) -> void:
	save = p_save


func bootstrap() -> void:
	## Call once from GameServices. Prefer project .translation remaps when present;
	## always ensure CSV rows are registered so headless / fresh clones work.
	_ensure_translations_registered()
	var preferred := ""
	if save and save.profile.has("locale"):
		preferred = str(save.profile.get("locale", ""))
	if preferred.is_empty():
		preferred = OS.get_locale_language()
	set_locale(preferred, false)


func set_locale(locale: String, persist: bool = true) -> void:
	var code := locale
	if code.length() > 2:
		code = code.substr(0, 2)
	if not SUPPORTED.has(code):
		code = FALLBACK
	current = code
	TranslationServer.set_locale(code)
	if persist and save:
		save.profile["locale"] = code
		save.save_local()
	locale_changed.emit(code)


func tr_key(key: StringName, src := "") -> String:
	## Prefer TranslationServer; fall back to src or key string.
	var t := TranslationServer.translate(String(key))
	if t == String(key) and not src.is_empty():
		return src
	return t


func supported_labels() -> PackedStringArray:
	return PackedStringArray(["English", "Español", "Français"])


func index_of_current() -> int:
	var i := SUPPORTED.find(current)
	return i if i >= 0 else 0


func _ensure_translations_registered() -> void:
	if _registered:
		return
	_registered = true
	## Optional: use Godot-imported .translation remaps when the editor/CI imported them.
	for code in SUPPORTED:
		var path := "res://localization/shiftr.%s.translation" % code
		if ResourceLoader.exists(path):
			var res: Resource = load(path)
			if res is Translation:
				TranslationServer.add_translation(res as Translation)
	## Always overlay CSV so missing imports still work and CSV edits win without reimport.
	_register_from_csv(CSV_PATH)


func _register_from_csv(path: String) -> void:
	if not FileAccess.file_exists(path):
		push_warning("LocaleService: missing %s" % path)
		return
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		push_warning("LocaleService: empty %s" % path)
		return
	## Strip UTF-8 BOM if present.
	if text.begins_with("\ufeff"):
		text = text.substr(1)
	var rows := _parse_csv(text)
	if rows.is_empty():
		return
	var header: PackedStringArray = rows[0]
	if header.is_empty() or header[0] != "keys":
		push_warning("LocaleService: CSV header must start with 'keys'")
		return
	var locale_cols: Dictionary = {} ## locale -> column index
	for i in range(1, header.size()):
		var loc := String(header[i]).strip_edges()
		if SUPPORTED.has(loc):
			locale_cols[loc] = i
	var translations: Dictionary = {} ## locale -> Translation
	for loc in locale_cols.keys():
		var t := Translation.new()
		t.locale = String(loc)
		translations[loc] = t
	for r in range(1, rows.size()):
		var row: PackedStringArray = rows[r]
		if row.is_empty():
			continue
		var key := String(row[0]).strip_edges()
		if key.is_empty() or key.begins_with("#"):
			continue
		for loc in translations.keys():
			var col: int = int(locale_cols[loc])
			var msg := ""
			if col < row.size():
				msg = String(row[col])
			if msg.is_empty() and loc != FALLBACK and locale_cols.has(FALLBACK):
				var en_col: int = int(locale_cols[FALLBACK])
				if en_col < row.size():
					msg = String(row[en_col])
			(translations[loc] as Translation).add_message(key, msg)
	for loc in translations.keys():
		TranslationServer.add_translation(translations[loc] as Translation)


## Minimal RFC4180-ish CSV parser (quoted fields, commas, CRLF).
func _parse_csv(text: String) -> Array[PackedStringArray]:
	var rows: Array[PackedStringArray] = []
	var row := PackedStringArray()
	var field := ""
	var i := 0
	var in_quotes := false
	while i < text.length():
		var ch := text[i]
		if in_quotes:
			if ch == "\"":
				if i + 1 < text.length() and text[i + 1] == "\"":
					field += "\""
					i += 2
					continue
				in_quotes = false
				i += 1
				continue
			field += ch
			i += 1
			continue
		match ch:
			"\"":
				in_quotes = true
				i += 1
			",":
				row.append(field)
				field = ""
				i += 1
			"\r":
				i += 1
			"\n":
				row.append(field)
				field = ""
				if not (row.size() == 1 and String(row[0]).is_empty()):
					rows.append(row)
				row = PackedStringArray()
				i += 1
			_:
				field += ch
				i += 1
	row.append(field)
	if not (row.size() == 1 and String(row[0]).is_empty()):
		rows.append(row)
	return rows
