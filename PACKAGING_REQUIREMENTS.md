# Packaging Requirements

When creating a Windows package for SimpleTech Books, the installer must install or verify every runtime dependency needed to run and support the app.

Required runtime dependencies:

- Microsoft Edge WebView2 Runtime
- PostgreSQL Server
- PostgreSQL command-line tools, including `psql.exe`

The setup experience should not only copy `SimpleTechBooks.exe`. It must either install these dependencies automatically or clearly report which dependency is missing and how to fix it.

PostgreSQL notes:

- The app connects to `postgres://postgres:postgres@localhost:5432/simpletech_books?sslmode=disable` unless `SIMPLETECH_DATABASE_URL` is set.
- The installer should verify that `psql.exe` exists after PostgreSQL installation.
- If `psql.exe` is found outside `PATH`, the installer should create a support helper command under the app install directory.
- A fresh install should be able to create the `simpletech_books` database, run embedded migrations, and create the default admin user.

Default login for a fresh database:

- Username: `admin`
- Password: `admin123`
