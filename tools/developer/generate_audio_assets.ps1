# SHIFTR placeholder audio generator (PowerShell)
# Run: powershell -ExecutionPolicy Bypass -File tools/developer/generate_audio_assets.ps1
# Outputs SFX + music stems under assets/audio/. Replace with authored WAVs/OGGs anytime.

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root "project.godot"))) {
  $root = (Get-Location).Path
}
$sfxDir = Join-Path $root "assets\audio\sfx"
$uiDir = Join-Path $root "assets\audio\ui"
$musicDir = Join-Path $root "assets\audio\music"
New-Item -ItemType Directory -Force -Path $sfxDir, $uiDir, $musicDir | Out-Null
$rate = 22050

function Write-Wav([string]$path, [double[]]$samples, [bool]$loop = $false) {
  $n = $samples.Length
  $dataLen = $n * 2
  $bytes = New-Object byte[] (44 + $dataLen)
  $enc = [Text.Encoding]::ASCII
  [Array]::Copy($enc.GetBytes("RIFF"), 0, $bytes, 0, 4)
  [BitConverter]::GetBytes([int](36 + $dataLen)).CopyTo($bytes, 4)
  [Array]::Copy($enc.GetBytes("WAVE"), 0, $bytes, 8, 4)
  [Array]::Copy($enc.GetBytes("fmt "), 0, $bytes, 12, 4)
  [BitConverter]::GetBytes([int]16).CopyTo($bytes, 16)
  [BitConverter]::GetBytes([int16]1).CopyTo($bytes, 20)
  [BitConverter]::GetBytes([int16]1).CopyTo($bytes, 22)
  [BitConverter]::GetBytes([int]$rate).CopyTo($bytes, 24)
  [BitConverter]::GetBytes([int]($rate * 2)).CopyTo($bytes, 28)
  [BitConverter]::GetBytes([int16]2).CopyTo($bytes, 32)
  [BitConverter]::GetBytes([int16]16).CopyTo($bytes, 34)
  [Array]::Copy($enc.GetBytes("data"), 0, $bytes, 36, 4)
  [BitConverter]::GetBytes([int]$dataLen).CopyTo($bytes, 40)
  for ($i = 0; $i -lt $n; $i++) {
    $v = [math]::Max(-1.0, [math]::Min(1.0, $samples[$i]))
    $s = [int16]([math]::Round($v * 32767))
    [BitConverter]::GetBytes($s).CopyTo($bytes, 44 + $i * 2)
  }
  [IO.File]::WriteAllBytes($path, $bytes)
  Write-Host "wrote $path ($n samples)$(if ($loop) { ' [loop stem]' })"
}

function Gen-Pad([double]$dur, [double[]]$freqs, [double]$amp, [double]$lfo) {
  $n = [int]($dur * $rate); $a = New-Object double[] $n
  $fade = 0.04
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $env = 0.85 + 0.15 * [math]::Sin(2 * [math]::PI * $lfo * $t)
    $v = 0.0
    foreach ($f in $freqs) { $v += [math]::Sin(2 * [math]::PI * $f * $t) }
    $v /= [math]::Max(1, $freqs.Length)
    $edge = 1.0
    if ($t -lt $fade) { $edge = $t / $fade }
    elseif ($t -gt ($dur - $fade)) { $edge = ($dur - $t) / $fade }
    $a[$i] = $v * $amp * $env * $edge
  }
  return ,$a
}

function Gen-Arp([double[]]$notes, [double]$dur, [double]$step) {
  $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate; $v = 0.0
    for ($ni = 0; $ni -lt $notes.Length; $ni++) {
      $start = $ni * $step
      if ($t -lt $start) { continue }
      $lt = $t - $start
      $env = [math]::Exp(-$lt * 7.5) * [math]::Sin([math]::PI * [math]::Min(1.0, $lt / 0.14))
      $v += [math]::Sin(2 * [math]::PI * $notes[$ni] * $lt) * $env
    }
    $a[$i] = $v * 0.3
  }
  return ,$a
}

function Gen-Whoosh {
  $dur = 0.09; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $env = [math]::Sin([math]::PI * $t / $dur) * [math]::Exp(-$t * 14)
    $f0 = 420 + $t * 900
    $noise = ((($i * 1103515245 + 12345) -band 0x7fff) / 32767.0) * 2 - 1
    $a[$i] = (([math]::Sin(2 * [math]::PI * $f0 * $t) * 0.55) + $noise * 0.35) * $env * 0.55
  }
  return ,$a
}

function Gen-Tick {
  $dur = 0.035; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $a[$i] = [math]::Sin(2 * [math]::PI * 1800 * $t) * [math]::Exp(-$t * 90) * 0.45
  }
  return ,$a
}

function Gen-Land {
  $dur = 0.07; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $env = [math]::Exp(-$t * 42)
    $body = [math]::Sin(2 * [math]::PI * 110 * $t) * 0.7 + [math]::Sin(2 * [math]::PI * 220 * $t) * 0.25
    $click = [math]::Sin(2 * [math]::PI * 1400 * $t) * [math]::Exp(-$t * 120) * 0.35
    $a[$i] = ($body + $click) * $env * 0.6
  }
  return ,$a
}

