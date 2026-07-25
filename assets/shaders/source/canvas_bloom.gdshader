shader_type canvas_item;
render_mode blend_add;
// Lightweight full-screen soft bloom via screen blur.
// Place on a ColorRect covering the viewport after BackBufferCopy.
// High/Med: enabled. Low / strength~0: early-out (no texture reads).
// quality_scale < 1 reduces effective samples (Med/Low/Battery mobile GPU).
// Note: Godot 4.7 RD forbids return inside fragment().

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_linear;

uniform float strength : hint_range(0.0, 2.0) = 0.45;
uniform float threshold : hint_range(0.0, 1.5) = 0.72;
uniform int samples : hint_range(1, 9) = 5;
uniform float quality_scale : hint_range(0.25, 1.0) = 1.0;
uniform vec4 tint : source_color = vec4(0.55, 0.95, 0.9, 1.0);

void fragment() {
	mediump float s = strength;
	mediump vec4 out_color = vec4(0.0);
	if (s >= 0.001) {
		mediump vec2 uv = SCREEN_UV;
		mediump vec4 acc = vec4(0.0);
		mediump float wsum = 0.0;
		int n = samples;
		if (quality_scale < 0.76) {
			n = min(n, 3);
		}
		if (quality_scale < 0.51) {
			n = min(n, 2);
		}
		for (int i = 0; i < 9; i++) {
			if (i < n) {
				mediump float t = float(i) / float(max(n - 1, 1)) - 0.5;
				mediump vec2 off = vec2(t, t * 0.75) * SCREEN_PIXEL_SIZE * (28.0 / max(quality_scale, 0.35)) * (1.0 + s);
				mediump float w = 1.0 - abs(t) * 1.2;
				w = max(w, 0.05);
				acc += textureLod(screen_texture, uv + off, 0.0) * w;
				acc += textureLod(screen_texture, uv + vec2(-off.y, off.x), 0.0) * w;
				wsum += w * 2.0;
			}
		}
		acc /= max(wsum, 0.0001);
		mediump float lum = dot(acc.rgb, vec3(0.299, 0.587, 0.114));
		mediump float mask = smoothstep(threshold, threshold + 0.35, lum);
		mediump vec3 bloom = acc.rgb * tint.rgb * mask * s;
		out_color = vec4(bloom, mask * s * 0.55);
	}
	COLOR = out_color;
}
