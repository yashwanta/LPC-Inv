package repository

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

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
		select id, username, display_name, password_hash, role, active
		from users
		where lower(username) = lower($1) and active = true
	`, strings.TrimSpace(username)).Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role, &user.Active)
	if err != nil {
		return nil, err
	}
	return &user, nil
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
	_, err := r.db.ExecContext(ctx, `delete from customers where id=$1`, id)
	return err
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
		select p.id, coalesce(v.id, 0), coalesce(v.vendor_name, ''), p.purchase_date::text, p.description, coalesce(pc.name, ''), p.amount, p.tax_paid, p.payment_method, p.notes, p.created_at::text
		from purchases p
		left join vendors v on v.id = p.vendor_id
		left join purchase_categories pc on pc.id = p.category_id
		where $1 = '' or p.description ilike '%' || $1 || '%' or coalesce(v.vendor_name, '') ilike '%' || $1 || '%' or coalesce(pc.name, '') ilike '%' || $1 || '%'
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
		if err := rows.Scan(&purchase.ID, &purchase.VendorID, &purchase.VendorName, &purchase.PurchaseDate, &purchase.Description, &purchase.CategoryName, &purchase.Amount, &purchase.TaxPaid, &purchase.PaymentMethod, &purchase.Notes, &purchase.CreatedAt); err != nil {
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

	var purchaseID int64
	err = tx.QueryRowContext(ctx, `
		insert into purchases(vendor_id, purchase_date, description, category_id, amount, tax_paid, payment_method, notes)
		values($1,$2,$3,$4,$5,$6,$7,$8)
		returning id
	`, nullInt64(vendorID), purchaseDate, input.Description, categoryID, input.Amount, input.TaxPaid, strings.TrimSpace(input.PaymentMethod), strings.TrimSpace(input.Notes)).Scan(&purchaseID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.getPurchase(ctx, purchaseID)
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
		insert into invoices(invoice_number, invoice_date, due_date, customer_id, subtotal, discount_amount, tax_amount, total_amount, notes, terms)
		values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		returning id
	`, invoiceNumber, invoiceDate, dueDate, input.CustomerID, subtotal, discount, tax, total, input.Notes, fallback(input.Terms, settings.InvoiceTerms)).Scan(&invoiceID)
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

	var taxableSubtotal float64
	if settings.PartsTaxable {
		taxableSubtotal += partsCost
	}
	if settings.LaborTaxable {
		taxableSubtotal += serviceCharge
	}
	tax := roundMoney(taxableSubtotal * settings.DefaultTaxRate)
	subtotal := roundMoney(partsCost + serviceCharge)
	total := roundMoney(subtotal + tax)

	var sequence int64
	if err := tx.QueryRowContext(ctx, `select nextval('invoice_number_seq')`).Scan(&sequence); err != nil {
		return nil, err
	}
	invoiceNumber := fmt.Sprintf("%s-%06d", settings.InvoicePrefix, sequence)
	notes := buildServiceNotes(input)

	var invoiceID int64
	err = tx.QueryRowContext(ctx, `
		insert into invoices(invoice_number, invoice_date, due_date, customer_id, subtotal, tax_amount, total_amount, notes, terms)
		values($1,$2,$3,$4,$5,$6,$7,$8,$9)
		returning id
	`, invoiceNumber, serviceDate, serviceDate, customerID, subtotal, tax, total, notes, fallback(settings.InvoiceTerms, "Payment due on receipt.")).Scan(&invoiceID)
	if err != nil {
		return nil, err
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
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetInvoice(ctx, invoiceID)
}

func (r *Repository) ListInvoices(ctx context.Context, search string) ([]InvoiceListItem, error) {
	search = strings.TrimSpace(search)
	rows, err := r.db.QueryContext(ctx, `
		select i.id, i.invoice_number, i.invoice_date::text, i.due_date::text, c.full_name, i.status, i.total_amount, i.paid_amount, i.created_at::text
		from invoices i
		join customers c on c.id = i.customer_id
		where $1 = '' or i.invoice_number ilike '%' || $1 || '%' or c.full_name ilike '%' || $1 || '%' or c.company_name ilike '%' || $1 || '%'
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
		if err := rows.Scan(&invoice.ID, &invoice.InvoiceNumber, &invoice.InvoiceDate, &invoice.DueDate, &invoice.CustomerName, &invoice.Status, &invoice.TotalAmount, &invoice.PaidAmount, &invoice.CreatedAt); err != nil {
			return nil, err
		}
		invoices = append(invoices, invoice)
	}
	return invoices, rows.Err()
}

func (r *Repository) GetInvoice(ctx context.Context, id int64) (*InvoiceDetail, error) {
	var invoice InvoiceDetail
	err := r.db.QueryRowContext(ctx, `
		select i.id, i.invoice_number, i.invoice_date::text, i.due_date::text,
			c.id, c.full_name, c.company_name, c.email, c.phone, c.billing_address, c.service_address, c.tax_exempt, c.notes, c.created_at::text, c.updated_at::text,
			i.status, i.subtotal, i.discount_amount, i.tax_amount, i.total_amount, i.paid_amount, i.notes, i.terms, i.created_at::text, i.updated_at::text
		from invoices i
		join customers c on c.id = i.customer_id
		where i.id=$1
	`, id).Scan(
		&invoice.ID, &invoice.InvoiceNumber, &invoice.InvoiceDate, &invoice.DueDate,
		&invoice.Customer.ID, &invoice.Customer.FullName, &invoice.Customer.CompanyName, &invoice.Customer.Email, &invoice.Customer.Phone, &invoice.Customer.BillingAddress, &invoice.Customer.ServiceAddress, &invoice.Customer.TaxExempt, &invoice.Customer.Notes, &invoice.Customer.CreatedAt, &invoice.Customer.UpdatedAt,
		&invoice.Status, &invoice.Subtotal, &invoice.DiscountAmount, &invoice.TaxAmount, &invoice.TotalAmount, &invoice.PaidAmount, &invoice.Notes, &invoice.Terms, &invoice.CreatedAt, &invoice.UpdatedAt,
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
		"smtp_password":      input.SMTPPassword,
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
		SMTPPassword:     values["smtp_password"],
		SMTPFromEmail:    values["smtp_from_email"],
		SMTPFromName:     values["smtp_from_name"],
		SMTPUseTLS:       parseBool(values["smtp_use_tls"], true),
	}
	return settings, rows.Err()
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
		select p.id, coalesce(v.id, 0), coalesce(v.vendor_name, ''), p.purchase_date::text, p.description, coalesce(pc.name, ''), p.amount, p.tax_paid, p.payment_method, p.notes, p.created_at::text
		from purchases p
		left join vendors v on v.id = p.vendor_id
		left join purchase_categories pc on pc.id = p.category_id
		where p.id=$1
	`, id).Scan(&purchase.ID, &purchase.VendorID, &purchase.VendorName, &purchase.PurchaseDate, &purchase.Description, &purchase.CategoryName, &purchase.Amount, &purchase.TaxPaid, &purchase.PaymentMethod, &purchase.Notes, &purchase.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &purchase, nil
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
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "cash":
		return "cash"
	case "card", "credit", "credit card", "debit", "debit card":
		return "card"
	case "check", "cheque":
		return "check"
	case "zelle":
		return "zelle"
	default:
		return "other"
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
