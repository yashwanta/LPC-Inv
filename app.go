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
	"strings"

	"simpletech-books/internal/database"
	"simpletech-books/internal/pdf"
	"simpletech-books/internal/repository"
	"simpletech-books/internal/security"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx        context.Context
	repo       *repository.Repository
	migrations fs.FS
}

func NewApp(migrations ...fs.FS) *App {
	var migrationFS fs.FS
	if len(migrations) > 0 {
		migrationFS = migrations[0]
	}
	return &App{migrations: migrationFS}
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
	user, err := a.repo.GetUserByUsername(a.ctx, username)
	if err != nil {
		return nil, fmt.Errorf("invalid username or password")
	}
	if !security.VerifyPassword(password, user.PasswordHash) {
		return nil, fmt.Errorf("invalid username or password")
	}
	return &repository.AuthSession{
		UserID:      user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		Token:       security.NewSessionToken(),
	}, nil
}

func (a *App) GetDashboard() (*repository.DashboardSummary, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetDashboard(a.ctx)
}

func (a *App) GetIncomeExpenseReport(period string, year int) (*repository.IncomeExpenseReport, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetIncomeExpenseReport(a.ctx, period, year)
}

func (a *App) ListCustomers(search string) ([]repository.Customer, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListCustomers(a.ctx, search)
}

func (a *App) SaveCustomer(input repository.CustomerInput) (*repository.Customer, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveCustomer(a.ctx, input)
}

func (a *App) DeleteCustomer(id int64) error {
	if err := a.healthCheck(); err != nil {
		return err
	}
	return a.repo.DeleteCustomer(a.ctx, id)
}

func (a *App) ListVendors(search string) ([]repository.Vendor, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListVendors(a.ctx, search)
}

func (a *App) SaveVendor(input repository.VendorInput) (*repository.Vendor, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveVendor(a.ctx, input)
}

func (a *App) DeleteVendor(id int64) error {
	if err := a.healthCheck(); err != nil {
		return err
	}
	return a.repo.DeleteVendor(a.ctx, id)
}

func (a *App) ListInvoices(search string) ([]repository.InvoiceListItem, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListInvoices(a.ctx, search)
}

func (a *App) CreateInvoice(input repository.InvoiceInput) (*repository.InvoiceDetail, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.CreateInvoice(a.ctx, input)
}

func (a *App) GetInvoice(id int64) (*repository.InvoiceDetail, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetInvoice(a.ctx, id)
}

func (a *App) ExportInvoicePDF(id int64) (string, error) {
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
func (a *App) ListCustomerLookup(search string, kind string) ([]repository.CustomerLookup, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.ListCustomerLookup(a.ctx, search, kind)
}

func (a *App) GetSettings() (*repository.AppSettings, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetSettings(a.ctx)
}

func (a *App) SaveSettings(input repository.AppSettings) (*repository.AppSettings, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.SaveSettings(a.ctx, input)
}

func (a *App) SelectBusinessLogo() (string, error) {
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

func (a *App) GetImageDataURL(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	contentType := http.DetectContentType(data)
	return "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data), nil
}

func (a *App) EmailInvoice(input repository.EmailInvoiceInput) error {
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
