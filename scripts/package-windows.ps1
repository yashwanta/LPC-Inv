param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = (Get-Content -LiteralPath (Join-Path $repoRoot "VERSION") -Raw).Trim()
}
if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "Version is required."
}

$env:GOCACHE = Join-Path $repoRoot ".gocache"
$localTemp = Join-Path $repoRoot ".tmp"
New-Item -ItemType Directory -Force -Path $localTemp | Out-Null
$env:TEMP = $localTemp
$env:TMP = $localTemp

Push-Location (Join-Path $repoRoot "frontend")
try {
    npm.cmd ci
    npm.cmd run build
}
finally {
    Pop-Location
}

wails build -skipbindings

$distDir = Join-Path $repoRoot "dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$packageName = "SimpleTechBooks-$Version-windows-amd64.zip"
$packagePath = Join-Path $distDir $packageName
if (Test-Path -LiteralPath $packagePath) {
    Remove-Item -LiteralPath $packagePath -Force
}

$exePath = Join-Path $repoRoot "build\bin\SimpleTechBooks.exe"
if (-not (Test-Path -LiteralPath $exePath)) {
    throw "Expected build output not found: $exePath"
}

$stagingDir = Join-Path $distDir "SimpleTechBooks-$Version-windows-amd64"
if (Test-Path -LiteralPath $stagingDir) {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
Copy-Item -LiteralPath $exePath -Destination (Join-Path $stagingDir "SimpleTechBooks.exe")
Copy-Item -LiteralPath (Join-Path $repoRoot "README.md") -Destination (Join-Path $stagingDir "README.md")
Copy-Item -LiteralPath (Join-Path $repoRoot "VERSION") -Destination (Join-Path $stagingDir "VERSION")

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $packagePath -Force
Write-Output "Created $packagePath"



