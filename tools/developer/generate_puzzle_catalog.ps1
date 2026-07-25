# Generate Align puzzle seed catalogs (headless Godot).
# Usage:
#   .\tools\developer\generate_puzzle_catalog.ps1
#   .\tools\developer\generate_puzzle_catalog.ps1 -Count 5000 -Difficulty 4 -Godot "C:\Path\Godot_v4.exe"

param(
    [int]$Count = 2000,
    [int]$Difficulty = 3,
    [int]$BaseSeed = 42,
    [int]$Bake = 24,
    [string]$Godot = $env:GODOT
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not $Godot) {
    $candidates = @(
        "godot",
        "godot4",
        "$env:LOCALAPPDATA\Programs\Godot\Godot*.exe"
    )
    foreach ($c in $candidates) {
        $resolved = Get-Command $c -ErrorAction SilentlyContinue
        if ($resolved) { $Godot = $resolved.Source; break }
        $hit = Get-Item $c -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($hit) { $Godot = $hit.FullName; break }
    }
}

if (-not $Godot) {
    Write-Error "Godot executable not found. Set -Godot or env GODOT."
}

Write-Host "Using Godot: $Godot"
& $Godot --headless --path $ProjectRoot -s res://tools/developer/generate_puzzle_catalog.gd -- `
    "--count=$Count" "--difficulty=$Difficulty" "--base-seed=$BaseSeed" "--bake=$Bake"
exit $LASTEXITCODE
