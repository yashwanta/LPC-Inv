import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Building2,
  CreditCard,
  DatabaseBackup,
  FileDown,
  FileText,
  ImageIcon,
  Mail,
  Home,
  LogOut,
  Moon,
  PackageOpen,
  Pencil,
  Repeat,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
  Wrench
} from "lucide-react";
import { api, AppSettings, AuthSession, Business, BusinessInput, Customer, CustomerLookup, DashboardSummary, IncomeExpensePeriod, IncomeExpenseReport, InvoiceDetail, InvoiceInput, InvoiceItemInput, InvoiceListItem, Purchase, PurchaseInput, TaxReportSummary, User, UserInput, Vendor, WalkInServiceInput } from "./api";

type Page = "dashboard" | "manual" | "customers" | "customerLookup" | "invoices" | "payments" | "purchases" | "vendors" | "import" | "tax" | "reports" | "users" | "backup" | "settings";

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "manual", label: "Manual Entry", icon: Wrench },
  { id: "customers", label: "Customers", icon: Users },
  { id: "customerLookup", label: "Customer Lookup", icon: UserPlus },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "purchases", label: "Purchases", icon: PackageOpen },
  { id: "vendors", label: "Vendors", icon: Building2 },
  { id: "import", label: "Credit Card Import", icon: CreditCard },
  { id: "tax", label: "Tax Reports", icon: BadgeDollarSign },
  { id: "reports", label: "Reports", icon: ReceiptText },
  { id: "users", label: "User Management", icon: UserPlus },
  { id: "backup", label: "Backup & Restore", icon: DatabaseBackup },
  { id: "settings", label: "Settings", icon: Settings }
];

const emptyCustomer: Partial<Customer> = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  billingAddress: "",
  serviceAddress: "",
  taxExempt: false,
  notes: ""
};

