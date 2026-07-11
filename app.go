package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io/fs"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"simpletech-books/internal/database"
	"simpletech-books/internal/pdf"
	"simpletech-books/internal/repository"
	"simpletech-books/internal/security"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx           context.Context
	repo          *repository.Repository
	migrations    fs.FS
	sessionsMu    sync.RWMutex
	sessions      map[string]*repository.AuthSession
	loginMu       sync.Mutex
	loginAttempts map[string]*loginAttempt
}

type loginAttempt struct {
	Failures    int
	LockedUntil time.Time
}

const sessionTimeout = 30 * time.Minute

func NewApp(migrations ...fs.FS) *App {
	var migrationFS fs.FS
	if len(migrations) > 0 {
		migrationFS = migrations[0]
	}
	return &App{migrations: migrationFS, sessions: make(map[string]*repository.AuthSession), loginAttempts: make(map[string]*loginAttempt)}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	db, err := database.Open(ctx, a.migrations)
	if err != nil {
		fmt.Printf("database startup failed: %v\n", err)
		return
	}
	a.repo = repository.New(db)
	if err := a.repo.EnsureDefaultAdmin(ctx); err != nil {
		fmt.Printf("default admin setup failed: %v\n", err)
	}
}

func (a *App) healthCheck() error {
	if a.repo == nil {
		return fmt.Errorf("database is not connected")
	}
	return nil
}

func (a *App) Login(username string, password string) (*repository.AuthSession, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	loginKey := strings.ToLower(strings.TrimSpace(username))
	a.loginMu.Lock()
	attempt := a.loginAttempts[loginKey]
	if attempt != nil && time.Now().Before(attempt.LockedUntil) {
		a.loginMu.Unlock()
		time.Sleep(500 * time.Millisecond)
		return nil, fmt.Errorf("account is temporarily locked; try again later")
	}
	a.loginMu.Unlock()
	user, err := a.repo.GetUserByUsername(a.ctx, username)
	if err != nil {
		return nil, a.failedLogin(loginKey)
	}
	if !security.VerifyPassword(password, user.PasswordHash) {
		return nil, a.failedLogin(loginKey)
	}
	a.loginMu.Lock()
	delete(a.loginAttempts, loginKey)
	a.loginMu.Unlock()
	session := &repository.AuthSession{
		UserID:       user.ID,
		Username:     user.Username,
		DisplayName:  user.DisplayName,
		Role:         user.Role,
		Token:        security.NewSessionToken(),
		LastActivity: time.Now(),
	}
	a.sessionsMu.Lock()
	a.sessions[session.Token] = session
	a.sessionsMu.Unlock()
	return session, nil
}

func (a *App) failedLogin(username string) error {
	a.loginMu.Lock()
	attempt := a.loginAttempts[username]
	if attempt == nil {
		attempt = &loginAttempt{}
		a.loginAttempts[username] = attempt
	}
	attempt.Failures++
	if attempt.Failures >= 5 {
		attempt.LockedUntil = time.Now().Add(15 * time.Minute)
	}
	a.loginMu.Unlock()
	time.Sleep(500 * time.Millisecond)
	return fmt.Errorf("invalid username or password")
}

func (a *App) requireAuth(token string) (*repository.AuthSession, error) {
	if strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	a.sessionsMu.Lock()
	defer a.sessionsMu.Unlock()
	session, ok := a.sessions[token]
	if !ok {
		return nil, fmt.Errorf("invalid session")
	}
	if time.Since(session.LastActivity) > sessionTimeout {
		delete(a.sessions, token)
		return nil, fmt.Errorf("session expired")
	}
	session.LastActivity = time.Now()
	return session, nil
}

func (a *App) requireAdmin(token string) (*repository.AuthSession, error) {
	session, err := a.requireAuth(token)
	if err != nil {
		return nil, err
	}
	if session.Role != "admin" {
		return nil, fmt.Errorf("administrator access required")
	}
	return session, nil
}

func (a *App) Logout(token string) error {
	if _, err := a.requireAuth(token); err != nil {
		return err
	}
	a.sessionsMu.Lock()
	delete(a.sessions, token)
	a.sessionsMu.Unlock()
	return nil
}

func (a *App) GetDashboard(token string) (*repository.DashboardSummary, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetDashboard(a.ctx)
}

