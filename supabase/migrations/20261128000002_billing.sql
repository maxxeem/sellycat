-- Phase 7, part 1: plans and subscriptions (Stripe Billing), as in SwypeCast.
-- Prices are numerically the same in CHF, EUR and USD; staff edits names, prices, fees and limits
-- under Staff → Pläne. Business is "contact us" (no public price). New shops start on Free
-- (Sellycat branding, 30 % fee).

-- ---------------------------------------------------------------- plans
alter table public.plans
  add column if not exists marketing jsonb not null default '{}'::jsonb,
  add column if not exists contact_only boolean not null default false;
comment on column public.plans.prices is 'List prices {"monthly": {"CHF": 49, "EUR": 49, "USD": 49}, "yearly": {...}}; missing = no price.';
comment on column public.plans.stripe is 'Stripe ids per mode: {"test": {"product_id", "price_month_id", "price_year_id"}, "live": {...}}';
comment on column public.plans.marketing is 'Pricing-page copy per locale: {"de": {"tagline", "badge"}, "en": {...}}';

insert into public.plans (id, name, sort_order, is_public, contact_only, limits, prices, application_fee_bps, application_fee_fixed, trial_days, marketing) values
  ('free', 'Free', 0, true, false,
   '{"deals_live": 3, "seats": 1, "custom_domain": false, "custom_mail_domain": false, "branding": true}',
   '{"monthly": {"CHF": 0, "EUR": 0, "USD": 0}, "yearly": {"CHF": 0, "EUR": 0, "USD": 0}}', 3000, 0, 0,
   '{"de": {"tagline": "Zum Starten: dein Shop mit Sellycat-Branding, ohne Fixkosten.", "badge": ""}, "en": {"tagline": "To get started: your shop with Sellycat branding, no fixed costs.", "badge": ""}}'),
  ('starter', 'Starter', 1, true, false,
   '{"deals_live": 15, "seats": 3, "custom_domain": false, "custom_mail_domain": false, "branding": false}',
   '{"monthly": {"CHF": 49, "EUR": 49, "USD": 49}, "yearly": {"CHF": 468, "EUR": 468, "USD": 468}}', 1000, 0, 7,
   '{"de": {"tagline": "Für Betriebe und Vereine: eigener Shop ohne Sellycat-Branding.", "badge": ""}, "en": {"tagline": "For businesses and clubs: your own shop without Sellycat branding.", "badge": ""}}'),
  ('pro', 'Pro', 2, true, false,
   '{"deals_live": 100, "seats": 10, "custom_domain": true, "custom_mail_domain": true, "branding": false}',
   '{"monthly": {"CHF": 149, "EUR": 149, "USD": 149}, "yearly": {"CHF": 1428, "EUR": 1428, "USD": 1428}}', 500, 0, 7,
   '{"de": {"tagline": "Für Deal-Plattformen und Medien: eigene Domain, eigene Absender-Adresse.", "badge": "Beliebt"}, "en": {"tagline": "For deal platforms and media: own domain, own sender address.", "badge": "Popular"}}'),
  ('business', 'Business', 3, true, true,
   '{"deals_live": null, "seats": 50, "custom_domain": true, "custom_mail_domain": true, "branding": false}',
   '{"monthly": {}, "yearly": {}}', 250, 0, 0,
   '{"de": {"tagline": "Für grosse Netzwerke und Verlage: alles unbegrenzt, persönliche Betreuung.", "badge": "Auf Anfrage"}, "en": {"tagline": "For large networks and publishers: everything unlimited, personal support.", "badge": "On request"}}')
on conflict (id) do update set
  name = excluded.name, sort_order = excluded.sort_order, is_public = excluded.is_public, contact_only = excluded.contact_only,
  limits = excluded.limits, prices = excluded.prices, application_fee_bps = excluded.application_fee_bps,
  application_fee_fixed = excluded.application_fee_fixed, trial_days = excluded.trial_days, marketing = excluded.marketing;

-- A shop's plan limit as a number (null = unlimited).
create or replace function public.plan_limit(p_tenant uuid, p_key text) returns int
language sql stable security definer set search_path = public as $$
  select nullif(p.limits ->> p_key, '')::int
  from public.tenants t join public.plans p on p.id = t.plan_id
  where t.id = p_tenant
$$;
revoke all on function public.plan_limit(uuid, text) from public;
grant execute on function public.plan_limit(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------- tenants: subscription state
alter table public.tenants alter column plan_id set default 'free';
alter table public.tenants
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_status text not null default 'none' check (billing_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  add column if not exists billing_interval text check (billing_interval in ('monthly', 'yearly')),
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists stripe_schedule_id text,
  add column if not exists pending_plan_id text references public.plans (id),
  add column if not exists pending_interval text check (pending_interval in ('monthly', 'yearly')),
  add column if not exists pending_at timestamptz;

-- Customers never write plan or billing state themselves (only Stripe via the server, or staff).
create or replace function public.tenants_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;
  if new.plan_id is distinct from old.plan_id or new.status is distinct from old.status
     or new.fee_override_bps is distinct from old.fee_override_bps or new.fee_override_fixed is distinct from old.fee_override_fixed
     or new.slug is distinct from old.slug or new.created_by is distinct from old.created_by
     or new.stripe_customer_id is distinct from old.stripe_customer_id or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.billing_status is distinct from old.billing_status or new.billing_interval is distinct from old.billing_interval
     or new.current_period_end is distinct from old.current_period_end or new.cancel_at_period_end is distinct from old.cancel_at_period_end
     or new.stripe_schedule_id is distinct from old.stripe_schedule_id or new.pending_plan_id is distinct from old.pending_plan_id
     or new.pending_interval is distinct from old.pending_interval or new.pending_at is distinct from old.pending_at then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- live-deal limit per plan
create or replace function public.deals_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_live int;
begin
  if new.state <> 'published' or (tg_op = 'UPDATE' and old.state = 'published') then return new; end if;
  v_limit := public.plan_limit(new.tenant_id, 'deals_live');
  if v_limit is null then return new; end if;
  select count(*) into v_live from public.deals d
  where d.tenant_id = new.tenant_id and d.state = 'published' and d.archived_at is null and d.id <> new.id;
  if v_live >= v_limit then
    raise exception 'plan limit deals_live %', v_limit using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists deals_plan_limit on public.deals;
create trigger deals_plan_limit before insert or update of state on public.deals for each row execute function public.deals_plan_limit();

-- ---------------------------------------------------------------- Stripe webhook log (idempotency)
create table if not exists public.billing_events (
  id text primary key,
  type text not null,
  status text not null check (status in ('ok', 'ignored', 'failed')),
  tenant_id uuid references public.tenants (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
create policy billing_events_staff on public.billing_events for select using (public.is_staff());

-- ---------------------------------------------------------------- Business enquiries (pricing page)
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  company text check (company is null or length(company) <= 160),
  email text not null check (length(email) <= 200 and position('@' in email) > 1),
  message text not null check (length(message) between 1 and 4000),
  plan_id text references public.plans (id) on delete set null,
  locale text,
  country text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.contact_requests enable row level security;
create policy contact_requests_staff on public.contact_requests for select using (public.is_staff());

-- ---------------------------------------------------------------- platform billing ids (portal etc.)
alter table public.platform_settings add column if not exists billing jsonb not null default '{}'::jsonb;
