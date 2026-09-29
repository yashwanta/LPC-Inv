alter table users
	add column if not exists recovery_email text not null default '',
	add column if not exists security_question text not null default '',
	add column if not exists security_answer_hash text not null default '';

