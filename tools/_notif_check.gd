extends SceneTree
func _initialize() -> void:
	var list: PackedStringArray = ClassDB.class_get_integer_constant_list("Node")
	for n in list:
		if String(n).contains("APPLICATION") or String(n).contains("FOCUS") or String(n).contains("WM_"):
			print(n, "=", ClassDB.class_get_integer_constant("Node", n))
	# PackedByteArray methods
	var p := PackedByteArray([1,2,3])
	print("has md5_text ", p.has_method("md5_text"))
	print("has md5_buffer ", p.has_method("md5_buffer"))
	print("has hex_encode ", p.has_method("hex_encode"))
	quit(0)