const emptyVendor: Partial<Vendor> = {
  vendorName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  notes: ""
};

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function money(value: number | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [dark, setDark] = useState(false);

  if (!session) {
    return <LoginScreen onLogin={setSession} dark={dark} setDark={setDark} />;
  }

  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">ST</div>
          <div>
            <strong>SimpleTech</strong>
            <span>Books</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={page === item.id ? "navItem active" : "navItem"} key={item.id} onClick={() => setPage(item.id)} title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{navItems.find((item) => item.id === page)?.label}</h1>
            <p>{session.displayName} · {session.role}</p>
          </div>
          <div className="topActions">
            <button className="iconButton" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="ghostButton" onClick={() => setSession(null)}><LogOut size={16} /> Sign out</button>
          </div>
        </header>
        {page === "dashboard" && <Dashboard />}
        {page === "manual" && <ManualEntry />}
        {page === "customers" && <Customers />}
        {page === "customerLookup" && <CustomerLookupPage />}
        {page === "vendors" && <Vendors />}
        {page === "invoices" && <Invoices />}
        {page === "payments" && <Placeholder title="Payments" items={["Record payment date, amount, method, and notes", "Automatically update unpaid, partial, and paid status", "Keep the first payment workflow simple"]} />}
        {page === "purchases" && <Placeholder title="Purchases" items={["Enter vendor, date, description, category, amount, tax paid, and receipt", "Connect purchases to invoices when useful", "CSV exports arrive in Phase 2"]} />}
        {page === "import" && <CreditCardImport />}
        {page === "tax" && <TaxReports />}
        {page === "reports" && <IncomeExpenseReports />}
        {page === "users" && <UserManagement />}
        {page === "backup" && <Placeholder title="Backup & Restore" items={["Use pg_dump and pg_restore for full PostgreSQL backups", "Export important tables to CSV", "Add daily, weekly, and monthly auto backup after core records are stable"]} />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin, dark, setDark }: { onLogin: (session: AuthSession) => void; dark: boolean; setDark: (value: boolean) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      onLogin(await api.login(username, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={dark ? "loginPage dark" : "loginPage"}>
      <form className="loginPanel" onSubmit={submit}>
        <div className="loginHeader">
          <div className="brandMark">ST</div>
          <button className="iconButton" type="button" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
        <h1>SimpleTech Books</h1>
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primaryButton" disabled={loading}>{loading ? "Signing in" : "Sign in"}</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((err) => setError(err instanceof Error ? err.message : "Dashboard failed"));
  }, []);

  if (error) return <StateMessage message={error} />;
  if (!data) return <StateMessage message="Loading dashboard" />;
  const recentInvoices = data.recentInvoices ?? [];
  const recentCustomers = data.recentCustomers ?? [];

  return (
    <section className="contentStack">
      <div className="metricGrid">
        <Metric label="Unpaid invoices" value={money(data.totalUnpaidInvoices)} />
        <Metric label="Paid invoices" value={String(data.paidInvoicesMonth)} />
        <Metric label="Sales this month" value={money(data.totalSalesMonth)} />
        <Metric label="Purchases this month" value={money(data.purchasesMonth)} />
        <Metric label="Sales tax collected" value={money(data.salesTaxCollected)} />
      </div>
      <div className="twoColumn">
        <ListPanel title="Recent invoices" rows={recentInvoices.map((invoice) => `${invoice.invoiceNumber} · ${invoice.customerName} · ${money(invoice.totalAmount)}`)} />
        <ListPanel title="Recent customers" rows={recentCustomers.map((customer) => `${customer.fullName}${customer.companyName ? ` · ${customer.companyName}` : ""}`)} />
      </div>
    </section>
  );
}

const emptyServiceEntry: WalkInServiceInput = {
  businessId: 0,
  serviceDate: today(),
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  device: "",
  make: "",
  model: "",
  serialNumber: "",
  issue: "",
  solution: "",
  partsCost: 0,
  serviceCharge: 150,
  amountPaid: 150,
  paymentMethod: "cash",
  paymentDate: today(),
  reference: "",
  notes: ""
};

const emptyPurchaseEntry: PurchaseInput = {
  businessId: 0,
  purchaseDate: today(),
  vendorName: "",
  description: "",
  categoryName: "Computer parts",
  amount: 0,
  taxPaid: 0,
  paymentMethod: "card",
  notes: ""
};

function noteValue(notes: string, label: string) {
  const line = notes.split(/\r?\n/).find((row) => row.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(label.length + 1).trim() : "";
}

function invoiceToServiceEntry(invoice: InvoiceDetail): WalkInServiceInput {
  const labor = invoice.items.find((item) => item.itemType === "labor");
  const parts = invoice.items.find((item) => item.itemType === "parts");
  const name = splitName(invoice.customer.fullName);
  return {
    id: invoice.id,
    businessId: invoice.businessId,
    serviceDate: invoice.invoiceDate,
    firstName: name.firstName,
    lastName: name.lastName,
    phone: formatPhone(invoice.customer.phone),
    email: invoice.customer.email,
    device: noteValue(invoice.notes, "Device"),
    make: noteValue(invoice.notes, "Make"),
    model: noteValue(invoice.notes, "Model"),
    serialNumber: noteValue(invoice.notes, "Serial"),
    issue: noteValue(invoice.notes, "Issue"),
    solution: noteValue(invoice.notes, "Solution") || parts?.description || "",
    partsCost: parts?.unitPrice ?? 0,
    serviceCharge: labor?.unitPrice ?? 0,
    amountPaid: invoice.paidAmount,
    paymentMethod: invoice.paymentMethod || "cash",
    paymentDate: invoice.paymentDate || invoice.invoiceDate,
    reference: noteValue(invoice.notes, "Reference"),
    notes: noteValue(invoice.notes, "Notes")
  };
}

function ManualEntry() {
  const [service, setService] = useState<WalkInServiceInput>(emptyServiceEntry);
  const [purchase, setPurchase] = useState<PurchaseInput>(emptyPurchaseEntry);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceListItem[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [invoiceRows, purchaseRows, businessRows] = await Promise.all([api.listInvoices(""), api.listPurchases(""), api.listBusinesses()]);
    setRecentInvoices(invoiceRows.slice(0, 6));
    setRecentPurchases(purchaseRows.slice(0, 6));
    setBusinesses(businessRows.filter((row) => row.active));
    const defaultBusinessId = businessRows.find((row) => row.active)?.id || 0;
    if (defaultBusinessId) {
      setService((current) => current.businessId ? current : { ...current, businessId: defaultBusinessId });
      setPurchase((current) => current.businessId ? current : { ...current, businessId: defaultBusinessId });
    }
  }

  useEffect(() => { load().catch((err) => setMessage(String(err))); }, []);

  const serviceTotal = service.partsCost + service.serviceCharge;

  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    await api.recordWalkInService(service);
    setService({ ...emptyServiceEntry, businessId: service.businessId, serviceDate: today(), paymentDate: today() });
    setMessage(service.id ? "Walk-in service income updated" : "Walk-in service income saved");
    await load();
  }

  async function savePurchase(event: React.FormEvent) {
    event.preventDefault();
    await api.savePurchase(purchase);
    setPurchase({ ...emptyPurchaseEntry, businessId: purchase.businessId, purchaseDate: today() });
    setMessage(purchase.id ? "Expense updated" : "Expense saved");
    await load();
  }

  async function editService(id: number) {
    const invoice = await api.getInvoice(id);
    setService(invoiceToServiceEntry(invoice));
    setMessage("Editing service income");
  }

  function editPurchase(row: Purchase) {
    setPurchase({
      id: row.id,
      businessId: row.businessId,
      purchaseDate: row.purchaseDate,
      vendorName: row.vendorName,
      description: row.description,
      categoryName: row.categoryName || "Uncategorized",
      amount: row.amount,
      taxPaid: row.taxPaid,
      paymentMethod: row.paymentMethod || "card",
      notes: row.notes
    });
    setMessage("Editing expense");
  }

  async function deleteService(id: number) {
    if (!window.confirm("Delete this service income entry?")) return;
    await api.deleteInvoice(id);
    if (service.id === id) {
      setService({ ...emptyServiceEntry, businessId: service.businessId, serviceDate: today(), paymentDate: today() });
    }
    setMessage("Service income deleted");
    await load();
  }

  async function deletePurchase(id: number) {
    if (!window.confirm("Delete this expense entry?")) return;
    await api.deletePurchase(id);
    if (purchase.id === id) {
      setPurchase({ ...emptyPurchaseEntry, businessId: purchase.businessId, purchaseDate: today() });
    }
    setMessage("Expense deleted");
    await load();
  }

  return (
    <section className="manualEntryGrid">
      <form className="formPanel" onSubmit={saveService}>
        <PanelTitle icon={Wrench} title={service.id ? "Edit walk-in service income" : "Walk-in service income"} />
        <BusinessSelect businesses={businesses} value={service.businessId} onChange={(businessId) => setService({ ...service, businessId })} />
        <div className="fieldRow"><Input label="Service date" type="date" value={service.serviceDate} onChange={(serviceDate) => setService({ ...service, serviceDate })} /><Input label="Payment date" type="date" value={service.paymentDate} onChange={(paymentDate) => setService({ ...service, paymentDate })} /></div>
        <div className="fieldRow"><Input label="First name" value={service.firstName} onChange={(firstName) => setService({ ...service, firstName })} /><Input label="Last name" value={service.lastName} onChange={(lastName) => setService({ ...service, lastName })} /></div>
        <div className="fieldRow"><Input label="Phone" value={service.phone} onChange={(phone) => setService({ ...service, phone: formatPhone(phone) })} /><Input label="Email" value={service.email} onChange={(email) => setService({ ...service, email })} /></div>
        <div className="fieldRow"><Input label="Device" value={service.device} onChange={(device) => setService({ ...service, device })} /><Input label="Make" value={service.make} onChange={(make) => setService({ ...service, make })} /></div>
        <div className="fieldRow"><Input label="Model" value={service.model} onChange={(model) => setService({ ...service, model })} /><Input label="Serial number" value={service.serialNumber} onChange={(serialNumber) => setService({ ...service, serialNumber })} /></div>
        <TextArea label="Issue" value={service.issue} onChange={(issue) => setService({ ...service, issue })} />
        <TextArea label="Solution" value={service.solution} onChange={(solution) => setService({ ...service, solution })} />
        <div className="fieldRow"><Input label="Parts cost" type="number" value={String(service.partsCost)} onChange={(partsCost) => setService({ ...service, partsCost: Number(partsCost), amountPaid: Number(partsCost) + service.serviceCharge })} /><Input label="Service charge" type="number" value={String(service.serviceCharge)} onChange={(serviceCharge) => setService({ ...service, serviceCharge: Number(serviceCharge), amountPaid: Number(serviceCharge) + service.partsCost })} /></div>
        <div className="fieldRow"><Input label="Amount paid" type="number" value={String(service.amountPaid)} onChange={(amountPaid) => setService({ ...service, amountPaid: Number(amountPaid) })} /><PaymentMethodSelect value={service.paymentMethod} onChange={(paymentMethod) => setService({ ...service, paymentMethod })} /></div>
        <Input label="Reference" value={service.reference} onChange={(reference) => setService({ ...service, reference })} />
        <TextArea label="Notes" value={service.notes} onChange={(notes) => setService({ ...service, notes })} />
        <div className="invoiceTotal"><span>Total income</span><strong>{money(serviceTotal)}</strong></div>
        <div className="formActions">
          <button className="primaryButton"><Plus size={16} /> {service.id ? "Update service income" : "Save service income"}</button>
          {service.id ? <button className="ghostButton" type="button" onClick={() => setService({ ...emptyServiceEntry, businessId: service.businessId, serviceDate: today(), paymentDate: today() })}>New entry</button> : null}
        </div>
      </form>

      <div className="contentStack">
        <form className="formPanel" onSubmit={savePurchase}>
          <PanelTitle icon={PackageOpen} title={purchase.id ? "Edit manual expense" : "Manual expense"} />
          <BusinessSelect businesses={businesses} value={purchase.businessId} onChange={(businessId) => setPurchase({ ...purchase, businessId })} />
          <Input label="Purchase date" type="date" value={purchase.purchaseDate} onChange={(purchaseDate) => setPurchase({ ...purchase, purchaseDate })} />
          <Input label="Vendor" value={purchase.vendorName} onChange={(vendorName) => setPurchase({ ...purchase, vendorName })} />
          <TextArea label="Description" value={purchase.description} onChange={(description) => setPurchase({ ...purchase, description })} />
          <div className="fieldRow"><CategorySelect value={purchase.categoryName} onChange={(categoryName) => setPurchase({ ...purchase, categoryName })} /><PaymentMethodSelect value={purchase.paymentMethod} onChange={(paymentMethod) => setPurchase({ ...purchase, paymentMethod })} /></div>
          <div className="fieldRow"><Input label="Amount" type="number" value={String(purchase.amount)} onChange={(amount) => setPurchase({ ...purchase, amount: Number(amount) })} /><Input label="Tax paid" type="number" value={String(purchase.taxPaid)} onChange={(taxPaid) => setPurchase({ ...purchase, taxPaid: Number(taxPaid) })} /></div>
          <TextArea label="Notes" value={purchase.notes} onChange={(notes) => setPurchase({ ...purchase, notes })} />
          <div className="formActions">
            <button className="primaryButton"><Plus size={16} /> {purchase.id ? "Update expense" : "Save expense"}</button>
            {purchase.id ? <button className="ghostButton" type="button" onClick={() => setPurchase({ ...emptyPurchaseEntry, businessId: purchase.businessId, purchaseDate: today() })}>New expense</button> : null}
          </div>
        </form>
        {message && <div className="notice">{message}</div>}
        <div className="twoColumn manualRecent">
          <div className="listPanel">
            <div className="sectionTitle"><strong>Recent service income</strong></div>
            <div className="tableList">
              {recentInvoices.length ? recentInvoices.map((invoice) => (
                <div className="invoiceRow" key={invoice.id}>
                  <span><strong>{invoice.invoiceDate} · {invoice.customerName}</strong><small>{invoice.businessName || "Business"} · {invoice.status}</small></span>
                  <span>{money(invoice.totalAmount)}</span>
                  <div className="rowActions">
                    <button className="iconButton" type="button" onClick={() => editService(invoice.id)} title="Edit service income"><Pencil size={16} /></button>
                    <button className="iconButton dangerIconButton" type="button" onClick={() => deleteService(invoice.id)} title="Delete service income"><Trash2 size={16} /></button>
                  </div>
                </div>
              )) : <StateMessage message="No records yet" />}
            </div>
          </div>
          <div className="listPanel">
            <div className="sectionTitle"><strong>Recent expenses</strong></div>
            <div className="tableList">
              {recentPurchases.length ? recentPurchases.map((row) => (
                <div className="invoiceRow" key={row.id}>
                  <span><strong>{row.purchaseDate} · {row.vendorName || "No vendor"}</strong><small>{row.businessName || "Business"} · {row.categoryName}</small></span>
                  <span>{money(row.amount)}</span>
                  <div className="rowActions">
                    <button className="iconButton" type="button" onClick={() => editPurchase(row)} title="Edit expense"><Pencil size={16} /></button>
                    <button className="iconButton dangerIconButton" type="button" onClick={() => deletePurchase(row.id)} title="Delete expense"><Trash2 size={16} /></button>
                  </div>
                </div>
              )) : <StateMessage message="No records yet" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function CreditCardImport() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(0);
  const [rows, setRows] = useState<PurchaseInput[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.listBusinesses().then((items) => {
      const active = items.filter((row) => row.active);
      setBusinesses(active);
      setBusinessId(active[0]?.id || 0);
    }).catch((err) => setMessage(String(err)));
  }, []);

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const matrix = parseCSV(await file.text());
    const [headers = [], ...dataRows] = matrix;
    const indexFor = (...names: string[]) => headers.findIndex((header) => names.includes(header.trim().toLowerCase()));
    const dateIndex = indexFor("transaction_date", "date", "purchase_date");
    const descriptionIndex = indexFor("description", "memo", "details", "name");
    const amountIndex = indexFor("amount", "debit", "charge");
    const vendorIndex = indexFor("vendor_name", "vendor", "merchant");
    const categoryIndex = indexFor("category_name", "category");
    const taxIndex = indexFor("tax_paid", "tax");
    const paymentIndex = indexFor("payment_method", "method");
    const parsed = dataRows.map((row) => ({
      businessId,
      purchaseDate: row[dateIndex] || today(),
      vendorName: row[vendorIndex] || "",
      description: row[descriptionIndex] || row[vendorIndex] || "Credit card transaction",
      categoryName: row[categoryIndex] || "Uncategorized",
      amount: Math.abs(Number(String(row[amountIndex] || "0").replace(/[$,]/g, ""))),
      taxPaid: Math.max(0, Number(String(row[taxIndex] || "0").replace(/[$,]/g, ""))),
      paymentMethod: row[paymentIndex] || "card",
      notes: `Imported from ${file.name}`
    })).filter((row) => row.amount > 0);
    setRows(parsed);
    setMessage(`${parsed.length} rows ready to import`);
  }

  async function saveRows() {
    for (const row of rows) {
      await api.savePurchase({ ...row, businessId });
    }
    setRows([]);
    setMessage("Credit card rows imported into purchases");
  }

  return (
    <section className="contentStack">
      <div className="formPanel importPanel">
        <PanelTitle icon={CreditCard} title="Credit card import" />
        <BusinessSelect businesses={businesses} value={businessId} onChange={setBusinessId} />
        <label>CSV file<input type="file" accept=".csv,text/csv" onChange={chooseFile} /></label>
        {message && <div className="notice">{message}</div>}
        <button className="primaryButton" type="button" disabled={!rows.length} onClick={saveRows}><Plus size={16} /> Import purchases</button>
      </div>
      <section className="workList">
        <div className="sectionTitle"><CreditCard size={18} /><strong>Preview</strong></div>
        <div className="reportTable">
          <div className="importTableHeader"><span>Date</span><span>Vendor</span><span>Description</span><span>Category</span><span>Amount</span></div>
          {rows.map((row, index) => (
            <div className="importTableRow" key={`${row.purchaseDate}-${index}`}>
              <span>{row.purchaseDate}</span><span>{row.vendorName || "-"}</span><span>{row.description}</span><span>{row.categoryName}</span><span>{money(row.amount)}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function TaxReports() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(0);
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState<TaxReportSummary | null>(null);
  const [message, setMessage] = useState("");

  async function load(nextBusinessId = businessId) {
    setReport(await api.taxReport(startDate, endDate, nextBusinessId));
  }

  useEffect(() => {
    api.listBusinesses().then((items) => {
      const active = items.filter((row) => row.active);
      setBusinesses(active);
      load(0).catch((err) => setMessage(String(err)));
    }).catch((err) => setMessage(String(err)));
  }, []);

  async function refresh(event: React.FormEvent) {
    event.preventDefault();
    await load();
  }

  function exportCSV() {
    if (!report) return;
    const csv = [
      ["Start Date", "End Date", "Business", "Gross Sales", "Taxable Sales", "Non-Taxable Sales", "Sales Tax Collected", "Total Purchases", "Net Income"],
      [report.startDate, report.endDate, report.businessName || "All businesses", report.grossSales, report.taxableSales, report.nonTaxableSales, report.salesTaxCollected, report.totalPurchases, report.netIncome]
    ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tax-report-${report.startDate}-to-${report.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="contentStack">
      <form className="reportToolbar" onSubmit={refresh}>
        <BusinessSelect businesses={[{ id: 0, name: "All businesses", active: true }, ...businesses]} value={businessId} onChange={setBusinessId} />
        <Input label="Start date" type="date" value={startDate} onChange={setStartDate} />
        <Input label="End date" type="date" value={endDate} onChange={setEndDate} />
        <button className="primaryButton"><ReceiptText size={16} /> Run</button>
        <button className="ghostButton" type="button" disabled={!report} onClick={exportCSV}><FileDown size={16} /> Export CSV</button>
      </form>
      {message && <div className="notice">{message}</div>}
      {report && (
        <>
          <div className="metricGrid compactMetrics">
            <Metric label="Gross sales" value={money(report.grossSales)} />
            <Metric label="Sales tax" value={money(report.salesTaxCollected)} />
            <Metric label="Purchases" value={money(report.totalPurchases)} />
          </div>
          <section className="workList">
            <div className="reportTable">
              <div className="reportTableHeader"><span>Taxable</span><span>Non-taxable</span><span>Net income</span><span>Business</span></div>
              <div className="reportTableRow"><span>{money(report.taxableSales)}</span><span>{money(report.nonTaxableSales)}</span><span>{money(report.netIncome)}</span><span>{report.businessName || "All businesses"}</span></div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

const emptyUser: UserInput = { username: "", displayName: "", password: "", role: "standard", accessLabel: "Sales Entry", active: true };
const emptyBusiness: BusinessInput = { name: "", active: true };

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [userForm, setUserForm] = useState<UserInput>(emptyUser);
  const [businessForm, setBusinessForm] = useState<BusinessInput>(emptyBusiness);
  const [message, setMessage] = useState("");

  async function load() {
    const [userRows, businessRows] = await Promise.all([api.listUsers(), api.listBusinesses()]);
    setUsers(userRows);
    setBusinesses(businessRows);
  }

  useEffect(() => { load().catch((err) => setMessage(String(err))); }, []);

  async function saveUser(event: React.FormEvent) {
    event.preventDefault();
    await api.saveUser(userForm);
    setUserForm(emptyUser);
    setMessage("User saved");
    await load();
  }

  async function saveBusiness(event: React.FormEvent) {
    event.preventDefault();
    await api.saveBusiness(businessForm);
    setBusinessForm(emptyBusiness);
    setMessage("Business saved");
    await load();
  }

  return (
    <section className="splitWorkArea">
      <div className="contentStack">
        <form className="formPanel" onSubmit={saveUser}>
          <PanelTitle icon={UserPlus} title={userForm.id ? "Edit user" : "Create user"} />
          <div className="fieldRow"><Input label="Username" value={userForm.username} onChange={(username) => setUserForm({ ...userForm, username })} required /><Input label="Display name" value={userForm.displayName} onChange={(displayName) => setUserForm({ ...userForm, displayName })} /></div>
          <div className="fieldRow"><Input label={userForm.id ? "New password" : "Password"} type="password" value={userForm.password} onChange={(password) => setUserForm({ ...userForm, password })} required={!userForm.id} /><label>Role<select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserInput["role"] })}><option value="standard">Standard</option><option value="admin">Admin</option></select></label></div>
          <Input label="Access label" value={userForm.accessLabel} onChange={(accessLabel) => setUserForm({ ...userForm, accessLabel })} />
          <label className="checkRow"><input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })} /> Active</label>
          <button className="primaryButton"><Plus size={16} /> Save user</button>
        </form>
        <form className="formPanel" onSubmit={saveBusiness}>
          <PanelTitle icon={Building2} title={businessForm.id ? "Edit business" : "Add business"} />
          <Input label="Business name" value={businessForm.name} onChange={(name) => setBusinessForm({ ...businessForm, name })} required />
          <label className="checkRow"><input type="checkbox" checked={businessForm.active} onChange={(e) => setBusinessForm({ ...businessForm, active: e.target.checked })} /> Active</label>
          <button className="primaryButton"><Plus size={16} /> Save business</button>
        </form>
        {message && <div className="notice">{message}</div>}
      </div>
      <div className="contentStack">
        <section className="workList"><div className="sectionTitle"><strong>Users</strong></div><div className="tableList">{users.map((row) => <button className="rowButton" key={row.id} onClick={() => setUserForm({ ...row, password: "" })}><span><strong>{row.displayName}</strong><small>{row.username} · {row.accessLabel}</small></span><span className={row.active ? "pill success" : "pill"}>{row.role}</span></button>)}</div></section>
        <section className="workList"><div className="sectionTitle"><strong>Businesses</strong></div><div className="tableList">{businesses.map((row) => <button className="rowButton" key={row.id} onClick={() => setBusinessForm(row)}><span><strong>{row.name}</strong></span><span className={row.active ? "pill success" : "pill"}>{row.active ? "Active" : "Inactive"}</span></button>)}</div></section>
      </div>
    </section>
  );
}

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<Customer>>(emptyCustomer);
  const [message, setMessage] = useState("");

  async function load() {
    setCustomers(await api.listCustomers(search));
  }

  useEffect(() => { load().catch((err) => setMessage(String(err))); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await api.saveCustomer(form);
    setForm(emptyCustomer);
    setMessage("Customer saved");
    await load();
  }

  async function remove(id: number) {
    await api.deleteCustomer(id);
    await load();
  }

  return (
    <section className="splitWorkArea">
      <div className="workList">
        <SearchBox value={search} onChange={setSearch} onSearch={load} />
        <div className="tableList">
          {customers.map((customer) => (
            <button key={customer.id} className="rowButton" onClick={() => setForm(customer)}>
              <span><strong>{customer.fullName}</strong><small>{customer.companyName || customer.phone || customer.email}</small></span>
              <span>{customer.taxExempt ? "Tax exempt" : "Taxable"}</span>
            </button>
          ))}
        </div>
      </div>
      <form className="formPanel" onSubmit={save}>
        <PanelTitle icon={Users} title={form.id ? "Edit customer" : "Add customer"} />
        <Input label="Full name" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} required />
        <Input label="Company" value={form.companyName} onChange={(companyName) => setForm({ ...form, companyName })} />
        <div className="fieldRow"><Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone: formatPhone(phone) })} /></div>
        <TextArea label="Billing address" value={form.billingAddress} onChange={(billingAddress) => setForm({ ...form, billingAddress })} />
        <TextArea label="Service address" value={form.serviceAddress} onChange={(serviceAddress) => setForm({ ...form, serviceAddress })} />
        <label className="checkRow"><input type="checkbox" checked={Boolean(form.taxExempt)} onChange={(e) => setForm({ ...form, taxExempt: e.target.checked })} /> Tax exempt</label>
        <TextArea label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
        {message && <div className="notice">{message}</div>}
        <div className="formActions"><button className="primaryButton"><Plus size={16} /> Save</button>{form.id ? <button className="dangerButton" type="button" onClick={() => remove(form.id!)}>Delete</button> : null}</div>
      </form>
    </section>
  );
}

