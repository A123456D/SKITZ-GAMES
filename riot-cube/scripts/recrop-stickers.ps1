# Recrop stickers: expanded cells, edge flood-fill, keep largest blob, padded square PNG.
Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\PC\.cursor\projects\c-Users-PC-Projects-SHIFTR\assets\c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_Jul_25__2026__09_33_32_PM-fbf07e9f-a612-45f8-9f60-662860b6dc13.png"
$outDir = "C:\Users\PC\Projects\SHIFTR\riot-cube\public\stickers"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$cols = 4; $rows = 3
$cw = [int]($src.Width / $cols)
$ch = [int]($src.Height / $rows)
# Expand slightly into black gutter so white borders aren't clipped
$expandX = [int]($cw * 0.03)
$expandY = [int]($ch * 0.03)
$names = @('skull','heart','bolt','star','flame','diamond','headphones','bomb','eightball','spray','smiley','sneaker')

function Test-SheetBlack([byte]$r,[byte]$g,[byte]$b) {
  return ($r -lt 32 -and $g -lt 32 -and $b -lt 32)
}

for ($i = 0; $i -lt 12; $i++) {
  if ($names[$i] -eq 'eightball') { continue }
  $col = $i % $cols
  $row = [int][math]::Floor($i / $cols)
  $x0 = [math]::Max(0, $col * $cw - $expandX)
  $y0 = [math]::Max(0, $row * $ch - $expandY)
  $x1 = [math]::Min($src.Width, ($col + 1) * $cw + $expandX)
  $y1 = [math]::Min($src.Height, ($row + 1) * $ch + $expandY)
  $w = $x1 - $x0
  $h = $y1 - $y0

  $cell = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($cell)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0,0,$w,$h), (New-Object System.Drawing.Rectangle $x0,$y0,$w,$h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  # Lock bits for speed
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $cell.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = [Math]::Abs($stride) * $h
  $buf = New-Object byte[] $bytes
  [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $bytes)

  $idx = { param($x,$y) return ($y * $stride + $x * 4) }

  # Edge flood-fill sheet black -> alpha 0
  $seen = New-Object 'bool[]' ($w * $h)
  $qx = New-Object System.Collections.Generic.Queue[int]
  $qy = New-Object System.Collections.Generic.Queue[int]
  $tryPush = {
    param($x,$y)
    if ($x -lt 0 -or $y -lt 0 -or $x -ge $w -or $y -ge $h) { return }
    $si = $y * $w + $x
    if ($seen[$si]) { return }
    $o = $y * $stride + $x * 4
    $b = $buf[$o]; $g = $buf[$o+1]; $r = $buf[$o+2]; $a = $buf[$o+3]
    if ($a -lt 8) { $seen[$si] = $true; return }
    if (-not (Test-SheetBlack $r $g $b)) { return }
    $seen[$si] = $true
    $buf[$o+3] = 0
    $qx.Enqueue($x); $qy.Enqueue($y)
  }
  for ($x=0; $x -lt $w; $x++) { & $tryPush $x 0; & $tryPush $x ($h-1) }
  for ($y=0; $y -lt $h; $y++) { & $tryPush 0 $y; & $tryPush ($w-1) $y }
  while ($qx.Count -gt 0) {
    $x = $qx.Dequeue(); $y = $qy.Dequeue()
    & $tryPush ($x+1) $y; & $tryPush ($x-1) $y; & $tryPush $x ($y+1); & $tryPush $x ($y-1)
  }

  # Largest opaque component
  [Array]::Clear($seen, 0, $seen.Length)
  $best = New-Object System.Collections.Generic.List[int]
  $bestCount = 0
  for ($y=0; $y -lt $h; $y++) {
    for ($x=0; $x -lt $w; $x++) {
      $si = $y * $w + $x
      if ($seen[$si]) { continue }
      $o = $y * $stride + $x * 4
      if ($buf[$o+3] -lt 10) { $seen[$si] = $true; continue }
      $comp = New-Object System.Collections.Generic.List[int]
      $qx.Clear(); $qy.Clear()
      $qx.Enqueue($x); $qy.Enqueue($y); $seen[$si] = $true
      while ($qx.Count -gt 0) {
        $cx = $qx.Dequeue(); $cy = $qy.Dequeue()
        $comp.Add($cy * $w + $cx)
        foreach ($d in @(@(1,0),@(-1,0),@(0,1),@(0,-1))) {
          $nx = $cx + $d[0]; $ny = $cy + $d[1]
          if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h) { continue }
          $nsi = $ny * $w + $nx
          if ($seen[$nsi]) { continue }
          $no = $ny * $stride + $nx * 4
          if ($buf[$no+3] -lt 10) { $seen[$nsi] = $true; continue }
          $seen[$nsi] = $true
          $qx.Enqueue($nx); $qy.Enqueue($ny)
        }
      }
      if ($comp.Count -gt $bestCount) { $bestCount = $comp.Count; $best = $comp }
    }
  }

  # Mask to largest only
  $keep = New-Object 'bool[]' ($w * $h)
  foreach ($si in $best) { $keep[$si] = $true }
  for ($si = 0; $si -lt ($w * $h); $si++) {
    if (-not $keep[$si]) {
      $x = $si % $w; $y = [int][math]::Floor($si / $w)
      $o = $y * $stride + $x * 4
      $buf[$o+3] = 0
    }
  }

  # Bounds of remaining
  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
  for ($y=0; $y -lt $h; $y++) {
    for ($x=0; $x -lt $w; $x++) {
      $o = $y * $stride + $x * 4
      if ($buf[$o+3] -lt 10) { continue }
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }

  [Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $bytes)
  $cell.UnlockBits($data)

  if ($maxX -lt 0) { "FAIL $($names[$i])"; $cell.Dispose(); continue }

  $pad = 14
  $tx = [math]::Max(0, $minX - $pad)
  $ty = [math]::Max(0, $minY - $pad)
  $tw = [math]::Min($w - $tx, ($maxX + $pad) - $tx + 1)
  $th = [math]::Min($h - $ty, ($maxY + $pad) - $ty + 1)
  $side = [math]::Max($tw, $th)

  $out = New-Object System.Drawing.Bitmap $side, $side, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $og = [System.Drawing.Graphics]::FromImage($out)
  $og.Clear([System.Drawing.Color]::Transparent)
  $og.DrawImage($cell, [int](($side - $tw) / 2), [int](($side - $th) / 2), (New-Object System.Drawing.Rectangle $tx,$ty,$tw,$th), [System.Drawing.GraphicsUnit]::Pixel)
  $og.Dispose()
  $cell.Dispose()

  $path = Join-Path $outDir ($names[$i] + ".png")
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  "OK $($names[$i]) ${side}x${side} pts=$bestCount"
}

$src.Dispose()
