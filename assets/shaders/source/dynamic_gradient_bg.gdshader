shader_type canvas_item;
// Slow dynamic gradient + faint shift-grid + optional light beam planes.
// beams_enabled=0 and drift_speed=0: static wash (Low / Battery) - still one pass, fewer ops.

uniform vec4 color_a : source_color = vec4(0.039, 0.055, 0.078, 1.0);
uniform vec4 color_b : source_color = vec4(0.071, 0.102, 0.141, 1.0);
uniform vec4 color_c : source_color = vec4(0.055, 0.094, 0.125, 1.0);
uniform vec4 beam_color : source_color = vec4(0.18, 0.88, 0.77, 0.12);
uniform vec4 grid_color : source_color = vec4(0.45, 0.55, 0.62, 0.09);
uniform float grid_scale : hint_range(8.0, 128.0) = 48.0;
uniform float drift_speed : hint_range(0.0, 2.0) = 0.08;
uniform float beam_speed : hint_range(0.0, 2.0) = 0.05;
uniform float intensity : hint_range(0.0, 1.5) = 1.0;
uniform float beams_enabled : hint_range(0.0, 1.0) = 1.0;
uniform vec2 parallax_offset = vec2(0.0, 0.0);

void fragment() {
	mediump vec2 uv = UV + parallax_offset * 0.002;
	mediump float t = TIME * drift_speed;

	mediump vec2 g = uv * 1.15;
	if (drift_speed > 0.0001) {
		g += vec2(sin(t * 0.7) * 0.03, cos(t * 0.55) * 0.025);
	}
	mediump float wash = smoothstep(0.0, 1.0, g.y + sin(g.x * 2.2 + t) * 0.08);
	mediump vec3 col = mix(color_a.rgb, color_b.rgb, wash);
	col = mix(col, color_c.rgb, smoothstep(0.15, 0.95, length(g - vec2(0.55, 0.35))));

	mediump float vig = smoothstep(1.15, 0.35, length(uv - vec2(0.5, 0.48)));
	col *= mix(0.82, 1.0, vig);

	mediump vec2 gp = (uv + parallax_offset * 0.004) * (1.0 / max(grid_scale * SCREEN_PIXEL_SIZE.x, 0.0001));
	mediump vec2 gf = abs(fract(gp) - 0.5);
	mediump float line = 1.0 - smoothstep(0.0, 0.04, min(gf.x, gf.y));
	col = mix(col, grid_color.rgb, line * grid_color.a * intensity);

	if (beams_enabled > 0.5) {
		mediump float beam = sin((uv.x * 1.4 - uv.y * 0.9) * 3.14159 + TIME * beam_speed * 6.28318);
		beam = pow(max(beam, 0.0), 8.0);
		mediump float beam2 = sin((uv.x * 0.6 + uv.y * 1.1) * 2.0 - TIME * beam_speed * 4.0);
		beam2 = pow(max(beam2, 0.0), 12.0) * 0.55;
		col += beam_color.rgb * beam_color.a * (beam + beam2) * intensity;
	}

	COLOR = vec4(col, 1.0);
}
