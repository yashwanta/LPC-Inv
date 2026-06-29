export type AuthSession = {
  userId: number;
  username: string;
  displayName: string;
  role: "admin" | "standard";
  token: string;
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

export type InvoiceListItem = {
  id: number;
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
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  discountAmount: number;
  notes: string;
  terms: string;
  items: InvoiceItemInput[];
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
  { id: 1, invoiceNumber: "INV-001001", invoiceDate: "2026-06-10", dueDate: "2026-06-24", customerName: "Jordan Lee", status: "unpaid", totalAmount: 189.2, paidAmount: 0 },
  { id: 2, invoiceNumber: "INV-001002", invoiceDate: "2026-06-20", dueDate: "2026-07-04", customerName: "Walk-in Customer", status: "paid", totalAmount: 95, paidAmount: 95 },
  { id: 3, invoiceNumber: "INV-001003", invoiceDate: "2026-06-22", dueDate: "2026-07-06", customerName: "Jordan Lee", status: "paid", totalAmount: 255.8, paidAmount: 255.8 }
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
    case "CreateInvoice": {
      const input = args[0] as InvoiceInput;
      const customer = demoCustomers.find((row) => row.id === input.customerId);
      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const saved: InvoiceListItem = {
        id: demoInvoiceId++,
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
    case "ExportInvoicePDF":
      return "Browser preview: PDF export works in the Wails desktop app." as T;
    case "GetSettings":
      return demoSettings as T;
    case "SaveSettings":
      demoSettings = args[0] as AppSettings;
      return demoSettings as T;
    case "SelectBusinessLogo":
      return "C:\\Logos\\simpletech-logo.png" as T;
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
  listCustomers: (search = "") => call<Customer[]>("ListCustomers", search),
  listCustomerLookup: (search = "", kind = "all") => call<CustomerLookup[]>("ListCustomerLookup", search, kind),
  saveCustomer: (customer: Partial<Customer>) => call<Customer>("SaveCustomer", customer),
  deleteCustomer: (id: number) => call<void>("DeleteCustomer", id),
  listVendors: (search = "") => call<Vendor[]>("ListVendors", search),
  saveVendor: (vendor: Partial<Vendor>) => call<Vendor>("SaveVendor", vendor),
  deleteVendor: (id: number) => call<void>("DeleteVendor", id),
  listInvoices: (search = "") => call<InvoiceListItem[]>("ListInvoices", search),
  createInvoice: (invoice: InvoiceInput) => call<unknown>("CreateInvoice", invoice),
  exportInvoicePDF: (id: number) => call<string>("ExportInvoicePDF", id),
  getSettings: () => call<AppSettings>("GetSettings"),
  saveSettings: (settings: AppSettings) => call<AppSettings>("SaveSettings", settings),
  selectBusinessLogo: () => call<string>("SelectBusinessLogo"),
  emailInvoice: (input: EmailInvoiceInput) => call<void>("EmailInvoice", input)
};
