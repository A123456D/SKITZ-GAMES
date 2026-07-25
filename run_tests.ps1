# Run all SHIFTR headless validation scripts.
# Usage:
#   .\run_tests.ps1
#   .\run_tests.ps1 -Godot "C:\Users\PC\Projects\SHIFTR\tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64_console.exe"
#
# Real console binary:
#   tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64_console.exe

param(
    [string]$Godot = $env:GODOT
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot
. (Join-Path $ProjectRoot "tools\resolve_godot.ps1")

try {
    $exe = if ($Godot) { Get-ShiftrGodot -Prefer "console" -Override $Godot } else { Get-ShiftrGodot -Prefer "console" }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    Write-Host "Resolved path is not a file (is tools\Godot_*.exe still a folder?):`n  $exe" -ForegroundColor Red
    exit 1
}

Write-Host "Godot: $exe"
Write-Host "Project: $ProjectRoot"
Write-Host ""

$scripts = @(
    "res://tests/unit/board/run_board_validation.gd",
    "res://tests/unit/puzzle/run_puzzle_validation.gd",
    "res://tests/unit/puzzle_gen/run_puzzle_gen_validation.gd",
    "res://tests/unit/level_editor/run_level_editor_validation.gd",
    "res://tests/unit/platform/run_platform_validation.gd"
)

$failed = 0
foreach ($script in $scripts) {
    Write-Host "=== $script ===" -ForegroundColor Cyan
    $p = Start-Process -FilePath $exe -ArgumentList @("--headless", "--path", $ProjectRoot, "-s", $script) -Wait -PassThru -NoNewWindow
    $code = $p.ExitCode
    if ($code -ne 0) {
        Write-Host "FAILED (exit $code)" -ForegroundColor Red
        $failed++
    } else {
        Write-Host "OK" -ForegroundColor Green
    }
    Write-Host ""
}

if ($failed -gt 0) {
    Write-Host "$failed suite(s) failed." -ForegroundColor Red
    exit 1
}
Write-Host "All validation suites passed." -ForegroundColor Green
exit 0
