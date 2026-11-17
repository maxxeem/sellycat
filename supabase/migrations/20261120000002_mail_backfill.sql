-- Orders paid before voucher mails existed count as handled: the cron must not mail them now.
update public.orders set mail_sent_at = coalesce(paid_at, now()) where mail_sent_at is null and status in ('paid', 'partially_refunded', 'refunded');
