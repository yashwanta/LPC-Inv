alter table businesses add column if not exists payment_instructions text not null default '';
alter table businesses add column if not exists check_payable_to text not null default '';

update businesses set payment_instructions = 'Cash or check only.', check_payable_to = 'Yashwanta Thakur'
where lower(trim(name)) = 'lexington pc clinic';
