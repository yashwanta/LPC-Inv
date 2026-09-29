package repository

import "time"

type User struct {
	ID                 int64  `json:"id"`
	Username           string `json:"username"`
	DisplayName        string `json:"displayName"`
	PasswordHash       string `json:"-"`
	Role               string `json:"role"`
	AccessLabel        string `json:"accessLabel"`
	Active             bool   `json:"active"`
	RecoveryEmail      string `json:"recoveryEmail"`
	SecurityQuestion   string `json:"securityQuestion"`
	SecurityAnswerHash string `json:"-"`
}

type UserInput struct {
	ID               int64  `json:"id"`
	Username         string `json:"username"`
	DisplayName      string `json:"displayName"`
	Password         string `json:"password"`
	Role             string `json:"role"`
	AccessLabel      string `json:"accessLabel"`
	Active           bool   `json:"active"`
	RecoveryEmail    string `json:"recoveryEmail"`
	SecurityQuestion string `json:"securityQuestion"`
	SecurityAnswer   string `json:"securityAnswer"`
}

type PasswordRecoveryOptions struct {
	SecurityQuestion string `json:"securityQuestion"`
	EmailAvailable   bool   `json:"emailAvailable"`
	MaskedEmail      string `json:"maskedEmail"`
}

type AuthSession struct {
	UserID       int64     `json:"userId"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"displayName"`
	Role         string    `json:"role"`
	Token        string    `json:"token"`
	LastActivity time.Time `json:"-"`
}

