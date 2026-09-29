package repository

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"math"
	"net/mail"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"simpletech-books/internal/security"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) EnsureDefaultAdmin(ctx context.Context) error {
	var count int
	if err := r.db.QueryRowContext(ctx, `select count(*) from users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	hash, err := security.HashPassword("admin123")
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `insert into users(username, display_name, password_hash, role) values('admin', 'Administrator', $1, 'admin')`, hash)
	return err
}

func (r *Repository) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	var user User
	err := r.db.QueryRowContext(ctx, `
		select id, username, display_name, password_hash, role, access_label, active,
			recovery_email, security_question, security_answer_hash
		from users
		where lower(username) = lower($1) and active = true
	`, strings.TrimSpace(username)).Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.AccessLabel, &user.Active, &user.RecoveryEmail, &user.SecurityQuestion, &user.SecurityAnswerHash)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) ListUsers(ctx context.Context) ([]User, error) {
	rows, err := r.db.QueryContext(ctx, `
		select id, username, display_name, '' as password_hash, role, access_label, active,
			recovery_email, security_question, '' as security_answer_hash
		from users
		order by active desc, display_name asc
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []User{}
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.AccessLabel, &user.Active, &user.RecoveryEmail, &user.SecurityQuestion, &user.SecurityAnswerHash); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (r *Repository) SaveUser(ctx context.Context, input UserInput) (*User, error) {
	input.Username = strings.TrimSpace(input.Username)
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	if input.Username == "" {
		return nil, fmt.Errorf("username is required")
	}
	if input.DisplayName == "" {
		input.DisplayName = input.Username
	}
	role := strings.ToLower(strings.TrimSpace(input.Role))
	if role != "standard" && role != "admin" {
		return nil, fmt.Errorf("invalid role: must be admin or standard")
	}
	accessLabel := fallback(input.AccessLabel, "Full Access")
	input.RecoveryEmail = strings.ToLower(strings.TrimSpace(input.RecoveryEmail))
	if input.RecoveryEmail != "" {
		address, err := mail.ParseAddress(input.RecoveryEmail)
		if err != nil || address.Address != input.RecoveryEmail {
			return nil, fmt.Errorf("recovery email must be a valid email address")
		}
	}
	input.SecurityQuestion = strings.TrimSpace(input.SecurityQuestion)
	input.SecurityAnswer = strings.TrimSpace(input.SecurityAnswer)
	if input.SecurityAnswer != "" && input.SecurityQuestion == "" {
		return nil, fmt.Errorf("security question is required when setting an answer")
	}
	if input.ID == 0 {
		if strings.TrimSpace(input.Password) == "" {
			return nil, fmt.Errorf("password is required")
		}
		if utf8.RuneCountInString(input.Password) < 10 {
			return nil, fmt.Errorf("password must be at least 10 characters")
		}
		hash, err := security.HashPassword(input.Password)
		if err != nil {
			return nil, err
		}
		answerHash := ""
		if input.SecurityAnswer != "" {
			answerHash, err = security.HashPassword(normalizeSecurityAnswer(input.SecurityAnswer))
			if err != nil {
				return nil, err
			}
		}
		var user User
		err = r.db.QueryRowContext(ctx, `
			insert into users(username, display_name, password_hash, role, access_label, active, recovery_email, security_question, security_answer_hash)
			values($1,$2,$3,$4,$5,true,$6,$7,$8)
			returning id, username, display_name, '' as password_hash, role, access_label, active, recovery_email, security_question, '' as security_answer_hash
		`, input.Username, input.DisplayName, hash, role, accessLabel, input.RecoveryEmail, input.SecurityQuestion, answerHash).Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.AccessLabel, &user.Active, &user.RecoveryEmail, &user.SecurityQuestion, &user.SecurityAnswerHash)
		return &user, err
	}

	if strings.TrimSpace(input.Password) != "" {
		if utf8.RuneCountInString(input.Password) < 10 {
			return nil, fmt.Errorf("password must be at least 10 characters")
		}
		hash, err := security.HashPassword(input.Password)
		if err != nil {
			return nil, err
		}
		if _, err := r.db.ExecContext(ctx, `update users set password_hash=$1 where id=$2`, hash, input.ID); err != nil {
			return nil, err
		}
	}
	if input.SecurityQuestion == "" {
		if _, err := r.db.ExecContext(ctx, `update users set security_answer_hash='' where id=$1`, input.ID); err != nil {
			return nil, err
		}
	} else if input.SecurityAnswer != "" {
		answerHash, err := security.HashPassword(normalizeSecurityAnswer(input.SecurityAnswer))
		if err != nil {
			return nil, err
		}
		if _, err := r.db.ExecContext(ctx, `update users set security_answer_hash=$1 where id=$2`, answerHash, input.ID); err != nil {
			return nil, err
		}
	}
	var user User
	err := r.db.QueryRowContext(ctx, `
		update users
		set username=$1, display_name=$2, role=$3, access_label=$4, active=$5,
			recovery_email=$6, security_question=$7, updated_at=now()
		where id=$8
		returning id, username, display_name, '' as password_hash, role, access_label, active, recovery_email, security_question, '' as security_answer_hash
	`, input.Username, input.DisplayName, role, accessLabel, input.Active, input.RecoveryEmail, input.SecurityQuestion, input.ID).Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.AccessLabel, &user.Active, &user.RecoveryEmail, &user.SecurityQuestion, &user.SecurityAnswerHash)
	return &user, err
}

func (r *Repository) UpdatePassword(ctx context.Context, userID int64, password string) error {
	if utf8.RuneCountInString(password) < 10 {
		return fmt.Errorf("password must be at least 10 characters")
	}
	hash, err := security.HashPassword(password)
	if err != nil {
		return err
	}
	result, err := r.db.ExecContext(ctx, `update users set password_hash=$1, updated_at=now() where id=$2 and active=true`, hash, userID)
	if err != nil {
		return err
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if updated != 1 {
		return fmt.Errorf("active user not found")
	}
	return nil
}

func normalizeSecurityAnswer(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(value), " "))
}

func VerifySecurityAnswer(user *User, answer string) bool {
	return user != nil && user.SecurityAnswerHash != "" && security.VerifyPassword(normalizeSecurityAnswer(answer), user.SecurityAnswerHash)
}

func (r *Repository) ListBusinesses(ctx context.Context) ([]Business, error) {
	rows, err := r.db.QueryContext(ctx, `select id, name, active, payment_instructions, check_payable_to from businesses order by active desc, name asc`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	businesses := []Business{}
	for rows.Next() {
		var business Business
		if err := rows.Scan(&business.ID, &business.Name, &business.Active, &business.PaymentInstructions, &business.CheckPayableTo); err != nil {
			return nil, err
		}
		businesses = append(businesses, business)
	}
	return businesses, rows.Err()
}

func (r *Repository) SaveBusiness(ctx context.Context, input BusinessInput) (*Business, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, fmt.Errorf("business name is required")
	}
	if input.ID == 0 {
		input.Active = true
	}
	var business Business
	if input.ID == 0 {
		err := r.db.QueryRowContext(ctx, `
			insert into businesses(name, active, payment_instructions, check_payable_to)
			values($1, true, $2, $3)
			on conflict (name) do update set active=true, updated_at=now()
			returning id, name, active, payment_instructions, check_payable_to
		`, name, strings.TrimSpace(input.PaymentInstructions), strings.TrimSpace(input.CheckPayableTo)).Scan(&business.ID, &business.Name, &business.Active, &business.PaymentInstructions, &business.CheckPayableTo)
		return &business, err
	}
	err := r.db.QueryRowContext(ctx, `
		update businesses set name=$1, active=$2, payment_instructions=$4, check_payable_to=$5, updated_at=now()
		where id=$3
		returning id, name, active, payment_instructions, check_payable_to
	`, name, input.Active, input.ID, strings.TrimSpace(input.PaymentInstructions), strings.TrimSpace(input.CheckPayableTo)).Scan(&business.ID, &business.Name, &business.Active, &business.PaymentInstructions, &business.CheckPayableTo)
	return &business, err
}

