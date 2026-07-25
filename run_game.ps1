# Launch SHIFTR in the Godot editor (default) or run the game.
# Usage:
#   .\run_game.ps1
#   .\run_game.ps1 -Editor
#   .\run_game.ps1 -Play
#   .\run_game.ps1 -Play -RenderingMethod gl_compatibility
#   .\run_game.ps1 -Godot "C:\Users\PC\Projects\SHIFTR\tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe"
#
# Real binary (zip extracts to a FOLDER named *.exe):
#   tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe

param(
    [switch]$Editor,
    [switch]$Play,
    [string]$Godot = $env:GODOT,
    # Shipping default matches project.godot (mobile / Vulkan Forward Mobile).
    [ValidateSet("mobile", "forward_plus", "gl_compatibility")]
    [string]$RenderingMethod = "mobile",
    [string]$RenderingDriver = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
. (Join-Path $ProjectRoot "tools\resolve_godot.ps1")

try {
    $exe = if ($Godot) { Get-ShiftrGodot -Prefer "gui" -Override $Godot } else { Get-ShiftrGodot -Prefer "gui" }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    Write-Host "Resolved path is not a file (is tools\Godot_*.exe still a folder?):`n  $exe" -ForegroundColor Red
    exit 1
}

$renderArgs = @("--rendering-method", $RenderingMethod)
if ($RenderingDriver) {
    $renderArgs += @("--rendering-driver", $RenderingDriver)
}

Write-Host "Godot: $exe"
Write-Host "Project: $ProjectRoot"
Write-Host ("Render: {0}{1}" -f $RenderingMethod, $(if ($RenderingDriver) { " / $RenderingDriver" } else { "" }))

if ($Play -and -not $Editor) {
    & $exe --path $ProjectRoot @renderArgs
} else {
    & $exe --editor --path $ProjectRoot @renderArgs
}
exit $LASTEXITCODE
