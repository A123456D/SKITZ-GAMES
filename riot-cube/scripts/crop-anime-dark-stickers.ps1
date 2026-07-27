# Crop anime sticker sheet v2 ÔåÆ public/themes/anime/*.png
# Uses whole-sheet connected-component detection (irregular rows, 24 stickers).
Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "ref-stickers-anime-dark.png"
$outDir = Join-Path (Split-Path $PSScriptRoot) "public\themes\anime-dark"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$names = @(
  'glitch', 'punk', 'hood', 'ramen', 'mask', 'katana',
  'eyepatch', 'tears', 'butterfly', 'bolt', 'pill', 'chain',
  'ghost', 'bunny', 'tv', 'candle', 'crow', 'bear',
  'poison', 'heart', 'eye', 'hourglass', 'soda', 'grimoire'
)
function Test-SheetBlack([byte]$r, [byte]$g, [byte]$b) {
  return ($r -lt 40 -and $g -lt 40 -and $b -lt 40)
}

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height
Write-Host "Source: ${w}x${h}"

# Working 32bpp ARGB copy
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, 0, 0, $w, $h)
$g.Dispose()
$src.Dispose()

$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$bytes = [Math]::Abs($stride) * $h
$buf = New-Object byte[] $bytes
[Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $bytes)

# 1) Flood-fill sheet black from edges ÔåÆ alpha 0
$seen = New-Object 'bool[]' ($w * $h)
$qx = New-Object System.Collections.Generic.Queue[int]
$qy = New-Object System.Collections.Generic.Queue[int]
$tryPushBlack = {
  param($x, $y)
  if ($x -lt 0 -or $y -lt 0 -or $x -ge $w -or $y -ge $h) { return }
  $si = $y * $w + $x
  if ($seen[$si]) { return }
  $o = $y * $stride + $x * 4
  $b = $buf[$o]; $gv = $buf[$o + 1]; $r = $buf[$o + 2]; $a = $buf[$o + 3]
  if ($a -lt 8) { $seen[$si] = $true; return }
  if (-not (Test-SheetBlack $r $gv $b)) { return }
  $seen[$si] = $true
  $buf[$o + 3] = 0
  $qx.Enqueue($x); $qy.Enqueue($y)
}
for ($x = 0; $x -lt $w; $x++) { & $tryPushBlack $x 0; & $tryPushBlack $x ($h - 1) }
for ($y = 0; $y -lt $h; $y++) { & $tryPushBlack 0 $y; & $tryPushBlack ($w - 1) $y }
while ($qx.Count -gt 0) {
  $x = $qx.Dequeue(); $y = $qy.Dequeue()
  & $tryPushBlack ($x + 1) $y
  & $tryPushBlack ($x - 1) $y
  & $tryPushBlack $x ($y + 1)
  & $tryPushBlack $x ($y - 1)
}

# 2) Connected components of alpha >= 10 (4-connected)
[Array]::Clear($seen, 0, $seen.Length)
$components = New-Object System.Collections.Generic.List[object]
$totalPixels = $w * $h
$areaThreshold = [int]($totalPixels * 0.003)  # 0.3% of image

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $si = $y * $w + $x
    if ($seen[$si]) { continue }
    $o = $y * $stride + $x * 4
    if ($buf[$o + 3] -lt 10) { $seen[$si] = $true; continue }

    $comp = New-Object System.Collections.Generic.List[int]
    $qx.Clear(); $qy.Clear()
    $qx.Enqueue($x); $qy.Enqueue($y)
    $seen[$si] = $true
    $minX = $x; $minY = $y; $maxX = $x; $maxY = $y
    $sumX = 0L; $sumY = 0L

    while ($qx.Count -gt 0) {
      $cx = $qx.Dequeue(); $cy = $qy.Dequeue()
      $comp.Add($cy * $w + $cx)
      $sumX += $cx; $sumY += $cy
      if ($cx -lt $minX) { $minX = $cx }
      if ($cy -lt $minY) { $minY = $cy }
      if ($cx -gt $maxX) { $maxX = $cx }
      if ($cy -gt $maxY) { $maxY = $cy }
      foreach ($d in @(@(1, 0), @(-1, 0), @(0, 1), @(0, -1))) {
        $nx = $cx + $d[0]; $ny = $cy + $d[1]
        if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h) { continue }
        $nsi = $ny * $w + $nx
        if ($seen[$nsi]) { continue }
        $no = $ny * $stride + $nx * 4
        if ($buf[$no + 3] -lt 10) { $seen[$nsi] = $true; continue }
        $seen[$nsi] = $true
        $qx.Enqueue($nx); $qy.Enqueue($ny)
      }
    }

    $area = $comp.Count
    if ($area -gt $areaThreshold) {
      $centerX = [double]$sumX / $area
      $centerY = [double]$sumY / $area
      $components.Add([pscustomobject]@{
        Area = $area
        MinX = $minX; MinY = $minY; MaxX = $maxX; MaxY = $maxY
        CenterX = $centerX; CenterY = $centerY
        Pixels = $comp
      })
    }
  }
}

Write-Host "Area threshold: $areaThreshold (0.3% of $totalPixels)"
Write-Host "Components kept: $($components.Count)"

