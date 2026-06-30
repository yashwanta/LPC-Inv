# SimpleTech Books

SimpleTech Books is a local-first Windows desktop invoicing and purchase tracking app for a small computer repair and parts business.

The first version is intentionally boring, stable, and useful. It focuses on customers, vendors, invoices, invoice PDFs, and a PostgreSQL foundation that can grow into payments, purchases, imports, tax reporting, and backup/restore.

## Stack

- Backend: Go
- Desktop: Wails
- Frontend: React + TypeScript
- Database: PostgreSQL
- Target OS: Windows desktop

## Phase 1 Scope

- Wails app setup
- PostgreSQL schema and migrations
- Basic login with admin/standard user roles
- Customer management
- Vendor management
- Invoice creation
- Invoice PDF export

## Local Configuration

Set `SIMPLETECH_DATABASE_URL` before running the app:

```powershell
$env:SIMPLETECH_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/simpletech_books?sslmode=disable"
```

If no users exist, the app creates a default admin user:

- Username: `admin`
- Password: `admin123`

Change this password after first login.


## Downloadable Windows Setup

GitHub Actions builds two Windows artifacts:

- `SimpleTechBooks-Setup-<version>.exe`: click-to-run setup. It installs the app under `%LOCALAPPDATA%\SimpleTech Books`, creates a Start Menu launcher, and attempts to install runtime dependencies with `winget`.
- `SimpleTechBooks-<version>-windows-amd64.zip`: portable app zip containing `SimpleTechBooks.exe`.

The setup exe installs runtime prerequisites for normal use:

- Microsoft Edge WebView2 Runtime
- PostgreSQL

For a development computer, run the setup exe from `cmd.exe` with `--dev` to also install Git, Go, Node.js LTS, and Wails where possible:

```cmd
SimpleTechBooks-Setup-0.1.0.exe --dev
```

No PowerShell is required for the setup exe or the `.cmd` package script.

## Development

Install Wails if needed:

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Install frontend dependencies:

```powershell
cd frontend
npm.cmd install
```

Run the desktop app:

```powershell
wails dev
```

## Project Shape

- `main.go`, `app.go`: Wails entrypoint and frontend-callable app methods
- `internal/database`: PostgreSQL connection and migration runner
- `internal/repository`: SQL-backed data access
- `internal/security`: Password hashing and session helpers
- `internal/pdf`: Basic invoice PDF generation
- `migrations`: PostgreSQL schema
- `frontend`: React TypeScript UI

## Later Phases

- Phase 2: payments, purchases, categories, dashboard, CSV exports
- Phase 3: credit card CSV import, mapping, duplicate detection, auto-categorization
- Phase 4: tax settings and tax reports
- Phase 5: backup/restore, auto backup, backup history
- Phase 6: email invoices, receipt attachments, search/filter polish

