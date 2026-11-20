-- Public API (keys per shop) and webhooks (endpoints, events, deliveries).
-- Keys are stored only as SHA-256; webhook secrets are readable only by the server.
-- Events are written by deferred triggers (at commit), so every path that pays, refunds or
-- redeems produces them; the app delivers them (signed, retried) through the SSRF-safe fetch.

-- ---------------------------------------------------------------- plan flag
update public.plans set limits = limits || jsonb_build_object('api', id in ('pro', 'business'))
where not (limits ? 'api');

-- ---------------------------------------------------------------- api keys
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  prefix text not null check (length(prefix) between 8 and 20),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default array['read'] check (scopes <@ array['read', 'redeem'] and array_length(scopes, 1) >= 1),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_tenant_idx on public.api_keys (tenant_id, created_at desc);
alter table public.api_keys enable row level security;
create policy api_keys_select on public.api_keys for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.api_keys from anon, authenticated;
grant select (id, tenant_id, name, prefix, scopes, created_by, created_at, last_used_at, revoked_at) on public.api_keys to authenticated;

alter table public.redemptions add column api_key_id uuid references public.api_keys (id) on delete set null;

-- Server: key → shop (only active keys of shops whose plan includes the API). Marks the key as used
-- (at most once a minute, to keep writes low).
create or replace function public.api_key_auth(p_hash text)
returns table (key_id uuid, tenant_id uuid, scopes text[])
language plpgsql security definer set search_path = public as $$
declare
  k public.api_keys%rowtype;
begin
  select * into k from public.api_keys a where a.key_hash = p_hash and a.revoked_at is null;
  if not found then return; end if;
  if not exists (select 1 from public.tenants t where t.id = k.tenant_id and t.status in ('trial', 'active')) then return; end if;
  if not public.plan_allows(k.tenant_id, 'api') then return; end if;
  if k.last_used_at is null or k.last_used_at < now() - interval '1 minute' then
    update public.api_keys set last_used_at = now() where id = k.id;
  end if;
  return query select k.id, k.tenant_id, k.scopes;
end $$;
revoke all on function public.api_key_auth(text) from public, anon, authenticated;
grant execute on function public.api_key_auth(text) to service_role;

-- ---------------------------------------------------------------- webhooks
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  url text not null check (url ~ '^https://' and length(url) <= 500),
  description text check (description is null or length(description) <= 120),
  events text[] not null check (array_length(events, 1) >= 1 and events <@ array['order.paid', 'order.refunded', 'voucher.redeemed', 'voucher.redemption_undone', 'voucher.voided']),
  secret text not null check (length(secret) >= 32),
  enabled boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index webhook_endpoints_tenant_idx on public.webhook_endpoints (tenant_id);
alter table public.webhook_endpoints enable row level security;
create policy webhook_endpoints_select on public.webhook_endpoints for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.webhook_endpoints from anon, authenticated;
grant select (id, tenant_id, url, description, events, enabled, created_by, created_at) on public.webhook_endpoints to authenticated;

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index webhook_events_tenant_idx on public.webhook_events (tenant_id, created_at desc);
alter table public.webhook_events enable row level security;
create policy webhook_events_select on public.webhook_events for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.webhook_events from anon, authenticated;
grant select on public.webhook_events to authenticated;

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event_id uuid not null references public.webhook_events (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'succeeded', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_status int,
  last_error text,
  created_at timestamptz not null default now(),
  unique (endpoint_id, event_id)
);
create index webhook_deliveries_due_idx on public.webhook_deliveries (next_attempt_at) where status = 'pending';
create index webhook_deliveries_endpoint_idx on public.webhook_deliveries (endpoint_id, created_at desc);
alter table public.webhook_deliveries enable row level security;
create policy webhook_deliveries_select on public.webhook_deliveries for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.webhook_deliveries from anon, authenticated;
grant select on public.webhook_deliveries to authenticated;