# 3) Sort by centerY then centerX (reading order). Group into rows by Y proximity.
$sorted = $components | Sort-Object CenterY, CenterX
# Refine reading order: cluster into rows
$rowTol = [math]::Max(40, [int]($h * 0.04))
$rows = New-Object System.Collections.Generic.List[object]
$currentRow = New-Object System.Collections.Generic.List[object]
$rowY = $null
foreach ($c in ($components | Sort-Object CenterY)) {
  if ($null -eq $rowY -or [math]::Abs($c.CenterY - $rowY) -le $rowTol) {
    $currentRow.Add($c)
    if ($null -eq $rowY) { $rowY = $c.CenterY } else { $rowY = ($rowY + $c.CenterY) / 2 }
  } else {
    $rows.Add(@($currentRow | Sort-Object CenterX))
    $currentRow = New-Object System.Collections.Generic.List[object]
    $currentRow.Add($c)
    $rowY = $c.CenterY
  }
}
if ($currentRow.Count -gt 0) { $rows.Add(@($currentRow | Sort-Object CenterX)) }

$ordered = New-Object System.Collections.Generic.List[object]
foreach ($row in $rows) {
  foreach ($c in $row) { $ordered.Add($c) }
}

Write-Host "Rows: $($rows.Count); ordered count: $($ordered.Count)"
for ($i = 0; $i -lt $ordered.Count; $i++) {
  $c = $ordered[$i]
  $label = if ($i -lt $names.Count) { $names[$i] } else { "extra$i" }
  Write-Host ("  [{0,2}] {1,-12} area={2} bbox=({3},{4})-({5},{6}) center=({7:n0},{8:n0})" -f `
    $i, $label, $c.Area, $c.MinX, $c.MinY, $c.MaxX, $c.MaxY, $c.CenterX, $c.CenterY)
}

if ($ordered.Count -ne $names.Count) {
  Write-Host "WARNING: expected $($names.Count) stickers, got $($ordered.Count). Adjust threshold and re-run."
}

# Write back cleared alpha for any further pixel ops on bmp
[Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $bytes)
$bmp.UnlockBits($data)

$pad = 12
$target = 206
$count = [math]::Min($ordered.Count, $names.Count)

for ($i = 0; $i -lt $count; $i++) {
  $c = $ordered[$i]
  $name = $names[$i]

  $tx = [math]::Max(0, $c.MinX - $pad)
  $ty = [math]::Max(0, $c.MinY - $pad)
  $tw = [math]::Min($w - $tx, ($c.MaxX + $pad) - $tx + 1)
  $th = [math]::Min($h - $ty, ($c.MaxY + $pad) - $ty + 1)
  $side = [math]::Max($tw, $th)

  # Crop square with transparency: only keep this component's pixels
  $cropped = New-Object System.Drawing.Bitmap $side, $side, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cg = [System.Drawing.Graphics]::FromImage($cropped)
  $cg.Clear([System.Drawing.Color]::Transparent)
  $ox = [int](($side - $tw) / 2)
  $oy = [int](($side - $th) / 2)
  $cg.DrawImage($bmp, (New-Object System.Drawing.Rectangle $ox, $oy, $tw, $th), (New-Object System.Drawing.Rectangle $tx, $ty, $tw, $th), [System.Drawing.GraphicsUnit]::Pixel)
  $cg.Dispose()

  # Zero pixels that aren't part of this component (and aren't pad/transparent already)
  $crect = New-Object System.Drawing.Rectangle 0, 0, $side, $side
  $cdata = $cropped.LockBits($crect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cstride = $cdata.Stride
  $cbytes = [Math]::Abs($cstride) * $side
  $cbuf = New-Object byte[] $cbytes
  [Runtime.InteropServices.Marshal]::Copy($cdata.Scan0, $cbuf, 0, $cbytes)

  $keep = New-Object 'bool[]' ($side * $side)
  foreach ($psi in $c.Pixels) {
    $px = $psi % $w
    $py = [int][math]::Floor($psi / $w)
    $lx = $px - $tx + $ox
    $ly = $py - $ty + $oy
    if ($lx -ge 0 -and $ly -ge 0 -and $lx -lt $side -and $ly -lt $side) {
      $keep[$ly * $side + $lx] = $true
    }
  }
  # Also keep nearby white-border/pad pixels that are already non-transparent within pad of keep set
  # Simpler: clear anything not in keep
  for ($si = 0; $si -lt ($side * $side); $si++) {
    if (-not $keep[$si]) {
      $lx = $si % $side
      $ly = [int][math]::Floor($si / $side)
      $o = $ly * $cstride + $lx * 4
      $cbuf[$o + 3] = 0
    }
  }

  [Runtime.InteropServices.Marshal]::Copy($cbuf, 0, $cdata.Scan0, $cbytes)
  $cropped.UnlockBits($cdata)

  $out = New-Object System.Drawing.Bitmap $target, $target, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $og = [System.Drawing.Graphics]::FromImage($out)
  $og.Clear([System.Drawing.Color]::Transparent)
  $og.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $og.DrawImage($cropped, 0, 0, $target, $target)
  $og.Dispose()
  $cropped.Dispose()

  $path = Join-Path $outDir ($name + ".png")
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Host "OK $name ${target}x${target} area=$($c.Area)"
}

$bmp.Dispose()
Write-Host "Done. Wrote $count / $($names.Count) stickers. Components found: $($ordered.Count)"


