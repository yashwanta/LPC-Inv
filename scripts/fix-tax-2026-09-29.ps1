# One-time: back up, delete the double entry INV-001009 (only if it matches exactly),
# then run the normal release (backup, version bump, commit, build, push).
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
Start-Transcript -Path (Join-Path $repoRoot 'fix-tax.log') -Force | Out-Null
try {
    $db = $env:SIMPLETECH_DATABASE_URL
    if ([string]::IsNullOrWhiteSpace($db)) { $db = [Environment]::GetEnvironmentVariable('SIMPLETECH_DATABASE_URL', 'User') }
    if ([string]::IsNullOrWhiteSpace($db)) { $db = [Environment]::GetEnvironmentVariable('SIMPLETECH_DATABASE_URL', 'Machine') }
    if ([string]::IsNullOrWhiteSpace($db)) { $db = 'postgres://postgres:postgres@localhost:5432/simpletech_books?sslmode=disable' }
    $found = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($found) { $bin = Split-Path -Parent $found.Source }
    else {
        $hit = Get-ChildItem "$env:ProgramFiles\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1
        if (-not $hit) { throw "psql.exe not found - nothing changed." }
        $bin = Split-Path -Parent $hit.FullName
    }
    $psql = Join-Path $bin 'psql.exe'; $pgDump = Join-Path $bin 'pg_dump.exe'

    Write-Host "=== Backup before deleting INV-001009 ==="
    $backupDir = 'C:\DRISHTI\SimpleTechBooks-Backups'
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $backupFile = Join-Path $backupDir ("simpletech_books-before-inv001009-delete-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".dump")
    & $pgDump --format=custom "--file=$backupFile" "--dbname=$db"
    if ($LASTEXITCODE -ne 0 -or (Get-Item $backupFile).Length -lt 1024) { throw "Backup failed - nothing deleted." }
    Write-Host "Backup: $backupFile"

    Write-Host "=== Deleting INV-001009 (Walk-in Customer, 2026-07-03, total 1305.00) ==="
    $sql = @"
begin;
update purchases set related_invoice_id = null
 where related_invoice_id in (select id from invoices where invoice_number='INV-001009' and invoice_date='2026-07-03' and total_amount=1305.00);
delete from invoices where invoice_number='INV-001009' and invoice_date='2026-07-03' and total_amount=1305.00 returning invoice_number, invoice_date, total_amount;
commit;
"@
    $sql | & $psql -X -v ON_ERROR_STOP=1 -d $db
    if ($LASTEXITCODE -ne 0) { throw "Delete failed (database unchanged)." }
    $left = & $psql -X -At -d $db -c "select 'customers=' || (select count(*) from customers) || '  invoices=' || (select count(*) from invoices) || '  payments=' || (select count(*) from payments) || '  purchases=' || (select count(*) from purchases)"
    Write-Host "Row counts now: $left"
}
catch {
    Write-Host "FIX FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Stop-Transcript | Out-Null
    exit 1
}
Stop-Transcript | Out-Null

$env:RELEASE_TITLE = "Kentucky sales tax fixes"
$env:RELEASE_BODY = @"
- Tax rate is entered as a percent (6 = 6%); stored 6.0000 is migrated to 0.06 (was applied as 600%)
- Kentucky rule: labor that installs taxable parts on the same job is taxed; labor-only repairs are not
- Walk-in amounts are tax-included: tax is split out of what the customer paid
- Tax report taxable sales exclude included tax; report re-runs when business changes
- Settings: sales tax rule checkboxes; PDF shows tax included on walk-ins
- Removed double entry INV-001009 (backup taken first)
"@
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'release-local.ps1')
exit $LASTEXITCODE
