-- Sellycat phase 3: payments. Stripe Connect (Standard) per tenant, buyers, orders, stock
-- reservations during checkout, idempotent webhook processing.
--
-- Money never flows through Sellycat: the charge happens on the customer's own Stripe account
-- (direct charge) and Sellycat keeps only the application fee.
--
-- All stock changes run in definer functions callable only by the service role, so concurrent
-- buyers can never oversell: every function locks the deal row before touching its counters.

-- ---------------------------------------------------------------- types
create type public.order_status as enum ('pending', 'paid', 'partially_refunded', 'refunded', 'expired');
create type public.reservation_status as enum ('active', 'converted', 'released');

-- Who may see orders and buyers (personal data): owner, admin, editor. Redeemers and partners never.
create or replace function public.can_see_orders(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_tenant_role(p_tenant, array['owner', 'admin', 'editor']::public.member_role[]) or public.is_staff();
$$;

create or replace function public.can_manage(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_tenant_role(p_tenant, array['owner', 'admin']::public.member_role[]) or public.is_staff();
$$;

-- ---------------------------------------------------------------- stripe accounts
create table public.stripe_accounts (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  account_id text not null unique,
  livemode boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  -- Open requirements as Stripe lists them (field names), shown as "Stripe needs more details".
  requirements jsonb not null default '[]'::jsonb,
  business_name text,
  country text,
  default_currency text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger stripe_accounts_updated before update on public.stripe_accounts for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- buyers
create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  name text,
  newsletter_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create trigger buyers_updated before update on public.buyers for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete restrict,
  -- Short reference for buyers and support ("8F3A-21C9"), unique per shop.
  number text not null,
  status public.order_status not null default 'pending',
  email text not null,
  name text,
  locale text not null default 'de',
  newsletter boolean not null default false,
  currency text not null,
  amount_cents int not null check (amount_cents >= 0),
  fee_cents int not null default 0 check (fee_cents >= 0),
  refunded_cents int not null default 0 check (refunded_cents >= 0),
  restocked boolean not null default false,
  -- Paid although the reservation had already been released and stock ran out (very rare: a
  -- late webhook). The order is valid; the shop sees a hint to check the quantity.
  oversold boolean not null default false,
  stripe_account_id text,
  stripe_session_id text unique,
  stripe_payment_intent text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create index orders_tenant_idx on public.orders (tenant_id, created_at desc);
create index orders_buyer_idx on public.orders (buyer_id);
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  -- Snapshot: the deal may change or disappear later, the order stays as bought.
  title text not null,
  qty int not null check (qty between 1 and 100),
  unit_cents int not null check (unit_cents >= 0),
  total_cents int not null check (total_cents >= 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_deal_idx on public.order_items (deal_id);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  email text not null,
  qty int not null check (qty >= 1),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index reservations_active_idx on public.reservations (deal_id, expires_at) where status = 'active';
create index reservations_order_idx on public.reservations (order_id);

-- Stripe webhook events already handled (idempotency) with their outcome.
create table public.processed_events (
  id text primary key,
  type text not null,
  account text,
  status text not null check (status in ('ok', 'ignored', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table public.stripe_accounts enable row level security;
alter table public.buyers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reservations enable row level security;
alter table public.processed_events enable row level security;

-- Read-only for customers; every write runs on the server after authorisation (service role).
create policy stripe_accounts_read on public.stripe_accounts for select using (public.can_manage(tenant_id));
create policy buyers_read on public.buyers for select using (public.can_see_orders(tenant_id));
create policy orders_read on public.orders for select using (public.can_see_orders(tenant_id));
create policy order_items_read on public.order_items for select using (public.can_see_orders(tenant_id));
create policy reservations_read on public.reservations for select using (public.can_see_orders(tenant_id));
-- processed_events: no policy, service role only.

-- ---------------------------------------------------------------- stock functions
-- Releases a pending order: its active reservations give their stock back. Idempotent.
create or replace function public.release_order(p_order uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_status public.order_status;
begin
  select status into v_status from public.orders where id = p_order for update;
  if v_status is distinct from 'pending' then return false; end if;
  for r in select * from public.reservations where order_id = p_order and status = 'active' order by deal_id for update loop
    update public.deals set reserved_qty = greatest(reserved_qty - r.qty, 0) where id = r.deal_id;
    update public.reservations set status = 'released' where id = r.id;
  end loop;
  update public.orders set status = 'expired' where id = p_order;
  return true;
end $$;

-- Pending orders whose reservation ran out (optionally only for one deal). Returns how many.
create or replace function public.release_expired(p_deal uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_count int := 0;
begin
  for v_order in
    select distinct r.order_id from public.reservations r
    where r.status = 'active' and r.expires_at < now() and (p_deal is null or r.deal_id = p_deal)
  loop
    if public.release_order(v_order) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end $$;

-- Application fee of a tenant for an amount: tenant override, else plan; never above the amount.
create or replace function public.application_fee(p_tenant uuid, p_amount int) returns int
language sql stable security definer set search_path = public as $$
  select least(p_amount, greatest(0,
    round(p_amount * coalesce(t.fee_override_bps, p.application_fee_bps) / 10000.0)::int
    + coalesce(t.fee_override_fixed, p.application_fee_fixed)))
  from public.tenants t join public.plans p on p.id = t.plan_id
  where t.id = p_tenant;
$$;

/*
 * Start of a checkout: checks the deal (published, live shop, sales window, stock, limits per
 * order and per buyer), reserves the quantity and creates the pending order. The deal row is
 * locked, so two buyers of the last item cannot both get it. Errors are `checkout:<reason>`.
 */
create or replace function public.start_checkout(
  p_deal uuid, p_qty int, p_email text, p_name text, p_newsletter boolean, p_locale text, p_minutes int default 35
) returns table (order_id uuid, order_number text, amount_cents int, fee_cents int, currency text, title text, unit_cents int, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  d public.deals%rowtype;
  v_currency text;
  v_email text := lower(trim(p_email));
  v_buyer uuid;
  v_bought int;
  v_order uuid;
  v_number text;
  v_amount int;
  v_fee int;
  v_expires timestamptz := now() + make_interval(mins => p_minutes);
begin
  if p_qty is null or p_qty < 1 or p_qty > 100 then raise exception 'checkout:quantity'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'checkout:email'; end if;

  -- Give back what abandoned checkouts still hold, then lock the deal.
  perform public.release_expired(p_deal);
  select * into d from public.deals where id = p_deal for update;
  if not found or d.state <> 'published' or not public.tenant_is_public(d.tenant_id) then raise exception 'checkout:unavailable'; end if;
  if not public.shop_legal_complete(d.tenant_id) then raise exception 'checkout:unavailable'; end if;
  if d.sales_start is not null and d.sales_start > now() then raise exception 'checkout:not_started'; end if;
  if d.sales_end is not null and d.sales_end <= now() then raise exception 'checkout:ended'; end if;
  if d.max_per_order is not null and p_qty > d.max_per_order then raise exception 'checkout:max_per_order'; end if;
  if d.total_qty is not null and d.total_qty - d.sold_qty - d.reserved_qty < p_qty then
    raise exception '%', case when d.total_qty - d.sold_qty - d.reserved_qty <= 0 then 'checkout:sold_out' else 'checkout:not_enough' end;
  end if;
  if d.max_per_buyer is not null then
    select coalesce(sum(i.qty), 0) into v_bought
    from public.order_items i join public.orders o on o.id = i.order_id
    where o.tenant_id = d.tenant_id and o.email = v_email and i.deal_id = d.id and o.status in ('paid', 'partially_refunded');
    v_bought := v_bought + coalesce((select sum(r.qty) from public.reservations r where r.deal_id = d.id and r.email = v_email and r.status = 'active'), 0);
    if v_bought + p_qty > d.max_per_buyer then raise exception 'checkout:max_per_buyer'; end if;
  end if;

  select t.currency into v_currency from public.tenants t where t.id = d.tenant_id;
  insert into public.buyers (tenant_id, email, name) values (d.tenant_id, v_email, nullif(trim(p_name), ''))
  on conflict on constraint buyers_tenant_id_email_key do update set name = coalesce(excluded.name, buyers.name)
  returning id into v_buyer;

  v_amount := d.price_cents * p_qty;
  v_fee := coalesce(public.application_fee(d.tenant_id, v_amount), 0);
  loop
    v_number := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4) || '-' || substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from public.orders o where o.tenant_id = d.tenant_id and o.number = v_number);
  end loop;

  insert into public.orders (tenant_id, buyer_id, number, email, name, locale, newsletter, currency, amount_cents, fee_cents)
  values (d.tenant_id, v_buyer, v_number, v_email, nullif(trim(p_name), ''), coalesce(p_locale, 'de'), coalesce(p_newsletter, false), v_currency, v_amount, v_fee)
  returning id into v_order;
  insert into public.order_items (tenant_id, order_id, deal_id, title, qty, unit_cents, total_cents)
  values (d.tenant_id, v_order, d.id, d.title, p_qty, d.price_cents, v_amount);
  insert into public.reservations (tenant_id, order_id, deal_id, email, qty, expires_at)
  values (d.tenant_id, v_order, d.id, v_email, p_qty, v_expires);
  update public.deals set reserved_qty = reserved_qty + p_qty where id = d.id;

  return query select v_order, v_number, v_amount, v_fee, v_currency, d.title, d.price_cents, v_expires;
end $$;

/*
 * A paid checkout: reservation → sold, order → paid. Idempotent (a repeated webhook or the
 * return page after the webhook change nothing). Returns the order id, null for an unknown session.
 */
create or replace function public.fulfil_order(p_session text, p_payment_intent text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  r record;
  d public.deals%rowtype;
  v_oversold boolean := false;
begin
  select * into o from public.orders where stripe_session_id = p_session for update;
  if not found then return null; end if;
  if o.status not in ('pending', 'expired') then return o.id; end if;

  for r in select * from public.reservations where order_id = o.id and status <> 'converted' order by deal_id for update loop
    select * into d from public.deals where id = r.deal_id for update;
    if r.status = 'active' then
      update public.deals set reserved_qty = greatest(reserved_qty - r.qty, 0), sold_qty = sold_qty + r.qty where id = r.deal_id;
    else
      -- Released before the payment arrived: sell from free stock; if there is none, the
      -- buyer still gets the voucher (they paid) and the shop's quantity grows to match.
      if d.total_qty is not null and d.total_qty - d.sold_qty - d.reserved_qty < r.qty then
        v_oversold := true;
        update public.deals set total_qty = d.sold_qty + d.reserved_qty + r.qty, sold_qty = sold_qty + r.qty where id = r.deal_id;
      else
        update public.deals set sold_qty = sold_qty + r.qty where id = r.deal_id;
      end if;
    end if;
    update public.reservations set status = 'converted' where id = r.id;
  end loop;

  update public.orders
  set status = 'paid', paid_at = now(), stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent), oversold = v_oversold
  where id = o.id;
  if o.newsletter then
    update public.buyers set newsletter_opt_in_at = coalesce(newsletter_opt_in_at, now()) where id = o.buyer_id;
  end if;
  return o.id;
end $$;

-- Refund state from Stripe (absolute amount refunded so far, so repeats are harmless).
create or replace function public.record_refund(p_payment_intent text, p_refunded int) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where stripe_payment_intent = p_payment_intent for update;
  if not found or o.status not in ('paid', 'partially_refunded', 'refunded') then return null; end if;
  update public.orders
  set refunded_cents = greatest(o.refunded_cents, p_refunded),
      status = case when greatest(o.refunded_cents, p_refunded) >= o.amount_cents then 'refunded'::public.order_status
                    when greatest(o.refunded_cents, p_refunded) > 0 then 'partially_refunded'::public.order_status
                    else o.status end
  where id = o.id;
  return o.id;
end $$;

-- Puts the quantities of a (refunded) order back on sale, once.
create or replace function public.restock_order(p_order uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  i record;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.restocked or o.status not in ('refunded', 'partially_refunded') then return false; end if;
  for i in select * from public.order_items where order_id = o.id and deal_id is not null order by deal_id loop
    update public.deals set sold_qty = greatest(sold_qty - i.qty, 0) where id = i.deal_id;
  end loop;
  update public.orders set restocked = true where id = o.id;
  return true;
end $$;

revoke all on function public.release_order(uuid) from public, anon, authenticated;
revoke all on function public.release_expired(uuid) from public, anon, authenticated;
revoke all on function public.application_fee(uuid, int) from public, anon, authenticated;
revoke all on function public.start_checkout(uuid, int, text, text, boolean, text, int) from public, anon, authenticated;
revoke all on function public.fulfil_order(text, text) from public, anon, authenticated;
revoke all on function public.record_refund(text, int) from public, anon, authenticated;
revoke all on function public.restock_order(uuid) from public, anon, authenticated;
grant execute on function public.release_order(uuid) to service_role;
grant execute on function public.release_expired(uuid) to service_role;
grant execute on function public.application_fee(uuid, int) to service_role;
grant execute on function public.start_checkout(uuid, int, text, text, boolean, text, int) to service_role;
grant execute on function public.fulfil_order(text, text) to service_role;
grant execute on function public.record_refund(text, int) to service_role;
grant execute on function public.restock_order(uuid) to service_role;

-- ---------------------------------------------------------------- shop profile
-- Adds `payments_ready`: the buy button only works when the shop's Stripe account can charge.
drop function if exists public.shop_profile(uuid);
create or replace function public.shop_profile(p_tenant uuid)
returns table (tenant_id uuid, slug text, name text, locale text, currency text, theme jsonb, settings jsonb, legal_complete boolean, primary_host text, payments_ready boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale, t.currency,
         coalesce((select th.published from public.shop_themes th where th.tenant_id = t.id), '{}'::jsonb),
         jsonb_build_object(
           'contact_email', t.shop_settings->>'contact_email',
           'contact_phone', t.shop_settings->>'contact_phone',
           'ga4_id', t.shop_settings->>'ga4_id',
           'meta_pixel_id', t.shop_settings->>'meta_pixel_id',
           'seo_description', t.shop_settings->>'seo_description'
         ),
         public.shop_legal_complete(t.id),
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary),
         coalesce((select s.charges_enabled from public.stripe_accounts s where s.tenant_id = t.id), false)
  from public.tenants t
  where t.id = p_tenant and t.status in ('trial', 'active');
$$;
grant execute on function public.shop_profile(uuid) to anon, authenticated;
