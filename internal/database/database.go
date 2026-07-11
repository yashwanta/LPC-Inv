package database

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func Open(ctx context.Context, migrations fs.FS) (*sql.DB, error) {
	dsn := os.Getenv("SIMPLETECH_DATABASE_URL")
	if strings.TrimSpace(dsn) == "" {
		return nil, fmt.Errorf("SIMPLETECH_DATABASE_URL is required")
	}
	if migrations == nil {
		migrations = os.DirFS(".")
	}
	if err := ensureDatabase(ctx, dsn); err != nil {
		return nil, err
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := runMigrations(ctx, db, migrations); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func ensureDatabase(ctx context.Context, dsn string) error {
	parsed, err := url.Parse(dsn)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil
	}
	dbName := strings.Trim(strings.TrimSpace(parsed.Path), "/")
	if dbName == "" || dbName == "postgres" || dbName == "template1" {
		return nil
	}

	maintenance := *parsed
	maintenance.Path = "/postgres"
	db, err := sql.Open("pgx", maintenance.String())
	if err != nil {
		return err
	}
	defer db.Close()

	var exists bool
	if err := db.QueryRowContext(ctx, `select exists(select 1 from pg_database where datname = $1)`, dbName).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	_, err = db.ExecContext(ctx, `create database `+quoteIdentifier(dbName))
	return err
}

func quoteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func runMigrations(ctx context.Context, db *sql.DB, migrations fs.FS) error {
	if _, err := db.ExecContext(ctx, `
		create table if not exists schema_migrations (
			version text primary key,
			applied_at timestamptz not null default now()
		)
	`); err != nil {
		return err
	}

	entries, err := fs.ReadDir(migrations, "migrations")
	if err != nil {
		return err
	}
	var names []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		var exists bool
		err := db.QueryRowContext(ctx, `select exists(select 1 from schema_migrations where version = $1)`, name).Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		sqlText, err := fs.ReadFile(migrations, "migrations/"+name)
		if err != nil {
			return err
		}
		sqlText = trimUTF8BOM(sqlText)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, string(sqlText)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %s failed: %w", name, err)
		}
		if _, err := tx.ExecContext(ctx, `insert into schema_migrations(version) values($1)`, name); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func trimUTF8BOM(value []byte) []byte {
	if len(value) >= 3 && value[0] == 0xef && value[1] == 0xbb && value[2] == 0xbf {
		return value[3:]
	}
	return value
}
