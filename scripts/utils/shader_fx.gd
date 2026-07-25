class_name ShaderFx
extends Object
## Safe ShaderMaterial load for canvas post-FX. Prefer skip over white-screen on bad shaders.
## Godot .gdshader comments must use // — ## is GDScript-only and fails RD compile (version_get_shader null).


static func load_material(tres_path: String, shader_path: String = "") -> ShaderMaterial:
	if not tres_path.is_empty() and ResourceLoader.exists(tres_path):
		var res := load(tres_path)
		if res is ShaderMaterial:
			var src := res as ShaderMaterial
			if src.shader != null and _shader_code_ok(src.shader.code):
				return src.duplicate() as ShaderMaterial
			push_warning("SHIFTR: ShaderMaterial has invalid/missing shader: %s" % tres_path)
	if not shader_path.is_empty() and ResourceLoader.exists(shader_path):
		var sh := load(shader_path) as Shader
		if sh != null and _shader_code_ok(sh.code):
			var mat := ShaderMaterial.new()
			mat.shader = sh
			return mat
		push_warning("SHIFTR: shader load/compile guard failed: %s" % shader_path)
	elif not tres_path.is_empty() or not shader_path.is_empty():
		push_warning("SHIFTR: shader material not found (tres=%s shader=%s)" % [tres_path, shader_path])
	return null


static func _shader_code_ok(code: String) -> bool:
	if code.is_empty():
		return false
	# Reject GDScript doc comments leaked into .gdshader (breaks tokenizer on '#').
	if code.contains("##"):
		return false
	# Godot 4.7 RD: return inside fragment() fails compile -> version_get_shader null spam.
	if code.contains("void fragment()") and _fragment_has_return(code):
		return false
	return code.contains("shader_type")


static func _fragment_has_return(code: String) -> bool:
	var idx := code.find("void fragment()")
	if idx < 0:
		return false
	var body := code.substr(idx)
	# Rough guard: any bare 'return;' after fragment entry.
	return body.contains("return;")
