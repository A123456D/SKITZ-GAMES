# Rename theme stickers so filenames match artwork; remove edgy razor.
# Two-phase rename via __tmp__ to avoid collisions.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot
Set-Location $root

function Rename-Pack([string]$dir, [hashtable]$map, [string[]]$delete = @()) {
  $full = Join-Path $root $dir
  Write-Host "`n=== $dir ==="
  $tmp = Join-Path $full "__rename_tmp"
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null

  foreach ($old in $map.Keys) {
    $src = Join-Path $full "$old.png"
    if (-not (Test-Path $src)) {
      Write-Host "  MISSING $old.png"
      continue
    }
    $dest = Join-Path $tmp "$($map[$old]).png"
    Copy-Item $src $dest -Force
    Write-Host "  $old -> $($map[$old])"
  }

  foreach ($old in $map.Keys) {
    $src = Join-Path $full "$old.png"
    if (Test-Path $src) { Remove-Item $src -Force }
  }
  foreach ($name in $delete) {
    $p = Join-Path $full "$name.png"
    if (Test-Path $p) {
      Remove-Item $p -Force
      Write-Host "  DELETED $name"
    }
  }

  Get-ChildItem $tmp -Filter *.png | ForEach-Object {
    Move-Item $_.FullName (Join-Path $full $_.Name) -Force
  }
  Remove-Item $tmp -Recurse -Force
}

# Edgy: remove razor (old bolt). pill (lightning) becomes bolt.
$edgy = @{
  glitch = 'crack'; punk = 'doll'; hood = 'flare'; ramen = 'crown'; mask = 'smile'
  katana = 'alien'; eyepatch = 'dice'; tears = 'pin'; butterfly = 'spray'
  pill = 'bolt'; chain = 'eye'; ghost = 'melt'; bunny = 'knife'; tv = 'eight'
  candle = 'nails'; crow = 'flip'; bear = 'blaze'; poison = 'collar'; heart = 'skull'
  eye = 'sting'; hourglass = 'lock'; soda = 'star'; grimoire = 'bomb'
}
Rename-Pack "public\themes\edgy" $edgy @('bolt')

# Anime day
$anime = @{
  bear = 'kitty'; bolt = 'goggles'; candle = 'juice'; chain = 'smirk'; eye = 'kitsune'
  eyepatch = 'peace'; grimoire = 'school'; heart = 'ramen'; hood = 'ember'
  hourglass = 'handheld'; tears = 'bubble'; hero = 'volt'; mage = 'idol'
}
Rename-Pack "public\themes\anime" $anime

# Anime dark — only ghost -> slime; rest already match
$dark = @{ ghost = 'slime' }
Rename-Pack "public\themes\anime-dark" $dark

# Classroom
$classroom = @{
  glitch = 'skull'; punk = 'star'; hood = 'flame'; ramen = 'heart'; mask = 'gem'
  katana = 'bolt'; tears = 'cans'; bolt = 'smile'; candle = 'spray'; pill = 'bomb'
  kittyw = 'kitty'; board = 'skate'
}
Rename-Pack "public\themes\classroom" $classroom

Write-Host "`nDone renames."
