create table if not exists businesses (
	id bigserial primary key,
	name text not null unique,
	active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

insert into businesses(name)
select value from settings where key = 'business_name' and trim(value) <> ''
on conflict (name) do nothing;

insert into businesses(name)
select 'SimpleTech Books'
where not exists (select 1 from businesses)
on conflict (name) do nothing;

alter table users add column if not exists access_label text not null default 'Full Access';
alter table invoices add column if not exists business_id bigint references businesses(id);
alter table purchases add column if not exists business_id bigint references businesses(id);
alter table statement_imports add column if not exists business_id bigint references businesses(id);

update invoices set business_id = (select id from businesses order by id limit 1) where business_id is null;
update purchases set business_id = (select id from businesses order by id limit 1) where business_id is null;
