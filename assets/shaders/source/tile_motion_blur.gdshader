shader_type canvas_item;
// Directional streak / soft motion blur for 2D tiles.
// Instance uniforms keep ONE shared ShaderMaterial across all tiles (batch-friendly).
// Toggle off on low-end by setting blur_amount = 0 (single texture read).
// Note: Godot 4.7 RD forbids return inside fragment().

instance uniform vec2 blur_dir = vec2(0.0, 0.0);
instance uniform float blur_amount : hint_range(0.0, 2.0) = 0.0;
uniform int samples : hint_range(1, 9) = 5;

void fragment() {
	mediump float amt = blur_amount;
	mediump vec4 out_color = texture(TEXTURE, UV) * COLOR;
	if (amt >= 0.001) {
		mediump vec2 dir = blur_dir * amt * 0.04;
		mediump vec4 acc = vec4(0.0);
		mediump float wsum = 0.0;
		int n = samples;
		for (int i = 0; i < 9; i++) {
			if (i < n) {
				mediump float t = float(i) / float(max(n - 1, 1)) - 0.5;
				mediump float w = 1.0 - abs(t) * 1.4;
				w = max(w, 0.05);
				acc += texture(TEXTURE, UV + dir * t) * w;
				wsum += w;
			}
		}
		out_color = (acc / max(wsum, 0.0001)) * COLOR;
	}
	COLOR = out_color;
}
