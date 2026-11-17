-- Phase 4 (part 3): code pools as stock (auto-stop), sign-in codes for the redemption app on
-- the shop domain, voucher PDF designs.

-- ---------------------------------------------------------------- code pools
-- Free codes per deal, kept by a trigger. For pool deals, the shop sells at most
-- pool_free - reserved_qty more units: an empty pool stops sales by itself.
alter table public.deals add column pool_free int not null default 0 check (pool_free >= 0);

create or replace function public.deals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.sold_qty := 0;
    new.reserved_qty := 0;
    new.pool_free := 0;
  elsif new.sold_qty is distinct from old.sold_qty or new.reserved_qty is distinct from old.reserved_qty or new.tenant_id is distinct from old.tenant_id
     or (new.pool_free is distinct from old.pool_free and coalesce(current_setting('sellycat.pool_sync', true), '') <> '1') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new.state = 'published' and (tg_op = 'INSERT' or old.state <> 'published') then new.published_at := now(); end if;
  return new;
end $$;

create or replace function public.code_pool_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_delta int := 0;
  v_deal uuid;
begin
  if tg_op = 'INSERT' then
    v_deal := new.deal_id;
    v_delta := case when new.voucher_id is null then 1 else 0 end;
  elsif tg_op = 'DELETE' then
    v_deal := old.deal_id;
    v_delta := case when old.voucher_id is null then -1 else 0 end;
  else
    v_deal := new.deal_id;
    v_delta := (case when new.voucher_id is null then 1 else 0 end) - (case when old.voucher_id is null then 1 else 0 end);
  end if;
  if v_delta <> 0 then
    perform set_config('sellycat.pool_sync', '1', true);
    update public.deals set pool_free = greatest(pool_free + v_delta, 0) where id = v_deal;
    perform set_config('sellycat.pool_sync', '', true);
  end if;
  return null;
end $$;
create trigger code_pool_count after insert or update of voucher_id or delete on public.code_pool for each row execute function public.code_pool_count();

do $$ begin
  perform set_config('sellycat.pool_sync', '1', true);
  update public.deals d set pool_free = (select count(*) from public.code_pool c where c.deal_id = d.id and c.voucher_id is null);
end $$;