function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<Vendor>>(emptyVendor);
  const [message, setMessage] = useState("");

  async function load() { setVendors(await api.listVendors(search)); }
  useEffect(() => { load().catch((err) => setMessage(String(err))); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await api.saveVendor(form);
    setForm(emptyVendor);
    setMessage("Vendor saved");
    await load();
  }

  return (
    <section className="splitWorkArea">
      <div className="workList">
        <SearchBox value={search} onChange={setSearch} onSearch={load} />
        <div className="tableList">{vendors.map((vendor) => <button key={vendor.id} className="rowButton" onClick={() => setForm(vendor)}><span><strong>{vendor.vendorName}</strong><small>{vendor.contactName || vendor.phone || vendor.email}</small></span><span>{vendor.website}</span></button>)}</div>
      </div>
      <form className="formPanel" onSubmit={save}>
        <PanelTitle icon={Building2} title={form.id ? "Edit vendor" : "Add vendor"} />
        <Input label="Vendor name" value={form.vendorName} onChange={(vendorName) => setForm({ ...form, vendorName })} required />
        <Input label="Contact" value={form.contactName} onChange={(contactName) => setForm({ ...form, contactName })} />
        <div className="fieldRow"><Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone: formatPhone(phone) })} /></div>
        <Input label="Website" value={form.website} onChange={(website) => setForm({ ...form, website })} />
        <TextArea label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} />
        <TextArea label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
        {message && <div className="notice">{message}</div>}
        <div className="formActions"><button className="primaryButton"><Plus size={16} /> Save</button>{form.id ? <button className="dangerButton" type="button" onClick={async () => { await api.deleteVendor(form.id!); setForm(emptyVendor); await load(); }}>Delete</button> : null}</div>
      </form>
    </section>
  );
}

