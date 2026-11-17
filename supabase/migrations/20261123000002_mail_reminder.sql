-- Expiry reminders appear in the order's mail log too.
alter table public.mail_log drop constraint if exists mail_log_kind_check;
alter table public.mail_log add constraint mail_log_kind_check check (kind in ('order', 'gift', 'my_link', 'reminder'));
