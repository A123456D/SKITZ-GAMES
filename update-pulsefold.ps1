# Rebuilds PulseFold, syncs the web build into the SKITZ site, and pushes to GitHub.
# GitHub push triggers Cloudflare Pages to redeploy automatically.
#
# Usage (from the SHIFTR folder):
#   ./update-pulsefold.ps1
#   ./update-pulsefold.ps1 -Message "new levels + bug fixes"
#   ./update-pulsefold.ps1 -NoPush        # build & copy only, don't push

param(
    [string]$Message = "Update PulseFold build",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

$siteRoot     = $PSScriptRoot
$pulsefoldDir = Join-Path (Split-Path $siteRoot -Parent) "PulseFold"
$distDir      = Join-Path $pulsefoldDir "dist"
$webTarget    = Join-Path $siteRoot "website/public/games/pulsefold/web"
$logoSource   = Join-Path $siteRoot "website/public/images/pulsefold-logo.png"
$logoTarget   = Join-Path $pulsefoldDir "public/assets/pulsefold-logo.png"

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

if (-not (Test-Path $pulsefoldDir)) { throw "PulseFold project not found at $pulsefoldDir" }

Step "Preparing PulseFold assets"
if (-not (Test-Path $logoSource)) { throw "PulseFold logo not found at $logoSource" }
New-Item -ItemType Directory -Path (Split-Path $logoTarget -Parent) -Force | Out-Null
Copy-Item -Path $logoSource -Destination $logoTarget -Force

Step "Building PulseFold"
Push-Location $pulsefoldDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "PulseFold build failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

Step "Syncing build into the site"
if (-not (Test-Path $distDir)) { throw "Build output not found at $distDir" }
if (Test-Path $webTarget) { Remove-Item $webTarget -Recurse -Force }
New-Item -ItemType Directory -Path $webTarget -Force | Out-Null
Copy-Item -Path (Join-Path $distDir "*") -Destination $webTarget -Recurse -Force
Write-Host "Copied $distDir -> $webTarget"

if ($NoPush) {
    Step "Done (build + copy only, not pushed)"
    return
}

Step "Committing and pushing to GitHub"
Push-Location $siteRoot
try {
    git add "website/public/games/pulsefold/web" "update-pulsefold.ps1"
    $status = git status --porcelain "website/public/games/pulsefold/web" "update-pulsefold.ps1"
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "No changes to publish - the build is identical to what's already live."
        return
    }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw "git commit failed (exit $LASTEXITCODE)" }
    git push
    if ($LASTEXITCODE -ne 0) { throw "git push failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

Step "Done - Cloudflare Pages will redeploy in ~1-2 minutes"
