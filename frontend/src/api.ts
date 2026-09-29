export type AuthSession = {
  userId: number;
  username: string;
  displayName: string;
  role: "admin" | "standard";
  token: string;
};

export type User = {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "standard";
  accessLabel: string;
  active: boolean;
  recoveryEmail: string;
  securityQuestion: string;
};

export type UserInput = {
  id?: number;
  username: string;
  displayName: string;
  password: string;
  role: "admin" | "standard";
  accessLabel: string;
  active: boolean;
  recoveryEmail: string;
  securityQuestion: string;
  securityAnswer: string;
};

export type PasswordRecoveryOptions = {
  securityQuestion: string;
  emailAvailable: boolean;
  maskedEmail: string;
};

export type Business = {
  paymentInstructions?: string;
  checkPayableTo?: string;
  id: number;
  name: string;
  active: boolean;
};

export type BusinessInput = {
  paymentInstructions?: string;
  checkPayableTo?: string;
  id?: number;
  name: string;
  active: boolean;
};
export type Customer = {
  id: number;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  billingAddress: string;
  serviceAddress: string;
  taxExempt: boolean;
  notes: string;
};

export type CustomerLookup = {
  customer: Customer;
  invoiceCount: number;
  totalSales: number;
  lastInvoice: string;
  kind: "new" | "repeat";
};

export type Vendor = {
  id: number;
  vendorName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
};

export type Purchase = {
  id: number;
  businessId: number;
  businessName: string;
  vendorId: number;
  vendorName: string;
  purchaseDate: string;
  description: string;
  categoryName: string;
  amount: number;
  taxPaid: number;
  paymentMethod: string;
  notes: string;
  createdAt: string;
};

export type PurchaseInput = {
  id?: number;
  businessId: number;
  purchaseDate: string;
  vendorName: string;
  description: string;
  categoryName: string;
  amount: number;
  taxPaid: number;
  paymentMethod: string;
  notes: string;
};

export type InvoiceListItem = {
  id: number;
  businessId: number;
  businessName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
};

