export namespace repository {
	
	export class AppSettings {
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
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.businessName = source["businessName"];
	        this.businessAddress = source["businessAddress"];
	        this.businessPhone = source["businessPhone"];
	        this.businessEmail = source["businessEmail"];
	        this.businessLogoPath = source["businessLogoPath"];
	        this.defaultTaxRate = source["defaultTaxRate"];
	        this.partsTaxable = source["partsTaxable"];
	        this.laborTaxable = source["laborTaxable"];
	        this.invoiceTerms = source["invoiceTerms"];
	        this.invoicePrefix = source["invoicePrefix"];
	        this.theme = source["theme"];
	        this.smtpHost = source["smtpHost"];
	        this.smtpPort = source["smtpPort"];
	        this.smtpUsername = source["smtpUsername"];
	        this.smtpPassword = source["smtpPassword"];
	        this.smtpFromEmail = source["smtpFromEmail"];
	        this.smtpFromName = source["smtpFromName"];
	        this.smtpUseTLS = source["smtpUseTLS"];
	    }
	}
	export class AuthSession {
	    userId: number;
	    username: string;
	    displayName: string;
	    role: string;
	    token: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userId = source["userId"];
	        this.username = source["username"];
	        this.displayName = source["displayName"];
	        this.role = source["role"];
	        this.token = source["token"];
	    }
	}
	export class Customer {
	    id: number;
	    fullName: string;
	    companyName: string;
	    email: string;
	    phone: string;
	    billingAddress: string;
	    serviceAddress: string;
	    taxExempt: boolean;
	    notes: string;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Customer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fullName = source["fullName"];
	        this.companyName = source["companyName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.billingAddress = source["billingAddress"];
	        this.serviceAddress = source["serviceAddress"];
	        this.taxExempt = source["taxExempt"];
	        this.notes = source["notes"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class CustomerInput {
	    id: number;
	    fullName: string;
	    companyName: string;
	    email: string;
	    phone: string;
	    billingAddress: string;
	    serviceAddress: string;
	    taxExempt: boolean;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomerInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fullName = source["fullName"];
	        this.companyName = source["companyName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.billingAddress = source["billingAddress"];
	        this.serviceAddress = source["serviceAddress"];
	        this.taxExempt = source["taxExempt"];
	        this.notes = source["notes"];
	    }
	}
	export class CustomerLookup {
	    customer: Customer;
	    invoiceCount: number;
	    totalSales: number;
	    lastInvoice: string;
	    kind: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomerLookup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customer = this.convertValues(source["customer"], Customer);
	        this.invoiceCount = source["invoiceCount"];
	        this.totalSales = source["totalSales"];
	        this.lastInvoice = source["lastInvoice"];
	        this.kind = source["kind"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InvoiceListItem {
	    id: number;
	    invoiceNumber: string;
	    invoiceDate: string;
	    dueDate: string;
	    customerName: string;
	    status: string;
	    totalAmount: number;
	    paidAmount: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceListItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invoiceNumber = source["invoiceNumber"];
	        this.invoiceDate = source["invoiceDate"];
	        this.dueDate = source["dueDate"];
	        this.customerName = source["customerName"];
	        this.status = source["status"];
	        this.totalAmount = source["totalAmount"];
	        this.paidAmount = source["paidAmount"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class DashboardSummary {
	    totalUnpaidInvoices: number;
	    paidInvoicesMonth: number;
	    totalSalesMonth: number;
	    purchasesMonth: number;
	    salesTaxCollected: number;
	    recentInvoices: InvoiceListItem[];
	    recentCustomers: Customer[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalUnpaidInvoices = source["totalUnpaidInvoices"];
	        this.paidInvoicesMonth = source["paidInvoicesMonth"];
	        this.totalSalesMonth = source["totalSalesMonth"];
	        this.purchasesMonth = source["purchasesMonth"];
	        this.salesTaxCollected = source["salesTaxCollected"];
	        this.recentInvoices = this.convertValues(source["recentInvoices"], InvoiceListItem);
	        this.recentCustomers = this.convertValues(source["recentCustomers"], Customer);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EmailInvoiceInput {
	    invoiceId: number;
	    to: string;
	    subject: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new EmailInvoiceInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.invoiceId = source["invoiceId"];
	        this.to = source["to"];
	        this.subject = source["subject"];
	        this.message = source["message"];
	    }
	}
	export class InvoiceItem {
	    id: number;
	    invoiceId: number;
	    itemType: string;
	    description: string;
	    quantity: number;
	    unitPrice: number;
	    taxable: boolean;
	    lineTotal: number;
	    position: number;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invoiceId = source["invoiceId"];
	        this.itemType = source["itemType"];
	        this.description = source["description"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	        this.taxable = source["taxable"];
	        this.lineTotal = source["lineTotal"];
	        this.position = source["position"];
	    }
	}
	export class InvoiceDetail {
	    id: number;
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
	    items: InvoiceItem[];
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invoiceNumber = source["invoiceNumber"];
	        this.invoiceDate = source["invoiceDate"];
	        this.dueDate = source["dueDate"];
	        this.customer = this.convertValues(source["customer"], Customer);
	        this.status = source["status"];
	        this.subtotal = source["subtotal"];
	        this.discountAmount = source["discountAmount"];
	        this.taxAmount = source["taxAmount"];
	        this.totalAmount = source["totalAmount"];
	        this.paidAmount = source["paidAmount"];
	        this.notes = source["notes"];
	        this.terms = source["terms"];
	        this.items = this.convertValues(source["items"], InvoiceItem);
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InvoiceItemInput {
	    itemType: string;
	    description: string;
	    quantity: number;
	    unitPrice: number;
	    taxable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceItemInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.itemType = source["itemType"];
	        this.description = source["description"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	        this.taxable = source["taxable"];
	    }
	}
	export class InvoiceInput {
	    customerId: number;
	    invoiceDate: string;
	    dueDate: string;
	    discountAmount: number;
	    notes: string;
	    terms: string;
	    items: InvoiceItemInput[];
	
	    static createFrom(source: any = {}) {
	        return new InvoiceInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customerId = source["customerId"];
	        this.invoiceDate = source["invoiceDate"];
	        this.dueDate = source["dueDate"];
	        this.discountAmount = source["discountAmount"];
	        this.notes = source["notes"];
	        this.terms = source["terms"];
	        this.items = this.convertValues(source["items"], InvoiceItemInput);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	export class Vendor {
	    id: number;
	    vendorName: string;
	    contactName: string;
	    email: string;
	    phone: string;
	    website: string;
	    address: string;
	    notes: string;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Vendor(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.vendorName = source["vendorName"];
	        this.contactName = source["contactName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.website = source["website"];
	        this.address = source["address"];
	        this.notes = source["notes"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class VendorInput {
	    id: number;
	    vendorName: string;
	    contactName: string;
	    email: string;
	    phone: string;
	    website: string;
	    address: string;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new VendorInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.vendorName = source["vendorName"];
	        this.contactName = source["contactName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.website = source["website"];
	        this.address = source["address"];
	        this.notes = source["notes"];
	    }
	}

}