function Gen-Combo {
  return ,(Gen-Arp @(523.25, 659.25, 783.99) 0.12 0.028)
}

function Gen-Laser {
  $dur = 0.1; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $env = [math]::Sin([math]::PI * $t / $dur) * [math]::Exp(-$t * 8)
    $f0 = 880 + $t * 1600
    $a[$i] = ([math]::Sin(2 * [math]::PI * $f0 * $t) * 0.5 + [math]::Sin(2 * [math]::PI * $f0 * 1.5 * $t) * 0.2) * $env * 0.4
  }
  return ,$a
}

function Gen-Switch {
  $dur = 0.05; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $a[$i] = ([math]::Sin(2 * [math]::PI * 700 * $t) * 0.45 + [math]::Sin(2 * [math]::PI * 1400 * $t) * 0.25) * [math]::Exp(-$t * 55) * 0.45
  }
  return ,$a
}

function Gen-Button {
  $dur = 0.045; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $a[$i] = ([math]::Sin(2 * [math]::PI * 980 * $t) * 0.5 + [math]::Sin(2 * [math]::PI * 1960 * $t) * 0.18) * [math]::Exp(-$t * 65) * 0.42
  }
  return ,$a
}

function Gen-Particle {
  $dur = 0.06; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $env = [math]::Exp(-$t * 40) * [math]::Sin([math]::PI * [math]::Min(1.0, $t / 0.02))
    $noise = ((($i * 1103515245 + 12345) -band 0x7fff) / 32767.0) * 2 - 1
    $a[$i] = ([math]::Sin(2 * [math]::PI * 2400 * $t) * 0.35 + $noise * 0.35) * $env * 0.3
  }
  return ,$a
}

function Gen-Ui {
  $dur = 0.04; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $a[$i] = ([math]::Sin(2 * [math]::PI * 1200 * $t) * 0.55 + [math]::Sin(2 * [math]::PI * 2400 * $t) * 0.2) * [math]::Exp(-$t * 70) * 0.4
  }
  return ,$a
}

function Gen-Error {
  $dur = 0.08; $n = [int]($dur * $rate); $a = New-Object double[] $n
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $env = [math]::Exp(-$t * 36)
    $body = [math]::Sin(2 * [math]::PI * 90 * $t) * 0.55 + [math]::Sin(2 * [math]::PI * 140 * $t) * 0.3
    $noise = ((($i * 1103515245 + 12345) -band 0x7fff) / 32767.0) * 2 - 1
    $a[$i] = ($body + $noise * 0.15 * [math]::Exp(-$t * 50)) * $env * 0.5
  }
  return ,$a
}

function Gen-Solve {
  return ,(Gen-Arp @(523.25, 659.25, 783.99, 1046.5) 0.28 0.045)
}

# Movement / juice
Write-Wav (Join-Path $sfxDir "shift_whoosh.wav") (Gen-Whoosh)
Write-Wav (Join-Path $sfxDir "shift_tick.wav") (Gen-Tick)
Write-Wav (Join-Path $sfxDir "shift_land.wav") (Gen-Land)
Write-Wav (Join-Path $sfxDir "shift_combo.wav") (Gen-Combo)
Write-Wav (Join-Path $sfxDir "puzzle_solve.wav") (Gen-Solve)
Write-Wav (Join-Path $sfxDir "laser_fire.wav") (Gen-Laser)
Write-Wav (Join-Path $sfxDir "switch_toggle.wav") (Gen-Switch)
Write-Wav (Join-Path $sfxDir "button_press.wav") (Gen-Button)
Write-Wav (Join-Path $sfxDir "particle_spark.wav") (Gen-Particle)

# UI
Write-Wav (Join-Path $uiDir "ui_click.wav") (Gen-Ui)
Write-Wav (Join-Path $uiDir "ui_error.wav") (Gen-Error)

# Music stems + stingers
Write-Wav (Join-Path $musicDir "stem_ambient.wav") (Gen-Pad 4.0 @(110.0, 164.81) 0.18 0.35) $true
Write-Wav (Join-Path $musicDir "stem_bed.wav") (Gen-Pad 4.0 @(220.0, 277.18, 329.63) 0.22 0.55) $true
Write-Wav (Join-Path $musicDir "stem_tension.wav") (Gen-Pad 2.0 @(185.0, 277.18, 370.0) 0.2 1.2) $true
Write-Wav (Join-Path $musicDir "stinger_victory.wav") (Gen-Arp @(523.25, 659.25, 783.99, 1046.5) 0.32 0.045)
Write-Wav (Join-Path $musicDir "stinger_failure.wav") (Gen-Arp @(392.0, 311.13, 246.94) 0.28 0.06)

Write-Host "Done. Enable loop_mode on stems in Godot import or rely on ProceduralMusic fallback."