export type InvoiceItemInput = {
  itemType: "labor" | "parts" | "other";
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type InvoiceInput = {
  businessId: number;
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  discountAmount: number;
  notes: string;
  terms: string;
  items: InvoiceItemInput[];
};

export type WalkInServiceInput = {
  id?: number;
  businessId: number;
  serviceDate: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  device: string;
  make: string;
  model: string;
  serialNumber: string;
  issue: string;
  solution: string;
  partsCost: number;
  serviceCharge: number;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  reference: string;
  notes: string;
};

export type InvoiceDetail = {
  paymentInstructions?: string;
  checkPayableTo?: string;
  id: number;
  businessId: number;
  businessName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customer: Customer;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  terms: string;
  paymentDate: string;
  paymentMethod: string;
  items: Array<InvoiceItemInput & { id: number; lineTotal: number; position: number }>;
};

export type TaxReportSummary = {
  startDate: string;
  endDate: string;
  businessId: number;
  businessName: string;
  grossSales: number;
  taxableSales: number;
  nonTaxableSales: number;
  salesTaxCollected: number;
  totalPurchases: number;
  netIncome: number;
};
export type AppSettings = {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessLogoPath: string;
  defaultTaxRate: number;
  partsTaxable: boolean;
  laborTaxable: boolean;
  invoiceTerms: string;
  invoicePrefix: string;
  theme: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
  smtpUseTLS: boolean;
};

export type EmailInvoiceInput = {
  invoiceId: number;
  to: string;
  subject: string;
  message: string;
};

export type DashboardSummary = {
  totalUnpaidInvoices: number;
  paidInvoicesMonth: number;
  totalSalesMonth: number;
  purchasesMonth: number;
  salesTaxCollected: number;
  recentInvoices: InvoiceListItem[];
  recentCustomers: Customer[];
};

export type IncomeExpensePeriod = "monthly" | "yearly";

export type IncomeExpenseReportItem = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

export type IncomeExpenseReport = {
  period: IncomeExpensePeriod;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  rows: IncomeExpenseReportItem[];
};

export type MonthlySummaryMonth = {
  month: number;
  label: string;
  income: number;
  collected: number;
  expense: number;
  invoiceCount: number;
  customerCount: number;
};

export type MonthlySummaryCustomer = {
  customerId: number;
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  invoiceCount: number;
  income: number;
  collected: number;
  firstVisit: string;
  lastVisit: string;
  possibleDuplicates: number;
};

export type MonthlySummaryEntry = InvoiceListItem & {
  customerId: number;
  possibleDuplicate: boolean;
  itemCount: number;
  walkInEntry: boolean;
  paymentMethod: string;
};

export type MonthlySummary = {
  year: number;
  month: number;
  businessId: number;
  income: number;
  collected: number;
  outstanding: number;
  expense: number;
  net: number;
  invoiceCount: number;
  customerCount: number;
  duplicateCount: number;
  months: MonthlySummaryMonth[];
  customers: MonthlySummaryCustomer[];
  entries: MonthlySummaryEntry[];
};

/** Turns a Wails/Go error (often a plain string) into readable text. */
export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export const SESSION_EXPIRED_EVENT = "simpletech:session-expired";

type WailsWindow = Window & {
  go?: {
    main?: {
      App?: Record<string, (...args: unknown[]) => Promise<unknown>>;
    };
  };
};

let demoCustomerId = 4;
let demoVendorId = 3;
let demoInvoiceId = 4;
let demoPurchaseId = 3;
let demoUserId = 2;
let demoBusinessId = 2;

let demoSettings: AppSettings = {
  businessName: "SimpleTech Books",
  businessAddress: "",
  businessPhone: "555-0199",
  businessEmail: "service@simpletech.local",
  businessLogoPath: "C:\\Logos\\simpletech-logo.png",
  defaultTaxRate: 0.07,
  partsTaxable: true,
  laborTaxable: false,
  invoiceTerms: "Payment due by due date. Thank you for your business.",
  invoicePrefix: "INV",
  theme: "light",
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpUsername: "service@simpletech.local",
  smtpPassword: "",
  smtpFromEmail: "service@simpletech.local",
  smtpFromName: "SimpleTech Books",
  smtpUseTLS: true
};

let demoUsers: User[] = [
  { id: 1, username: "admin", displayName: "Administrator", role: "admin", accessLabel: "Full Access", active: true, recoveryEmail: "a***@example.com", securityQuestion: "What city were you born in?" }
];

let demoBusinesses: Business[] = [
  { id: 1, name: "SimpleTech Books", active: true }
];

let demoCustomers: Customer[] = [
  {
    id: 1,
    fullName: "Walk-in Customer",
    companyName: "",
    email: "walkin@example.com",
    phone: "555-0101",
    billingAddress: "Local pickup",
    serviceAddress: "",
    taxExempt: false,
    notes: "Sample walk-in repair customer"
  },
  {
    id: 2,
    fullName: "Jordan Lee",
    companyName: "Lee Design Studio",
    email: "jordan@example.com",
    phone: "555-0142",
    billingAddress: "120 Market St\nSuite 4",
    serviceAddress: "120 Market St",
    taxExempt: false,
    notes: "Regular customer"
  },
  {
    id: 3,
    fullName: "Priya Shah",
    companyName: "",
    email: "priya@example.com",
    phone: "555-0160",
    billingAddress: "44 Cedar Ave",
    serviceAddress: "",
    taxExempt: false,
    notes: "New customer"
  }
];

let demoVendors: Vendor[] = [
  { id: 1, vendorName: "Amazon Business", contactName: "", email: "", phone: "", website: "amazon.com", address: "", notes: "Parts and supplies" },
  { id: 2, vendorName: "Dell", contactName: "Parts Desk", email: "parts@example.com", phone: "555-0188", website: "dell.com", address: "", notes: "Computer parts" }
];

let demoInvoices: InvoiceListItem[] = [
  { id: 1, businessId: 1, businessName: "SimpleTech Books", invoiceNumber: "INV-001001", invoiceDate: "2026-06-10", dueDate: "2026-06-24", customerName: "Jordan Lee", status: "unpaid", totalAmount: 189.2, paidAmount: 0 },
  { id: 2, businessId: 1, businessName: "SimpleTech Books", invoiceNumber: "INV-001002", invoiceDate: "2026-06-20", dueDate: "2026-07-04", customerName: "Walk-in Customer", status: "paid", totalAmount: 95, paidAmount: 95 },
  { id: 3, businessId: 1, businessName: "SimpleTech Books", invoiceNumber: "INV-001003", invoiceDate: "2026-06-22", dueDate: "2026-07-06", customerName: "Jordan Lee", status: "paid", totalAmount: 255.8, paidAmount: 255.8 }
];

let demoPurchases: Purchase[] = [
  { id: 1, businessId: 1, businessName: "SimpleTech Books", vendorId: 1, vendorName: "Amazon Business", purchaseDate: "2026-06-14", description: "Replacement SSD", categoryName: "Computer parts", amount: 72.49, taxPaid: 0, paymentMethod: "card", notes: "", createdAt: "2026-06-14" },
  { id: 2, businessId: 1, businessName: "SimpleTech Books", vendorId: 2, vendorName: "Dell", purchaseDate: "2026-06-18", description: "Laptop screen", categoryName: "Computer parts", amount: 119.95, taxPaid: 0, paymentMethod: "card", notes: "", createdAt: "2026-06-18" }
];

function inDemoMode() {
  return !(window as WailsWindow).go?.main?.App;
}

function filterText(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

function demoLookup(search: string, kind: string): CustomerLookup[] {
  const rows = demoCustomers.map((customer) => {
    const invoices = demoInvoices.filter((invoice) => invoice.customerName === customer.fullName);
    const invoiceCount = invoices.length;
    return {
      customer,
      invoiceCount,
      totalSales: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      lastInvoice: invoices.map((invoice) => invoice.invoiceDate).sort().reverse()[0] || "",
      kind: invoiceCount > 1 ? "repeat" : "new"
    } as CustomerLookup;
  });
  return rows
    .filter((row) => !search || filterText(`${row.customer.fullName} ${row.customer.companyName} ${row.customer.email} ${row.customer.phone}`, search))
    .filter((row) => kind === "all" || kind === "" || row.kind === kind)
    .sort((a, b) => b.invoiceCount - a.invoiceCount || a.customer.fullName.localeCompare(b.customer.fullName));
}

function demoMonthlySummary(year: number, month: number, businessId: number): MonthlySummary {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const scoped = demoInvoices.filter((row) => row.invoiceDate.startsWith(String(year)) && (!businessId || row.businessId === businessId));
  const monthOf = (date: string) => Number(date.slice(5, 7));
  const inPeriod = scoped.filter((row) => !month || monthOf(row.invoiceDate) === month);
  const customerId = (name: string) => demoCustomers.find((row) => row.fullName === name)?.id || 0;
  const entries: MonthlySummaryEntry[] = inPeriod.map((row) => ({
    ...row,
    customerId: customerId(row.customerName),
    possibleDuplicate: inPeriod.filter((other) => other.customerName.toLowerCase() === row.customerName.toLowerCase() && other.invoiceDate === row.invoiceDate && other.totalAmount === row.totalAmount).length > 1,
    itemCount: 1,
    walkInEntry: true,
    paymentMethod: row.paidAmount ? "Cash" : ""
  }));
  const byCustomer = new Map<string, MonthlySummaryCustomer>();
  for (const row of entries) {
    const customer = demoCustomers.find((item) => item.fullName === row.customerName);
    const current = byCustomer.get(row.customerName) || { customerId: row.customerId, fullName: row.customerName, companyName: customer?.companyName || "", phone: customer?.phone || "", email: customer?.email || "", invoiceCount: 0, income: 0, collected: 0, firstVisit: row.invoiceDate, lastVisit: row.invoiceDate, possibleDuplicates: 0 };
    current.invoiceCount += 1;
    current.income += row.totalAmount;
    current.collected += row.paidAmount;
    if (row.invoiceDate < current.firstVisit) current.firstVisit = row.invoiceDate;
    if (row.invoiceDate > current.lastVisit) current.lastVisit = row.invoiceDate;
    byCustomer.set(row.customerName, current);
  }
  const expenseFor = (m: number) => demoPurchases.filter((row) => row.purchaseDate.startsWith(String(year)) && (!m || monthOf(row.purchaseDate) === m)).reduce((sum, row) => sum + row.amount, 0);
  const income = entries.reduce((sum, row) => sum + row.totalAmount, 0);
  const collected = entries.reduce((sum, row) => sum + row.paidAmount, 0);
  const expense = expenseFor(month);
  return {
    year, month, businessId, income, collected, outstanding: income - collected, expense, net: income - expense,
    invoiceCount: entries.length,
    customerCount: byCustomer.size,
    duplicateCount: entries.filter((row) => row.possibleDuplicate).length,
    months: labels.map((label, index) => {
      const rows = scoped.filter((row) => monthOf(row.invoiceDate) === index + 1);
      return { month: index + 1, label, income: rows.reduce((sum, row) => sum + row.totalAmount, 0), collected: rows.reduce((sum, row) => sum + row.paidAmount, 0), expense: expenseFor(index + 1), invoiceCount: rows.length, customerCount: new Set(rows.map((row) => row.customerName)).size };
    }),
    customers: [...byCustomer.values()].sort((a, b) => b.income - a.income),
    entries: entries.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id)
  };
}

async function demoCall<T>(method: string, ...args: unknown[]): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  switch (method) {
    case "Login":
      return { userId: 1, username: String(args[0] || "admin"), displayName: "Browser Preview", role: "admin", token: "demo" } as T;
    case "Logout":
      return undefined as T;
    case "GetPasswordRecoveryOptions":
      return { securityQuestion: "What city were you born in?", emailAvailable: true, maskedEmail: "a***@example.com" } as T;
    case "RequestPasswordResetCode":
    case "ResetPasswordWithCode":
    case "ResetPasswordWithSecurityAnswer":
      return undefined as T;
    case "GetDashboard":
      return {
        totalUnpaidInvoices: demoInvoices.filter((row) => row.status !== "paid").reduce((sum, row) => sum + row.totalAmount - row.paidAmount, 0),
        paidInvoicesMonth: demoInvoices.filter((row) => row.status === "paid").length,
        totalSalesMonth: demoInvoices.reduce((sum, row) => sum + row.totalAmount, 0),
        purchasesMonth: 312.45,
        salesTaxCollected: 14.2,
        recentInvoices: demoInvoices,
        recentCustomers: demoCustomers
      } as T;
    case "GetIncomeExpenseReport": {
      const period = String(args[0] || "monthly") as IncomeExpensePeriod;
      const year = Number(args[1] || new Date().getFullYear());
      const labels = period === "yearly"
        ? Array.from({ length: 5 }, (_, index) => String(year - 4 + index))
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const rows = labels.map((label, index) => {
        const income = period === "yearly" ? 7000 + index * 1400 : Math.max(0, 650 + index * 115 + (index % 3) * 420);
        const expense = period === "yearly" ? 3200 + index * 650 : Math.max(0, 280 + index * 70 + (index % 2) * 190);
        return { label, income, expense, net: income - expense };
      });
      return {
        period,
        year,
        rows,
        totalIncome: rows.reduce((sum, row) => sum + row.income, 0),
        totalExpense: rows.reduce((sum, row) => sum + row.expense, 0),
        netIncome: rows.reduce((sum, row) => sum + row.net, 0)
      } as T;
    }
    case "GetTaxReport": {
      const startDate = String(args[0] || "");
      const endDate = String(args[1] || "");
      const businessId = Number(args[2] || 0);
      const invoices = demoInvoices.filter((row) => (!businessId || row.businessId === businessId) && (!startDate || row.invoiceDate >= startDate) && (!endDate || row.invoiceDate <= endDate));
      const purchases = demoPurchases.filter((row) => (!businessId || row.businessId === businessId) && (!startDate || row.purchaseDate >= startDate) && (!endDate || row.purchaseDate <= endDate));
      const grossSales = invoices.reduce((sum, row) => sum + row.totalAmount, 0);
      const totalPurchases = purchases.reduce((sum, row) => sum + row.amount, 0);
      return {
        startDate,
        endDate,
        businessId,
        businessName: demoBusinesses.find((row) => row.id === businessId)?.name || "All businesses",
        grossSales,
        taxableSales: grossSales,
        nonTaxableSales: 0,
        salesTaxCollected: 14.2,
        totalPurchases,
        netIncome: grossSales - totalPurchases
      } as T;
    }
    case "ListUsers":
      return demoUsers as T;
    case "SaveUser": {
      const input = args[0] as UserInput;
      const saved: User = { id: input.id || demoUserId++, username: input.username, displayName: input.displayName, role: input.role, accessLabel: input.accessLabel, active: input.active, recoveryEmail: input.recoveryEmail, securityQuestion: input.securityQuestion };
      demoUsers = input.id ? demoUsers.map((row) => row.id === input.id ? saved : row) : [saved, ...demoUsers];
      return saved as T;
    }
    case "ListBusinesses":
      return demoBusinesses as T;
    case "SaveBusiness": {
      const input = args[0] as BusinessInput;
      const saved: Business = { id: input.id || demoBusinessId++, name: input.name, active: input.active, paymentInstructions: input.paymentInstructions, checkPayableTo: input.checkPayableTo };
      demoBusinesses = input.id ? demoBusinesses.map((row) => row.id === input.id ? saved : row) : [saved, ...demoBusinesses];
      return saved as T;
    }
    case "ListCustomers": {
      const search = String(args[0] || "");
      return demoCustomers.filter((row) => !search || filterText(`${row.fullName} ${row.companyName} ${row.email} ${row.phone}`, search)) as T;
    }
    case "ListCustomerLookup":
      return demoLookup(String(args[0] || ""), String(args[1] || "all")) as T;
    case "SaveCustomer": {
      const input = args[0] as Partial<Customer>;
      const saved = { ...input, id: input.id || demoCustomerId++ } as Customer;
      demoCustomers = input.id ? demoCustomers.map((row) => row.id === input.id ? saved : row) : [saved, ...demoCustomers];
      return saved as T;
    }
    case "DeleteCustomer":
      demoCustomers = demoCustomers.filter((row) => row.id !== Number(args[0]));
      return undefined as T;
    case "ListVendors": {
      const search = String(args[0] || "");
      return demoVendors.filter((row) => !search || filterText(`${row.vendorName} ${row.contactName} ${row.email} ${row.phone}`, search)) as T;
    }
    case "SaveVendor": {
      const input = args[0] as Partial<Vendor>;
      const saved = { ...input, id: input.id || demoVendorId++ } as Vendor;
      demoVendors = input.id ? demoVendors.map((row) => row.id === input.id ? saved : row) : [saved, ...demoVendors];
      return saved as T;
    }
    case "DeleteVendor":
      demoVendors = demoVendors.filter((row) => row.id !== Number(args[0]));
      return undefined as T;
    case "ListInvoices": {
      const search = String(args[0] || "");
      return demoInvoices.filter((row) => !search || filterText(`${row.invoiceNumber} ${row.customerName}`, search)) as T;
    }
    case "ListPurchases": {
      const search = String(args[0] || "");
      return demoPurchases.filter((row) => !search || filterText(`${row.vendorName} ${row.description} ${row.categoryName}`, search)) as T;
    }
    case "SavePurchase": {
      const input = args[0] as PurchaseInput;
      const vendor = demoVendors.find((row) => row.vendorName.toLowerCase() === input.vendorName.toLowerCase());
      const saved: Purchase = {
        id: input.id || demoPurchaseId++,
        businessId: input.businessId || 1,
        businessName: demoBusinesses.find((row) => row.id === input.businessId)?.name || "SimpleTech Books",
        vendorId: vendor?.id || 0,
        vendorName: input.vendorName,
        purchaseDate: input.purchaseDate,
        description: input.description,
        categoryName: input.categoryName || "Uncategorized",
        amount: input.amount,
        taxPaid: input.taxPaid,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        createdAt: input.purchaseDate
      };
      demoPurchases = input.id ? demoPurchases.map((row) => row.id === input.id ? saved : row) : [saved, ...demoPurchases];
      return saved as T;
    }
    case "DeletePurchase":
      demoPurchases = demoPurchases.filter((row) => row.id !== Number(args[0]));
      return undefined as T;
    case "GetInvoice": {
      const id = Number(args[0]);
      const invoice = demoInvoices.find((row) => row.id === id);
      if (!invoice) throw new Error("Invoice not found");
      const customer = demoCustomers.find((row) => row.fullName === invoice.customerName) || {
        id: 0,
        fullName: invoice.customerName,
        companyName: "",
        email: "",
        phone: "",
        billingAddress: "",
        serviceAddress: "",
        taxExempt: false,
        notes: ""
      };
      return {
        ...invoice,
        businessId: invoice.businessId,
        businessName: invoice.businessName,
        paymentInstructions: demoBusinesses.find((row) => row.id === invoice.businessId)?.paymentInstructions,
        checkPayableTo: demoBusinesses.find((row) => row.id === invoice.businessId)?.checkPayableTo,
        customer,
        subtotal: invoice.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        notes: "",
        terms: "",
        paymentDate: invoice.invoiceDate,
        paymentMethod: "cash",
        items: [
          { id: 1, itemType: "labor", description: "Walk-in service charge", quantity: 1, unitPrice: invoice.totalAmount, taxable: false, lineTotal: invoice.totalAmount, position: 0 }
        ]
      } as T;
    }
    case "CreateInvoice": {
      const input = args[0] as InvoiceInput;
      const customer = demoCustomers.find((row) => row.id === input.customerId);
      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const saved: InvoiceListItem = {
        id: demoInvoiceId++,
        businessId: input.businessId || 1,
        businessName: demoBusinesses.find((row) => row.id === input.businessId)?.name || "SimpleTech Books",
        invoiceNumber: `${demoSettings.invoicePrefix}-00${1000 + demoInvoiceId}`,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        customerName: customer?.fullName || "Customer",
        status: "unpaid",
        totalAmount: Math.round((subtotal - input.discountAmount) * 100) / 100,
        paidAmount: 0
      };
      demoInvoices = [saved, ...demoInvoices];
      const detail = await demoCall<InvoiceDetail>("GetInvoice", saved.id);
      return { ...detail, customer, notes: input.notes, terms: input.terms, discountAmount: input.discountAmount, items: input.items.map((item, index) => ({ ...item, id: index + 1, position: index, lineTotal: item.quantity * item.unitPrice })) } as T;
    }
    case "RecordWalkInService": {
      const input = args[0] as WalkInServiceInput;
      const customerName = `${input.firstName} ${input.lastName}`.trim() || "Walk-in Customer";
      const totalAmount = Math.round((input.partsCost + input.serviceCharge) * 100) / 100;
      const paidAmount = Math.min(totalAmount, input.amountPaid);
      const saved: InvoiceListItem = {
        id: input.id || demoInvoiceId++,
        businessId: input.businessId || 1,
        businessName: demoBusinesses.find((row) => row.id === input.businessId)?.name || "SimpleTech Books",
        invoiceNumber: `${demoSettings.invoicePrefix}-00${1000 + demoInvoiceId}`,
        invoiceDate: input.serviceDate,
        dueDate: input.serviceDate,
        customerName,
        status: paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
        totalAmount,
        paidAmount
      };
      demoInvoices = input.id ? demoInvoices.map((row) => row.id === input.id ? saved : row) : [saved, ...demoInvoices];
      return saved as T;
    }
    case "DeleteInvoice":
      demoInvoices = demoInvoices.filter((row) => row.id !== Number(args[0]));
      return undefined as T;
    case "MergeCustomers": {
      const source = demoCustomers.find((row) => row.id === Number(args[0]));
      const target = demoCustomers.find((row) => row.id === Number(args[1]));
      if (!source || !target) throw new Error("customer not found");
      demoInvoices = demoInvoices.map((row) => row.customerName === source.fullName ? { ...row, customerName: target.fullName } : row);
      demoCustomers = demoCustomers.filter((row) => row.id !== source.id);
      return target as T;
    }
    case "GetMonthlySummary":
      return demoMonthlySummary(Number(args[0]), Number(args[1]), Number(args[2] || 0)) as T;
    case "ExportInvoicePDF":
      return "Browser preview: PDF export works in the Wails desktop app." as T;
    case "GetSettings":
      return demoSettings as T;
    case "SaveSettings":
      demoSettings = args[0] as AppSettings;
      return demoSettings as T;
    case "SelectBusinessLogo":
      return "C:\\Logos\\simpletech-logo.png" as T;
    case "GetImageDataURL":
      return "" as T;
    case "EmailInvoice":
      return undefined as T;
    default:
      throw new Error(`Demo method not implemented: ${method}`);
  }
}

