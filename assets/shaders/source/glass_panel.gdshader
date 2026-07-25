shader_type canvas_item;
// Frosted glass panel: screen blur + tint + soft border highlight.
// Requires a BackBufferCopy behind this node for screen sampling.
// Low tier / battery: set blur_amount = 0 for tint-only glass (cheap).

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_linear;

uniform vec4 tint : source_color = vec4(0.12, 0.16, 0.20, 0.55);
uniform vec4 border_color : source_color = vec4(0.55, 0.72, 0.78, 0.28);
uniform vec4 glow_color : source_color = vec4(0.18, 0.88, 0.77, 0.15);
uniform float blur_amount : hint_range(0.0, 4.0) = 1.6;
uniform int blur_samples : hint_range(1, 9) = 5;
uniform float corner_softness : hint_range(0.0, 0.5) = 0.08;
uniform float border_width : hint_range(0.0, 0.08) = 0.012;
uniform float noise_strength : hint_range(0.0, 0.15) = 0.035;
uniform float time_scale : hint_range(0.0, 2.0) = 0.15;

float hash21(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void fragment() {
	mediump vec2 uv = SCREEN_UV;
	mediump vec4 blurred = vec4(0.0);
	mediump float wsum = 0.0;
	int n = blur_samples;
	mediump float amt = blur_amount;

	if (amt < 0.001 || n <= 1) {
		// Tint-only path: one sample, no blur loop (Low / Battery).
		blurred = textureLod(screen_texture, uv, 0.0);
		wsum = 1.0;
	} else {
		for (int i = 0; i < 9; i++) {
			if (i >= n) {
				break;
			}
			mediump float t = float(i) / float(max(n - 1, 1)) - 0.5;
			mediump vec2 off = vec2(t, t * 0.65) * amt * SCREEN_PIXEL_SIZE * 48.0;
			mediump float w = 1.0 - abs(t) * 1.35;
			w = max(w, 0.05);
			blurred += textureLod(screen_texture, uv + off, 0.0) * w;
			blurred += textureLod(screen_texture, uv + vec2(off.y, -off.x), 0.0) * w;
			wsum += w * 2.0;
		}
		blurred /= wsum;
	}

	mediump float nse = 0.0;
	if (noise_strength > 0.001) {
		nse = hash21(UV * 180.0 + TIME * time_scale) * noise_strength;
	}
	mediump vec3 base = mix(blurred.rgb, tint.rgb, tint.a) + nse;

	mediump float edge_x = min(UV.x, 1.0 - UV.x);
	mediump float edge_y = min(UV.y, 1.0 - UV.y);
	mediump float edge = min(edge_x, edge_y);
	mediump float border = 1.0 - smoothstep(border_width, border_width + 0.01, edge);
	mediump float corner = smoothstep(0.0, corner_softness, edge_x) * smoothstep(0.0, corner_softness, edge_y);

	mediump vec3 col = mix(base, border_color.rgb, border * border_color.a);
	col += glow_color.rgb * glow_color.a * (1.0 - edge * 4.0) * 0.35;
	mediump float alpha = mix(tint.a + 0.2, 0.92, border) * corner;
	COLOR = vec4(col, clamp(alpha, 0.0, 1.0));
}
