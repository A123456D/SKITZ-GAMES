# Resolves Godot executable for SHIFTR.
# Prefer console build for headless; fall back to GUI exe, env GODOT, PATH.
#
# NOTE: Official zip often extracts to tools\Godot_v*-win64.exe\ (a FOLDER).
# The real binaries live INSIDE that folder — do not point GODOT at the folder itself.
$script:ShiftrToolsDir = $PSScriptRoot
$script:ShiftrProjectRoot = Split-Path $PSScriptRoot -Parent

function Find-ShiftrGodotInRoot {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [ValidateSet("console", "gui", "any")][string]$Prefer = "any"
    )
    if (-not (Test-Path -LiteralPath $Root)) { return $null }

    $consoleHits = @(Get-ChildItem -LiteralPath $Root -Filter "Godot*_console.exe" -File -ErrorAction SilentlyContinue)
    $guiHits = @(Get-ChildItem -LiteralPath $Root -Filter "Godot*_win64.exe" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '_console\.exe$' })

    if ($Prefer -eq "console" -and $consoleHits.Count -gt 0) { return $consoleHits[0].FullName }
    if ($Prefer -eq "gui" -and $guiHits.Count -gt 0) { return $guiHits[0].FullName }
    if ($guiHits.Count -gt 0) { return $guiHits[0].FullName }
    if ($consoleHits.Count -gt 0) { return $consoleHits[0].FullName }
    return $null
}

function Get-ShiftrGodot {
    param(
        [ValidateSet("console", "gui")]
        [string]$Prefer = "console",
        [string]$Override = $env:GODOT
    )

    if ($Override) {
        if (Test-Path -LiteralPath $Override -PathType Leaf) {
            return (Resolve-Path -LiteralPath $Override).Path
        }
        if (Test-Path -LiteralPath $Override -PathType Container) {
            $inside = Find-ShiftrGodotInRoot -Root $Override -Prefer $Prefer
            if ($inside) { return $inside }
            Write-Error @"
GODOT points to a directory, not an .exe:
  $Override
Expected a file such as:
  $Override\Godot_v4.7.1-stable_win64.exe
  $Override\Godot_v4.7.1-stable_win64_console.exe
"@
            throw "Godot path is a directory without Godot_*.exe inside."
        }
        Write-Error "GODOT is set but path does not exist: $Override"
        throw "Invalid GODOT path."
    }

    $toolsRoot = $script:ShiftrToolsDir
    $packDirs = @(Get-ChildItem -LiteralPath $toolsRoot -Directory -Filter "Godot*" -ErrorAction SilentlyContinue)
    $searchRoots = @($toolsRoot) + @($packDirs | ForEach-Object { $_.FullName })

    foreach ($root in $searchRoots) {
        $hit = Find-ShiftrGodotInRoot -Root $root -Prefer $Prefer
        if ($hit) { return $hit }
    }

    # Prefer mismatch: try opposite flavor across same roots
    $alt = if ($Prefer -eq "console") { "gui" } else { "console" }
    foreach ($root in $searchRoots) {
        $hit = Find-ShiftrGodotInRoot -Root $root -Prefer $alt
        if ($hit) { return $hit }
    }

    foreach ($name in @("godot", "godot4")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }

    $hintGui = Join-Path $toolsRoot "Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe"
    $hintCon = Join-Path $toolsRoot "Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64_console.exe"
    throw @"
Godot executable not found.
Set env GODOT to the .exe file, or unpack under tools\ so you have:
  $hintGui
  $hintCon
Then run: .\run_game.ps1
"@
}
