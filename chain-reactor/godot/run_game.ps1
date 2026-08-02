# Launch CHAIN REACTOR Godot build (editor play / standalone).
param(
    [switch]$Editor,
    [string]$Godot = $env:GODOT
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

function Find-GodotGui {
    param([string]$Override)
    if ($Override -and (Test-Path -LiteralPath $Override -PathType Leaf)) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    $candidates = @(
        "$env:USERPROFILE\Downloads\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe",
        "$PSScriptRoot\..\..\tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c -PathType Leaf) { return $c }
    }
    $hit = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "Godot*_win64.exe" -Recurse -Depth 3 -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '_console\.exe$' } |
        Select-Object -First 1
    if ($hit) { return $hit.FullName }
    throw "Godot 4.7 GUI exe not found. Set GODOT or pass -Godot."
}

$exe = Find-GodotGui -Override $Godot
Write-Host "Godot: $exe"
Write-Host "Project: $ProjectRoot"

if ($Editor) {
    Start-Process -FilePath $exe -ArgumentList @("--path", $ProjectRoot, "--editor")
} else {
    Start-Process -FilePath $exe -ArgumentList @("--path", $ProjectRoot, "res://scenes/game.tscn")
}
