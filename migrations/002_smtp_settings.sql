insert into settings(key, value) values
	('smtp_host', ''),
	('smtp_port', '587'),
	('smtp_username', ''),
	('smtp_password', ''),
	('smtp_from_email', ''),
	('smtp_from_name', ''),
	('smtp_use_tls', 'true')
on conflict (key) do nothing;
