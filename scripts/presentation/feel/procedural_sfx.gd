class_name ProceduralSfx
extends RefCounted
## Generates short mono AudioStreamWAV buffers for feel / puzzle / UI.
## Prefer shipping files under res://assets/audio/; this is the always-available fallback.

enum Kind {
	WHOOSH, TICK, LAND, COMBO, SUB, UI, SOLVE, ERROR,
	LASER, SWITCH, BUTTON, PARTICLE,
}


static func make(kind: Kind, sample_rate: int = 22050) -> AudioStreamWAV:
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = false
	match kind:
		Kind.WHOOSH:
			stream.data = _whoosh(sample_rate)
		Kind.TICK:
			stream.data = _tick(sample_rate)
		Kind.LAND:
			stream.data = _land(sample_rate)
		Kind.COMBO:
			stream.data = _combo(sample_rate)
		Kind.SUB:
			stream.data = _sub(sample_rate)
		Kind.UI:
			stream.data = _ui(sample_rate)
		Kind.SOLVE:
			stream.data = _solve(sample_rate)
		Kind.ERROR:
			stream.data = _error(sample_rate)
		Kind.LASER:
			stream.data = _laser(sample_rate)
		Kind.SWITCH:
			stream.data = _switch(sample_rate)
		Kind.BUTTON:
			stream.data = _button(sample_rate)
		Kind.PARTICLE:
			stream.data = _particle(sample_rate)
	return stream


static func _whoosh(rate: int) -> PackedByteArray:
	var dur := 0.09
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := sin(PI * t / dur) * exp(-t * 14.0)
		var f0 := 420.0 + t * 900.0
		var noise := (randf() * 2.0 - 1.0) * 0.35
		samples[i] = (sin(TAU * f0 * t) * 0.55 + noise) * env * 0.55
	return _to_pcm16(samples)


static func _tick(rate: int) -> PackedByteArray:
	var dur := 0.035
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 90.0)
		samples[i] = sin(TAU * 1800.0 * t) * env * 0.45
	return _to_pcm16(samples)


static func _land(rate: int) -> PackedByteArray:
	var dur := 0.07
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 42.0)
		var body := sin(TAU * 110.0 * t) * 0.7 + sin(TAU * 220.0 * t) * 0.25
		var click := sin(TAU * 1400.0 * t) * exp(-t * 120.0) * 0.35
		samples[i] = (body + click) * env * 0.6
	return _to_pcm16(samples)


static func _combo(rate: int) -> PackedByteArray:
	var dur := 0.12
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	var notes := [523.25, 659.25, 783.99] # C5 E5 G5
	for i in n:
		var t := float(i) / float(rate)
		var v := 0.0
		for ni in notes.size():
			var start := float(ni) * 0.028
			if t < start:
				continue
			var lt := t - start
			var env := exp(-lt * 18.0) * sin(PI * minf(1.0, lt / 0.08))
			v += sin(TAU * notes[ni] * lt) * env
		samples[i] = v * 0.35
	return _to_pcm16(samples)


static func _sub(rate: int) -> PackedByteArray:
	var dur := 0.11
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 28.0) * sin(PI * minf(1.0, t / (dur * 0.85)))
		samples[i] = sin(TAU * 55.0 * t) * env * 0.7
	return _to_pcm16(samples)


static func _ui(rate: int) -> PackedByteArray:
	var dur := 0.04
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 70.0)
		samples[i] = (sin(TAU * 1200.0 * t) * 0.55 + sin(TAU * 2400.0 * t) * 0.2) * env * 0.4
	return _to_pcm16(samples)


static func _solve(rate: int) -> PackedByteArray:
	var dur := 0.28
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	var notes := [523.25, 659.25, 783.99, 1046.5] # C5 E5 G5 C6
	for i in n:
		var t := float(i) / float(rate)
		var v := 0.0
		for ni in notes.size():
			var start := float(ni) * 0.045
			if t < start:
				continue
			var lt := t - start
			var env := exp(-lt * 9.0) * sin(PI * minf(1.0, lt / 0.12))
			v += sin(TAU * notes[ni] * lt) * env
		samples[i] = v * 0.28
	return _to_pcm16(samples)


static func _error(rate: int) -> PackedByteArray:
	var dur := 0.08
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 36.0)
		var body := sin(TAU * 90.0 * t) * 0.55 + sin(TAU * 140.0 * t) * 0.3
		var noise := (randf() * 2.0 - 1.0) * 0.15 * exp(-t * 50.0)
		samples[i] = (body + noise) * env * 0.5
	return _to_pcm16(samples)


static func _laser(rate: int) -> PackedByteArray:
	var dur := 0.1
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := sin(PI * t / dur) * exp(-t * 8.0)
		var f0 := 880.0 + t * 1600.0
		samples[i] = (sin(TAU * f0 * t) * 0.5 + sin(TAU * f0 * 1.5 * t) * 0.2) * env * 0.4
	return _to_pcm16(samples)


static func _switch(rate: int) -> PackedByteArray:
	var dur := 0.05
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 55.0)
		samples[i] = (sin(TAU * 700.0 * t) * 0.45 + sin(TAU * 1400.0 * t) * 0.25) * env * 0.45
	return _to_pcm16(samples)


static func _button(rate: int) -> PackedByteArray:
	var dur := 0.045
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 65.0)
		samples[i] = (sin(TAU * 980.0 * t) * 0.5 + sin(TAU * 1960.0 * t) * 0.18) * env * 0.42
	return _to_pcm16(samples)


static func _particle(rate: int) -> PackedByteArray:
	var dur := 0.06
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := exp(-t * 40.0) * sin(PI * minf(1.0, t / 0.02))
		var noise := (randf() * 2.0 - 1.0) * 0.35
		samples[i] = (sin(TAU * 2400.0 * t) * 0.35 + noise) * env * 0.3
	return _to_pcm16(samples)


static func _to_pcm16(samples: PackedFloat32Array) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(samples.size() * 2)
	for i in samples.size():
		var s := clampf(samples[i], -1.0, 1.0)
		var v := int(s * 32767.0)
		out.encode_s16(i * 2, v)
	return out
