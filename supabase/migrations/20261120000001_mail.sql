-- Phase 4, part 2: voucher mails (PDF attached), gifts, "my vouchers" links, and the shop's own
-- sender domain (allowed per plan: `limits.custom_mail_domain`).

-- ---------------------------------------------------------------- plans
-- Open for every plan for now; switch off per plan later (staff), the sender falls back to Sellycat.
-- The same for the shop's own web domain (phase 6), which was off for Starter.
update public.plans set limits = limits || '{"custom_mail_domain": true, "custom_domain": true}'::jsonb;

-- Does the shop's plan allow a feature (`limits.<key> = true`)?
create or replace function public.plan_allows(p_tenant uuid, p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((p.limits ->> p_feature)::boolean, false)
  from public.tenants t join public.plans p on p.id = t.plan_id
  where t.id = p_tenant
$$;
revoke all on function public.plan_allows(uuid, text) from public;
grant execute on function public.plan_allows(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------- orders: gift + mail state
alter table public.orders
  add column gift boolean not null default false,
  add column gift_name text check (gift_name is null or length(gift_name) <= 120),
  add column gift_email text check (gift_email is null or (gift_email = lower(gift_email) and position('@' in gift_email) > 1 and length(gift_email) <= 200)),
  add column gift_from text check (gift_from is null or length(gift_from) <= 120),
  add column gift_message text check (gift_message is null or length(gift_message) <= 500),
  -- Day (Zurich) the recipient gets the mail; null = right after payment.
  add column gift_send_on date,
  add column gift_sent_at timestamptz,
  -- Buyer mail with the vouchers went out (claimed before sending, released again on failure).
  add column mail_sent_at timestamptz,
  add constraint orders_gift_complete check (not gift or gift_email is not null);
create index orders_gift_due_idx on public.orders (gift_send_on) where gift and gift_sent_at is null;
create index orders_mail_open_idx on public.orders (paid_at) where mail_sent_at is null and paid_at is not null;
create index orders_email_idx on public.orders (tenant_id, email);
create index orders_gift_email_idx on public.orders (tenant_id, gift_email) where gift_email is not null;

-- ---------------------------------------------------------------- mail log
create table public.mail_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  kind text not null check (kind in ('order', 'gift', 'my_link')),
  recipient text not null,
  sender text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index mail_log_order_idx on public.mail_log (order_id, created_at desc);
create index mail_log_tenant_idx on public.mail_log (tenant_id, created_at desc);
alter table public.mail_log enable row level security;
create policy mail_log_read on public.mail_log for select using (public.can_see_orders(tenant_id));

-- ---------------------------------------------------------------- "my vouchers" links
-- One-time sign-in links by mail; only the SHA-256 of the token is stored. Service role only.
create table public.buyer_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (email = lower(email)),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index buyer_links_tenant_email_idx on public.buyer_links (tenant_id, email, created_at desc);
alter table public.buyer_links enable row level security;

-- ---------------------------------------------------------------- the shop's own sender domain
create table public.mail_domains (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  domain citext not null unique check (domain ~ '^([a-z0-9-]+\.)+[a-z]{2,}$' and length(domain) <= 200),
  -- Local part of the sender address ("gutscheine" → gutscheine@<domain>).
  local_part text not null default 'gutscheine' check (local_part ~ '^[a-z0-9._-]{1,40}$'),
  status text not null default 'pending' check (status in ('pending', 'active', 'error')),
  -- DNS records to set, as Mailgun lists them (type, name, value, valid).
  records jsonb not null default '[]'::jsonb,
  error text,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger mail_domains_updated before update on public.mail_domains for each row execute function public.set_updated_at();
alter table public.mail_domains enable row level security;
-- Read for owners/admins; every write goes through the server (Mailgun API) with the service role.
create policy mail_domains_read on public.mail_domains for select using (public.can_manage(tenant_id));
