#!/usr/bin/env python3
"""Generate tiny procedural WAV SFX for SHIFTR feel system.
Run: python tools/developer/generate_feel_sfx.py
Outputs: assets/audio/sfx/shift_{whoosh,tick,land,combo}.wav
FeelAudio loads these paths; ProceduralSfx is the runtime fallback.
"""
from __future__ import annotations
import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "audio" / "sfx"
RATE = 22050


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = bytearray()
        for s in samples:
            v = max(-1.0, min(1.0, s))
            frames += struct.pack("<h", int(v * 32767))
        w.writeframes(frames)
    print(f"wrote {path} ({len(samples)} samples)")


def whoosh() -> list[float]:
    dur = 0.09
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        env = math.sin(math.pi * t / dur) * math.exp(-t * 14.0)
        f0 = 420.0 + t * 900.0
        noise = ((i * 1103515245 + 12345) & 0x7fff) / 32767.0 * 2.0 - 1.0
        out.append((math.sin(2 * math.pi * f0 * t) * 0.55 + noise * 0.35) * env * 0.55)
    return out


def tick() -> list[float]:
    dur = 0.035
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * 90.0)
        out.append(math.sin(2 * math.pi * 1800.0 * t) * env * 0.45)
    return out


def land() -> list[float]:
    dur = 0.07
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * 42.0)
        body = math.sin(2 * math.pi * 110.0 * t) * 0.7 + math.sin(2 * math.pi * 220.0 * t) * 0.25
        click = math.sin(2 * math.pi * 1400.0 * t) * math.exp(-t * 120.0) * 0.35
        out.append((body + click) * env * 0.6)
    return out


def combo() -> list[float]:
    dur = 0.12
    n = int(dur * RATE)
    notes = [523.25, 659.25, 783.99]
    out = []
    for i in range(n):
        t = i / RATE
        v = 0.0
        for ni, freq in enumerate(notes):
            start = ni * 0.028
            if t < start:
                continue
            lt = t - start
            env = math.exp(-lt * 18.0) * math.sin(math.pi * min(1.0, lt / 0.08))
            v += math.sin(2 * math.pi * freq * lt) * env
        out.append(v * 0.35)
    return out


def main() -> None:
    write_wav(OUT / "shift_whoosh.wav", whoosh())
    write_wav(OUT / "shift_tick.wav", tick())
    write_wav(OUT / "shift_land.wav", land())
    write_wav(OUT / "shift_combo.wav", combo())


if __name__ == "__main__":
    main()
