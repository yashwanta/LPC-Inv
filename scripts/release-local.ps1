# SimpleTech Books - local release: backup DB, bump version, commit, build, push.
# Safe for existing data: the build never touches PostgreSQL. A full pg_dump backup
# is taken first, and row counts are printed before and after for comparison.
param(
    [string]$Title = "",
    [string]$Body = ""
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$logPath = Join-Path $repoRoot 'release-local.log'
Start-Transcript -Path $logPath -Force | Out-Null

function Step([string]$title) { Write-Host ""; Write-Host "=== $title ===" -ForegroundColor Cyan }
function Invoke-Native([string]$exe, [string[]]$argList) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $exe @argList
    $code = $LASTEXITCODE
    $ErrorActionPreference = $previous
    if ($code -ne 0) { throw "$exe $($argList -join ' ') failed with exit code $code" }
}
function Find-PgTool([string]$name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $hit = Get-ChildItem -Path "$env:ProgramFiles\PostgreSQL\*\bin\$name" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1
    if ($hit) { return $hit.FullName }
    return $null
}
function Get-RowCounts([string]$psql, [string]$db) {
    $sql = "select 'customers=' || (select count(*) from customers) || '  invoices=' || (select count(*) from invoices) || '  payments=' || (select count(*) from payments) || '  purchases=' || (select count(*) from purchases) || '  users=' || (select count(*) from users)"
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & $psql -At -d $db -c $sql
    $ErrorActionPreference = $previous
    return $out
}

try {
    # ---------- 1. Database backup ----------
    Step "1/6 Backing up the database"
    $db = $env:SIMPLETECH_DATABASE_URL
    if ([string]::IsNullOrWhiteSpace($db)) { $db = [Environment]::GetEnvironmentVariable('SIMPLETECH_DATABASE_URL', 'User') }
    if ([string]::IsNullOrWhiteSpace($db)) { $db = [Environment]::GetEnvironmentVariable('SIMPLETECH_DATABASE_URL', 'Machine') }
    if ([string]::IsNullOrWhiteSpace($db)) { $db = 'postgres://postgres:postgres@localhost:5432/simpletech_books?sslmode=disable' }
    $pgDump = Find-PgTool 'pg_dump.exe'
    $psql = Find-PgTool 'psql.exe'
    if (-not $pgDump) { throw 'pg_dump.exe not found - install PostgreSQL command-line tools. Nothing was changed.' }
    $backupDir = 'C:\DRISHTI\SimpleTechBooks-Backups'
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupFile = Join-Path $backupDir "simpletech_books-$stamp.dump"
    Invoke-Native $pgDump @('--format=custom', "--file=$backupFile", "--dbname=$db")
    $size = (Get-Item $backupFile).Length
    if ($size -lt 1024) { throw "Backup file looks too small ($size bytes). Stopping before any change." }
    Write-Host "Backup saved: $backupFile ($([math]::Round($size/1KB)) KB)"
    Write-Host "Restore if ever needed:  pg_restore --clean --if-exists --dbname=<db url> `"$backupFile`""
    if ($psql) { Write-Host "Row counts BEFORE: $(Get-RowCounts $psql $db)" }

    # ---------- 2. Version bump ----------
    Step "2/6 Bumping version"
    $old = (Get-Content -Raw VERSION).Trim()
    $parts = $old.Split('.')
    $parts[2] = [string]([int]$parts[2] + 1)
    $new = $parts -join '.'
    [IO.File]::WriteAllText((Join-Path $repoRoot 'VERSION'), "$new`n")
    $wails = Get-Content -Raw wails.json
    $wails = $wails -replace '"productVersion":\s*"[^"]*"', ('"productVersion":  "' + $new + '"')
    [IO.File]::WriteAllText((Join-Path $repoRoot 'wails.json'), $wails)
    Write-Host "Version $old -> $new"

    # ---------- 3. Commit ----------
    Step "3/6 Committing"
    $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
    Write-Host "Branch: $branch"
    Invoke-Native git @('add', '-A')
    & git status --short
    $msgFile = Join-Path $env:TEMP "simpletech-commit-$stamp.txt"
    if ([string]::IsNullOrWhiteSpace($Title)) { $Title = $env:RELEASE_TITLE }
    if ([string]::IsNullOrWhiteSpace($Body)) { $Body = $env:RELEASE_BODY }
    if ([string]::IsNullOrWhiteSpace($Title)) { $Title = "update" }
    $msg = "Release $new`: $Title`n`n$Body`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`nClaude-Session: https://claude.ai/code/session_01H5XEvCznqbqrc4Y83xgFMj`n"
    [IO.File]::WriteAllText($msgFile, $msg)
    Invoke-Native git @('commit', '-F', $msgFile)
    Remove-Item $msgFile -ErrorAction SilentlyContinue

    # ---------- 4. Build ----------
    Step "4/6 Building executable and installer (this takes a few minutes)"
    Invoke-Native 'cmd.exe' @('/c', 'scripts\package-windows.cmd')

    # ---------- 5. Push ----------
    Step "5/6 Pushing to GitHub"
    Invoke-Native git @('push', '-u', 'origin', $branch)

    # ---------- 6. Verify ----------
    Step "6/6 Result"
    if ($psql) { Write-Host "Row counts AFTER:  $(Get-RowCounts $psql $db)" }
    Get-ChildItem dist -Filter "*$new*" | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB,1)}}, LastWriteTime | Format-Table -AutoSize | Out-String | Write-Host
    Write-Host "App exe:   $repoRoot\build\bin\SimpleTechBooks.exe"
    Write-Host "Installer: $repoRoot\dist\SimpleTechBooks-Setup-$new.exe"
    Write-Host "Database backup: $backupFile"
    Write-Host ""
    Write-Host "RELEASE OK" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "RELEASE FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Stop-Transcript | Out-Null
    exit 1
}
Stop-Transcript | Out-Null
exit 0