function Invoices() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [items, setItems] = useState<InvoiceItemInput[]>([{ itemType: "labor", description: "Computer repair labor", quantity: 1, unitPrice: 0, taxable: false }]);
  const [invoice, setInvoice] = useState<Omit<InvoiceInput, "items">>({ businessId: 0, customerId: 0, invoiceDate: today(), dueDate: today(14), discountAmount: 0, notes: "", terms: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [customerRows, invoiceRows, businessRows] = await Promise.all([api.listCustomers(""), api.listInvoices(""), api.listBusinesses()]);
    setCustomers(customerRows);
    setInvoices(invoiceRows);
    setBusinesses(businessRows.filter((row) => row.active));
    const defaultBusinessId = businessRows.find((row) => row.active)?.id || 0;
    if (defaultBusinessId) {
      setInvoice((current) => current.businessId ? current : { ...current, businessId: defaultBusinessId });
    }
  }
  useEffect(() => { load().catch((err) => setMessage(String(err))); }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await api.createInvoice({ ...invoice, items });
    setMessage("Invoice created");
    await load();
  }

  async function exportPDF(id: number) {
    const path = await api.exportInvoicePDF(id);
    setMessage(`PDF exported: ${path}`);
  }

  async function emailInvoice(id: number) {
    await api.emailInvoice({ invoiceId: id, to: "", subject: "", message: "" });
    setMessage("Invoice email sent or queued by SMTP settings");
  }

  return (
    <section className="invoiceGrid">
      <form className="formPanel" onSubmit={create}>
        <PanelTitle icon={FileText} title="Create invoice" />
        <BusinessSelect businesses={businesses} value={invoice.businessId} onChange={(businessId) => setInvoice({ ...invoice, businessId })} />
        <label>Customer<select value={invoice.customerId} onChange={(e) => setInvoice({ ...invoice, customerId: Number(e.target.value) })} required><option value={0}>Select customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.fullName}</option>)}</select></label>
        <div className="fieldRow"><Input label="Invoice date" type="date" value={invoice.invoiceDate} onChange={(invoiceDate) => setInvoice({ ...invoice, invoiceDate })} /><Input label="Due date" type="date" value={invoice.dueDate} onChange={(dueDate) => setInvoice({ ...invoice, dueDate })} /></div>
        <div className="lineEditor">
          {items.map((item, index) => <InvoiceLine key={index} item={item} onChange={(next) => setItems(items.map((row, rowIndex) => rowIndex === index ? next : row))} onDelete={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))} />)}
        </div>
        <button className="ghostButton" type="button" onClick={() => setItems([...items, { itemType: "parts", description: "", quantity: 1, unitPrice: 0, taxable: true }])}><Plus size={16} /> Add line</button>
        <Input label="Discount" type="number" value={String(invoice.discountAmount)} onChange={(discountAmount) => setInvoice({ ...invoice, discountAmount: Number(discountAmount) })} />
        <TextArea label="Notes" value={invoice.notes} onChange={(notes) => setInvoice({ ...invoice, notes })} />
        <div className="invoiceTotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        {message && <div className="notice">{message}</div>}
        <button className="primaryButton"><Plus size={16} /> Create invoice</button>
      </form>
      <div className="workList">
        <div className="sectionTitle"><FileText size={18} /><strong>Recent invoices</strong></div>
        <div className="tableList">{invoices.map((row) => <div className="invoiceRow" key={row.id}><span><strong>{row.invoiceNumber}</strong><small>{row.customerName} · {row.businessName || "Business"} · {row.invoiceDate}</small></span><span>{money(row.totalAmount)}</span><div className="rowActions"><button className="iconButton" onClick={() => emailInvoice(row.id)} title="Email invoice"><Mail size={16} /></button><button className="iconButton" onClick={() => exportPDF(row.id)} title="Export PDF"><FileDown size={16} /></button></div></div>)}</div>
      </div>
    </section>
  );
}