func (r *Repository) ListCustomers(ctx context.Context, search string) ([]Customer, error) {
	search = strings.TrimSpace(search)
	rows, err := r.db.QueryContext(ctx, `
		select id, full_name, company_name, email, phone, billing_address, service_address, tax_exempt, notes, created_at::text, updated_at::text
		from customers
		where $1 = '' or full_name ilike '%' || $1 || '%' or company_name ilike '%' || $1 || '%' or email ilike '%' || $1 || '%' or phone ilike '%' || $1 || '%'
		order by updated_at desc, full_name asc
		limit 200
	`, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	customers := []Customer{}
	for rows.Next() {
		var c Customer
		if err := rows.Scan(&c.ID, &c.FullName, &c.CompanyName, &c.Email, &c.Phone, &c.BillingAddress, &c.ServiceAddress, &c.TaxExempt, &c.Notes, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		customers = append(customers, c)
	}
	return customers, rows.Err()
}

func (r *Repository) SaveCustomer(ctx context.Context, input CustomerInput) (*Customer, error) {
	if strings.TrimSpace(input.FullName) == "" {
		return nil, fmt.Errorf("customer full name is required")
	}
	var c Customer
	if input.ID == 0 {
		err := r.db.QueryRowContext(ctx, `
			insert into customers(full_name, company_name, email, phone, billing_address, service_address, tax_exempt, notes)
			values($1,$2,$3,$4,$5,$6,$7,$8)
			returning id, full_name, company_name, email, phone, billing_address, service_address, tax_exempt, notes, created_at::text, updated_at::text
		`, input.FullName, input.CompanyName, input.Email, input.Phone, input.BillingAddress, input.ServiceAddress, input.TaxExempt, input.Notes).
			Scan(&c.ID, &c.FullName, &c.CompanyName, &c.Email, &c.Phone, &c.BillingAddress, &c.ServiceAddress, &c.TaxExempt, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
		return &c, err
	}
	err := r.db.QueryRowContext(ctx, `
		update customers
		set full_name=$1, company_name=$2, email=$3, phone=$4, billing_address=$5, service_address=$6, tax_exempt=$7, notes=$8, updated_at=now()
		where id=$9
		returning id, full_name, company_name, email, phone, billing_address, service_address, tax_exempt, notes, created_at::text, updated_at::text
	`, input.FullName, input.CompanyName, input.Email, input.Phone, input.BillingAddress, input.ServiceAddress, input.TaxExempt, input.Notes, input.ID).
		Scan(&c.ID, &c.FullName, &c.CompanyName, &c.Email, &c.Phone, &c.BillingAddress, &c.ServiceAddress, &c.TaxExempt, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

func (r *Repository) DeleteCustomer(ctx context.Context, id int64) error {
	var invoiceCount int
	if err := r.db.QueryRowContext(ctx, `select count(*) from invoices where customer_id=$1`, id).Scan(&invoiceCount); err != nil {
		return err
	}
	if invoiceCount > 0 {
		return fmt.Errorf("this customer has %d invoice(s); delete those entries first, or use Merge into another customer to move them", invoiceCount)
	}
	result, err := r.db.ExecContext(ctx, `delete from customers where id=$1`, id)
	if err != nil {
		return err
	}
	if rows, err := result.RowsAffected(); err == nil && rows == 0 {
		return fmt.Errorf("customer not found")
	}
	return nil
}

// MergeCustomers moves every invoice from sourceID to targetID, fills any blank
// contact fields on the target from the source, then deletes the source record.
// Used to clean up duplicate customers created by manual entry.
func (r *Repository) MergeCustomers(ctx context.Context, sourceID int64, targetID int64) (*Customer, error) {
	if sourceID == 0 || targetID == 0 {
		return nil, fmt.Errorf("choose both customers to merge")
	}
	if sourceID == targetID {
		return nil, fmt.Errorf("cannot merge a customer into itself")
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var found int
	if err := tx.QueryRowContext(ctx, `select count(*) from customers where id in ($1, $2)`, sourceID, targetID).Scan(&found); err != nil {
		return nil, err
	}
	if found != 2 {
		return nil, fmt.Errorf("customer not found")
	}
	if _, err := tx.ExecContext(ctx, `
		update customers t set
			company_name = case when t.company_name = '' then s.company_name else t.company_name end,
			email = case when t.email = '' then s.email else t.email end,
			phone = case when t.phone = '' then s.phone else t.phone end,
			billing_address = case when t.billing_address = '' then s.billing_address else t.billing_address end,
			service_address = case when t.service_address = '' then s.service_address else t.service_address end,
			notes = case when s.notes = '' or s.notes = t.notes then t.notes when t.notes = '' then s.notes else t.notes || E'\n' || s.notes end,
			updated_at = now()
		from customers s
		where t.id = $2 and s.id = $1
	`, sourceID, targetID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `update invoices set customer_id=$2, updated_at=now() where customer_id=$1`, sourceID, targetID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `delete from customers where id=$1`, sourceID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.getCustomer(ctx, targetID)
}

func (r *Repository) ListVendors(ctx context.Context, search string) ([]Vendor, error) {
	search = strings.TrimSpace(search)
	rows, err := r.db.QueryContext(ctx, `
		select id, vendor_name, contact_name, email, phone, website, address, notes, created_at::text, updated_at::text
		from vendors
		where $1 = '' or vendor_name ilike '%' || $1 || '%' or contact_name ilike '%' || $1 || '%' or email ilike '%' || $1 || '%' or phone ilike '%' || $1 || '%'
		order by updated_at desc, vendor_name asc
		limit 200
	`, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vendors := []Vendor{}
	for rows.Next() {
		var v Vendor
		if err := rows.Scan(&v.ID, &v.VendorName, &v.ContactName, &v.Email, &v.Phone, &v.Website, &v.Address, &v.Notes, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		vendors = append(vendors, v)
	}
	return vendors, rows.Err()
}

func (r *Repository) SaveVendor(ctx context.Context, input VendorInput) (*Vendor, error) {
	if strings.TrimSpace(input.VendorName) == "" {
		return nil, fmt.Errorf("vendor name is required")
	}
	var v Vendor
	if input.ID == 0 {
		err := r.db.QueryRowContext(ctx, `
			insert into vendors(vendor_name, contact_name, email, phone, website, address, notes)
			values($1,$2,$3,$4,$5,$6,$7)
			returning id, vendor_name, contact_name, email, phone, website, address, notes, created_at::text, updated_at::text
		`, input.VendorName, input.ContactName, input.Email, input.Phone, input.Website, input.Address, input.Notes).
			Scan(&v.ID, &v.VendorName, &v.ContactName, &v.Email, &v.Phone, &v.Website, &v.Address, &v.Notes, &v.CreatedAt, &v.UpdatedAt)
		return &v, err
	}
	err := r.db.QueryRowContext(ctx, `
		update vendors
		set vendor_name=$1, contact_name=$2, email=$3, phone=$4, website=$5, address=$6, notes=$7, updated_at=now()
		where id=$8
		returning id, vendor_name, contact_name, email, phone, website, address, notes, created_at::text, updated_at::text
	`, input.VendorName, input.ContactName, input.Email, input.Phone, input.Website, input.Address, input.Notes, input.ID).
		Scan(&v.ID, &v.VendorName, &v.ContactName, &v.Email, &v.Phone, &v.Website, &v.Address, &v.Notes, &v.CreatedAt, &v.UpdatedAt)
	return &v, err
}

func (r *Repository) DeleteVendor(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `delete from vendors where id=$1`, id)
	return err
}

func (r *Repository) ListPurchases(ctx context.Context, search string) ([]Purchase, error) {
	search = strings.TrimSpace(search)
	rows, err := r.db.QueryContext(ctx, `
		select p.id, coalesce(b.id, 0), coalesce(b.name, ''), coalesce(v.id, 0), coalesce(v.vendor_name, ''), p.purchase_date::text, p.description, coalesce(pc.name, ''), p.amount, p.tax_paid, p.payment_method, p.notes, p.created_at::text
		from purchases p
		left join businesses b on b.id = p.business_id
		left join vendors v on v.id = p.vendor_id
		left join purchase_categories pc on pc.id = p.category_id
		where $1 = '' or p.description ilike '%' || $1 || '%' or coalesce(v.vendor_name, '') ilike '%' || $1 || '%' or coalesce(pc.name, '') ilike '%' || $1 || '%' or coalesce(b.name, '') ilike '%' || $1 || '%'
		order by p.purchase_date desc, p.created_at desc
		limit 200
	`, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	purchases := []Purchase{}
	for rows.Next() {
		var purchase Purchase
		if err := rows.Scan(&purchase.ID, &purchase.BusinessID, &purchase.BusinessName, &purchase.VendorID, &purchase.VendorName, &purchase.PurchaseDate, &purchase.Description, &purchase.CategoryName, &purchase.Amount, &purchase.TaxPaid, &purchase.PaymentMethod, &purchase.Notes, &purchase.CreatedAt); err != nil {
			return nil, err
		}
		purchases = append(purchases, purchase)
	}
	return purchases, rows.Err()
}

func (r *Repository) SavePurchase(ctx context.Context, input PurchaseInput) (*Purchase, error) {
	purchaseDate, err := parseDate(input.PurchaseDate)
	if err != nil {
		return nil, fmt.Errorf("invalid purchase date")
	}
	input.Description = strings.TrimSpace(input.Description)
	if input.Description == "" {
		return nil, fmt.Errorf("purchase description is required")
	}
	input.Amount = roundMoney(input.Amount)
	if input.Amount <= 0 {
		return nil, fmt.Errorf("purchase amount must be greater than zero")
	}
	input.TaxPaid = math.Max(0, roundMoney(input.TaxPaid))
	categoryName := fallback(strings.TrimSpace(input.CategoryName), "Uncategorized")
	paymentMethod := normalizePaymentMethod(input.PaymentMethod)

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	vendorID, err := ensureVendor(ctx, tx, input.VendorName)
	if err != nil {
		return nil, err
	}
	categoryID, err := ensurePurchaseCategory(ctx, tx, categoryName)
	if err != nil {
		return nil, err
	}
	businessID, err := ensureBusinessID(ctx, tx, input.BusinessID)
	if err != nil {
		return nil, err
	}

	purchaseID := input.ID
	if purchaseID == 0 {
		err = tx.QueryRowContext(ctx, `
			insert into purchases(business_id, vendor_id, purchase_date, description, category_id, amount, tax_paid, payment_method, notes)
			values($1,$2,$3,$4,$5,$6,$7,$8,$9)
			returning id
		`, businessID, nullInt64(vendorID), purchaseDate, input.Description, categoryID, input.Amount, input.TaxPaid, paymentMethod, strings.TrimSpace(input.Notes)).Scan(&purchaseID)
	} else {
		result, execErr := tx.ExecContext(ctx, `
			update purchases
			set business_id=$1, vendor_id=$2, purchase_date=$3, description=$4, category_id=$5, amount=$6, tax_paid=$7, payment_method=$8, notes=$9, updated_at=now()
			where id=$10
		`, businessID, nullInt64(vendorID), purchaseDate, input.Description, categoryID, input.Amount, input.TaxPaid, paymentMethod, strings.TrimSpace(input.Notes), purchaseID)
		err = execErr
		if err == nil {
			if rows, rowsErr := result.RowsAffected(); rowsErr == nil && rows == 0 {
				err = fmt.Errorf("purchase not found")
			}
		}
	}
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.getPurchase(ctx, purchaseID)
}

func (r *Repository) DeletePurchase(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `update statement_transactions set saved_purchase_id=null where saved_purchase_id=$1`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `delete from purchases where id=$1`, id); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) DeleteInvoice(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `update purchases set related_invoice_id=null where related_invoice_id=$1`, id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `delete from invoices where id=$1`, id)
	if err != nil {
		return err
	}
	if rows, err := result.RowsAffected(); err == nil && rows == 0 {
		return fmt.Errorf("entry not found (it may already be deleted)")
	}
	return tx.Commit()
}

func (r *Repository) CreateInvoice(ctx context.Context, input InvoiceInput) (*InvoiceDetail, error) {
	if input.CustomerID == 0 {
		return nil, fmt.Errorf("customer is required")
	}
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("at least one invoice line item is required")
	}

	invoiceDate, err := parseDate(input.InvoiceDate)
	if err != nil {
		return nil, fmt.Errorf("invalid invoice date")
	}
	dueDate, err := parseDate(input.DueDate)
	if err != nil {
		return nil, fmt.Errorf("invalid due date")
	}
	settings, err := r.GetSettings(ctx)
	if err != nil {
		return nil, err
	}
	customer, err := r.getCustomer(ctx, input.CustomerID)
	if err != nil {
		return nil, err
	}
	businessID, err := r.ensureBusinessID(ctx, input.BusinessID)
	if err != nil {
		return nil, err
	}

	var subtotal, taxableSubtotal float64
	for i := range input.Items {
		item := &input.Items[i]
		item.Description = strings.TrimSpace(item.Description)
		if item.Description == "" {
			return nil, fmt.Errorf("line item description is required")
		}
		if item.Quantity <= 0 {
			item.Quantity = 1
		}
		if item.ItemType == "parts" {
			item.Taxable = settings.PartsTaxable
		}
		if item.ItemType == "labor" {
			item.Taxable = settings.LaborTaxable
		}
		lineTotal := roundMoney(item.Quantity * item.UnitPrice)
		subtotal += lineTotal
		if item.Taxable && !customer.TaxExempt {
			taxableSubtotal += lineTotal
		}
	}
	subtotal = roundMoney(subtotal)
	discount := math.Max(0, roundMoney(input.DiscountAmount))
	if discount > subtotal {
		discount = subtotal
	}
	tax := roundMoney(math.Max(0, taxableSubtotal-discount) * settings.DefaultTaxRate)
	total := roundMoney(subtotal - discount + tax)

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var sequence int64
	if err := tx.QueryRowContext(ctx, `select nextval('invoice_number_seq')`).Scan(&sequence); err != nil {
		return nil, err
	}
	invoiceNumber := fmt.Sprintf("%s-%06d", settings.InvoicePrefix, sequence)

	var invoiceID int64
	err = tx.QueryRowContext(ctx, `
		insert into invoices(business_id, invoice_number, invoice_date, due_date, customer_id, subtotal, discount_amount, tax_amount, total_amount, notes, terms)
		values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		returning id
	`, businessID, invoiceNumber, invoiceDate, dueDate, input.CustomerID, subtotal, discount, tax, total, input.Notes, fallback(input.Terms, settings.InvoiceTerms)).Scan(&invoiceID)
	if err != nil {
		return nil, err
	}

	for position, item := range input.Items {
		itemType := fallback(item.ItemType, "other")
		lineTotal := roundMoney(item.Quantity * item.UnitPrice)
		_, err := tx.ExecContext(ctx, `
			insert into invoice_items(invoice_id, item_type, description, quantity, unit_price, taxable, line_total, position)
			values($1,$2,$3,$4,$5,$6,$7,$8)
		`, invoiceID, itemType, item.Description, item.Quantity, item.UnitPrice, item.Taxable, lineTotal, position)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetInvoice(ctx, invoiceID)
}

func (r *Repository) RecordWalkInService(ctx context.Context, input WalkInServiceInput) (*InvoiceDetail, error) {
	serviceDate, err := parseDate(input.ServiceDate)
	if err != nil {
		return nil, fmt.Errorf("invalid service date")
	}
	paymentDate, err := parseDate(fallback(input.PaymentDate, input.ServiceDate))
	if err != nil {
		return nil, fmt.Errorf("invalid payment date")
	}

	serviceCharge := math.Max(0, roundMoney(input.ServiceCharge))
	partsCost := math.Max(0, roundMoney(input.PartsCost))
	if serviceCharge == 0 && partsCost == 0 {
		return nil, fmt.Errorf("service charge or parts cost is required")
	}

	fullName := strings.TrimSpace(strings.TrimSpace(input.FirstName) + " " + strings.TrimSpace(input.LastName))
	if fullName == "" {
		fullName = "Walk-in Customer"
	}
	description := buildServiceDescription(input)

	settings, err := r.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	customerID, err := ensureCustomer(ctx, tx, CustomerInput{
		FullName: fullName,
		Email:    strings.TrimSpace(input.Email),
		Phone:    strings.TrimSpace(input.Phone),
		Notes:    "Created from manual walk-in service entry.",
	})
	if err != nil {
		return nil, err
	}
	businessID, err := ensureBusinessID(ctx, tx, input.BusinessID)
	if err != nil {
		return nil, err
	}

	subtotal := roundMoney(partsCost + serviceCharge)
	tax := 0.0
	total := subtotal

	notes := buildServiceNotes(input)

	invoiceID := input.ID
	if invoiceID == 0 {
		var sequence int64
		if err := tx.QueryRowContext(ctx, `select nextval('invoice_number_seq')`).Scan(&sequence); err != nil {
			return nil, err
		}
		invoiceNumber := fmt.Sprintf("%s-%06d", settings.InvoicePrefix, sequence)
		err = tx.QueryRowContext(ctx, `
			insert into invoices(business_id, invoice_number, invoice_date, due_date, customer_id, subtotal, tax_amount, total_amount, notes, terms)
			values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			returning id
		`, businessID, invoiceNumber, serviceDate, serviceDate, customerID, subtotal, tax, total, notes, fallback(settings.InvoiceTerms, "Payment due on receipt.")).Scan(&invoiceID)
		if err != nil {
			return nil, err
		}
	} else {
		result, err := tx.ExecContext(ctx, `
			update invoices
			set business_id=$1, invoice_date=$2, due_date=$2, customer_id=$3, subtotal=$4, discount_amount=0, tax_amount=$5, total_amount=$6, notes=$7, terms=$8, updated_at=now()
			where id=$9
		`, businessID, serviceDate, customerID, subtotal, tax, total, notes, fallback(settings.InvoiceTerms, "Payment due on receipt."), invoiceID)
		if err != nil {
			return nil, err
		}
		if rows, err := result.RowsAffected(); err == nil && rows == 0 {
			return nil, fmt.Errorf("invoice not found")
		}
		if _, err := tx.ExecContext(ctx, `delete from invoice_items where invoice_id=$1`, invoiceID); err != nil {
			return nil, err
		}
		if _, err := tx.ExecContext(ctx, `delete from payments where invoice_id=$1`, invoiceID); err != nil {
			return nil, err
		}
	}

	position := 0
	if serviceCharge > 0 {
		if _, err := tx.ExecContext(ctx, `
			insert into invoice_items(invoice_id, item_type, description, quantity, unit_price, taxable, line_total, position)
			values($1,'labor',$2,1,$3,$4,$3,$5)
		`, invoiceID, fallback(description, "Walk-in service charge"), serviceCharge, settings.LaborTaxable, position); err != nil {
			return nil, err
		}
		position++
	}
	if partsCost > 0 {
		if _, err := tx.ExecContext(ctx, `
			insert into invoice_items(invoice_id, item_type, description, quantity, unit_price, taxable, line_total, position)
			values($1,'parts',$2,1,$3,$4,$3,$5)
		`, invoiceID, fallback(input.Solution, "Parts"), partsCost, settings.PartsTaxable, position); err != nil {
			return nil, err
		}
	}

	amountPaid := math.Min(total, math.Max(0, roundMoney(input.AmountPaid)))
	if amountPaid > 0 {
		method := normalizePaymentMethod(input.PaymentMethod)
		if _, err := tx.ExecContext(ctx, `
			insert into payments(invoice_id, payment_date, amount, method, notes)
			values($1,$2,$3,$4,$5)
		`, invoiceID, paymentDate, amountPaid, method, "Manual walk-in payment"); err != nil {
			return nil, err
		}
		status := "partial"
		if amountPaid >= total {
			status = "paid"
		}
		if _, err := tx.ExecContext(ctx, `update invoices set paid_amount=$1, status=$2, updated_at=now() where id=$3`, amountPaid, status, invoiceID); err != nil {
			return nil, err
		}
	} else if input.ID != 0 {
		if _, err := tx.ExecContext(ctx, `update invoices set paid_amount=0, status='unpaid', updated_at=now() where id=$1`, invoiceID); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetInvoice(ctx, invoiceID)
}

func (r *Repository) ListInvoices(ctx context.Context, search string) ([]InvoiceListItem, error) {
	search = strings.TrimSpace(search)
	rows, err := r.db.QueryContext(ctx, `
		select i.id, coalesce(b.id, 0), coalesce(b.name, ''), i.invoice_number, i.invoice_date::text, i.due_date::text, c.full_name, i.status, i.total_amount, i.paid_amount, i.created_at::text
		from invoices i
		join customers c on c.id = i.customer_id
		left join businesses b on b.id = i.business_id
		where $1 = '' or i.invoice_number ilike '%' || $1 || '%' or c.full_name ilike '%' || $1 || '%' or c.company_name ilike '%' || $1 || '%' or coalesce(b.name, '') ilike '%' || $1 || '%'
		order by i.created_at desc
		limit 200
	`, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invoices := []InvoiceListItem{}
	for rows.Next() {
		var invoice InvoiceListItem
		if err := rows.Scan(&invoice.ID, &invoice.BusinessID, &invoice.BusinessName, &invoice.InvoiceNumber, &invoice.InvoiceDate, &invoice.DueDate, &invoice.CustomerName, &invoice.Status, &invoice.TotalAmount, &invoice.PaidAmount, &invoice.CreatedAt); err != nil {
			return nil, err
		}
		invoices = append(invoices, invoice)
	}
	return invoices, rows.Err()
}

func (r *Repository) GetInvoice(ctx context.Context, id int64) (*InvoiceDetail, error) {
	var invoice InvoiceDetail
	err := r.db.QueryRowContext(ctx, `
		select i.id, coalesce(b.id, 0), coalesce(b.name, ''), i.invoice_number, i.invoice_date::text, i.due_date::text,
			c.id, c.full_name, c.company_name, c.email, c.phone, c.billing_address, c.service_address, c.tax_exempt, c.notes, c.created_at::text, c.updated_at::text,
			i.status, i.subtotal, i.discount_amount, i.tax_amount, i.total_amount, i.paid_amount,
			coalesce((select p.payment_date::text from payments p where p.invoice_id = i.id order by p.payment_date desc, p.id desc limit 1), ''),
			coalesce((select p.method from payments p where p.invoice_id = i.id order by p.payment_date desc, p.id desc limit 1), ''),
			i.notes, i.terms, i.created_at::text, i.updated_at::text, coalesce(b.payment_instructions, ''), coalesce(b.check_payable_to, '')
		from invoices i
		join customers c on c.id = i.customer_id
		left join businesses b on b.id = i.business_id
		where i.id=$1
	`, id).Scan(
		&invoice.ID, &invoice.BusinessID, &invoice.BusinessName, &invoice.InvoiceNumber, &invoice.InvoiceDate, &invoice.DueDate,
		&invoice.Customer.ID, &invoice.Customer.FullName, &invoice.Customer.CompanyName, &invoice.Customer.Email, &invoice.Customer.Phone, &invoice.Customer.BillingAddress, &invoice.Customer.ServiceAddress, &invoice.Customer.TaxExempt, &invoice.Customer.Notes, &invoice.Customer.CreatedAt, &invoice.Customer.UpdatedAt,
		&invoice.Status, &invoice.Subtotal, &invoice.DiscountAmount, &invoice.TaxAmount, &invoice.TotalAmount, &invoice.PaidAmount, &invoice.PaymentDate, &invoice.PaymentMethod, &invoice.Notes, &invoice.Terms, &invoice.CreatedAt, &invoice.UpdatedAt, &invoice.PaymentInstructions, &invoice.CheckPayableTo,
	)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.QueryContext(ctx, `
		select id, invoice_id, item_type, description, quantity, unit_price, taxable, line_total, position
		from invoice_items
		where invoice_id=$1
		order by position asc, id asc
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item InvoiceItem
		if err := rows.Scan(&item.ID, &item.InvoiceID, &item.ItemType, &item.Description, &item.Quantity, &item.UnitPrice, &item.Taxable, &item.LineTotal, &item.Position); err != nil {
			return nil, err
		}
		invoice.Items = append(invoice.Items, item)
	}
	return &invoice, rows.Err()
}

func (r *Repository) ListCustomerLookup(ctx context.Context, search string, kind string) ([]CustomerLookup, error) {
	search = strings.TrimSpace(search)
	kind = strings.TrimSpace(strings.ToLower(kind))
	rows, err := r.db.QueryContext(ctx, `
		select c.id, c.full_name, c.company_name, c.email, c.phone, c.billing_address, c.service_address, c.tax_exempt, c.notes, c.created_at::text, c.updated_at::text,
			count(i.id)::int as invoice_count,
			coalesce(sum(i.total_amount), 0) as total_sales,
			coalesce(max(i.invoice_date)::text, '') as last_invoice
		from customers c
		left join invoices i on i.customer_id = c.id
		where $1 = '' or c.full_name ilike '%' || $1 || '%' or c.company_name ilike '%' || $1 || '%' or c.email ilike '%' || $1 || '%' or c.phone ilike '%' || $1 || '%'
		group by c.id
		having $2 = ''
			or $2 = 'all'
			or ($2 = 'repeat' and count(i.id) > 1)
			or ($2 = 'new' and count(i.id) <= 1)
		order by count(i.id) desc, max(i.invoice_date) desc nulls last, c.full_name asc
		limit 500
	`, search, kind)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	customers := []CustomerLookup{}
	for rows.Next() {
		var item CustomerLookup
		if err := rows.Scan(&item.Customer.ID, &item.Customer.FullName, &item.Customer.CompanyName, &item.Customer.Email, &item.Customer.Phone, &item.Customer.BillingAddress, &item.Customer.ServiceAddress, &item.Customer.TaxExempt, &item.Customer.Notes, &item.Customer.CreatedAt, &item.Customer.UpdatedAt, &item.InvoiceCount, &item.TotalSales, &item.LastInvoice); err != nil {
			return nil, err
		}
		item.Kind = "new"
		if item.InvoiceCount > 1 {
			item.Kind = "repeat"
		}
		customers = append(customers, item)
	}
	return customers, rows.Err()
}

func (r *Repository) SaveSettings(ctx context.Context, input AppSettings) (*AppSettings, error) {
	smtpPassword, err := encryptSetting(input.SMTPPassword)
	if err != nil {
		return nil, err
	}
	values := map[string]string{
		"business_name":      input.BusinessName,
		"business_address":   input.BusinessAddress,
		"business_phone":     input.BusinessPhone,
		"business_email":     input.BusinessEmail,
		"business_logo_path": input.BusinessLogoPath,
		"default_tax_rate":   fmt.Sprintf("%.4f", input.DefaultTaxRate),
		"parts_taxable":      strconv.FormatBool(input.PartsTaxable),
		"labor_taxable":      strconv.FormatBool(input.LaborTaxable),
		"invoice_terms":      input.InvoiceTerms,
		"invoice_prefix":     fallback(input.InvoicePrefix, "INV"),
		"theme":              fallback(input.Theme, "light"),
		"smtp_host":          input.SMTPHost,
		"smtp_port":          strconv.Itoa(input.SMTPPort),
		"smtp_username":      input.SMTPUsername,
		"smtp_password":      smtpPassword,
		"smtp_from_email":    input.SMTPFromEmail,
		"smtp_from_name":     input.SMTPFromName,
		"smtp_use_tls":       strconv.FormatBool(input.SMTPUseTLS),
	}
	for key, value := range values {
		_, err := r.db.ExecContext(ctx, `
			insert into settings(key, value, updated_at)
			values($1, $2, now())
			on conflict (key) do update set value = excluded.value, updated_at = now()
		`, key, value)
		if err != nil {
			return nil, err
		}
	}
	return r.GetSettings(ctx)
}
func (r *Repository) GetSettings(ctx context.Context) (*AppSettings, error) {
	rows, err := r.db.QueryContext(ctx, `select key, value from settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	values := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		values[key] = value
	}
	smtpPassword, err := decryptSetting(values["smtp_password"])
	if err != nil {
		return nil, err
	}
	settings := &AppSettings{
		BusinessName:     fallback(values["business_name"], "SimpleTech Books"),
		BusinessAddress:  values["business_address"],
		BusinessPhone:    values["business_phone"],
		BusinessEmail:    values["business_email"],
		BusinessLogoPath: values["business_logo_path"],
		DefaultTaxRate:   parseFloat(values["default_tax_rate"]),
		PartsTaxable:     parseBool(values["parts_taxable"], true),
		LaborTaxable:     parseBool(values["labor_taxable"], false),
		InvoiceTerms:     values["invoice_terms"],
		InvoicePrefix:    fallback(values["invoice_prefix"], "INV"),
		Theme:            fallback(values["theme"], "light"),
		SMTPHost:         values["smtp_host"],
		SMTPPort:         parseInt(values["smtp_port"], 587),
		SMTPUsername:     values["smtp_username"],
		SMTPPassword:     smtpPassword,
		SMTPFromEmail:    values["smtp_from_email"],
		SMTPFromName:     values["smtp_from_name"],
		SMTPUseTLS:       parseBool(values["smtp_use_tls"], true),
	}
	return settings, rows.Err()
}

const encryptedSettingPrefix = "aesgcm:"

func secretKey() ([]byte, error) {
	encoded := strings.TrimSpace(os.Getenv("SIMPLETECH_SECRET_KEY"))
	if encoded == "" {
		log.Printf("WARNING: SIMPLETECH_SECRET_KEY is not set; SMTP password will be stored as plaintext")
		return nil, nil
	}
	key, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(key) != 32 {
		return nil, fmt.Errorf("SIMPLETECH_SECRET_KEY must be a base64-encoded 32-byte key")
	}
	return key, nil
}

func encryptSetting(value string) (string, error) {
	key, err := secretKey()
	if err != nil || key == nil || value == "" || strings.HasPrefix(value, encryptedSettingPrefix) {
		return value, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(value), nil)
	return encryptedSettingPrefix + base64.RawStdEncoding.EncodeToString(sealed), nil
}

func decryptSetting(value string) (string, error) {
	if !strings.HasPrefix(value, encryptedSettingPrefix) {
		return value, nil
	}
	key, err := secretKey()
	if err != nil {
		return "", err
	}
	if key == nil {
		log.Printf("WARNING: encrypted SMTP password cannot be decrypted without SIMPLETECH_SECRET_KEY")
		return value, nil
	}
	payload, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(value, encryptedSettingPrefix))
	if err != nil {
		return "", fmt.Errorf("decode SMTP password: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(payload) < gcm.NonceSize() {
		return "", fmt.Errorf("invalid encrypted SMTP password")
	}
	plain, err := gcm.Open(nil, payload[:gcm.NonceSize()], payload[gcm.NonceSize():], nil)
	if err != nil {
		return "", fmt.Errorf("decrypt SMTP password: %w", err)
	}
	return string(plain), nil
}

func (r *Repository) GetDashboard(ctx context.Context) (*DashboardSummary, error) {
	summary := &DashboardSummary{
		RecentInvoices:  []InvoiceListItem{},
		RecentCustomers: []Customer{},
	}
	_ = r.db.QueryRowContext(ctx, `select coalesce(sum(total_amount - paid_amount), 0) from invoices where status <> 'paid'`).Scan(&summary.TotalUnpaidInvoices)
	_ = r.db.QueryRowContext(ctx, `select count(*) from invoices where status = 'paid' and date_trunc('month', invoice_date) = date_trunc('month', current_date)`).Scan(&summary.PaidInvoicesMonth)
	_ = r.db.QueryRowContext(ctx, `select coalesce(sum(total_amount), 0) from invoices where date_trunc('month', invoice_date) = date_trunc('month', current_date)`).Scan(&summary.TotalSalesMonth)
	_ = r.db.QueryRowContext(ctx, `select coalesce(sum(amount), 0) from purchases where date_trunc('month', purchase_date) = date_trunc('month', current_date)`).Scan(&summary.PurchasesMonth)
	_ = r.db.QueryRowContext(ctx, `select coalesce(sum(tax_amount), 0) from invoices where date_trunc('month', invoice_date) = date_trunc('month', current_date)`).Scan(&summary.SalesTaxCollected)
	invoices, err := r.ListInvoices(ctx, "")
	if err != nil {
		return nil, err
	}
	if len(invoices) > 8 {
		invoices = invoices[:8]
	}
	customers, err := r.ListCustomers(ctx, "")
	if err != nil {
		return nil, err
	}
	if len(customers) > 8 {
		customers = customers[:8]
	}
	summary.RecentInvoices = invoices
	summary.RecentCustomers = customers
	return summary, nil
}

func (r *Repository) GetIncomeExpenseReport(ctx context.Context, period string, year int) (*IncomeExpenseReport, error) {
	period = strings.ToLower(strings.TrimSpace(period))
	if period != "yearly" {
		period = "monthly"
	}
	if year == 0 {
		year = time.Now().Year()
	}

	if period == "yearly" {
		return r.getYearlyIncomeExpenseReport(ctx, year)
	}
	return r.getMonthlyIncomeExpenseReport(ctx, year)
}

func (r *Repository) GetTaxReport(ctx context.Context, startDate string, endDate string, businessID int64) (*TaxReportSummary, error) {
	start, err := parseDate(startDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start date")
	}
	end, err := parseDate(endDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end date")
	}
	if end.Before(start) {
		return nil, fmt.Errorf("end date must be after start date")
	}
	report := &TaxReportSummary{
		StartDate:  start.Format("2006-01-02"),
		EndDate:    end.Format("2006-01-02"),
		BusinessID: businessID,
	}
	if businessID != 0 {
		_ = r.db.QueryRowContext(ctx, `select name from businesses where id=$1`, businessID).Scan(&report.BusinessName)
	}
	_ = r.db.QueryRowContext(ctx, `
		select coalesce(sum(subtotal), 0), coalesce(sum(tax_amount), 0)
		from invoices
		where invoice_date between $1 and $2 and ($3::bigint = 0 or business_id = $3)
	`, start, end, businessID).Scan(&report.GrossSales, &report.SalesTaxCollected)
	_ = r.db.QueryRowContext(ctx, `
		select coalesce(sum(ii.line_total), 0)
		from invoice_items ii
		join invoices i on i.id = ii.invoice_id
		where i.invoice_date between $1 and $2 and ii.taxable = true and ($3::bigint = 0 or i.business_id = $3)
	`, start, end, businessID).Scan(&report.TaxableSales)
	report.NonTaxableSales = roundMoney(math.Max(0, report.GrossSales-report.TaxableSales))
	_ = r.db.QueryRowContext(ctx, `
		select coalesce(sum(amount), 0)
		from purchases
		where purchase_date between $1 and $2 and ($3::bigint = 0 or business_id = $3)
	`, start, end, businessID).Scan(&report.TotalPurchases)
	report.NetIncome = roundMoney(report.GrossSales - report.TotalPurchases)
	return report, nil
}

func (r *Repository) getMonthlyIncomeExpenseReport(ctx context.Context, year int) (*IncomeExpenseReport, error) {
	rows, err := r.db.QueryContext(ctx, `
		with months as (
			select generate_series(1, 12) as month_number
		),
		income as (
			select extract(month from invoice_date)::int as month_number, coalesce(sum(total_amount), 0) as amount
			from invoices
			where extract(year from invoice_date)::int = $1
			group by extract(month from invoice_date)::int
		),
		expenses as (
			select extract(month from purchase_date)::int as month_number, coalesce(sum(amount), 0) as amount
			from purchases
			where extract(year from purchase_date)::int = $1
			group by extract(month from purchase_date)::int
		)
		select to_char(make_date($1, months.month_number, 1), 'Mon') as label,
			coalesce(income.amount, 0) as income,
			coalesce(expenses.amount, 0) as expense
		from months
		left join income on income.month_number = months.month_number
		left join expenses on expenses.month_number = months.month_number
		order by months.month_number
	`, year)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanIncomeExpenseReport(rows, "monthly", year)
}

func (r *Repository) getYearlyIncomeExpenseReport(ctx context.Context, year int) (*IncomeExpenseReport, error) {
	startYear := year - 4
	rows, err := r.db.QueryContext(ctx, `
		with years as (
			select generate_series($1, $2) as report_year
		),
		income as (
			select extract(year from invoice_date)::int as report_year, coalesce(sum(total_amount), 0) as amount
			from invoices
			where extract(year from invoice_date)::int between $1 and $2
			group by extract(year from invoice_date)::int
		),
		expenses as (
			select extract(year from purchase_date)::int as report_year, coalesce(sum(amount), 0) as amount
			from purchases
			where extract(year from purchase_date)::int between $1 and $2
			group by extract(year from purchase_date)::int
		)
		select years.report_year::text as label,
			coalesce(income.amount, 0) as income,
			coalesce(expenses.amount, 0) as expense
		from years
		left join income on income.report_year = years.report_year
		left join expenses on expenses.report_year = years.report_year
		order by years.report_year
	`, startYear, year)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanIncomeExpenseReport(rows, "yearly", year)
}

func scanIncomeExpenseReport(rows *sql.Rows, period string, year int) (*IncomeExpenseReport, error) {
	report := &IncomeExpenseReport{
		Period: period,
		Year:   year,
		Rows:   []IncomeExpenseReportItem{},
	}
	for rows.Next() {
		var item IncomeExpenseReportItem
		if err := rows.Scan(&item.Label, &item.Income, &item.Expense); err != nil {
			return nil, err
		}
		item.Net = roundMoney(item.Income - item.Expense)
		report.TotalIncome = roundMoney(report.TotalIncome + item.Income)
		report.TotalExpense = roundMoney(report.TotalExpense + item.Expense)
		report.Rows = append(report.Rows, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	report.NetIncome = roundMoney(report.TotalIncome - report.TotalExpense)
	return report, nil
}

func (r *Repository) getCustomer(ctx context.Context, id int64) (*Customer, error) {
	var c Customer
	err := r.db.QueryRowContext(ctx, `
		select id, full_name, company_name, email, phone, billing_address, service_address, tax_exempt, notes, created_at::text, updated_at::text
		from customers where id=$1
	`, id).Scan(&c.ID, &c.FullName, &c.CompanyName, &c.Email, &c.Phone, &c.BillingAddress, &c.ServiceAddress, &c.TaxExempt, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) getPurchase(ctx context.Context, id int64) (*Purchase, error) {
	var purchase Purchase
	err := r.db.QueryRowContext(ctx, `
		select p.id, coalesce(b.id, 0), coalesce(b.name, ''), coalesce(v.id, 0), coalesce(v.vendor_name, ''), p.purchase_date::text, p.description, coalesce(pc.name, ''), p.amount, p.tax_paid, p.payment_method, p.notes, p.created_at::text
		from purchases p
		left join businesses b on b.id = p.business_id
		left join vendors v on v.id = p.vendor_id
		left join purchase_categories pc on pc.id = p.category_id
		where p.id=$1
	`, id).Scan(&purchase.ID, &purchase.BusinessID, &purchase.BusinessName, &purchase.VendorID, &purchase.VendorName, &purchase.PurchaseDate, &purchase.Description, &purchase.CategoryName, &purchase.Amount, &purchase.TaxPaid, &purchase.PaymentMethod, &purchase.Notes, &purchase.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &purchase, nil
}

func (r *Repository) ensureBusinessID(ctx context.Context, businessID int64) (int64, error) {
	if businessID != 0 {
		return businessID, nil
	}
	var id int64
	err := r.db.QueryRowContext(ctx, `select id from businesses where active = true order by id limit 1`).Scan(&id)
	return id, err
}

func ensureCustomer(ctx context.Context, tx *sql.Tx, input CustomerInput) (int64, error) {
	fullName := strings.TrimSpace(input.FullName)
	phone := strings.TrimSpace(input.Phone)
	email := strings.TrimSpace(input.Email)
	var id int64
	err := tx.QueryRowContext(ctx, `
		select id
		from customers
		where lower(full_name) = lower($1)
			and ($2 = '' or phone = $2)
			and ($3 = '' or lower(email) = lower($3))
		order by updated_at desc
		limit 1
	`, fullName, phone, email).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}
	err = tx.QueryRowContext(ctx, `
		insert into customers(full_name, email, phone, notes)
		values($1,$2,$3,$4)
		returning id
	`, fullName, email, phone, strings.TrimSpace(input.Notes)).Scan(&id)
	return id, err
}

func ensureVendor(ctx context.Context, tx *sql.Tx, vendorName string) (int64, error) {
	vendorName = strings.TrimSpace(vendorName)
	if vendorName == "" {
		return 0, nil
	}
	var id int64
	err := tx.QueryRowContext(ctx, `select id from vendors where lower(vendor_name) = lower($1) limit 1`, vendorName).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}
	err = tx.QueryRowContext(ctx, `insert into vendors(vendor_name) values($1) returning id`, vendorName).Scan(&id)
	return id, err
}

func ensurePurchaseCategory(ctx context.Context, tx *sql.Tx, categoryName string) (int64, error) {
	categoryName = fallback(strings.TrimSpace(categoryName), "Uncategorized")
	var id int64
	err := tx.QueryRowContext(ctx, `select id from purchase_categories where lower(name) = lower($1) limit 1`, categoryName).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}
	err = tx.QueryRowContext(ctx, `insert into purchase_categories(name) values($1) returning id`, categoryName).Scan(&id)
	return id, err
}

func ensureBusinessID(ctx context.Context, tx *sql.Tx, businessID int64) (int64, error) {
	if businessID != 0 {
		return businessID, nil
	}
	var id int64
	var err error
	query := `select id from businesses where active = true order by id limit 1`
	if tx != nil {
		err = tx.QueryRowContext(ctx, query).Scan(&id)
	} else {
		return 0, fmt.Errorf("business is required")
	}
	if err != nil {
		return 0, err
	}
	return id, nil
}

func buildServiceDescription(input WalkInServiceInput) string {
	parts := []string{}
	device := strings.TrimSpace(strings.Join([]string{input.Device, input.Make, input.Model}, " "))
	if device != "" {
		parts = append(parts, device)
	}
	if strings.TrimSpace(input.Issue) != "" {
		parts = append(parts, "Issue: "+strings.TrimSpace(input.Issue))
	}
	if strings.TrimSpace(input.Solution) != "" {
		parts = append(parts, "Solution: "+strings.TrimSpace(input.Solution))
	}
	return strings.Join(parts, " | ")
}

func buildServiceNotes(input WalkInServiceInput) string {
	parts := []string{}
	for _, item := range []struct {
		label string
		value string
	}{
		{"Device", strings.TrimSpace(input.Device)},
		{"Make", strings.TrimSpace(input.Make)},
		{"Model", strings.TrimSpace(input.Model)},
		{"Serial", strings.TrimSpace(input.SerialNumber)},
		{"Issue", strings.TrimSpace(input.Issue)},
		{"Solution", strings.TrimSpace(input.Solution)},
		{"Reference", strings.TrimSpace(input.Reference)},
		{"Notes", strings.TrimSpace(input.Notes)},
	} {
		if item.value != "" {
			parts = append(parts, item.label+": "+item.value)
		}
	}
	return strings.Join(parts, "\n")
}

func normalizePaymentMethod(value string) string {
	cleaned := strings.TrimSpace(value)
	switch strings.ToLower(cleaned) {
	case "cash":
		return "Cash"
	case "card", "credit", "credit card", "debit", "debit card":
		return "Card"
	case "cashapp", "cash app":
		return "CashApp"
	case "venmo":
		return "Venmo"
	case "check", "cheque":
		return "Check"
	case "applepay", "apple pay":
		return "ApplePay"
	case "googlepay", "google pay":
		return "GooglePay"
	case "paypal", "pay pal":
		return "PayPal"
	case "zelle":
		return "Zelle"
	case "":
		return "Cash"
	default:
		return cleaned
	}
}

func nullInt64(value int64) sql.NullInt64 {
	return sql.NullInt64{Int64: value, Valid: value != 0}
}

func parseDate(value string) (time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return time.Now(), nil
	}
	return time.Parse("2006-01-02", value)
}

func parseFloat(value string) float64 {
	parsed, _ := strconv.ParseFloat(strings.TrimSpace(value), 64)
	return parsed
}

func parseInt(value string, defaultValue int) int {
	if strings.TrimSpace(value) == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func parseBool(value string, defaultValue bool) bool {
	if strings.TrimSpace(value) == "" {
		return defaultValue
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

func fallback(value string, defaultValue string) string {
	if strings.TrimSpace(value) == "" {
		return defaultValue
	}
	return value
}

// GetMonthlySummary returns income, customers and every income entry for one
// month (month 1-12) or the whole year (month 0), plus a 12-month overview.
// businessID 0 means all businesses. Entries that share customer name, date
// and total are flagged as possible duplicates.
func (r *Repository) GetMonthlySummary(ctx context.Context, year int, month int, businessID int64) (*MonthlySummary, error) {
	if year == 0 {
		year = time.Now().Year()
	}
	if month < 0 || month > 12 {
		return nil, fmt.Errorf("invalid month")
	}
	summary := &MonthlySummary{
		Year:       year,
		Month:      month,
		BusinessID: businessID,
		Months:     []MonthlySummaryMonth{},
		Customers:  []MonthlySummaryCustomer{},
		Entries:    []MonthlySummaryEntry{},
	}

	monthRows, err := r.db.QueryContext(ctx, `
		with months as (select generate_series(1, 12) as m),
		inc as (
			select extract(month from invoice_date)::int as m,
				sum(total_amount) as income, sum(paid_amount) as collected,
				count(*)::int as invoice_count, count(distinct customer_id)::int as customer_count
			from invoices
			where extract(year from invoice_date)::int = $1 and ($2::bigint = 0 or business_id = $2)
			group by 1
		),
		exp as (
			select extract(month from purchase_date)::int as m, sum(amount) as expense
			from purchases
			where extract(year from purchase_date)::int = $1 and ($2::bigint = 0 or business_id = $2)
			group by 1
		)
		select months.m, to_char(make_date($1, months.m, 1), 'Mon'),
			coalesce(inc.income, 0), coalesce(inc.collected, 0), coalesce(exp.expense, 0),
			coalesce(inc.invoice_count, 0), coalesce(inc.customer_count, 0)
		from months
		left join inc on inc.m = months.m
		left join exp on exp.m = months.m
		order by months.m
	`, year, businessID)
	if err != nil {
		return nil, err
	}
	for monthRows.Next() {
		var row MonthlySummaryMonth
		if err := monthRows.Scan(&row.Month, &row.Label, &row.Income, &row.Collected, &row.Expense, &row.InvoiceCount, &row.CustomerCount); err != nil {
			monthRows.Close()
			return nil, err
		}
		summary.Months = append(summary.Months, row)
	}
	monthRows.Close()
	if err := monthRows.Err(); err != nil {
		return nil, err
	}

	start := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(1, 0, 0)
	if month > 0 {
		start = time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		end = start.AddDate(0, 1, 0)
	}

	if err := r.db.QueryRowContext(ctx, `
		select coalesce(sum(amount), 0) from purchases
		where purchase_date >= $1 and purchase_date < $2 and ($3::bigint = 0 or business_id = $3)
	`, start, end, businessID).Scan(&summary.Expense); err != nil {
		return nil, err
	}

	entryRows, err := r.db.QueryContext(ctx, `
		with scoped as (
			select i.*,
				count(*) over (partition by lower(trim(c.full_name)), i.invoice_date, i.total_amount, coalesce(i.business_id, 0)) as dupe_count
			from invoices i
			join customers c on c.id = i.customer_id
			where i.invoice_date >= $1 and i.invoice_date < $2 and ($3::bigint = 0 or i.business_id = $3)
		)
		select s.id, coalesce(b.id, 0), coalesce(b.name, ''), s.invoice_number, s.invoice_date::text, s.due_date::text,
			c.full_name, s.status, s.total_amount, s.paid_amount, s.created_at::text, c.id,
			s.dupe_count > 1,
			(select count(*)::int from invoice_items ii where ii.invoice_id = s.id),
			s.discount_amount = 0
				and (select count(*) from invoice_items ii where ii.invoice_id = s.id and ii.item_type = 'labor') <= 1
				and (select count(*) from invoice_items ii where ii.invoice_id = s.id and ii.item_type = 'parts') <= 1
				and (select count(*) from invoice_items ii where ii.invoice_id = s.id and ii.item_type = 'other') = 0,
			coalesce((select p.method from payments p where p.invoice_id = s.id order by p.payment_date desc, p.id desc limit 1), '')
		from scoped s
		join customers c on c.id = s.customer_id
		left join businesses b on b.id = s.business_id
		order by s.invoice_date desc, s.id desc
	`, start, end, businessID)
	if err != nil {
		return nil, err
	}
	for entryRows.Next() {
		var e MonthlySummaryEntry
		if err := entryRows.Scan(&e.ID, &e.BusinessID, &e.BusinessName, &e.InvoiceNumber, &e.InvoiceDate, &e.DueDate,
			&e.CustomerName, &e.Status, &e.TotalAmount, &e.PaidAmount, &e.CreatedAt, &e.CustomerID,
			&e.PossibleDupe, &e.ItemCount, &e.WalkInEntry, &e.PaymentMethod); err != nil {
			entryRows.Close()
			return nil, err
		}
		summary.Entries = append(summary.Entries, e)
		summary.Income += e.TotalAmount
		summary.Collected += e.PaidAmount
		if e.PossibleDupe {
			summary.DuplicateCount++
		}
	}
	entryRows.Close()
	if err := entryRows.Err(); err != nil {
		return nil, err
	}

	customerRows, err := r.db.QueryContext(ctx, `
		select c.id, c.full_name, c.company_name, c.phone, c.email,
			count(i.id)::int, coalesce(sum(i.total_amount), 0), coalesce(sum(i.paid_amount), 0),
			min(i.invoice_date)::text, max(i.invoice_date)::text,
			(select count(*)::int from customers d where d.id <> c.id and lower(trim(d.full_name)) = lower(trim(c.full_name)))
		from invoices i
		join customers c on c.id = i.customer_id
		where i.invoice_date >= $1 and i.invoice_date < $2 and ($3::bigint = 0 or i.business_id = $3)
		group by c.id
		order by coalesce(sum(i.total_amount), 0) desc, c.full_name asc
	`, start, end, businessID)
	if err != nil {
		return nil, err
	}
	for customerRows.Next() {
		var c MonthlySummaryCustomer
		if err := customerRows.Scan(&c.CustomerID, &c.FullName, &c.CompanyName, &c.Phone, &c.Email, &c.InvoiceCount, &c.Income, &c.Collected, &c.FirstVisit, &c.LastVisit, &c.PossibleDupes); err != nil {
			customerRows.Close()
			return nil, err
		}
		summary.Customers = append(summary.Customers, c)
	}
	customerRows.Close()
	if err := customerRows.Err(); err != nil {
		return nil, err
	}

	summary.Income = roundMoney(summary.Income)
	summary.Collected = roundMoney(summary.Collected)
	summary.Outstanding = roundMoney(summary.Income - summary.Collected)
	summary.Expense = roundMoney(summary.Expense)
	summary.Net = roundMoney(summary.Income - summary.Expense)
	summary.InvoiceCount = len(summary.Entries)
	summary.CustomerCount = len(summary.Customers)
	return summary, nil
}
