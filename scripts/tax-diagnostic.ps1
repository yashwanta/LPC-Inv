# Read-only: prints tax settings and every invoice that carries tax or taxable lines.
$repoRoot = Split-Path -Parent $PSScriptRoot
$out = Join-Path $repoRoot 'tax-diagnostic.txt'
$db = $env:SIMPLETECH_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($db)) { $db = [Environment]::GetEnvironmentVariable('SIMPLETECH_DATABASE_URL', 'User') }
if ([string]::IsNullOrWhiteSpace($db)) { $db = [Environment]::GetEnvironmentVariable('SIMPLETECH_DATABASE_URL', 'Machine') }
if ([string]::IsNullOrWhiteSpace($db)) { $db = 'postgres://postgres:postgres@localhost:5432/simpletech_books?sslmode=disable' }
$psql = (Get-Command psql.exe -ErrorAction SilentlyContinue).Source
if (-not $psql) { $psql = (Get-ChildItem "$env:ProgramFiles\PostgreSQL\*\bin\psql.exe" | Sort-Object FullName | Select-Object -Last 1).FullName }
$sql = @"
\echo === settings ===
select key, value from settings where key in ('default_tax_rate','parts_taxable','labor_taxable');
\echo === businesses ===
select id, name, active from businesses order by id;
\echo === invoices (all, with tax info) ===
select i.id, i.invoice_number, i.invoice_date, b.name as business, c.full_name, c.tax_exempt,
       i.subtotal, i.discount_amount, i.tax_amount, i.total_amount, i.paid_amount, i.status
from invoices i join customers c on c.id=i.customer_id left join businesses b on b.id=i.business_id
order by i.invoice_date, i.id;
\echo === line items ===
select ii.invoice_id, ii.item_type, ii.quantity, ii.unit_price, ii.line_total, ii.taxable, left(ii.description,40) as description
from invoice_items ii order by ii.invoice_id, ii.position;
\echo === purchases ===
select p.id, p.purchase_date, b.name as business, p.amount, p.tax_paid, left(p.description,40) from purchases p left join businesses b on b.id=p.business_id;
"@
$sql | & $psql -X -P pager=off -d $db *> $out
Write-Host "Saved $out"