function CustomerLookupPage() {
  const [rows, setRows] = useState<CustomerLookup[]>([]);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [message, setMessage] = useState("");

  async function load(nextKind = kind) {
    setRows(await api.listCustomerLookup(search, nextKind));
  }

  useEffect(() => { load().catch((err) => setMessage(String(err))); }, []);

  function switchKind(nextKind: string) {
    setKind(nextKind);
    load(nextKind).catch((err) => setMessage(String(err)));
  }

  const repeatCount = rows.filter((row) => row.kind === "repeat").length;
  const newCount = rows.filter((row) => row.kind === "new").length;

  return (
    <section className="contentStack">
      <div className="metricGrid compactMetrics">
        <Metric label="Visible customers" value={String(rows.length)} />
        <Metric label="Repeat customers" value={String(repeatCount)} />
        <Metric label="New customers" value={String(newCount)} />
      </div>
      <div className="workList">
        <div className="lookupToolbar">
          <SearchBox value={search} onChange={setSearch} onSearch={() => load()} />
          <div className="segmented">
            <button className={kind === "all" ? "active" : ""} onClick={() => switchKind("all")}>All</button>
            <button className={kind === "repeat" ? "active" : ""} onClick={() => switchKind("repeat")}><Repeat size={15} /> Repeat</button>
            <button className={kind === "new" ? "active" : ""} onClick={() => switchKind("new")}><UserPlus size={15} /> New</button>
          </div>
        </div>
        {message && <div className="notice">{message}</div>}
        <div className="tableList">
          {rows.map((row) => (
            <div className="lookupRow" key={row.customer.id}>
              <span>
                <strong>{row.customer.fullName}</strong>
                <small>{row.customer.companyName || row.customer.email || row.customer.phone}</small>
              </span>
              <span>{row.customer.email || "No email"}</span>
              <span>{row.invoiceCount} invoice{row.invoiceCount === 1 ? "" : "s"}</span>
              <span>{money(row.totalSales)}</span>
              <span className={row.kind === "repeat" ? "pill success" : "pill"}>{row.kind === "repeat" ? "Repeat" : "New"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [message, setMessage] = useState("");
  const [logoPreviewSrc, setLogoPreviewSrc] = useState("");

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setMessage(String(err)));
  }, []);

  useEffect(() => {
    const path = settings?.businessLogoPath?.trim() ?? "";
    if (!path) {
      setLogoPreviewSrc("");
      return;
    }
    let cancelled = false;
    api.getImageDataURL(path)
      .then((src) => {
        if (!cancelled) setLogoPreviewSrc(src);
      })
      .catch(() => {
        if (!cancelled) setLogoPreviewSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [settings?.businessLogoPath]);

  if (!settings) return <StateMessage message={message || "Loading settings"} />;
  const currentSettings = settings;

  async function chooseLogo() {
    const path = await api.selectBusinessLogo();
    setSettings({ ...currentSettings, businessLogoPath: path });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const saved = await api.saveSettings(currentSettings);
    setSettings(saved);
    setMessage("Settings saved");
  }

  return (
    <form className="settingsGrid" onSubmit={save}>
      <section className="formPanel">
        <PanelTitle icon={ImageIcon} title="Business" />
        <Input label="Business name" value={currentSettings.businessName} onChange={(businessName) => setSettings({ ...currentSettings, businessName })} />
        <TextArea label="Business address" value={currentSettings.businessAddress} onChange={(businessAddress) => setSettings({ ...currentSettings, businessAddress })} />
        <div className="fieldRow"><Input label="Business phone" value={currentSettings.businessPhone} onChange={(businessPhone) => setSettings({ ...currentSettings, businessPhone: formatPhone(businessPhone) })} /><Input label="Business email" value={currentSettings.businessEmail} onChange={(businessEmail) => setSettings({ ...currentSettings, businessEmail })} /></div>
        <div className="logoPicker">
          <div className="logoPreview">{logoPreviewSrc ? <img src={logoPreviewSrc} alt="Business logo" /> : <ImageIcon size={28} />}</div>
          <label>Business logo path<input value={currentSettings.businessLogoPath} onChange={(e) => setSettings({ ...currentSettings, businessLogoPath: e.target.value })} /></label>
          <button className="ghostButton" type="button" onClick={chooseLogo}>Choose</button>
        </div>
        <div className="fieldRow"><Input label="Invoice prefix" value={currentSettings.invoicePrefix} onChange={(invoicePrefix) => setSettings({ ...currentSettings, invoicePrefix })} /><Input label="Default tax rate" type="number" value={String(currentSettings.defaultTaxRate)} onChange={(defaultTaxRate) => setSettings({ ...currentSettings, defaultTaxRate: Number(defaultTaxRate) })} /></div>
        <TextArea label="Invoice terms" value={currentSettings.invoiceTerms} onChange={(invoiceTerms) => setSettings({ ...currentSettings, invoiceTerms })} />
      </section>
      <section className="formPanel">
        <PanelTitle icon={Mail} title="SMTP Email" />
        <Input label="SMTP host" value={currentSettings.smtpHost} onChange={(smtpHost) => setSettings({ ...currentSettings, smtpHost })} />
        <div className="fieldRow"><Input label="SMTP port" type="number" value={String(currentSettings.smtpPort)} onChange={(smtpPort) => setSettings({ ...currentSettings, smtpPort: Number(smtpPort) })} /><Input label="SMTP username" value={currentSettings.smtpUsername} onChange={(smtpUsername) => setSettings({ ...currentSettings, smtpUsername })} /></div>
        <Input label="SMTP password" type="password" value={currentSettings.smtpPassword} onChange={(smtpPassword) => setSettings({ ...currentSettings, smtpPassword })} />
        <div className="fieldRow"><Input label="From email" value={currentSettings.smtpFromEmail} onChange={(smtpFromEmail) => setSettings({ ...currentSettings, smtpFromEmail })} /><Input label="From name" value={currentSettings.smtpFromName} onChange={(smtpFromName) => setSettings({ ...currentSettings, smtpFromName })} /></div>
        <label className="checkRow"><input type="checkbox" checked={currentSettings.smtpUseTLS} onChange={(e) => setSettings({ ...currentSettings, smtpUseTLS: e.target.checked })} /> Use TLS</label>
        {message && <div className="notice">{message}</div>}
        <button className="primaryButton"><Settings size={16} /> Save settings</button>
      </section>
    </form>
  );
}

function IncomeExpenseReports() {
  const [period, setPeriod] = useState<IncomeExpensePeriod>("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<IncomeExpenseReport | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
    api.incomeExpenseReport(period, year)
      .then(setReport)
      .catch((err) => setMessage(err instanceof Error ? err.message : "Report failed"));
  }, [period, year]);

  if (message) return <StateMessage message={message} />;
  if (!report) return <StateMessage message="Loading report" />;

  return (
    <section className="contentStack">
      <div className="reportToolbar">
        <div className="segmented">
          <button type="button" className={period === "monthly" ? "active" : ""} onClick={() => setPeriod("monthly")}>Monthly</button>
          <button type="button" className={period === "yearly" ? "active" : ""} onClick={() => setPeriod("yearly")}>Yearly</button>
        </div>
        <Input label={period === "monthly" ? "Report year" : "Ending year"} type="number" value={String(year)} onChange={(value) => setYear(Number(value) || new Date().getFullYear())} />
      </div>
      <div className="metricGrid compactMetrics">
        <Metric label="Income" value={money(report.totalIncome)} />
        <Metric label="Expense" value={money(report.totalExpense)} />
        <Metric label="Net" value={money(report.netIncome)} />
      </div>
      <section className="reportPanel">
        <div className="sectionTitle"><ReceiptText size={18} /><strong>{period === "monthly" ? `${year} month by month` : `${year - 4}-${year} yearly`} income and expense</strong></div>
        <IncomeExpenseChart rows={report.rows} />
      </section>
      <section className="workList">
        <div className="sectionTitle"><ReceiptText size={18} /><strong>Report detail</strong></div>
        <div className="reportTable">
          <div className="reportTableHeader"><span>Period</span><span>Income</span><span>Expense</span><span>Net</span></div>
          {report.rows.map((row) => (
            <div className="reportTableRow" key={row.label}>
              <span>{row.label}</span>
              <span>{money(row.income)}</span>
              <span>{money(row.expense)}</span>
              <span className={row.net >= 0 ? "positiveAmount" : "negativeAmount"}>{money(row.net)}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function IncomeExpenseChart({ rows }: { rows: IncomeExpenseReport["rows"] }) {
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.income, row.expense]));
  return (
    <div className="barChart">
      {rows.map((row) => (
        <div className="barGroup" key={row.label}>
          <div className="bars">
            <span className="incomeBar" style={{ height: `${Math.max(4, (row.income / maxValue) * 100)}%` }} title={`Income ${money(row.income)}`} />
            <span className="expenseBar" style={{ height: `${Math.max(4, (row.expense / maxValue) * 100)}%` }} title={`Expense ${money(row.expense)}`} />
          </div>
          <strong>{row.label}</strong>
        </div>
      ))}
    </div>
  );
}
function InvoiceLine({ item, onChange, onDelete }: { item: InvoiceItemInput; onChange: (item: InvoiceItemInput) => void; onDelete: () => void }) {
  return <div className="invoiceLine"><select value={item.itemType} onChange={(e) => onChange({ ...item, itemType: e.target.value as InvoiceItemInput["itemType"] })}><option value="labor">Labor</option><option value="parts">Parts</option><option value="other">Other</option></select><input value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} placeholder="Description" /><input type="number" value={item.quantity} onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })} /><input type="number" value={item.unitPrice} onChange={(e) => onChange({ ...item, unitPrice: Number(e.target.value) })} /><label><input type="checkbox" checked={item.taxable} onChange={(e) => onChange({ ...item, taxable: e.target.checked })} /> Tax</label><button className="iconButton" type="button" onClick={onDelete} title="Remove line">×</button></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function ListPanel({ title, rows }: { title: string; rows: string[] }) { return <div className="listPanel"><div className="sectionTitle"><strong>{title}</strong></div>{rows.length ? rows.map((row) => <div className="simpleRow" key={row}>{row}</div>) : <StateMessage message="No records yet" />}</div>; }
function StateMessage({ message }: { message: string }) { return <div className="stateMessage">{message}</div>; }
function PanelTitle({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number }>; title: string }) { return <div className="sectionTitle"><Icon size={18} /><strong>{title}</strong></div>; }
function Placeholder({ title, items }: { title: string; items: string[] }) { return <section className="placeholder"><ShieldCheck size={28} /><h2>{title}</h2>{items.map((item) => <div className="simpleRow" key={item}>{item}</div>)}</section>; }
function SearchBox({ value, onChange, onSearch }: { value: string; onChange: (value: string) => void; onSearch: () => void }) { return <div className="searchBox"><Search size={16} /><input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }} placeholder="Search" /><button className="ghostButton" onClick={onSearch}>Search</button></div>; }
function Input({ label, value, onChange, type = "text", required = false }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label>{label}<input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} /></label>; }
function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label>{label}<textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function BusinessSelect({ businesses, value, onChange }: { businesses: Business[]; value: number; onChange: (value: number) => void }) {
  return <label>Business<select value={value} onChange={(e) => onChange(Number(e.target.value))}>{businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}</select></label>;
}
function PaymentMethodSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const methods = ["Cash", "Card", "CashApp", "Venmo", "Zelle", "Check", "ApplePay", "GooglePay", "PayPal"];
  const aliases: Record<string, string> = { cash: "Cash", card: "Card", check: "Check", zelle: "Zelle", other: "custom" };
  const normalizedValue = aliases[value] || value || "Cash";
  const customMode = normalizedValue === "custom" || !methods.includes(normalizedValue);
  return (
    <label>Payment method
      <select value={customMode ? "custom" : normalizedValue} onChange={(e) => onChange(e.target.value)}>
        {methods.map((method) => <option value={method} key={method}>{method}</option>)}
        <option value="custom">Add new...</option>
      </select>
      {customMode ? <input className="inlineField" value={normalizedValue === "custom" ? "" : normalizedValue} onChange={(e) => onChange(e.target.value)} placeholder="New payment method" /> : null}
    </label>
  );
}
function CategorySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>Category<select value={value} onChange={(e) => onChange(e.target.value)}><option>Computer parts</option><option>Tools</option><option>Software</option><option>Shipping</option><option>Office supplies</option><option>Repair supplies</option><option>Advertising</option><option>Bank fees</option><option>Fuel / travel</option><option>Uncategorized</option></select></label>;
}

export default App;




