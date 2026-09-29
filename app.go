package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io/fs"
	"math/big"
	"mime"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"simpletech-books/internal/database"
	"simpletech-books/internal/pdf"
	"simpletech-books/internal/repository"
	"simpletech-books/internal/security"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx              context.Context
	repo             *repository.Repository
	migrations       fs.FS
	sessionsMu       sync.RWMutex
	sessions         map[string]*repository.AuthSession
	loginMu          sync.Mutex
	loginAttempts    map[string]*loginAttempt
	recoveryMu       sync.Mutex
	resetCodes       map[string]*passwordResetCode
	recoveryAttempts map[string]*loginAttempt
}

type loginAttempt struct {
	Failures    int
	LockedUntil time.Time
}

type passwordResetCode struct {
	UserID    int64
	Hash      [32]byte
	ExpiresAt time.Time
	SentAt    time.Time
	Failures  int
}

const sessionTimeout = 30 * time.Minute
const passwordResetCodeLifetime = 10 * time.Minute

func NewApp(migrations ...fs.FS) *App {
	var migrationFS fs.FS
	if len(migrations) > 0 {
		migrationFS = migrations[0]
	}
	return &App{
		migrations:       migrationFS,
		sessions:         make(map[string]*repository.AuthSession),
		loginAttempts:    make(map[string]*loginAttempt),
		resetCodes:       make(map[string]*passwordResetCode),
		recoveryAttempts: make(map[string]*loginAttempt),
	}
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

func (a *App) GetPasswordRecoveryOptions(username string) (*repository.PasswordRecoveryOptions, error) {
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	user, err := a.repo.GetUserByUsername(a.ctx, username)
	if err != nil {
		return &repository.PasswordRecoveryOptions{}, nil
	}
	options := &repository.PasswordRecoveryOptions{}
	if user.SecurityAnswerHash != "" {
		options.SecurityQuestion = user.SecurityQuestion
	}
	if user.RecoveryEmail != "" {
		options.EmailAvailable = true
		options.MaskedEmail = maskEmail(user.RecoveryEmail)
	}
	return options, nil
}

func (a *App) RequestPasswordResetCode(username string) error {
	if err := a.healthCheck(); err != nil {
		return err
	}
	key := strings.ToLower(strings.TrimSpace(username))
	if err := a.checkRecoveryLock(key); err != nil {
		time.Sleep(500 * time.Millisecond)
		return err
	}
	user, err := a.repo.GetUserByUsername(a.ctx, key)
	if err != nil || user.RecoveryEmail == "" {
		time.Sleep(500 * time.Millisecond)
		return fmt.Errorf("email recovery is not configured for this account")
	}
	a.recoveryMu.Lock()
	previous := a.resetCodes[key]
	if previous != nil && time.Since(previous.SentAt) < time.Minute {
		a.recoveryMu.Unlock()
		return fmt.Errorf("please wait before requesting another code")
	}
	a.recoveryMu.Unlock()

	code, err := newOneTimeCode()
	if err != nil {
		return err
	}
	settings, err := a.repo.GetSettings(a.ctx)
	if err != nil {
		return err
	}
	if strings.TrimSpace(settings.SMTPHost) == "" {
		return fmt.Errorf("email recovery is unavailable until SMTP is configured")
	}
	subject := "SimpleTech Books password reset code"
	body := fmt.Sprintf("Your SimpleTech Books password reset code is %s.\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.", code)
	if err := sendSMTP(settings, user.RecoveryEmail, subject, body); err != nil {
		return fmt.Errorf("send password reset email: %w", err)
	}
	a.recoveryMu.Lock()
	a.resetCodes[key] = &passwordResetCode{
		UserID: user.ID, Hash: sha256.Sum256([]byte(code)),
		ExpiresAt: time.Now().Add(passwordResetCodeLifetime), SentAt: time.Now(),
	}
	a.recoveryMu.Unlock()
	return nil
}

func (a *App) ResetPasswordWithCode(username string, code string, newPassword string) error {
	if err := a.healthCheck(); err != nil {
		return err
	}
	key := strings.ToLower(strings.TrimSpace(username))
	if utf8.RuneCountInString(newPassword) < 10 {
		return fmt.Errorf("password must be at least 10 characters")
	}
	if err := a.checkRecoveryLock(key); err != nil {
		time.Sleep(500 * time.Millisecond)
		return err
	}
	actual := sha256.Sum256([]byte(strings.TrimSpace(code)))
	a.recoveryMu.Lock()
	request := a.resetCodes[key]
	if request == nil || time.Now().After(request.ExpiresAt) || request.Failures >= 5 {
		delete(a.resetCodes, key)
		a.recoveryMu.Unlock()
		time.Sleep(500 * time.Millisecond)
		return fmt.Errorf("reset code is invalid or expired")
	}
	if subtle.ConstantTimeCompare(actual[:], request.Hash[:]) != 1 {
		request.Failures++
		if request.Failures >= 5 {
			attempt := a.recoveryAttempts[key]
			if attempt == nil {
				attempt = &loginAttempt{}
				a.recoveryAttempts[key] = attempt
			}
			attempt.Failures = request.Failures
			attempt.LockedUntil = time.Now().Add(15 * time.Minute)
			delete(a.resetCodes, key)
		}
		a.recoveryMu.Unlock()
		time.Sleep(500 * time.Millisecond)
		return fmt.Errorf("reset code is invalid or expired")
	}
	userID := request.UserID
	delete(a.resetCodes, key)
	a.recoveryMu.Unlock()
	if err := a.repo.UpdatePassword(a.ctx, userID, newPassword); err != nil {
		return err
	}
	a.finishPasswordReset(key, userID)
	return nil
}

func (a *App) ResetPasswordWithSecurityAnswer(username string, answer string, newPassword string) error {
	if err := a.healthCheck(); err != nil {
		return err
	}
	key := strings.ToLower(strings.TrimSpace(username))
	if utf8.RuneCountInString(newPassword) < 10 {
		return fmt.Errorf("password must be at least 10 characters")
	}
	if err := a.checkRecoveryLock(key); err != nil {
		time.Sleep(500 * time.Millisecond)
		return err
	}
	user, err := a.repo.GetUserByUsername(a.ctx, key)
	if err != nil || !repository.VerifySecurityAnswer(user, answer) {
		a.recordRecoveryFailure(key)
		time.Sleep(500 * time.Millisecond)
		return fmt.Errorf("security answer is incorrect")
	}
	if err := a.repo.UpdatePassword(a.ctx, user.ID, newPassword); err != nil {
		return err
	}
	a.finishPasswordReset(key, user.ID)
	return nil
}

func (a *App) checkRecoveryLock(username string) error {
	a.recoveryMu.Lock()
	defer a.recoveryMu.Unlock()
	attempt := a.recoveryAttempts[username]
	if attempt != nil && time.Now().Before(attempt.LockedUntil) {
		return fmt.Errorf("password recovery is temporarily locked; try again later")
	}
	return nil
}

func (a *App) recordRecoveryFailure(username string) {
	a.recoveryMu.Lock()
	defer a.recoveryMu.Unlock()
	attempt := a.recoveryAttempts[username]
	if attempt == nil {
		attempt = &loginAttempt{}
		a.recoveryAttempts[username] = attempt
	}
	attempt.Failures++
	if attempt.Failures >= 5 {
		attempt.LockedUntil = time.Now().Add(15 * time.Minute)
	}
}

func (a *App) finishPasswordReset(username string, userID int64) {
	a.recoveryMu.Lock()
	delete(a.recoveryAttempts, username)
	delete(a.resetCodes, username)
	a.recoveryMu.Unlock()
	a.loginMu.Lock()
	delete(a.loginAttempts, username)
	a.loginMu.Unlock()
	a.sessionsMu.Lock()
	for token, session := range a.sessions {
		if session.UserID == userID {
			delete(a.sessions, token)
		}
	}
	a.sessionsMu.Unlock()
}

func newOneTimeCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func maskEmail(email string) string {
	parts := strings.Split(strings.TrimSpace(email), "@")
	if len(parts) != 2 || parts[0] == "" {
		return "configured email"
	}
	local := []rune(parts[0])
	visible := string(local[0])
	return visible + strings.Repeat("*", max(3, len(local)-1)) + "@" + parts[1]
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

func (a *App) MergeCustomers(token string, sourceID int64, targetID int64) (*repository.Customer, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.MergeCustomers(a.ctx, sourceID, targetID)
}

func (a *App) GetMonthlySummary(token string, year int, month int, businessID int64) (*repository.MonthlySummary, error) {
	if _, err := a.requireAuth(token); err != nil {
		return nil, err
	}
	if err := a.healthCheck(); err != nil {
		return nil, err
	}
	return a.repo.GetMonthlySummary(a.ctx, year, month, businessID)
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
	attachment, err := os.ReadFile(pdfPath)
	if err != nil {
		return err
	}
	if invoice.PaymentInstructions != "" {
		message += "\n\n" + invoice.PaymentInstructions
	}
	if invoice.CheckPayableTo != "" {
		message += "\nMake all checks payable to " + invoice.CheckPayableTo + "."
	}
	return sendSMTP(settings, to, subject, message, mailAttachment{Name: filepath.Base(pdfPath), Data: attachment})
}

type mailAttachment struct {
	Name string
	Data []byte
}

func writeMailBody(msg *bytes.Buffer, body string, attachments []mailAttachment) error {
	if len(attachments) == 0 {
		msg.WriteString("Content-Type: text/plain; charset=utf-8\r\n\r\n" + body)
		return nil
	}
	writer := multipart.NewWriter(msg)
	msg.WriteString("Content-Type: multipart/mixed; boundary=" + writer.Boundary() + "\r\n\r\n")
	header := textproto.MIMEHeader{}
	header.Set("Content-Type", "text/plain; charset=utf-8")
	part, err := writer.CreatePart(header)
	if err != nil {
		return err
	}
	if _, err = part.Write([]byte(body)); err != nil {
		return err
	}
	for _, attachment := range attachments {
		header = textproto.MIMEHeader{}
		header.Set("Content-Type", "application/pdf")
		header.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": attachment.Name}))
		header.Set("Content-Transfer-Encoding", "base64")
		part, err = writer.CreatePart(header)
		if err != nil {
			return err
		}
		encoded := base64.StdEncoding.EncodeToString(attachment.Data)
		for len(encoded) > 0 {
			size := 76
			if len(encoded) < size {
				size = len(encoded)
			}
			if _, err = part.Write([]byte(encoded[:size] + "\r\n")); err != nil {
				return err
			}
			encoded = encoded[size:]
		}
	}
	return writer.Close()
}

func sendSMTP(settings *repository.AppSettings, to string, subject string, body string, attachments ...mailAttachment) error {
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
	if err := writeMailBody(&msg, body, attachments); err != nil {
		return err
	}

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
