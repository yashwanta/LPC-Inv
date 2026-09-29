import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  Building2,
  CreditCard,
  DatabaseBackup,
  FileDown,
  FileText,
  GitMerge,
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
import { api, errorText, MonthlySummary, SESSION_EXPIRED_EVENT, AppSettings, AuthSession, Business, BusinessInput, Customer, CustomerLookup, DashboardSummary, IncomeExpensePeriod, IncomeExpenseReport, InvoiceDetail, InvoiceInput, InvoiceItemInput, InvoiceListItem, Purchase, PurchaseInput, TaxReportSummary, User, UserInput, Vendor, WalkInServiceInput } from "./api";

type Page = "dashboard" | "monthly" | "manual" | "customers" | "customerLookup" | "invoices" | "payments" | "purchases" | "vendors" | "import" | "tax" | "reports" | "users" | "backup" | "settings";

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "monthly", label: "Monthly Summary", icon: CalendarDays },
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

type ConfirmRequest = { message: string; confirmLabel: string; resolve: (ok: boolean) => void };
let showConfirm: ((request: ConfirmRequest) => void) | null = null;

/** In-app replacement for window.confirm, which is unreliable inside the Wails WebView. */
function confirmAction(message: string, confirmLabel = "Delete"): Promise<boolean> {
  return new Promise((resolve) => {
    if (!showConfirm) { resolve(window.confirm(message)); return; }
    showConfirm({ message, confirmLabel, resolve });
  });
}