-- Adds codes to a deal's pool (editor and up). Blank lines and duplicates are skipped.
create or replace function public.import_pool_codes(p_deal uuid, p_codes text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.deals%rowtype;
  v_clean text[];
  v_added int;
begin
  select * into d from public.deals where id = p_deal;
  if not found or not (public.can_manage(d.tenant_id) or public.has_tenant_role(d.tenant_id, array['editor']::public.member_role[])) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if coalesce(array_length(p_codes, 1), 0) > 20000 then return jsonb_build_object('ok', false, 'error', 'too_many'); end if;
  select coalesce(array_agg(distinct c), '{}') into v_clean
  from (select trim(x) as c from unnest(p_codes) as x) s
  where c <> '' and length(c) <= 120;
  with ins as (
    insert into public.code_pool (tenant_id, deal_id, code)
    select d.tenant_id, d.id, c from unnest(v_clean) as c
    where not exists (select 1 from public.vouchers v where v.tenant_id = d.tenant_id and v.code = c)
    on conflict (deal_id, code) do nothing
    returning 1
  )
  select count(*) into v_added from ins;
  return jsonb_build_object('ok', true, 'added', v_added, 'skipped', coalesce(array_length(p_codes, 1), 0) - v_added);
end $$;

-- Removes the codes of a deal's pool that were not handed out yet (owner/admin/editor).
create or replace function public.clear_pool_codes(p_deal uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.deals%rowtype;
  v_removed int;
begin
  select * into d from public.deals where id = p_deal;
  if not found or not (public.can_manage(d.tenant_id) or public.has_tenant_role(d.tenant_id, array['editor']::public.member_role[])) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  with del as (delete from public.code_pool where deal_id = d.id and voucher_id is null returning 1)
  select count(*) into v_removed from del;
  return jsonb_build_object('ok', true, 'removed', v_removed);
end $$;

revoke all on function public.import_pool_codes(uuid, text[]), public.clear_pool_codes(uuid) from public, anon;
grant execute on function public.import_pool_codes(uuid, text[]), public.clear_pool_codes(uuid) to authenticated;
revoke all on function public.code_pool_count() from public, anon, authenticated;

-- start_checkout: as before, plus the pool as a stock limit.
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
  v_left int;
  v_expires timestamptz := now() + make_interval(mins => p_minutes);
begin
  if p_qty is null or p_qty < 1 or p_qty > 100 then raise exception 'checkout:quantity'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'checkout:email'; end if;

  perform public.release_expired(p_deal);
  select * into d from public.deals where id = p_deal for update;
  if not found or d.state <> 'published' or not public.tenant_is_public(d.tenant_id) then raise exception 'checkout:unavailable'; end if;
  if not public.shop_legal_complete(d.tenant_id) then raise exception 'checkout:unavailable'; end if;
  if d.sales_start is not null and d.sales_start > now() then raise exception 'checkout:not_started'; end if;
  if d.sales_end is not null and d.sales_end <= now() then raise exception 'checkout:ended'; end if;
  if d.max_per_order is not null and p_qty > d.max_per_order then raise exception 'checkout:max_per_order'; end if;
  v_left := case when d.total_qty is null then null else d.total_qty - d.sold_qty - d.reserved_qty end;
  if d.code_source = 'pool' then v_left := least(coalesce(v_left, d.pool_free - d.reserved_qty), d.pool_free - d.reserved_qty); end if;
  if v_left is not null and v_left < p_qty then
    raise exception '%', case when v_left <= 0 then 'checkout:sold_out' else 'checkout:not_enough' end;
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

-- ---------------------------------------------------------------- redemption app
-- Six-digit sign-in codes for /redeem on a shop domain (only the SHA-256 is stored; service role only).
create table public.redeem_logins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email citext not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index redeem_logins_lookup_idx on public.redeem_logins (tenant_id, email, created_at desc);
alter table public.redeem_logins enable row level security;

-- May the signed-in user use the redemption app of this shop? (staff, shop team, redeemers, partners)
create or replace function public.can_use_redeem(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = auth.uid() and m.role in ('owner', 'admin', 'editor', 'redeemer', 'partner')
  ) or public.is_staff();
$$;

-- Finds a voucher by its check-link token (the QR code) for someone who may redeem it here.
create or replace function public.find_voucher_by_token(p_tenant uuid, p_token text) returns uuid
language sql stable security definer set search_path = public as $$
  select v.id from public.vouchers v
  where v.tenant_id = p_tenant and v.token = p_token and length(p_token) >= 20
    and public.can_redeem(v.tenant_id, v.partner_id)
  limit 1;
$$;

revoke all on function public.can_use_redeem(uuid), public.find_voucher_by_token(uuid, text) from public, anon;
grant execute on function public.can_use_redeem(uuid), public.find_voucher_by_token(uuid, text) to authenticated;

-- ---------------------------------------------------------------- voucher designs
create table public.voucher_designs (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  layout text not null default 'classic' check (layout in ('classic', 'ticket', 'minimal')),
  size text not null default 'a4' check (size in ('a4', 'a6')),
  accent text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  show_image boolean not null default true,
  show_locations boolean not null default true,
  show_terms boolean not null default true,
  note text check (note is null or length(note) <= 400),
  updated_at timestamptz not null default now()
);
create trigger voucher_designs_updated before update on public.voucher_designs for each row execute function public.set_updated_at();
alter table public.voucher_designs enable row level security;
create policy voucher_designs_read on public.voucher_designs for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy voucher_designs_insert on public.voucher_designs for insert with check (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]));
create policy voucher_designs_update on public.voucher_designs for update
  using (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]))
  with check (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]));
