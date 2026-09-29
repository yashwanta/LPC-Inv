-- Tax rate is stored as a fraction (0.06 = 6%). Earlier versions accepted "6",
-- which the app multiplied as 600%. Convert any whole-number percent to a fraction.
update settings
set value = to_char(value::numeric / 100, 'FM0.0000'), updated_at = now()
where key = 'default_tax_rate' and value ~ '^[0-9]+(\.[0-9]+)?$' and value::numeric > 1;

-- Kentucky: labor to install taxable parts on the same job is taxable.
insert into settings(key, value) values ('labor_taxable_with_parts', 'true')
on conflict (key) do nothing;

-- Walk-in prices are entered tax-inclusive; line items then include the tax.
alter table invoices add column if not exists tax_included boolean not null default false;
