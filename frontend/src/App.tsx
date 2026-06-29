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
  Repeat,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";
import { api, AppSettings, AuthSession, Customer, CustomerLookup, DashboardSummary, InvoiceInput, InvoiceItemInput, InvoiceListItem, Vendor } from "./api";

type Page = "dashboard" | "customers" | "customerLookup" | "invoices" | "payments" | "purchases" | "vendors" | "import" | "tax" | "reports" | "backup" | "settings";

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "customers", label: "Customers", icon: Users },
  { id: "customerLookup", label: "Customer Lookup", icon: UserPlus },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "purchases", label: "Purchases", icon: PackageOpen },
  { id: "vendors", label: "Vendors", icon: Building2 },
  { id: "import", label: "Credit Card Import", icon: CreditCard },
  { id: "tax", label: "Tax Reports", icon: BadgeDollarSign },
  { id: "reports", label: "Reports", icon: ReceiptText },
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
        {page === "customers" && <Customers />}
        {page === "customerLookup" && <CustomerLookupPage />}
        {page === "vendors" && <Vendors />}
        {page === "invoices" && <Invoices />}
        {page === "payments" && <Placeholder title="Payments" items={["Record payment date, amount, method, and notes", "Automatically update unpaid, partial, and paid status", "Keep the first payment workflow simple"]} />}
        {page === "purchases" && <Placeholder title="Purchases" items={["Enter vendor, date, description, category, amount, tax paid, and receipt", "Connect purchases to invoices when useful", "CSV exports arrive in Phase 2"]} />}
        {page === "import" && <Placeholder title="Credit Card Import" items={["Upload CSV and preview rows before saving", "Map date, description, amount, and vendor columns", "Detect duplicates and suggest categories"]} />}
        {page === "tax" && <Placeholder title="Tax Reports" items={["Default tax rate stays editable in settings", "Report gross, taxable, non-taxable sales, tax collected, and purchases", "CSV/PDF export belongs in Phase 4"]} />}
        {page === "reports" && <Placeholder title="Reports" items={["Sales, unpaid invoices, paid invoices, customer sales, purchases, tax, and profit estimate", "Date filters first, fancy charts later"]} />}
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
        <ListPanel title="Recent invoices" rows={data.recentInvoices.map((invoice) => `${invoice.invoiceNumber} · ${invoice.customerName} · ${money(invoice.totalAmount)}`)} />
        <ListPanel title="Recent customers" rows={data.recentCustomers.map((customer) => `${customer.fullName}${customer.companyName ? ` · ${customer.companyName}` : ""}`)} />
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
        <div className="fieldRow"><Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /></div>
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
        <div className="fieldRow"><Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /></div>
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
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [items, setItems] = useState<InvoiceItemInput[]>([{ itemType: "labor", description: "Computer repair labor", quantity: 1, unitPrice: 0, taxable: false }]);
  const [invoice, setInvoice] = useState<Omit<InvoiceInput, "items">>({ customerId: 0, invoiceDate: today(), dueDate: today(14), discountAmount: 0, notes: "", terms: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [customerRows, invoiceRows] = await Promise.all([api.listCustomers(""), api.listInvoices("")]);
    setCustomers(customerRows);
    setInvoices(invoiceRows);
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
        <div className="tableList">{invoices.map((row) => <div className="invoiceRow" key={row.id}><span><strong>{row.invoiceNumber}</strong><small>{row.customerName} · {row.invoiceDate}</small></span><span>{money(row.totalAmount)}</span><div className="rowActions"><button className="iconButton" onClick={() => emailInvoice(row.id)} title="Email invoice"><Mail size={16} /></button><button className="iconButton" onClick={() => exportPDF(row.id)} title="Export PDF"><FileDown size={16} /></button></div></div>)}</div>
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

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setMessage(String(err)));
  }, []);

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
        <div className="fieldRow"><Input label="Business phone" value={currentSettings.businessPhone} onChange={(businessPhone) => setSettings({ ...currentSettings, businessPhone })} /><Input label="Business email" value={currentSettings.businessEmail} onChange={(businessEmail) => setSettings({ ...currentSettings, businessEmail })} /></div>
        <div className="logoPicker">
          <div className="logoPreview">{currentSettings.businessLogoPath ? <img src={currentSettings.businessLogoPath} alt="Business logo" /> : <ImageIcon size={28} />}</div>
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

export default App;