type Customer struct {
	ID             int64  `json:"id"`
	FullName       string `json:"fullName"`
	CompanyName    string `json:"companyName"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	BillingAddress string `json:"billingAddress"`
	ServiceAddress string `json:"serviceAddress"`
	TaxExempt      bool   `json:"taxExempt"`
	Notes          string `json:"notes"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

type CustomerInput struct {
	ID             int64  `json:"id"`
	FullName       string `json:"fullName"`
	CompanyName    string `json:"companyName"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	BillingAddress string `json:"billingAddress"`
	ServiceAddress string `json:"serviceAddress"`
	TaxExempt      bool   `json:"taxExempt"`
	Notes          string `json:"notes"`
}

type Vendor struct {
	ID          int64  `json:"id"`
	VendorName  string `json:"vendorName"`
	ContactName string `json:"contactName"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Website     string `json:"website"`
	Address     string `json:"address"`
	Notes       string `json:"notes"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type VendorInput struct {
	ID          int64  `json:"id"`
	VendorName  string `json:"vendorName"`
	ContactName string `json:"contactName"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Website     string `json:"website"`
	Address     string `json:"address"`
	Notes       string `json:"notes"`
}

type Purchase struct {
	ID            int64   `json:"id"`
	BusinessID    int64   `json:"businessId"`
	BusinessName  string  `json:"businessName"`
	VendorID      int64   `json:"vendorId"`
	VendorName    string  `json:"vendorName"`
	PurchaseDate  string  `json:"purchaseDate"`
	Description   string  `json:"description"`
	CategoryName  string  `json:"categoryName"`
	Amount        float64 `json:"amount"`
	TaxPaid       float64 `json:"taxPaid"`
	PaymentMethod string  `json:"paymentMethod"`
	Notes         string  `json:"notes"`
	CreatedAt     string  `json:"createdAt"`
}

type PurchaseInput struct {
	ID            int64   `json:"id"`
	BusinessID    int64   `json:"businessId"`
	PurchaseDate  string  `json:"purchaseDate"`
	VendorName    string  `json:"vendorName"`
	Description   string  `json:"description"`
	CategoryName  string  `json:"categoryName"`
	Amount        float64 `json:"amount"`
	TaxPaid       float64 `json:"taxPaid"`
	PaymentMethod string  `json:"paymentMethod"`
	Notes         string  `json:"notes"`
}

type InvoiceItemInput struct {
	ItemType    string  `json:"itemType"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	Taxable     bool    `json:"taxable"`
}

type InvoiceInput struct {
	BusinessID     int64              `json:"businessId"`
	CustomerID     int64              `json:"customerId"`
	InvoiceDate    string             `json:"invoiceDate"`
	DueDate        string             `json:"dueDate"`
	DiscountAmount float64            `json:"discountAmount"`
	Notes          string             `json:"notes"`
	Terms          string             `json:"terms"`
	Items          []InvoiceItemInput `json:"items"`
}

type WalkInServiceInput struct {
	ID            int64   `json:"id"`
	BusinessID    int64   `json:"businessId"`
	ServiceDate   string  `json:"serviceDate"`
	FirstName     string  `json:"firstName"`
	LastName      string  `json:"lastName"`
	Phone         string  `json:"phone"`
	Email         string  `json:"email"`
	Device        string  `json:"device"`
	Make          string  `json:"make"`
	Model         string  `json:"model"`
	SerialNumber  string  `json:"serialNumber"`
	Issue         string  `json:"issue"`
	Solution      string  `json:"solution"`
	PartsCost     float64 `json:"partsCost"`
	ServiceCharge float64 `json:"serviceCharge"`
	AmountPaid    float64 `json:"amountPaid"`
	PaymentMethod string  `json:"paymentMethod"`
	PaymentDate   string  `json:"paymentDate"`
	Reference     string  `json:"reference"`
	Notes         string  `json:"notes"`
}

type InvoiceItem struct {
	ID          int64   `json:"id"`
	InvoiceID   int64   `json:"invoiceId"`
	ItemType    string  `json:"itemType"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	Taxable     bool    `json:"taxable"`
	LineTotal   float64 `json:"lineTotal"`
	Position    int     `json:"position"`
}

type InvoiceDetail struct {
	PaymentInstructions string        `json:"paymentInstructions"`
	CheckPayableTo      string        `json:"checkPayableTo"`
	ID                  int64         `json:"id"`
	BusinessID          int64         `json:"businessId"`
	BusinessName        string        `json:"businessName"`
	InvoiceNumber       string        `json:"invoiceNumber"`
	InvoiceDate         string        `json:"invoiceDate"`
	DueDate             string        `json:"dueDate"`
	Customer            Customer      `json:"customer"`
	Status              string        `json:"status"`
	Subtotal            float64       `json:"subtotal"`
	DiscountAmount      float64       `json:"discountAmount"`
	TaxAmount           float64       `json:"taxAmount"`
	TotalAmount         float64       `json:"totalAmount"`
	PaidAmount          float64       `json:"paidAmount"`
	TaxIncluded         bool          `json:"taxIncluded"`
	PaymentDate         string        `json:"paymentDate"`
	PaymentMethod       string        `json:"paymentMethod"`
	Notes               string        `json:"notes"`
	Terms               string        `json:"terms"`
	Items               []InvoiceItem `json:"items"`
	CreatedAt           string        `json:"createdAt"`
	UpdatedAt           string        `json:"updatedAt"`
}

type InvoiceListItem struct {
	ID            int64   `json:"id"`
	BusinessID    int64   `json:"businessId"`
	BusinessName  string  `json:"businessName"`
	InvoiceNumber string  `json:"invoiceNumber"`
	InvoiceDate   string  `json:"invoiceDate"`
	DueDate       string  `json:"dueDate"`
	CustomerName  string  `json:"customerName"`
	Status        string  `json:"status"`
	TotalAmount   float64 `json:"totalAmount"`
	PaidAmount    float64 `json:"paidAmount"`
	CreatedAt     string  `json:"createdAt"`
}

type AppSettings struct {
	BusinessName          string  `json:"businessName"`
	BusinessAddress       string  `json:"businessAddress"`
	BusinessPhone         string  `json:"businessPhone"`
	BusinessEmail         string  `json:"businessEmail"`
	BusinessLogoPath      string  `json:"businessLogoPath"`
	DefaultTaxRate        float64 `json:"defaultTaxRate"`
	PartsTaxable          bool    `json:"partsTaxable"`
	LaborTaxable          bool    `json:"laborTaxable"`
	LaborTaxableWithParts bool    `json:"laborTaxableWithParts"`
	InvoiceTerms          string  `json:"invoiceTerms"`
	InvoicePrefix         string  `json:"invoicePrefix"`
	Theme                 string  `json:"theme"`
	SMTPHost              string  `json:"smtpHost"`
	SMTPPort              int     `json:"smtpPort"`
	SMTPUsername          string  `json:"smtpUsername"`
	SMTPPassword          string  `json:"smtpPassword"`
	SMTPFromEmail         string  `json:"smtpFromEmail"`
	SMTPFromName          string  `json:"smtpFromName"`
	SMTPUseTLS            bool    `json:"smtpUseTLS"`
}

type DashboardSummary struct {
	TotalUnpaidInvoices float64           `json:"totalUnpaidInvoices"`
	PaidInvoicesMonth   int               `json:"paidInvoicesMonth"`
	TotalSalesMonth     float64           `json:"totalSalesMonth"`
	PurchasesMonth      float64           `json:"purchasesMonth"`
	SalesTaxCollected   float64           `json:"salesTaxCollected"`
	RecentInvoices      []InvoiceListItem `json:"recentInvoices"`
	RecentCustomers     []Customer        `json:"recentCustomers"`
}

type IncomeExpenseReport struct {
	Period       string                    `json:"period"`
	Year         int                       `json:"year"`
	TotalIncome  float64                   `json:"totalIncome"`
	TotalExpense float64                   `json:"totalExpense"`
	NetIncome    float64                   `json:"netIncome"`
	Rows         []IncomeExpenseReportItem `json:"rows"`
}

type IncomeExpenseReportItem struct {
	Label   string  `json:"label"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Net     float64 `json:"net"`
}

type Business struct {
	PaymentInstructions string `json:"paymentInstructions"`
	CheckPayableTo      string `json:"checkPayableTo"`
	ID                  int64  `json:"id"`
	Name                string `json:"name"`
	Active              bool   `json:"active"`
}

type BusinessInput struct {
	PaymentInstructions string `json:"paymentInstructions"`
	CheckPayableTo      string `json:"checkPayableTo"`
	ID                  int64  `json:"id"`
	Name                string `json:"name"`
	Active              bool   `json:"active"`
}

type TaxReportSummary struct {
	StartDate         string  `json:"startDate"`
	EndDate           string  `json:"endDate"`
	BusinessID        int64   `json:"businessId"`
	BusinessName      string  `json:"businessName"`
	GrossSales        float64 `json:"grossSales"`
	TaxableSales      float64 `json:"taxableSales"`
	NonTaxableSales   float64 `json:"nonTaxableSales"`
	SalesTaxCollected float64 `json:"salesTaxCollected"`
	TotalPurchases    float64 `json:"totalPurchases"`
	NetIncome         float64 `json:"netIncome"`
}

type CustomerLookup struct {
	Customer     Customer `json:"customer"`
	InvoiceCount int      `json:"invoiceCount"`
	TotalSales   float64  `json:"totalSales"`
	LastInvoice  string   `json:"lastInvoice"`
	Kind         string   `json:"kind"`
}

type EmailInvoiceInput struct {
	InvoiceID int64  `json:"invoiceId"`
	To        string `json:"to"`
	Subject   string `json:"subject"`
	Message   string `json:"message"`
}

type MonthlySummaryMonth struct {
	Month         int     `json:"month"`
	Label         string  `json:"label"`
	Income        float64 `json:"income"`
	Collected     float64 `json:"collected"`
	Expense       float64 `json:"expense"`
	InvoiceCount  int     `json:"invoiceCount"`
	CustomerCount int     `json:"customerCount"`
}

type MonthlySummaryCustomer struct {
	CustomerID    int64   `json:"customerId"`
	FullName      string  `json:"fullName"`
	CompanyName   string  `json:"companyName"`
	Phone         string  `json:"phone"`
	Email         string  `json:"email"`
	InvoiceCount  int     `json:"invoiceCount"`
	Income        float64 `json:"income"`
	Collected     float64 `json:"collected"`
	FirstVisit    string  `json:"firstVisit"`
	LastVisit     string  `json:"lastVisit"`
	PossibleDupes int     `json:"possibleDuplicates"`
}

type MonthlySummaryEntry struct {
	InvoiceListItem
	CustomerID    int64  `json:"customerId"`
	PossibleDupe  bool   `json:"possibleDuplicate"`
	ItemCount     int    `json:"itemCount"`
	WalkInEntry   bool   `json:"walkInEntry"`
	PaymentMethod string `json:"paymentMethod"`
}

type MonthlySummary struct {
	Year           int                      `json:"year"`
	Month          int                      `json:"month"`
	BusinessID     int64                    `json:"businessId"`
	Income         float64                  `json:"income"`
	Collected      float64                  `json:"collected"`
	Outstanding    float64                  `json:"outstanding"`
	Expense        float64                  `json:"expense"`
	Net            float64                  `json:"net"`
	InvoiceCount   int                      `json:"invoiceCount"`
	CustomerCount  int                      `json:"customerCount"`
	DuplicateCount int                      `json:"duplicateCount"`
	Months         []MonthlySummaryMonth    `json:"months"`
	Customers      []MonthlySummaryCustomer `json:"customers"`
	Entries        []MonthlySummaryEntry    `json:"entries"`
}