-- Server: claims due deliveries (status → sending), so parallel runs never send one twice.
-- Stuck "sending" rows (crashed run) become due again after 10 minutes.
create or replace function public.webhook_claim(p_limit int default 25, p_tenant uuid default null)
returns setof public.webhook_deliveries
language sql security definer set search_path = public as $$
  update public.webhook_deliveries d set status = 'sending', last_attempt_at = now()
  where d.id in (
    select x.id from public.webhook_deliveries x
    where ((x.status = 'pending' and x.next_attempt_at <= now()) or (x.status = 'sending' and x.last_attempt_at < now() - interval '10 minutes'))
      and (p_tenant is null or x.tenant_id = p_tenant)
    order by x.next_attempt_at
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  returning d.*;
$$;
revoke all on function public.webhook_claim(int, uuid) from public, anon, authenticated;
grant execute on function public.webhook_claim(int, uuid) to service_role;

-- ---------------------------------------------------------------- payloads (snapshots)
create or replace function public.webhook_voucher(p_voucher uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', v.id, 'code', v.code, 'title', v.title, 'status',
    case when v.status = 'valid' and v.valid_until is not null and v.valid_until <= now() then 'expired' else v.status::text end,
    'deal_id', v.deal_id, 'partner_id', v.partner_id, 'order_id', v.order_id,
    'value_cents', v.value_cents, 'remaining_cents', v.remaining_cents, 'partial', v.partial,
    'valid_until', v.valid_until, 'redeemed_at', v.redeemed_at, 'created_at', v.created_at)
  from public.vouchers v where v.id = p_voucher;
$$;

create or replace function public.webhook_order(p_order uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.number, 'status', o.status, 'email', o.email, 'name', o.name,
    'locale', o.locale, 'currency', o.currency, 'amount_cents', o.amount_cents,
    'refunded_cents', o.refunded_cents, 'newsletter', o.newsletter, 'gift', o.gift,
    'created_at', o.created_at, 'paid_at', o.paid_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('deal_id', i.deal_id, 'title', i.title, 'qty', i.qty, 'unit_cents', i.unit_cents, 'total_cents', i.total_cents) order by i.title)
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'vouchers', coalesce((select jsonb_agg(public.webhook_voucher(v.id) order by v.created_at, v.code)
                          from public.vouchers v where v.order_id = o.id), '[]'::jsonb))
  from public.orders o where o.id = p_order;
$$;

create or replace function public.webhook_redemption(p_redemption uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'amount_cents', r.amount_cents, 'source', r.source, 'partner_id', r.partner_id,
    'location_id', r.location_id, 'note', r.note, 'created_at', r.created_at, 'undone_at', r.undone_at,
    'voucher', public.webhook_voucher(r.voucher_id))
  from public.redemptions r where r.id = p_redemption;
$$;
revoke all on function public.webhook_voucher(uuid), public.webhook_order(uuid), public.webhook_redemption(uuid) from public, anon, authenticated;
grant execute on function public.webhook_voucher(uuid), public.webhook_order(uuid), public.webhook_redemption(uuid) to service_role;