function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { showConfirm = setRequest; return () => { showConfirm = null; }; }, []);
  useEffect(() => { if (request && !dialog.current?.open) dialog.current?.showModal(); }, [request]);
  function finish(ok: boolean) {
    request?.resolve(ok);
    dialog.current?.close();
    setRequest(null);
  }
  if (!request) return null;
  return <dialog ref={dialog} className="customerDialog confirmDialog" onCancel={(event) => { event.preventDefault(); finish(false); }}>
    <div className="formPanel">
      <PanelTitle icon={AlertTriangle} title="Please confirm" />
      <p className="confirmMessage">{request.message}</p>
      <div className="formActions">
        <button className="dangerButton" type="button" onClick={() => finish(true)}>{request.confirmLabel}</button>
        <button className="ghostButton" type="button" autoFocus onClick={() => finish(false)}>Cancel</button>
      </div>
    </div>
  </dialog>;
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [dark, setDark] = useState(false);
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [signedOutNotice, setSignedOutNotice] = useState("");

  useEffect(() => {
    function expired() {
      setSession(null);
      setSignedOutNotice("Your session expired after 30 minutes of inactivity. Sign in again to continue.");
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, []);

  function openEntry(id: number) {
    setEditServiceId(id);
    setPage("manual");
  }

  if (!session) {
    return <>
      {signedOutNotice && <div className="error sessionBanner" role="alert">{signedOutNotice}</div>}
      <LoginScreen onLogin={(next) => { setSignedOutNotice(""); setSession(next); }} dark={dark} setDark={setDark} />
    </>;
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
            <button className="ghostButton" onClick={() => { api.logout().finally(() => setSession(null)); }}><LogOut size={16} /> Sign out</button>
          </div>
        </header>
        {page === "dashboard" && <Dashboard />}
        {page === "monthly" && <MonthlySummaryPage onEdit={openEntry} />}
        {page === "manual" && <ManualEntry editId={editServiceId} onEditLoaded={() => setEditServiceId(null)} />}
        {page === "customers" && <Customers />}
        {page === "customerLookup" && <CustomerLookupPage />}
        {page === "vendors" && <Vendors />}
        {page === "invoices" && <Invoices onEdit={openEntry} />}
        {page === "payments" && <Placeholder title="Payments" items={["Record payment date, amount, method, and notes", "Automatically update unpaid, partial, and paid status", "Keep the first payment workflow simple"]} />}
        {page === "purchases" && <Placeholder title="Purchases" items={["Enter vendor, date, description, category, amount, tax paid, and receipt", "Connect purchases to invoices when useful", "CSV exports arrive in Phase 2"]} />}
        {page === "import" && <CreditCardImport />}
        {page === "tax" && <TaxReports />}
        {page === "reports" && <IncomeExpenseReports />}
        {page === "users" && <UserManagement />}
        {page === "backup" && <Placeholder title="Backup & Restore" items={["Use pg_dump and pg_restore for full PostgreSQL backups", "Export important tables to CSV", "Add daily, weekly, and monthly auto backup after core records are stable"]} />}
        {page === "settings" && <SettingsPage />}
      </main>
      <ConfirmHost />
    </div>
  );
}

function LoginScreen({ onLogin, dark, setDark }: { onLogin: (session: AuthSession) => void; dark: boolean; setDark: (value: boolean) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<"login" | "choose" | "question" | "email">("login");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  async function beginRecovery() {
    if (!username.trim()) {
      setError("Enter your username first");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const options = await api.passwordRecoveryOptions(username);
      setSecurityQuestion(options.securityQuestion || "");
      setEmailAvailable(Boolean(options.emailAvailable));
      setMaskedEmail(options.maskedEmail || "");
      if (!options.securityQuestion && !options.emailAvailable) {
        setError("No recovery method is configured for this account. Contact an administrator.");
        return;
      }
      setRecoveryMode("choose");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password recovery is unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function sendCode() {
    setLoading(true);
    setError("");
    try {
      await api.requestPasswordResetCode(username);
      setRecoveryMode("email");
      setMessage(`A 6-digit code was sent to ${maskedEmail}. It expires in 10 minutes.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      if (recoveryMode === "question") {
        await api.resetPasswordWithSecurityAnswer(username, answer, newPassword);
      } else {
        await api.resetPasswordWithCode(username, code, newPassword);
      }
      setRecoveryMode("login");
      setPassword("");
      setAnswer("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password reset. Sign in with your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  function cancelRecovery() {
    setRecoveryMode("login");
    setError("");
    setMessage("");
    setAnswer("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className={dark ? "loginPage dark" : "loginPage"}>
      <form className="loginPanel" onSubmit={recoveryMode === "login" ? submit : resetPassword}>
        <div className="loginHeader">
          <div className="brandMark">ST</div>
          <button className="iconButton" type="button" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
        <h1>{recoveryMode === "login" ? "SimpleTech Books" : "Reset password"}</h1>
        {recoveryMode === "login" && <>
          <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        </>}
        {recoveryMode === "choose" && <div className="recoveryChoices">
          <p>Choose how to verify the account <strong>{username}</strong>.</p>
          {securityQuestion && <button className="ghostButton" type="button" onClick={() => setRecoveryMode("question")}>Answer security question</button>}
          {emailAvailable && <button className="ghostButton" type="button" onClick={sendCode} disabled={loading}>Email a one-time code to {maskedEmail}</button>}
        </div>}
        {recoveryMode === "question" && <>
          <div className="recoveryPrompt">{securityQuestion}</div>
          <label>Security answer<input type="password" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" required /></label>
          <NewPasswordFields password={newPassword} confirm={confirmPassword} onPassword={setNewPassword} onConfirm={setConfirmPassword} />
        </>}
        {recoveryMode === "email" && <>
          <label>6-digit code<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required /></label>
          <NewPasswordFields password={newPassword} confirm={confirmPassword} onPassword={setNewPassword} onConfirm={setConfirmPassword} />
        </>}
        {error && <div className="error">{error}</div>}
        {message && <div className="notice">{message}</div>}
        {recoveryMode === "login" ? <>
          <button className="primaryButton" disabled={loading}>{loading ? "Signing in" : "Sign in"}</button>
          <button className="linkButton" type="button" onClick={beginRecovery} disabled={loading}>Forgot password?</button>
        </> : <>
          {(recoveryMode === "question" || recoveryMode === "email") && <button className="primaryButton" disabled={loading}>{loading ? "Resetting password" : "Reset password"}</button>}
          <button className="linkButton" type="button" onClick={cancelRecovery}>Back to sign in</button>
        </>}
      </form>
    </div>
  );
}

function NewPasswordFields({ password, confirm, onPassword, onConfirm }: { password: string; confirm: string; onPassword: (value: string) => void; onConfirm: (value: string) => void }) {
  return <>
    <label>New password<input type="password" value={password} onChange={(e) => onPassword(e.target.value)} autoComplete="new-password" minLength={10} required /></label>
    <label>Confirm new password<input type="password" value={confirm} onChange={(e) => onConfirm(e.target.value)} autoComplete="new-password" minLength={10} required /></label>
  </>;
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
  const items = invoice.items ?? [];
  const labor = items.find((item) => item.itemType === "labor");
  const parts = items.find((item) => item.itemType === "parts");
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

/** The walk-in form can only represent one service-charge line and one parts line. */
function walkInEditBlocker(invoice: InvoiceDetail): string {
  const items = invoice.items ?? [];
  const count = (type: string) => items.filter((item) => item.itemType === type).length;
  if (count("labor") > 1 || count("parts") > 1 || count("other") > 0 || invoice.discountAmount > 0) {
    return `${invoice.invoiceNumber} has ${items.length} line items${invoice.discountAmount > 0 ? " and a discount" : ""}, so it can't be edited in the walk-in form without losing lines. Delete it and create it again if it needs changes.`;
  }
  return "";
}

function scrollMainToTop() {
  document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ManualEntry({ editId = null, onEditLoaded }: { editId?: number | null; onEditLoaded?: () => void }) {
  const [service, setService] = useState<WalkInServiceInput>(emptyServiceEntry);
  const [purchase, setPurchase] = useState<PurchaseInput>(emptyPurchaseEntry);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceListItem[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [invoiceRows, purchaseRows, businessRows] = await Promise.all([api.listInvoices(""), api.listPurchases(""), api.listBusinesses()]);
    setRecentInvoices(invoiceRows.slice(0, 10));
    setRecentPurchases(purchaseRows.slice(0, 10));
    setBusinesses(businessRows.filter((row) => row.active));
    const defaultBusinessId = businessRows.find((row) => row.active)?.id || 0;
    if (defaultBusinessId) {
      setService((current) => current.businessId ? current : { ...current, businessId: defaultBusinessId });
      setPurchase((current) => current.businessId ? current : { ...current, businessId: defaultBusinessId });
    }
  }

  useEffect(() => { load().catch((err) => setError(errorText(err))); }, []);

  useEffect(() => {
    if (!editId) return;
    editService(editId).finally(() => onEditLoaded?.());
  }, [editId]);

  const serviceTotal = service.partsCost + service.serviceCharge;
  const [taxSettings, setTaxSettings] = useState<Pick<AppSettings, "defaultTaxRate" | "partsTaxable" | "laborTaxable" | "laborTaxableWithParts"> | null>(null);
  useEffect(() => { api.getSettings().then(setTaxSettings).catch(() => setTaxSettings(null)); }, []);
  const includedTax = useMemo(() => {
    if (!taxSettings) return null;
    const rate = taxSettings.defaultTaxRate > 1 ? taxSettings.defaultTaxRate / 100 : taxSettings.defaultTaxRate;
    const partsTaxed = taxSettings.partsTaxable && service.partsCost > 0;
    const laborTaxed = taxSettings.laborTaxable || (taxSettings.laborTaxableWithParts && partsTaxed);
    const taxable = (partsTaxed ? service.partsCost : 0) + (laborTaxed ? service.serviceCharge : 0);
    return { rate, tax: Math.round(taxable * rate / (1 + rate) * 100) / 100 };
  }, [taxSettings, service.partsCost, service.serviceCharge]);

  /** Runs an action, shows success or the real error, and never fails silently. */
  async function run(action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    const updating = Boolean(service.id);
    let taxNote = "";
    await run(async () => {
      const saved = await api.recordWalkInService(service) as InvoiceDetail | undefined;
      if (saved && typeof saved.taxAmount === "number") taxNote = saved.taxAmount > 0 ? ` · includes ${money(saved.taxAmount)} KY sales tax` : " · no sales tax (labor only)";
      setService({ ...emptyServiceEntry, businessId: service.businessId, serviceDate: today(), paymentDate: today() });
      await load();
    }, updating ? "Walk-in service income updated" : "Walk-in service income saved");
    if (taxNote) setMessage((current) => current ? current + taxNote : current);
  }

  async function savePurchase(event: React.FormEvent) {
    event.preventDefault();
    const updating = Boolean(purchase.id);
    await run(async () => {
      await api.savePurchase(purchase);
      setPurchase({ ...emptyPurchaseEntry, businessId: purchase.businessId, purchaseDate: today() });
      await load();
    }, updating ? "Expense updated" : "Expense saved");
  }

  async function editService(id: number) {
    setError("");
    setMessage("");
    try {
      const invoice = await api.getInvoice(id);
      const blocker = walkInEditBlocker(invoice);
      if (blocker) { setError(blocker); return; }
      setService(invoiceToServiceEntry(invoice));
      setMessage(`Editing ${invoice.invoiceNumber} · ${invoice.customer.fullName} · ${invoice.invoiceDate}`);
      scrollMainToTop();
    } catch (err) {
      setError(errorText(err));
    }
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
    setError("");
    setMessage("Editing expense");
    scrollMainToTop();
  }

  async function deleteService(row: InvoiceListItem) {
    if (!await confirmAction(`Delete ${row.invoiceNumber} for ${row.customerName} (${money(row.totalAmount)} on ${row.invoiceDate})? This also removes its payments.`)) return;
    await run(async () => {
      await api.deleteInvoice(row.id);
      if (service.id === row.id) {
        setService({ ...emptyServiceEntry, businessId: service.businessId, serviceDate: today(), paymentDate: today() });
      }
      await load();
    }, "Service income deleted");
  }

  async function deletePurchase(row: Purchase) {
    if (!await confirmAction(`Delete the ${money(row.amount)} expense from ${row.vendorName || "no vendor"} on ${row.purchaseDate}?`)) return;
    await run(async () => {
      await api.deletePurchase(row.id);
      if (purchase.id === row.id) {
        setPurchase({ ...emptyPurchaseEntry, businessId: purchase.businessId, purchaseDate: today() });
      }
      await load();
    }, "Expense deleted");
  }

  return (
    <section className="manualEntryGrid">
      {(error || message) && <div className="fullRow">
        {error && <div className="error" role="alert">{error}</div>}
        {message && <div className="notice" role="status">{message}</div>}
      </div>}
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
        <div className="invoiceTotal"><span>Total paid by customer{includedTax ? (includedTax.tax > 0 ? ` · includes ${money(includedTax.tax)} sales tax` : " · no sales tax (labor only)") : ""}</span><strong>{money(serviceTotal)}</strong></div>
        <div className="formActions">
          <button className="primaryButton" disabled={busy}><Plus size={16} /> {service.id ? "Update service income" : "Save service income"}</button>
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
            <button className="primaryButton" disabled={busy}><Plus size={16} /> {purchase.id ? "Update expense" : "Save expense"}</button>
            {purchase.id ? <button className="ghostButton" type="button" onClick={() => setPurchase({ ...emptyPurchaseEntry, businessId: purchase.businessId, purchaseDate: today() })}>New expense</button> : null}
          </div>
        </form>
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
                    <button className="iconButton dangerIconButton" type="button" disabled={busy} onClick={() => deleteService(invoice)} title="Delete service income"><Trash2 size={16} /></button>
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
                    <button className="iconButton dangerIconButton" type="button" disabled={busy} onClick={() => deletePurchase(row)} title="Delete expense"><Trash2 size={16} /></button>
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
    setMessage("");
    try {
      setReport(await api.taxReport(startDate, endDate, nextBusinessId));
    } catch (err) { setMessage(errorText(err)); }
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
        <BusinessSelect businesses={[{ id: 0, name: "All businesses", active: true }, ...businesses]} value={businessId} onChange={(next) => { setBusinessId(next); load(next); }} />
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

const emptyUser: UserInput = { username: "", displayName: "", password: "", role: "standard", accessLabel: "Sales Entry", active: true, recoveryEmail: "", securityQuestion: "", securityAnswer: "" };
const emptyBusiness: BusinessInput = { name: "", active: true, paymentInstructions: "", checkPayableTo: "" };

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
          <Input label="Recovery email" type="email" value={userForm.recoveryEmail} onChange={(recoveryEmail) => setUserForm({ ...userForm, recoveryEmail })} />
          <Input label="Security question" value={userForm.securityQuestion} onChange={(securityQuestion) => setUserForm({ ...userForm, securityQuestion })} placeholder="Example: What was the name of your first school?" />
          <Input label={userForm.id ? "New security answer (leave blank to keep current)" : "Security answer"} type="password" value={userForm.securityAnswer} onChange={(securityAnswer) => setUserForm({ ...userForm, securityAnswer })} />
          <div className="stateMessage">Users can reset passwords from the sign-in screen after a recovery email or security question is configured.</div>
          <label className="checkRow"><input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })} /> Active</label>
          <button className="primaryButton"><Plus size={16} /> Save user</button>
        </form>
        <form className="formPanel" onSubmit={saveBusiness}>
          <PanelTitle icon={Building2} title={businessForm.id ? "Edit business" : "Add business"} />
          <Input label="Business name" value={businessForm.name} onChange={(name) => setBusinessForm({ ...businessForm, name })} required />
          <TextArea label="Invoice payment instructions" value={businessForm.paymentInstructions || ""} onChange={(paymentInstructions) => setBusinessForm({ ...businessForm, paymentInstructions })} />
          <Input label="Make checks payable to" value={businessForm.checkPayableTo || ""} onChange={(checkPayableTo) => setBusinessForm({ ...businessForm, checkPayableTo })} />
          <label className="checkRow"><input type="checkbox" checked={businessForm.active} onChange={(e) => setBusinessForm({ ...businessForm, active: e.target.checked })} /> Active</label>
          <button className="primaryButton"><Plus size={16} /> Save business</button>
        </form>
        {message && <div className="notice">{message}</div>}
      </div>
      <div className="contentStack">
        <section className="workList"><div className="sectionTitle"><strong>Users</strong></div><div className="tableList">{users.map((row) => <button className="rowButton" key={row.id} onClick={() => setUserForm({ ...row, password: "", securityAnswer: "" })}><span><strong>{row.displayName}</strong><small>{row.username} · {row.accessLabel}{row.recoveryEmail || row.securityQuestion ? " · Recovery configured" : ""}</small></span><span className={row.active ? "pill success" : "pill"}>{row.role}</span></button>)}</div></section>
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
  const [error, setError] = useState("");
  const [mergeTarget, setMergeTarget] = useState(0);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  async function load() {
    const [rows, everyone] = await Promise.all([api.listCustomers(search), api.listCustomers("")]);
    setCustomers(rows);
    setAllCustomers(everyone);
  }

  useEffect(() => { load().catch((err) => setError(errorText(err))); }, []);

  const nameKey = (value?: string) => (value || "").trim().toLowerCase();
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    allCustomers.forEach((row) => counts.set(nameKey(row.fullName), (counts.get(nameKey(row.fullName)) || 0) + 1));
    return counts;
  }, [allCustomers]);
  const mergeOptions = allCustomers
    .filter((row) => row.id !== form.id)
    .sort((a, b) => Number(nameKey(b.fullName) === nameKey(form.fullName)) - Number(nameKey(a.fullName) === nameKey(form.fullName)) || a.fullName.localeCompare(b.fullName));

  function select(customer: Customer) {
    setForm(customer);
    setError("");
    setMessage("");
    const sameName = allCustomers.find((row) => row.id !== customer.id && nameKey(row.fullName) === nameKey(customer.fullName));
    setMergeTarget(sameName?.id || 0);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.saveCustomer(form);
      setForm(emptyCustomer);
      setMessage("Customer saved");
      await load();
    } catch (err) { setError(errorText(err)); }
  }

  async function remove(id: number) {
    if (!await confirmAction(`Delete customer ${form.fullName}?`)) return;
    setError("");
    try {
      await api.deleteCustomer(id);
      setForm(emptyCustomer);
      setMessage("Customer deleted");
      await load();
    } catch (err) { setError(errorText(err)); }
  }

  async function merge() {
    const target = allCustomers.find((row) => row.id === mergeTarget);
    if (!form.id || !target) return;
    if (!await confirmAction(`Move all of ${form.fullName}'s invoices to ${target.fullName}${target.phone ? ` (${target.phone})` : ""} and delete this duplicate customer record? Blank contact details on ${target.fullName} will be filled in from this record.`, "Merge")) return;
    setError("");
    try {
      const kept = await api.mergeCustomers(form.id, target.id);
      setForm(kept);
      setMergeTarget(0);
      setMessage(`Merged into ${kept.fullName}`);
      await load();
    } catch (err) { setError(errorText(err)); }
  }

  return (
    <section className="splitWorkArea">
      <div className="workList">
        <SearchBox value={search} onChange={setSearch} onSearch={load} />
        <div className="tableList">
          {customers.map((customer) => (
            <button key={customer.id} className={customer.id === form.id ? "rowButton selectedRow" : "rowButton"} onClick={() => select(customer)}>
              <span><strong>{customer.fullName}</strong><small>{customer.companyName || customer.phone || customer.email || "No contact details"}</small></span>
              <span className="rowActions">{(duplicateNames.get(nameKey(customer.fullName)) || 0) > 1 && <span className="pill warning">Same name ×{duplicateNames.get(nameKey(customer.fullName))}</span>}<span>{customer.taxExempt ? "Tax exempt" : "Taxable"}</span></span>
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
        {error && <div className="error" role="alert">{error}</div>}
        {message && <div className="notice">{message}</div>}
        <div className="formActions"><button className="primaryButton"><Plus size={16} /> Save</button>{form.id ? <><button className="dangerButton" type="button" onClick={() => remove(form.id!)}>Delete</button><button className="ghostButton" type="button" onClick={() => { setForm(emptyCustomer); setError(""); setMessage(""); }}>New customer</button></> : null}</div>
        {form.id ? <div className="mergePanel">
          <strong><GitMerge size={16} /> Duplicate customer? Merge it</strong>
          <small>Moves this customer's invoices to the one you pick, then removes this record.</small>
          <div className="mergeRow">
            <select aria-label="Merge into customer" value={mergeTarget || ""} onChange={(e) => setMergeTarget(Number(e.target.value))}>
              <option value="">Merge into…</option>
              {mergeOptions.map((row) => <option key={row.id} value={row.id}>{row.fullName}{row.phone ? ` · ${row.phone}` : ""}{row.email ? ` · ${row.email}` : ""} (#{row.id})</option>)}
            </select>
            <button className="ghostButton" type="button" disabled={!mergeTarget} onClick={merge}><GitMerge size={16} /> Merge</button>
          </div>
        </div> : null}
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
  useEffect(() => { load().catch((err) => setMessage(errorText(err))); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.saveVendor(form);
      setForm(emptyVendor);
      setMessage("Vendor saved");
      await load();
    } catch (err) { setMessage(errorText(err)); }
  }

  async function remove() {
    if (!form.id || !await confirmAction(`Delete vendor ${form.vendorName}?`)) return;
    try {
      await api.deleteVendor(form.id);
      setForm(emptyVendor);
      setMessage("Vendor deleted");
      await load();
    } catch (err) { setMessage(errorText(err)); }
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
        <div className="formActions"><button className="primaryButton"><Plus size={16} /> Save</button>{form.id ? <button className="dangerButton" type="button" onClick={remove}>Delete</button> : null}</div>
      </form>
    </section>
  );
}

function Invoices({ onEdit }: { onEdit: (id: number) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [items, setItems] = useState<InvoiceItemInput[]>([{ itemType: "labor", description: "Computer Repair / Onsite IT Service", quantity: 1, unitPrice: 0, taxable: false }]);
  const [invoice, setInvoice] = useState<Omit<InvoiceInput, "items">>({ businessId: 0, customerId: 0, invoiceDate: today(), dueDate: today(14), discountAmount: 0, notes: "", terms: "" });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [preview, setPreview] = useState<InvoiceDetail | null>(null);
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
    try {
    setPreview(await api.createInvoice({ ...invoice, items }));
    setMessage("Invoice created");
    await load();
    } catch (err) { setMessage(errorText(err)); }
  }

  async function removeInvoice(row: InvoiceListItem) {
    if (!await confirmAction(`Delete ${row.invoiceNumber} for ${row.customerName} (${money(row.totalAmount)} on ${row.invoiceDate})? This also removes its payments.`)) return;
    try {
      await api.deleteInvoice(row.id);
      if (preview?.id === row.id) setPreview(null);
      setMessage(`${row.invoiceNumber} deleted`);
      await load();
    } catch (err) { setMessage(errorText(err)); }
  }

  async function exportPDF(id: number) {
    try {
      const path = await api.exportInvoicePDF(id);
      setMessage(`PDF exported: ${path}`);
    } catch (err) { setMessage(errorText(err)); }
  }

  async function emailInvoice(id: number) {
    try {
      await api.emailInvoice({ invoiceId: id, to: "", subject: "", message: "" });
      setMessage("Invoice email sent");
    } catch (err) { setMessage(errorText(err)); }
  }

  return (
    <section className="invoiceGrid">
      <form className="formPanel" onSubmit={create}>
        <PanelTitle icon={FileText} title="Create invoice" />
        <BusinessSelect businesses={businesses} value={invoice.businessId} onChange={(businessId) => setInvoice({ ...invoice, businessId })} />
        <label>Customer<select value={invoice.customerId || ""} onChange={(e) => e.target.value === "new" ? setAddingCustomer(true) : setInvoice({ ...invoice, customerId: Number(e.target.value) })} required><option value="new">+ Add New Customer</option><option value="" disabled>Select customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.companyName ? `${customer.companyName} · ${customer.fullName}` : customer.fullName}</option>)}</select></label>
        <div className="fieldRow"><Input label="Invoice date" type="date" value={invoice.invoiceDate} onChange={(invoiceDate) => setInvoice({ ...invoice, invoiceDate })} /><Input label="Due date" type="date" value={invoice.dueDate} onChange={(dueDate) => setInvoice({ ...invoice, dueDate })} /></div>
        <div className="lineEditor">
          <div className="invoiceLine lineHeadings" aria-hidden="true"><span>Type</span><span>Description</span><span>Qty</span><span>Rate</span><span>Tax</span><span /></div>
          {items.map((item, index) => <InvoiceLine key={index} item={item} onChange={(next) => setItems(items.map((row, rowIndex) => rowIndex === index ? next : row))} onDelete={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))} />)}
        </div>
        <button className="ghostButton" type="button" onClick={() => setItems([...items, { itemType: "parts", description: "", quantity: 1, unitPrice: 0, taxable: true }])}><Plus size={16} /> Add line</button>
        <Input label="Discount" type="number" value={String(invoice.discountAmount)} onChange={(discountAmount) => setInvoice({ ...invoice, discountAmount: Number(discountAmount) })} />
        <TextArea label="Notes" value={invoice.notes} onChange={(notes) => setInvoice({ ...invoice, notes })} />
        <div className="invoiceTotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        <PaymentInformation value={businesses.find((row) => row.id === invoice.businessId)} />
        {message && <div className="notice">{message}</div>}
        <button className="primaryButton" disabled={addingCustomer}><Plus size={16} /> Create invoice</button>
      </form>
      <div className="workList">
        <div className="sectionTitle"><FileText size={18} /><strong>Recent invoices</strong></div>
        <div className="tableList">{invoices.map((row) => <div className="invoiceRow" key={row.id}><span><strong>{row.invoiceNumber}</strong><small>{row.customerName} · {row.businessName || "Business"} · {row.invoiceDate}</small></span><span>{money(row.totalAmount)}</span><div className="rowActions"><button className="iconButton" onClick={() => api.getInvoice(row.id).then(setPreview).catch((err) => setMessage(String(err)))} title="View invoice"><FileText size={16} /></button><button className="iconButton" onClick={() => emailInvoice(row.id)} title="Email invoice"><Mail size={16} /></button><button className="iconButton" onClick={() => exportPDF(row.id)} title="Export PDF"><FileDown size={16} /></button><button className="iconButton" onClick={() => onEdit(row.id)} title="Edit entry"><Pencil size={16} /></button><button className="iconButton dangerIconButton" onClick={() => removeInvoice(row)} title="Delete invoice"><Trash2 size={16} /></button></div></div>)}</div>
      </div>
      {addingCustomer && <NewInvoiceCustomer onCancel={() => setAddingCustomer(false)} onSaved={(customer) => {
        setCustomers((current) => [customer, ...current.filter((row) => row.id !== customer.id)]);
        setInvoice((current) => ({ ...current, customerId: customer.id }));
        setAddingCustomer(false);
      }} />}
      {preview && <section className="formPanel invoicePreview" aria-label="Invoice preview">
        <div className="sectionTitle"><strong>{preview.businessName} · {preview.invoiceNumber}</strong><button type="button" className="ghostButton" onClick={() => setPreview(null)}>Close preview</button></div>
        <p>Bill to: {preview.customer.companyName || preview.customer.fullName}</p>
        <p>{preview.invoiceDate} · Due {preview.dueDate}</p>
        {preview.items?.map((item, index) => <p key={index}>{item.itemType === "labor" ? "Service Charge" : item.itemType === "parts" ? "Parts" : "Other"} · {item.description} · {item.quantity} × {money(item.unitPrice)} = {money(item.lineTotal)}</p>)}
        <div className="invoiceTotal"><span>Total{preview.taxAmount > 0 ? ` · ${preview.taxIncluded ? "includes" : "incl."} ${money(preview.taxAmount)} sales tax` : ""}</span><strong>{money(preview.totalAmount)}</strong></div>
        <PaymentInformation value={preview} />
        <button type="button" className="ghostButton" onClick={() => exportPDF(preview.id)}>Download PDF / open PDF to print</button>
      </section>}
    </section>
  );
}


function PaymentInformation({ value }: { value?: { paymentInstructions?: string; checkPayableTo?: string } }) {
  if (!value?.paymentInstructions && !value?.checkPayableTo) return null;
  return <section className="paymentInformation"><strong>PAYMENT INFORMATION</strong>{value.paymentInstructions && <p>{value.paymentInstructions}</p>}{value.checkPayableTo && <p><strong>Make all checks payable to {value.checkPayableTo}.</strong></p>}</section>;
}

function NewInvoiceCustomer({ onCancel, onSaved }: { onCancel: () => void; onSaved: (customer: Customer) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState("individual");
  const [form, setForm] = useState<Partial<Customer>>({ ...emptyCustomer });
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const companyName = kind === "business" ? (form.companyName || "").trim() : "";
      const fullName = (form.fullName || "").trim() || companyName;
      if (!fullName || (kind === "business" && !companyName)) throw new Error("Enter the customer or business name.");
      const address = [form.billingAddress?.trim(), [city.trim(), state.trim(), zip.trim()].filter(Boolean).join(" ")].filter(Boolean).join("\n");
      onSaved(await api.saveCustomer({ ...form, fullName, companyName, billingAddress: address }));
    } catch (err) { setError(String(err)); setSaving(false); }
  }
  return <dialog ref={dialog} className="customerDialog" onCancel={(event) => { event.preventDefault(); if (!saving) onCancel(); }}>
    <form className="formPanel" onSubmit={save}>
      <PanelTitle icon={UserPlus} title="Add New Customer" />
      <label>Customer type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="individual">Individual</option><option value="business">Business</option></select></label>
      {kind === "business" && <Input label="Business name" value={form.companyName || ""} onChange={(companyName) => setForm({ ...form, companyName })} required />}
      <Input label={kind === "business" ? "Contact name (optional)" : "Customer name"} value={form.fullName || ""} onChange={(fullName) => setForm({ ...form, fullName })} required={kind === "individual"} />
      <div className="fieldRow"><Input label="Phone" value={form.phone || ""} onChange={(phone) => setForm({ ...form, phone: formatPhone(phone) })} /><Input label="Email" type="email" value={form.email || ""} onChange={(email) => setForm({ ...form, email })} /></div>
      <TextArea label="Billing address" value={form.billingAddress || ""} onChange={(billingAddress) => setForm({ ...form, billingAddress })} />
      <div className="fieldRow"><Input label="City" value={city} onChange={setCity} /><Input label="State" value={state} onChange={setState} /><Input label="ZIP" value={zip} onChange={setZip} /></div>
      <TextArea label="Notes" value={form.notes || ""} onChange={(notes) => setForm({ ...form, notes })} />
      {error && <div role="alert" className="notice">{error}</div>}
      <div className="rowActions"><button type="submit" className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save Customer"}</button><button type="button" className="ghostButton" onClick={onCancel} disabled={saving}>Cancel</button></div>
    </form>
  </dialog>;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function MonthlySummaryPage({ onEdit }: { onEdit: (id: number) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [businessId, setBusinessId] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState(0);
  const [dupesOnly, setDupesOnly] = useState(false);

  useEffect(() => { api.listBusinesses().then(setBusinesses).catch((err) => setError(errorText(err))); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await api.monthlySummary(year, month, businessId));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCustomerFilter(0);
    setDupesOnly(false);
    load();
  }, [year, month, businessId]);

  async function removeEntry(row: MonthlySummary["entries"][number]) {
    if (!await confirmAction(`Delete ${row.invoiceNumber} for ${row.customerName} (${money(row.totalAmount)} on ${row.invoiceDate})? This also removes its payments.`)) return;
    setMessage("");
    try {
      await api.deleteInvoice(row.id);
      setMessage(`${row.invoiceNumber} deleted`);
      await load();
    } catch (err) { setError(errorText(err)); }
  }

  const periodLabel = month ? `${monthNames[month - 1]} ${year}` : `All of ${year}`;
  const needle = search.trim().toLowerCase();
  const entries = (data?.entries ?? []).filter((row) =>
    (!customerFilter || row.customerId === customerFilter) &&
    (!dupesOnly || row.possibleDuplicate) &&
    (!needle || `${row.invoiceNumber} ${row.customerName} ${row.businessName} ${row.status} ${row.paymentMethod}`.toLowerCase().includes(needle)));
  const customers = (data?.customers ?? []).filter((row) => !needle || `${row.fullName} ${row.companyName} ${row.phone} ${row.email}`.toLowerCase().includes(needle));
  const filteredCustomer = customerFilter ? data?.customers.find((row) => row.customerId === customerFilter) : undefined;
  const maxMonthIncome = Math.max(1, ...(data?.months ?? []).map((row) => row.income));

  return (
    <section className="contentStack">
      <div className="monthlyToolbar">
        <div className="yearStepper">
          <button type="button" className="iconButton" onClick={() => setYear(year - 1)} title="Previous year">‹</button>
          <strong>{year}</strong>
          <button type="button" className="iconButton" onClick={() => setYear(year + 1)} title="Next year">›</button>
        </div>
        <label>Business<select value={businessId} onChange={(e) => setBusinessId(Number(e.target.value))}><option value={0}>All businesses</option>{businesses.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <SearchBox value={search} onChange={setSearch} onSearch={() => undefined} />
      </div>

      <div className="monthStrip" role="tablist" aria-label="Choose month">
        <button type="button" role="tab" aria-selected={month === 0} className={month === 0 ? "monthTile active" : "monthTile"} onClick={() => setMonth(0)}>
          <span>Full year</span>
          <strong>{money((data?.months ?? []).reduce((sum, row) => sum + row.income, 0))}</strong>
          <small>{(data?.months ?? []).reduce((sum, row) => sum + row.invoiceCount, 0)} entries</small>
        </button>
        {(data?.months ?? monthNames.map((_, index) => ({ month: index + 1, label: monthNames[index].slice(0, 3), income: 0, customerCount: 0, invoiceCount: 0 }))).map((row) => (
          <button type="button" role="tab" aria-selected={month === row.month} key={row.month} className={month === row.month ? "monthTile active" : "monthTile"} onClick={() => setMonth(row.month)}>
            <span>{row.label}</span>
            <strong>{money(row.income)}</strong>
            <small>{row.customerCount} customer{row.customerCount === 1 ? "" : "s"}</small>
            <i className="monthMeter" style={{ width: `${(row.income / maxMonthIncome) * 100}%` }} />
          </button>
        ))}
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      {!data && !error && <StateMessage message="Loading monthly summary" />}

      {data && <>
        <div className="metricGrid">
          <Metric label={`Income · ${periodLabel}`} value={money(data.income)} />
          <Metric label="Collected" value={money(data.collected)} />
          <Metric label="Outstanding" value={money(data.outstanding)} />
          <Metric label="Expenses" value={money(data.expense)} />
          <Metric label="Net (income − expenses)" value={money(data.net)} />
        </div>

        {data.duplicateCount > 0 && <div className="warningBanner" role="status">
          <AlertTriangle size={18} />
          <span><strong>{data.duplicateCount} entries look like double entries</strong> (same customer name, date and amount). Review them and delete the extra copy.</span>
          <button type="button" className="ghostButton" onClick={() => setDupesOnly(!dupesOnly)}>{dupesOnly ? "Show all entries" : "Show only these"}</button>
        </div>}

        <section className="workList">
          <div className="sectionTitle"><Users size={18} /><strong>Customers · {periodLabel}</strong><span className="pill">{data.customerCount}</span>{loading && <small>Refreshing…</small>}</div>
          {customers.length ? <div className="summaryTable">
            <div className="summaryHeader customerCols"><span>Customer</span><span>Contact</span><span>Visits</span><span>Income</span><span>Collected</span><span>Last visit</span></div>
            {customers.map((row) => (
              <button type="button" key={row.customerId} className={customerFilter && customerFilter === row.customerId ? "summaryRow customerCols selectedRow" : "summaryRow customerCols"} onClick={() => setCustomerFilter(customerFilter === row.customerId ? 0 : row.customerId)} title="Show this customer's entries">
                <span><strong>{row.fullName}</strong>{row.companyName && <small>{row.companyName}</small>}{row.possibleDuplicates > 0 && <span className="pill warning">{row.possibleDuplicates + 1} customer records share this name</span>}</span>
                <span><small>{[row.phone, row.email].filter(Boolean).join(" · ") || "—"}</small></span>
                <span>{row.invoiceCount}</span>
                <span>{money(row.income)}</span>
                <span className={row.collected < row.income ? "negativeAmount" : ""}>{money(row.collected)}</span>
                <span>{row.lastVisit}</span>
              </button>
            ))}
          </div> : <StateMessage message={`No customers in ${periodLabel}`} />}
        </section>

        <section className="workList">
          <div className="sectionTitle">
            <ReceiptText size={18} /><strong>Income entries · {periodLabel}</strong><span className="pill">{entries.length}</span>
            {filteredCustomer && <button type="button" className="ghostButton" onClick={() => setCustomerFilter(0)}>Showing {filteredCustomer.fullName} only · clear</button>}
          </div>
          {entries.length ? <div className="summaryTable">
            <div className="summaryHeader entryCols"><span>Date</span><span>Invoice</span><span>Customer</span><span>Status</span><span>Total</span><span>Paid</span><span /></div>
            {entries.map((row) => (
              <div key={row.id} className={row.possibleDuplicate ? "summaryRow entryCols duplicateRow" : "summaryRow entryCols"}>
                <span>{row.invoiceDate}</span>
                <span><strong>{row.invoiceNumber}</strong><small>{row.businessName || "Business"}</small></span>
                <span>{row.customerName}{row.possibleDuplicate && <span className="pill warning">Possible double entry</span>}</span>
                <span><span className={row.status === "paid" ? "pill success" : "pill"}>{row.status}</span>{row.paymentMethod && <small>{row.paymentMethod}</small>}</span>
                <span>{money(row.totalAmount)}</span>
                <span>{money(row.paidAmount)}</span>
                <span className="rowActions">
                  <button type="button" className="iconButton" onClick={() => onEdit(row.id)} disabled={!row.walkInEntry} title={row.walkInEntry ? "Edit entry" : "Multi-line invoice: delete and re-create to change it"}><Pencil size={16} /></button>
                  <button type="button" className="iconButton dangerIconButton" onClick={() => removeEntry(row)} title="Delete entry"><Trash2 size={16} /></button>
                </span>
              </div>
            ))}
          </div> : <StateMessage message={dupesOnly ? "No possible double entries" : `No income entries in ${periodLabel}`} />}
        </section>
      </>}
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
        <div className="fieldRow"><Input label="Invoice prefix" value={currentSettings.invoicePrefix} onChange={(invoicePrefix) => setSettings({ ...currentSettings, invoicePrefix })} /><label>Sales tax rate (%)<input type="number" min="0" max="100" step="0.001" value={String(Math.round((currentSettings.defaultTaxRate > 1 ? currentSettings.defaultTaxRate : currentSettings.defaultTaxRate * 100) * 1000) / 1000)} onChange={(e) => setSettings({ ...currentSettings, defaultTaxRate: Number(e.target.value) / 100 })} /><small className="fieldHint">Kentucky: 6 (no local sales tax)</small></label></div>
        <section className="paymentInformation">
          <strong>Sales tax rules</strong>
          <label className="checkRow"><input type="checkbox" checked={currentSettings.partsTaxable} onChange={(e) => setSettings({ ...currentSettings, partsTaxable: e.target.checked })} /> Parts are taxable</label>
          <label className="checkRow"><input type="checkbox" checked={currentSettings.laborTaxableWithParts} onChange={(e) => setSettings({ ...currentSettings, laborTaxableWithParts: e.target.checked })} /> Tax labor when parts are installed on the same job (Kentucky rule)</label>
          <label className="checkRow"><input type="checkbox" checked={currentSettings.laborTaxable} onChange={(e) => setSettings({ ...currentSettings, laborTaxable: e.target.checked })} /> Always tax labor, even with no parts</label>
          <small className="fieldHint">Walk-in amounts are what the customer paid, with tax included. Created invoices add tax on top.</small>
        </section>
        <BusinessPaymentSettings />
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

function BusinessPaymentSettings() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.listBusinesses().then((rows) => { setBusinesses(rows); setSelected(rows[0]?.id || 0); }).catch((err) => setMessage(String(err))); }, []);
  const business = businesses.find((row) => row.id === selected);
  function update(values: Partial<Business>) { setBusinesses((rows) => rows.map((row) => row.id === selected ? { ...row, ...values } : row)); }
  async function save() {
    if (!business || saving) return;
    setSaving(true);
    try { await api.saveBusiness(business); setMessage("Payment information saved"); }
    catch (err) { setMessage(String(err)); }
    finally { setSaving(false); }
  }
  return <section className="paymentInformation"><strong>Invoice payment information by business</strong>
    <BusinessSelect businesses={businesses} value={selected} onChange={setSelected} />
    {business && <><TextArea label="Payment instructions" value={business.paymentInstructions || ""} onChange={(paymentInstructions) => update({ paymentInstructions })} /><Input label="Checks payable to" value={business.checkPayableTo || ""} onChange={(checkPayableTo) => update({ checkPayableTo })} /><button type="button" className="ghostButton" disabled={saving} onClick={save}>Save payment information</button></>}
    {message && <p role="status">{message}</p>}
  </section>;
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
  return <div className="invoiceLine"><select aria-label="Item type" value={item.itemType} onChange={(e) => onChange({ ...item, itemType: e.target.value as InvoiceItemInput["itemType"] })}><option value="labor">Service Charge</option><option value="parts">Parts</option><option value="other">Other</option></select><input aria-label="Description" value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} placeholder="Description" /><input aria-label="Quantity" type="number" min="0.01" step="any" value={item.quantity} onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })} /><input aria-label="Rate" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => onChange({ ...item, unitPrice: Number(e.target.value) })} /><label><input type="checkbox" checked={item.taxable} onChange={(e) => onChange({ ...item, taxable: e.target.checked })} /> Tax</label><button className="iconButton" type="button" onClick={onDelete} title="Remove line">×</button></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function ListPanel({ title, rows }: { title: string; rows: string[] }) { return <div className="listPanel"><div className="sectionTitle"><strong>{title}</strong></div>{rows.length ? rows.map((row) => <div className="simpleRow" key={row}>{row}</div>) : <StateMessage message="No records yet" />}</div>; }
function StateMessage({ message }: { message: string }) { return <div className="stateMessage">{message}</div>; }
function PanelTitle({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number }>; title: string }) { return <div className="sectionTitle"><Icon size={18} /><strong>{title}</strong></div>; }
function Placeholder({ title, items }: { title: string; items: string[] }) { return <section className="placeholder"><ShieldCheck size={28} /><h2>{title}</h2>{items.map((item) => <div className="simpleRow" key={item}>{item}</div>)}</section>; }
function SearchBox({ value, onChange, onSearch }: { value: string; onChange: (value: string) => void; onSearch: () => void }) { return <div className="searchBox"><Search size={16} /><input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }} placeholder="Search" /><button className="ghostButton" onClick={onSearch}>Search</button></div>; }
function Input({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) { return <label>{label}<input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} /></label>; }
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




