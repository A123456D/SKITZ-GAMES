shader_type canvas_item;
// Soft additive glow halo for tiles / UI chrome. Drive glow_strength from tokens.
// Early-out when glow_strength~0. pulse=0 skips TIME sin (Battery / reduce-motion).
// Note: Godot 4.7 RD forbids return inside fragment().

render_mode blend_add;

uniform vec4 glow_color : source_color = vec4(0.18, 0.88, 0.77, 1.0);
uniform float glow_strength : hint_range(0.0, 2.0) = 0.45;
uniform float glow_radius : hint_range(0.05, 1.5) = 0.55;
uniform float core_opacity : hint_range(0.0, 1.0) = 0.15;
uniform float pulse : hint_range(0.0, 1.0) = 0.0;
uniform float pulse_speed : hint_range(0.0, 4.0) = 1.2;

void fragment() {
	mediump float gs = glow_strength;
	mediump vec4 out_color = vec4(0.0);
	if (gs >= 0.001 || core_opacity >= 0.001) {
		mediump vec2 p = UV - vec2(0.5);
		mediump float d = length(p) * 2.0;
		mediump float pulse_amt = 1.0;
		if (pulse > 0.001) {
			pulse_amt = 1.0 + pulse * sin(TIME * pulse_speed * 6.28318) * 0.12;
		}
		mediump float halo = 1.0 - smoothstep(glow_radius * 0.35, glow_radius * pulse_amt, d);
		halo = pow(max(halo, 0.0), 1.6);
		mediump float core = 1.0 - smoothstep(0.0, 0.35, d);
		mediump vec3 col = glow_color.rgb * (halo * gs + core * core_opacity);
		mediump float a = (halo * gs * 0.85 + core * core_opacity) * glow_color.a;
		out_color = vec4(col, a) * COLOR;
	}
	COLOR = out_color;
}