async function call<T>(method: string, ...args: unknown[]): Promise<T> {
  if (inDemoMode()) {
    return demoCall<T>(method, ...args);
  }
  const app = (window as WailsWindow).go?.main?.App;
  const fn = app?.[method];
  if (!fn) {
    throw new Error("Wails backend is not connected. Run this with `wails dev` after PostgreSQL is ready.");
  }
  return fn(...args) as Promise<T>;
}

let sessionToken = "";

async function authenticatedCall<T>(method: string, ...args: unknown[]): Promise<T> {
  if (!sessionToken) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error("You are signed out. Please sign in again.");
  }
  try {
    if (inDemoMode()) return await call<T>(method, ...args);
    return await call<T>(method, sessionToken, ...args);
  } catch (err) {
    const text = errorText(err);
    // The backend drops sessions after 30 minutes idle. Every save/edit/delete after
    // that used to fail silently; now the user is sent back to the sign-in screen.
    if (/session expired|invalid session|authentication required/i.test(text)) {
      sessionToken = "";
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw new Error("Your session expired. Please sign in again.");
    }
    throw new Error(text);
  }
}

export const api = {
  login: async (username: string, password: string) => { const session = await call<AuthSession>("Login", username, password); sessionToken = session.token; return session; },
  passwordRecoveryOptions: (username: string) => call<PasswordRecoveryOptions>("GetPasswordRecoveryOptions", username),
  requestPasswordResetCode: (username: string) => call<void>("RequestPasswordResetCode", username),
  resetPasswordWithCode: (username: string, code: string, newPassword: string) => call<void>("ResetPasswordWithCode", username, code, newPassword),
  resetPasswordWithSecurityAnswer: (username: string, answer: string, newPassword: string) => call<void>("ResetPasswordWithSecurityAnswer", username, answer, newPassword),
  logout: async () => { if (sessionToken) await authenticatedCall<void>("Logout").catch(() => undefined); sessionToken = ""; },
  dashboard: () => authenticatedCall<DashboardSummary>("GetDashboard"),
  incomeExpenseReport: (period: IncomeExpensePeriod, year: number) => authenticatedCall<IncomeExpenseReport>("GetIncomeExpenseReport", period, year),
  taxReport: (startDate: string, endDate: string, businessId = 0) => authenticatedCall<TaxReportSummary>("GetTaxReport", startDate, endDate, businessId),
  listUsers: () => authenticatedCall<User[]>("ListUsers"),
  saveUser: (user: UserInput) => authenticatedCall<User>("SaveUser", user),
  listBusinesses: () => authenticatedCall<Business[]>("ListBusinesses"),
  saveBusiness: (business: BusinessInput) => authenticatedCall<Business>("SaveBusiness", business),
  listCustomers: (search = "") => authenticatedCall<Customer[]>("ListCustomers", search),
  listCustomerLookup: (search = "", kind = "all") => authenticatedCall<CustomerLookup[]>("ListCustomerLookup", search, kind),
  saveCustomer: (customer: Partial<Customer>) => authenticatedCall<Customer>("SaveCustomer", customer),
  deleteCustomer: (id: number) => authenticatedCall<void>("DeleteCustomer", id),
  mergeCustomers: (sourceId: number, targetId: number) => authenticatedCall<Customer>("MergeCustomers", sourceId, targetId),
  monthlySummary: (year: number, month: number, businessId = 0) => authenticatedCall<MonthlySummary>("GetMonthlySummary", year, month, businessId),
  listVendors: (search = "") => authenticatedCall<Vendor[]>("ListVendors", search),
  saveVendor: (vendor: Partial<Vendor>) => authenticatedCall<Vendor>("SaveVendor", vendor),
  deleteVendor: (id: number) => authenticatedCall<void>("DeleteVendor", id),
  listPurchases: (search = "") => authenticatedCall<Purchase[]>("ListPurchases", search),
  savePurchase: (purchase: PurchaseInput) => authenticatedCall<Purchase>("SavePurchase", purchase),
  deletePurchase: (id: number) => authenticatedCall<void>("DeletePurchase", id),
  listInvoices: (search = "") => authenticatedCall<InvoiceListItem[]>("ListInvoices", search),
  getInvoice: (id: number) => authenticatedCall<InvoiceDetail>("GetInvoice", id),
  createInvoice: (invoice: InvoiceInput) => authenticatedCall<InvoiceDetail>("CreateInvoice", invoice),
  recordWalkInService: (entry: WalkInServiceInput) => authenticatedCall<unknown>("RecordWalkInService", entry),
  deleteInvoice: (id: number) => authenticatedCall<void>("DeleteInvoice", id),
  exportInvoicePDF: (id: number) => authenticatedCall<string>("ExportInvoicePDF", id),
  getSettings: () => authenticatedCall<AppSettings>("GetSettings"),
  saveSettings: (settings: AppSettings) => authenticatedCall<AppSettings>("SaveSettings", settings),
  selectBusinessLogo: () => authenticatedCall<string>("SelectBusinessLogo"),
  getImageDataURL: (path: string) => authenticatedCall<string>("GetImageDataURL", path),
  emailInvoice: (input: EmailInvoiceInput) => authenticatedCall<void>("EmailInvoice", input)
};





