$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root "project.godot"))) {
  $root = Get-Location
}
$outDir = Join-Path $root "assets\audio\sfx"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$rate = 22050

function Write-Wav([string]$path, [double[]]$samples) {
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
  Write-Host "wrote $path ($n samples)"
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
  $dur = 0.12; $n = [int]($dur * $rate); $a = New-Object double[] $n
  $notes = @(523.25, 659.25, 783.99)
  for ($i = 0; $i -lt $n; $i++) {
    $t = $i / $rate
    $v = 0.0
    for ($ni = 0; $ni -lt 3; $ni++) {
      $start = $ni * 0.028
      if ($t -lt $start) { continue }
      $lt = $t - $start
      $env = [math]::Exp(-$lt * 18) * [math]::Sin([math]::PI * [math]::Min(1.0, $lt / 0.08))
      $v += [math]::Sin(2 * [math]::PI * $notes[$ni] * $lt) * $env
    }
    $a[$i] = $v * 0.35
  }
  return ,$a
}

Write-Wav (Join-Path $outDir "shift_whoosh.wav") (Gen-Whoosh)
Write-Wav (Join-Path $outDir "shift_tick.wav") (Gen-Tick)
Write-Wav (Join-Path $outDir "shift_land.wav") (Gen-Land)
Write-Wav (Join-Path $outDir "shift_combo.wav") (Gen-Combo)
