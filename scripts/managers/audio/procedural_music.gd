class_name ProceduralMusic
extends RefCounted
## Runtime looping stem / stinger generators when shipped WAVs are missing.
## Swap by dropping real stems under assets/audio/music/ — see docs/AUDIO_SYSTEM.md.

enum Stem { AMBIENT, BED, TENSION, VICTORY, FAILURE }


static func make_stem(kind: Stem, sample_rate: int = 22050) -> AudioStreamWAV:
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = false
	var data: PackedByteArray
	match kind:
		Stem.AMBIENT:
			data = _pad(sample_rate, 4.0, [110.0, 164.81], 0.18, 0.35)
		Stem.BED:
			data = _pad(sample_rate, 4.0, [220.0, 277.18, 329.63], 0.22, 0.55)
		Stem.TENSION:
			data = _pad(sample_rate, 2.0, [185.0, 277.18, 370.0], 0.2, 1.2)
		Stem.VICTORY:
			data = _arpeggio(sample_rate, [523.25, 659.25, 783.99, 1046.5], 0.32, 0.045)
		Stem.FAILURE:
			data = _arpeggio(sample_rate, [392.0, 311.13, 246.94], 0.28, 0.06)
	stream.data = data
	var n := data.size() / 2
	if kind == Stem.AMBIENT or kind == Stem.BED or kind == Stem.TENSION:
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = n
	return stream


static func _pad(rate: int, dur: float, freqs: Array, amp: float, lfo_hz: float) -> PackedByteArray:
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var env := 0.85 + 0.15 * sin(TAU * lfo_hz * t)
		var v := 0.0
		for f in freqs:
			v += sin(TAU * float(f) * t)
		v /= float(maxi(1, freqs.size()))
		# Soft edge for seamless loop.
		var edge := 1.0
		var fade := 0.04
		if t < fade:
			edge = t / fade
		elif t > dur - fade:
			edge = (dur - t) / fade
		samples[i] = v * amp * env * edge
	return _to_pcm16(samples)


static func _arpeggio(rate: int, notes: Array, dur: float, step: float) -> PackedByteArray:
	var n := int(dur * rate)
	var samples := PackedFloat32Array()
	samples.resize(n)
	for i in n:
		var t := float(i) / float(rate)
		var v := 0.0
		for ni in notes.size():
			var start := float(ni) * step
			if t < start:
				continue
			var lt := t - start
			var env := exp(-lt * 7.5) * sin(PI * minf(1.0, lt / 0.14))
			v += sin(TAU * float(notes[ni]) * lt) * env
		samples[i] = v * 0.3
	return _to_pcm16(samples)


static func _to_pcm16(samples: PackedFloat32Array) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(samples.size() * 2)
	for i in samples.size():
		var s := clampf(samples[i], -1.0, 1.0)
		out.encode_s16(i * 2, int(s * 32767.0))
	return out
