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
};

export type UserInput = {
  id?: number;
  username: string;
  displayName: string;
  password: string;
  role: "admin" | "standard";
  accessLabel: string;
  active: boolean;
};

export type Business = {
  id: number;
  name: string;
  active: boolean;
};

export type BusinessInput = {
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
  { id: 1, username: "admin", displayName: "Administrator", role: "admin", accessLabel: "Full Access", active: true }
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

async function demoCall<T>(method: string, ...args: unknown[]): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  switch (method) {
    case "Login":
      return { userId: 1, username: String(args[0] || "admin"), displayName: "Browser Preview", role: "admin", token: "demo" } as T;
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
      const saved: User = { id: input.id || demoUserId++, username: input.username, displayName: input.displayName, role: input.role, accessLabel: input.accessLabel, active: input.active };
      demoUsers = input.id ? demoUsers.map((row) => row.id === input.id ? saved : row) : [saved, ...demoUsers];
      return saved as T;
    }
    case "ListBusinesses":
      return demoBusinesses as T;
    case "SaveBusiness": {
      const input = args[0] as BusinessInput;
      const saved: Business = { id: input.id || demoBusinessId++, name: input.name, active: input.active };
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
      return saved as T;
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

export const api = {
  login: (username: string, password: string) => call<AuthSession>("Login", username, password),
  dashboard: () => call<DashboardSummary>("GetDashboard"),
  incomeExpenseReport: (period: IncomeExpensePeriod, year: number) => call<IncomeExpenseReport>("GetIncomeExpenseReport", period, year),
  taxReport: (startDate: string, endDate: string, businessId = 0) => call<TaxReportSummary>("GetTaxReport", startDate, endDate, businessId),
  listUsers: () => call<User[]>("ListUsers"),
  saveUser: (user: UserInput) => call<User>("SaveUser", user),
  listBusinesses: () => call<Business[]>("ListBusinesses"),
  saveBusiness: (business: BusinessInput) => call<Business>("SaveBusiness", business),
  listCustomers: (search = "") => call<Customer[]>("ListCustomers", search),
  listCustomerLookup: (search = "", kind = "all") => call<CustomerLookup[]>("ListCustomerLookup", search, kind),
  saveCustomer: (customer: Partial<Customer>) => call<Customer>("SaveCustomer", customer),
  deleteCustomer: (id: number) => call<void>("DeleteCustomer", id),
  listVendors: (search = "") => call<Vendor[]>("ListVendors", search),
  saveVendor: (vendor: Partial<Vendor>) => call<Vendor>("SaveVendor", vendor),
  deleteVendor: (id: number) => call<void>("DeleteVendor", id),
  listPurchases: (search = "") => call<Purchase[]>("ListPurchases", search),
  savePurchase: (purchase: PurchaseInput) => call<Purchase>("SavePurchase", purchase),
  deletePurchase: (id: number) => call<void>("DeletePurchase", id),
  listInvoices: (search = "") => call<InvoiceListItem[]>("ListInvoices", search),
  getInvoice: (id: number) => call<InvoiceDetail>("GetInvoice", id),
  createInvoice: (invoice: InvoiceInput) => call<unknown>("CreateInvoice", invoice),
  recordWalkInService: (entry: WalkInServiceInput) => call<unknown>("RecordWalkInService", entry),
  deleteInvoice: (id: number) => call<void>("DeleteInvoice", id),
  exportInvoicePDF: (id: number) => call<string>("ExportInvoicePDF", id),
  getSettings: () => call<AppSettings>("GetSettings"),
  saveSettings: (settings: AppSettings) => call<AppSettings>("SaveSettings", settings),
  selectBusinessLogo: () => call<string>("SelectBusinessLogo"),
  getImageDataURL: (path: string) => call<string>("GetImageDataURL", path),
  emailInvoice: (input: EmailInvoiceInput) => call<void>("EmailInvoice", input)
};





