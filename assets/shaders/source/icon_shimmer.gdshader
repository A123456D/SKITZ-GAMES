shader_type canvas_item;
// Optional diagonal shimmer sweep for icons / confirmations. Disable on Low tier.
// strength~0 early-outs to a single texture sample (Battery / reduce-motion).
// Note: Godot 4.7 RD forbids return inside fragment().

uniform vec4 shimmer_color : source_color = vec4(0.75, 0.95, 0.92, 0.55);
uniform float speed : hint_range(0.0, 3.0) = 0.45;
uniform float band_width : hint_range(0.02, 0.4) = 0.12;
uniform float strength : hint_range(0.0, 1.5) = 0.55;
uniform float angle : hint_range(-1.5, 1.5) = 0.7;

void fragment() {
	mediump vec4 tex = texture(TEXTURE, UV) * COLOR;
	mediump vec4 out_color = tex;
	if (strength >= 0.001) {
		mediump float axis = UV.x * cos(angle) + UV.y * sin(angle);
		mediump float phase = fract(axis * 0.85 - TIME * speed);
		mediump float band = 1.0 - smoothstep(0.0, band_width, abs(phase - 0.5));
		band = pow(band, 2.0);
		mediump vec3 col = tex.rgb + shimmer_color.rgb * band * strength * shimmer_color.a * tex.a;
		out_color = vec4(col, tex.a);
	}
	COLOR = out_color;
}