-- Writes one event and a delivery per enabled endpoint that wants it (nothing without endpoints).
create or replace function public.webhook_enqueue(p_tenant uuid, p_type text, p_data jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_event uuid;
begin
  if p_data is null then return null; end if;
  if not exists (select 1 from public.webhook_endpoints e where e.tenant_id = p_tenant and e.enabled and p_type = any (e.events)) then return null; end if;
  if not public.plan_allows(p_tenant, 'api') then return null; end if;
  insert into public.webhook_events (tenant_id, type, data) values (p_tenant, p_type, p_data) returning id into v_event;
  insert into public.webhook_deliveries (tenant_id, endpoint_id, event_id)
  select p_tenant, e.id, v_event from public.webhook_endpoints e where e.tenant_id = p_tenant and e.enabled and p_type = any (e.events);
  return v_event;
end $$;
revoke all on function public.webhook_enqueue(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.webhook_enqueue(uuid, text, jsonb) to service_role;

-- ---------------------------------------------------------------- triggers (at commit)
create or replace function public.webhook_on_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.paid_at is null and new.paid_at is not null then
    perform public.webhook_enqueue(new.tenant_id, 'order.paid', public.webhook_order(new.id));
  end if;
  if new.refunded_cents > old.refunded_cents then
    perform public.webhook_enqueue(new.tenant_id, 'order.refunded',
      public.webhook_order(new.id) || jsonb_build_object('refund_cents', new.refunded_cents - old.refunded_cents));
  end if;
  return null;
end $$;
create constraint trigger orders_webhook after update on public.orders
deferrable initially deferred for each row execute function public.webhook_on_order();

create or replace function public.webhook_on_redemption() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.webhook_enqueue(new.tenant_id, 'voucher.redeemed', public.webhook_redemption(new.id));
  elsif old.undone_at is null and new.undone_at is not null then
    perform public.webhook_enqueue(new.tenant_id, 'voucher.redemption_undone', public.webhook_redemption(new.id));
  end if;
  return null;
end $$;
create constraint trigger redemptions_webhook after insert or update on public.redemptions
deferrable initially deferred for each row execute function public.webhook_on_redemption();

create or replace function public.webhook_on_voucher() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'void' and old.status <> 'void' then
    perform public.webhook_enqueue(new.tenant_id, 'voucher.voided', public.webhook_voucher(new.id));
  end if;
  return null;
end $$;
create constraint trigger vouchers_webhook after update of status on public.vouchers
deferrable initially deferred for each row execute function public.webhook_on_voucher();

revoke all on function public.webhook_on_order(), public.webhook_on_redemption(), public.webhook_on_voucher() from public, anon, authenticated;

-- ---------------------------------------------------------------- redemption via API
-- Shared core: the dashboard/app path checks can_redeem, the API path checks the shop of the key.
create or replace function public.redeem_apply(p_voucher uuid, p_amount int, p_source public.redemption_source, p_location uuid, p_note text, p_api_tenant uuid, p_api_key uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
  d public.deals%rowtype;
  v_amount int;
  v_left int;
begin
  select * into v from public.vouchers where id = p_voucher for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_api_tenant is null then
    if not public.can_redeem(v.tenant_id, v.partner_id) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  elsif v.tenant_id <> p_api_tenant then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v.status = 'valid' and v.valid_until is not null and v.valid_until <= now() then
    update public.vouchers set status = 'expired' where id = v.id;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v.status <> 'valid' then return jsonb_build_object('ok', false, 'error', v.status::text); end if;
  select * into d from public.deals where id = v.deal_id;
  if found and not public.in_redeem_window(d.redeem_windows, now()) then return jsonb_build_object('ok', false, 'error', 'outside_window'); end if;

  if v.remaining_cents is not null then
    v_amount := case when v.partial then coalesce(p_amount, v.remaining_cents) else v.remaining_cents end;
    if v_amount is null or v_amount <= 0 or v_amount > v.remaining_cents then return jsonb_build_object('ok', false, 'error', 'amount'); end if;
    v_left := v.remaining_cents - v_amount;
  end if;

  insert into public.redemptions (tenant_id, voucher_id, amount_cents, user_id, partner_id, location_id, source, note, api_key_id)
  values (v.tenant_id, v.id, v_amount, case when p_api_tenant is null then auth.uid() end, v.partner_id, p_location, p_source, nullif(trim(p_note), ''), p_api_key);
  update public.vouchers
  set remaining_cents = v_left,
      status = case when v_left is null or v_left = 0 then 'redeemed'::public.voucher_status else 'valid'::public.voucher_status end,
      redeemed_at = case when v_left is null or v_left = 0 then now() else redeemed_at end
  where id = v.id;
  return jsonb_build_object('ok', true, 'remaining', v_left, 'voucher', v.id);
end $$;
revoke all on function public.redeem_apply(uuid, int, public.redemption_source, uuid, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.redeem_voucher(p_voucher uuid, p_amount int default null, p_source public.redemption_source default 'dashboard', p_location uuid default null, p_note text default null)
returns jsonb
language sql security definer set search_path = public as $$
  select public.redeem_apply(p_voucher, p_amount, case when p_source = 'api' then 'dashboard'::public.redemption_source else p_source end, p_location, p_note, null, null);
$$;

-- Server (API key with "redeem"): voucher by code within the key's shop; the location must belong
-- to the voucher's partner.
create or replace function public.api_redeem_voucher(p_tenant uuid, p_key uuid, p_code text, p_amount int default null, p_location uuid default null, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
begin
  select * into v from public.vouchers x
  where x.tenant_id = p_tenant and upper(regexp_replace(x.code, '[\s-]', '', 'g')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'))
  limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_location is not null and not exists (
    select 1 from public.partner_locations l where l.id = p_location and l.tenant_id = p_tenant and (v.partner_id is null or l.partner_id = v.partner_id)
  ) then return jsonb_build_object('ok', false, 'error', 'location'); end if;
  return public.redeem_apply(v.id, p_amount, 'api', p_location, left(p_note, 500), p_tenant, p_key);
end $$;
revoke all on function public.api_redeem_voucher(uuid, uuid, text, int, uuid, text) from public, anon, authenticated;
grant execute on function public.api_redeem_voucher(uuid, uuid, text, int, uuid, text) to service_role;

-- Cleanup for the daily cron: delivered/failed events older than 30 days.
create or replace function public.webhook_prune() returns int
language sql security definer set search_path = public as $$
  with gone as (
    delete from public.webhook_events e where e.created_at < now() - interval '30 days'
      and not exists (select 1 from public.webhook_deliveries d where d.event_id = e.id and d.status in ('pending', 'sending'))
    returning 1)
  select count(*)::int from gone;
$$;
revoke all on function public.webhook_prune() from public, anon, authenticated;
grant execute on function public.webhook_prune() to service_role;
