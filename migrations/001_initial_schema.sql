create table if not exists users (
	id bigserial primary key,
	username text not null unique,
	display_name text not null,
	password_hash text not null,
	role text not null check (role in ('admin', 'standard')),
	active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create sequence if not exists invoice_number_seq start 1001;

create table if not exists customers (
	id bigserial primary key,
	full_name text not null,
	company_name text not null default '',
	email text not null default '',
	phone text not null default '',
	billing_address text not null default '',
	service_address text not null default '',
	tax_exempt boolean not null default false,
	notes text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_customers_search on customers using gin (
	to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
);

create table if not exists vendors (
	id bigserial primary key,
	vendor_name text not null,
	contact_name text not null default '',
	email text not null default '',
	phone text not null default '',
	website text not null default '',
	address text not null default '',
	notes text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists invoices (
	id bigserial primary key,
	invoice_number text not null unique,
	invoice_date date not null,
	due_date date not null,
	customer_id bigint not null references customers(id),
	status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
	subtotal numeric(12,2) not null default 0,
	discount_amount numeric(12,2) not null default 0,
	tax_amount numeric(12,2) not null default 0,
	total_amount numeric(12,2) not null default 0,
	paid_amount numeric(12,2) not null default 0,
	notes text not null default '',
	terms text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists invoice_items (
	id bigserial primary key,
	invoice_id bigint not null references invoices(id) on delete cascade,
	item_type text not null check (item_type in ('labor', 'parts', 'other')),
	description text not null,
	quantity numeric(12,2) not null default 1,
	unit_price numeric(12,2) not null default 0,
	taxable boolean not null default true,
	line_total numeric(12,2) not null default 0,
	position integer not null default 0
);

create table if not exists payments (
	id bigserial primary key,
	invoice_id bigint not null references invoices(id) on delete cascade,
	payment_date date not null,
	amount numeric(12,2) not null,
	method text not null check (method in ('cash', 'card', 'check', 'zelle', 'other')),
	notes text not null default '',
	created_at timestamptz not null default now()
);

create table if not exists purchase_categories (
	id bigserial primary key,
	name text not null unique
);

insert into purchase_categories(name) values
	('Computer parts'),
	('Tools'),
	('Software'),
	('Shipping'),
	('Office supplies'),
	('Repair supplies'),
	('Advertising'),
	('Bank fees'),
	('Fuel / travel'),
	('Uncategorized')
on conflict (name) do nothing;

create table if not exists purchases (
	id bigserial primary key,
	vendor_id bigint references vendors(id),
	purchase_date date not null,
	description text not null,
	category_id bigint references purchase_categories(id),
	amount numeric(12,2) not null,
	tax_paid numeric(12,2) not null default 0,
	payment_method text not null default '',
	receipt_attachment_id bigint,
	related_invoice_id bigint references invoices(id),
	notes text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists statement_imports (
	id bigserial primary key,
	file_name text not null,
	imported_by bigint references users(id),
	imported_at timestamptz not null default now(),
	row_count integer not null default 0,
	saved_count integer not null default 0
);

create table if not exists statement_transactions (
	id bigserial primary key,
	statement_import_id bigint references statement_imports(id) on delete cascade,
	transaction_date date not null,
	description text not null,
	amount numeric(12,2) not null,
	vendor_name text not null default '',
	category_name text not null default '',
	duplicate_of_id bigint references statement_transactions(id),
	saved_purchase_id bigint references purchases(id),
	raw_data jsonb not null default '{}'::jsonb
);

create table if not exists tax_rates (
	id bigserial primary key,
	name text not null,
	rate numeric(7,4) not null,
	active boolean not null default true,
	created_at timestamptz not null default now()
);

create table if not exists tax_reports (
	id bigserial primary key,
	start_date date not null,
	end_date date not null,
	gross_sales numeric(12,2) not null,
	taxable_sales numeric(12,2) not null,
	non_taxable_sales numeric(12,2) not null,
	sales_tax_collected numeric(12,2) not null,
	total_purchases numeric(12,2) not null,
	created_at timestamptz not null default now()
);

create table if not exists attachments (
	id bigserial primary key,
	file_name text not null,
	content_type text not null default '',
	file_path text not null,
	entity_type text not null,
	entity_id bigint not null,
	created_at timestamptz not null default now()
);

create table if not exists settings (
	key text primary key,
	value text not null,
	updated_at timestamptz not null default now()
);

insert into settings(key, value) values
	('business_name', 'SimpleTech Books'),
	('business_address', ''),
	('business_phone', ''),
	('business_email', ''),
	('business_logo_path', ''),
	('default_tax_rate', '0.0000'),
	('parts_taxable', 'true'),
	('labor_taxable', 'false'),
	('invoice_terms', 'Payment due by due date. Thank you for your business.'),
	('invoice_prefix', 'INV'),
	('backup_location', ''),
	('theme', 'light')
on conflict (key) do nothing;

create table if not exists audit_logs (
	id bigserial primary key,
	user_id bigint references users(id),
	action text not null,
	entity_type text not null,
	entity_id bigint,
	details jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create table if not exists backup_history (
	id bigserial primary key,
	backup_path text not null,
	backup_type text not null check (backup_type in ('manual', 'auto')),
	status text not null,
	message text not null default '',
	created_at timestamptz not null default now()
);