func (a *App) GetIncomeExpenseReport(token string, period string, year int) (*repository.IncomeExpenseReport, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetIncomeExpenseReport(a.ctx, period, year)
}

func (a *App) GetTaxReport(token string, startDate string, endDate string, businessID int64) (*repository.TaxReportSummary, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetTaxReport(a.ctx, startDate, endDate, businessID)
}

func (a *App) ListUsers(token string) ([]repository.User, error) {
	if _, err := a.requireAdmin(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListUsers(a.ctx)
}

func (a *App) SaveUser(token string, input repository.UserInput) (*repository.User, error) {
	if _, err := a.requireAdmin(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveUser(a.ctx, input)
}

func (a *App) ListBusinesses(token string) ([]repository.Business, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListBusinesses(a.ctx)
}

func (a *App) SaveBusiness(token string, input repository.BusinessInput) (*repository.Business, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveBusiness(a.ctx, input)
}

func (a *App) ListCustomers(token string, search string) ([]repository.Customer, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListCustomers(a.ctx, search)
}

func (a *App) SaveCustomer(token string, input repository.CustomerInput) (*repository.Customer, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveCustomer(a.ctx, input)
}

func (a *App) DeleteCustomer(token string, id int64) error {
	if _, err := a.requireAuth(token); err != nil {
		return err
	}
	if err := a.healthCheck(); err != nil {
		return err
	}
	return a.repo.DeleteCustomer(a.ctx, id)
}

func (a *App) ListVendors(token string, search string) ([]repository.Vendor, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListVendors(a.ctx, search)
}

func (a *App) SaveVendor(token string, input repository.VendorInput) (*repository.Vendor, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveVendor(a.ctx, input)
}

func (a *App) DeleteVendor(token string, id int64) error {
	if _, err := a.requireAuth(token); err != nil {
		return err
	}
	if err := a.healthCheck(); err != nil {
		return err
	}
	return a.repo.DeleteVendor(a.ctx, id)
}

func (a *App) ListPurchases(token string, search string) ([]repository.Purchase, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListPurchases(a.ctx, search)
}

func (a *App) SavePurchase(token string, input repository.PurchaseInput) (*repository.Purchase, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SavePurchase(a.ctx, input)
}

func (a *App) DeletePurchase(token string, id int64) error {
	if _, err := a.requireAuth(token); err != nil {
		return err
	}
	if err := a.healthCheck(); err != nil {
		return err
	}
	return a.repo.DeletePurchase(a.ctx, id)
}

func (a *App) ListInvoices(token string, search string) ([]repository.InvoiceListItem, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListInvoices(a.ctx, search)
}

func (a *App) CreateInvoice(token string, input repository.InvoiceInput) (*repository.InvoiceDetail, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.CreateInvoice(a.ctx, input)
}

func (a *App) RecordWalkInService(token string, input repository.WalkInServiceInput) (*repository.InvoiceDetail, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.RecordWalkInService(a.ctx, input)
}

func (a *App) DeleteInvoice(token string, id int64) error {
	if _, err := a.requireAuth(token); err != nil {
		return err
	}
	if err := a.healthCheck(); err != nil {
		return err
	}
	return a.repo.DeleteInvoice(a.ctx, id)
}

func (a *App) GetInvoice(token string, id int64) (*repository.InvoiceDetail, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetInvoice(a.ctx, id)
}

func (a *App) ExportInvoicePDF(token string, id int64) (string, error) {
	if _, err := a.requireAuth(token); err != nil {
		return "", err
	}
	if err := a.healthCheck(); err != nil {
		return "", err
	}
	invoice, err := a.repo.GetInvoice(a.ctx, id)
	if err != nil {
		return "", err
	}
	settings, err := a.repo.GetSettings(a.ctx)
	if err != nil {
		return "", err
	}
	return pdf.WriteInvoice(invoice, settings)
}
func (a *App) ListCustomerLookup(token string, search string, kind string) ([]repository.CustomerLookup, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListCustomerLookup(a.ctx, search, kind)
}

func (a *App) GetSettings(token string) (*repository.AppSettings, error) {
	if _, err := a.requireAdmin(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetSettings(a.ctx)
}

func (a *App) SaveSettings(token string, input repository.AppSettings) (*repository.AppSettings, error) {
	if _, err := a.requireAdmin(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveSettings(a.ctx, input)
}

func (a *App) SelectBusinessLogo(token string) (string, error) {
	if _, err := a.requireAuth(token); err != nil {
		return "", err
	}
	path, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Choose business logo",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg;*.webp"},
		},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

func (a *App) GetImageDataURL(token string, path string) (string, error) {
	if _, err := a.requireAuth(token); err != nil {
		return "", err
	}
	path = strings.TrimSpace(path)
	if path == "" {
		return "", nil
	}
	if strings.Contains(path, "..") {
		return "", fmt.Errorf("image path must not contain '..'")
	}
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png", ".jpg", ".jpeg", ".webp":
	default:
		return "", fmt.Errorf("unsupported image type")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("file content is not an image")
	}
	return "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data), nil
}

func (a *App) EmailInvoice(token string, input repository.EmailInvoiceInput) error {
	if _, err := a.requireAuth(token); err != nil {
		return err
	}
	if err := a.healthCheck(); err != nil {
		return err
	}
	invoice, err := a.repo.GetInvoice(a.ctx, input.InvoiceID)
	if err != nil {
		return err
	}
	settings, err := a.repo.GetSettings(a.ctx)
	if err != nil {
		return err
	}
	to := strings.TrimSpace(input.To)
	if to == "" {
		to = strings.TrimSpace(invoice.Customer.Email)
	}
	if to == "" {
		return fmt.Errorf("customer email address is required")
	}
	if strings.TrimSpace(settings.SMTPHost) == "" {
		return fmt.Errorf("SMTP host is not configured")
	}
	if settings.SMTPPort == 0 {
		settings.SMTPPort = 587
	}
	subject := input.Subject
	if strings.TrimSpace(subject) == "" {
		subject = fmt.Sprintf("Invoice %s from %s", invoice.InvoiceNumber, settings.BusinessName)
	}
	message := input.Message
	if strings.TrimSpace(message) == "" {
		message = fmt.Sprintf("Hello %s,\n\nAttached is invoice %s for %.2f.\n\nThank you,\n%s", invoice.Customer.FullName, invoice.InvoiceNumber, invoice.TotalAmount, settings.BusinessName)
	}
	pdfPath, err := pdf.WriteInvoice(invoice, settings)
	if err != nil {
		return err
	}
	message = message + "\n\nInvoice PDF saved locally at: " + pdfPath
	return sendSMTP(settings, to, subject, message)
}

func sendSMTP(settings *repository.AppSettings, to string, subject string, body string) error {
	from := strings.TrimSpace(settings.SMTPFromEmail)
	if from == "" {
		from = strings.TrimSpace(settings.BusinessEmail)
	}
	if from == "" {
		from = strings.TrimSpace(settings.SMTPUsername)
	}
	if from == "" {
		return fmt.Errorf("SMTP from email is required")
	}

	addr := fmt.Sprintf("%s:%d", settings.SMTPHost, settings.SMTPPort)
	var msg bytes.Buffer
	fromName := strings.TrimSpace(settings.SMTPFromName)
	if fromName == "" {
		fromName = strings.TrimSpace(settings.BusinessName)
	}
	msg.WriteString("From: " + fromName + " <" + from + ">\r\n")
	msg.WriteString("To: " + to + "\r\n")
	msg.WriteString("Subject: " + subject + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)

	var auth smtp.Auth
	if strings.TrimSpace(settings.SMTPUsername) != "" {
		auth = smtp.PlainAuth("", settings.SMTPUsername, settings.SMTPPassword, settings.SMTPHost)
	}
	if settings.SMTPUseTLS && settings.SMTPPort == 465 {
		conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: settings.SMTPHost})
		if err != nil {
			return err
		}
		client, err := smtp.NewClient(conn, settings.SMTPHost)
		if err != nil {
			return err
		}
		defer client.Close()
		if auth != nil {
			if err := client.Auth(auth); err != nil {
				return err
			}
		}
		if err := client.Mail(from); err != nil {
			return err
		}
		if err := client.Rcpt(to); err != nil {
			return err
		}
		writer, err := client.Data()
		if err != nil {
			return err
		}
		if _, err := writer.Write(msg.Bytes()); err != nil {
			return err
		}
		if err := writer.Close(); err != nil {
			return err
		}
		return client.Quit()
	}
	return smtp.SendMail(addr, auth, from, []string{to}, msg.Bytes())
}
