-- Phase 4 (part 1): vouchers, code pools, redemptions.
-- Vouchers are issued when an order is paid (fulfil_order), redeemed through redeem_voucher
-- (row lock: a voucher can never be redeemed twice) and voided when the order is fully refunded.

create extension if not exists pgcrypto with schema extensions;

create type public.voucher_status as enum ('valid', 'redeemed', 'expired', 'refunded', 'void');
create type public.redemption_source as enum ('dashboard', 'pwa', 'api');

create table public.code_pool (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  code text not null check (length(code) between 1 and 120),
  voucher_id uuid,
  created_at timestamptz not null default now(),
  unique (deal_id, code)
);
create index code_pool_free_idx on public.code_pool (deal_id) where voucher_id is null;

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  partner_id uuid references public.partners (id) on delete set null,
  -- Snapshot of the deal at purchase.
  title text not null,
  code_format public.code_format not null,
  barcode_type public.barcode_type,
  -- What people read and type (grouped, no 0/O/1/I/L) and what the barcode encodes.
  code text not null,
  -- Secret for the check link /v/<token> (128 bit); never shown as text.
  token text not null unique,
  value_cents int check (value_cents is null or value_cents > 0),
  remaining_cents int check (remaining_cents is null or remaining_cents >= 0),
  partial boolean not null default false,
  valid_until timestamptz,
  status public.voucher_status not null default 'valid',
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index vouchers_order_idx on public.vouchers (order_id);
create index vouchers_deal_idx on public.vouchers (deal_id);
create index vouchers_tenant_created_idx on public.vouchers (tenant_id, created_at desc);
alter table public.code_pool add constraint code_pool_voucher_fk foreign key (voucher_id) references public.vouchers (id) on delete set null;

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  voucher_id uuid not null references public.vouchers (id) on delete cascade,
  amount_cents int check (amount_cents is null or amount_cents > 0),
  user_id uuid references auth.users (id) on delete set null,
  partner_id uuid references public.partners (id) on delete set null,
  location_id uuid references public.partner_locations (id) on delete set null,
  source public.redemption_source not null default 'dashboard',
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid references auth.users (id) on delete set null
);
create index redemptions_tenant_created_idx on public.redemptions (tenant_id, created_at desc);
create index redemptions_voucher_idx on public.redemptions (voucher_id);

alter table public.code_pool enable row level security;
alter table public.vouchers enable row level security;
alter table public.redemptions enable row level security;

-- Who may redeem: staff of the shop, redeemers, and partners for their own deals.
create or replace function public.can_redeem(p_tenant uuid, p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = auth.uid()
      and (m.role in ('owner', 'admin', 'editor', 'redeemer') or (m.role = 'partner' and m.partner_id is not null and m.partner_id = p_partner))
  ) or public.is_staff();
$$;

create policy code_pool_read on public.code_pool for select using (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]));
create policy vouchers_read on public.vouchers for select using (public.can_see_orders(tenant_id) or public.can_redeem(tenant_id, partner_id));
create policy redemptions_read on public.redemptions for select using (public.can_see_orders(tenant_id) or user_id = auth.uid());

-- Readable code: groups of four from an alphabet without look-alikes (0/O, 1/I/L).
create or replace function public.voucher_code_text(p_groups int default 3) returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(p_groups * 4);
  out text := '';
begin
  for i in 0 .. p_groups * 4 - 1 loop
    if i > 0 and i % 4 = 0 then out := out || '-'; end if;
    out := out || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;
  return out;
end $$;

-- n random digits.
create or replace function public.random_digits(n int) returns text
language plpgsql volatile set search_path = public as $$
declare
  bytes bytea := extensions.gen_random_bytes(n);
  out text := '';
begin
  for i in 0 .. n - 1 loop out := out || (get_byte(bytes, i) % 10)::text; end loop;
  return out;
end $$;

-- GS1 check digit (EAN-8/13, UPC-A, ITF-14).
create or replace function public.gs1_check(p_digits text) returns text
language plpgsql immutable set search_path = public as $$
declare
  s int := 0;
  n int := length(p_digits);
begin
  for i in 1 .. n loop
    s := s + substr(p_digits, n - i + 1, 1)::int * (case when i % 2 = 1 then 3 else 1 end);
  end loop;
  return ((10 - s % 10) % 10)::text;
end $$;

-- A new code in the deal's format. Barcodes that only take digits get a valid check digit; the
-- leading 2 marks in-store numbers (no clash with product barcodes).
create or replace function public.new_voucher_code(p_format public.code_format, p_barcode public.barcode_type) returns text
language plpgsql volatile set search_path = public as $$
declare
  body text;
begin
  if p_format = 'numeric' then
    body := public.random_digits(12);
    return substr(body, 1, 4) || ' ' || substr(body, 5, 4) || ' ' || substr(body, 9, 4);
  end if;
  if p_format = 'barcode' and p_barcode in ('ean13', 'ean8', 'upca', 'itf14') then
    body := '2' || public.random_digits(case p_barcode when 'ean13' then 11 when 'ean8' then 6 when 'upca' then 10 else 12 end);
    return body || public.gs1_check(body);
  end if;
  return public.voucher_code_text(3);
end $$;

-- End of validity for a voucher bought now (end of the given day in Zurich, or n days later).
create or replace function public.voucher_valid_until(d public.deals, p_from timestamptz) returns timestamptz
language sql stable set search_path = public as $$
  select case d.redeem_validity
    when 'until_date' then ((d.redeem_until + 1)::timestamp at time zone 'Europe/Zurich')
    when 'days_after_purchase' then p_from + make_interval(days => d.redeem_days)
    else null end;
$$;

-- Issues the vouchers of a paid order (once per order item; safe to call again).
create or replace function public.issue_vouchers(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  i record;
  d public.deals%rowtype;
  v_code text;
  v_pool uuid;
  v_id uuid;
  v_count int := 0;
  v_has_deal boolean;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.status not in ('paid', 'partially_refunded') then return 0; end if;
  for i in select * from public.order_items where order_id = o.id order by id loop
    if exists (select 1 from public.vouchers where order_item_id = i.id) then continue; end if;
    d := null;
    select * into d from public.deals where id = i.deal_id;
    v_has_deal := found;
    for n in 1 .. i.qty loop
      v_pool := null;
      v_code := null;
      if v_has_deal and d.code_source = 'pool' then
        select id, code into v_pool, v_code from public.code_pool where deal_id = d.id and voucher_id is null order by created_at limit 1 for update skip locked;
        -- A pool code that is already in use in this shop is skipped (marked used).
        if v_pool is not null and exists (select 1 from public.vouchers where tenant_id = o.tenant_id and code = v_code) then
          v_pool := null;
          v_code := null;
        end if;
      end if;
      -- Generated code (no pool or pool empty): retry on the rare clash.
      if v_code is null then
        for attempt in 1 .. 8 loop
          v_code := public.new_voucher_code(coalesce(d.code_format, 'qr'), d.barcode_type);
          exit when not exists (select 1 from public.vouchers where tenant_id = o.tenant_id and code = v_code);
        end loop;
      end if;
      insert into public.vouchers (tenant_id, order_id, order_item_id, deal_id, partner_id, title, code_format, barcode_type, code, token, value_cents, remaining_cents, partial, valid_until)
      values (
        o.tenant_id, o.id, i.id, i.deal_id, d.partner_id, i.title, coalesce(d.code_format, 'qr'), d.barcode_type, v_code,
        translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_'),
        case when d.deal_type = 'value' then d.value_cents end,
        case when d.deal_type = 'value' then d.value_cents end,
        coalesce(d.deal_type = 'value' and d.partial_redemption, false),
        case when v_has_deal then public.voucher_valid_until(d, coalesce(o.paid_at, now())) end
      ) returning id into v_id;
      if v_pool is not null then update public.code_pool set voucher_id = v_id where id = v_pool; end if;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end $$;

-- fulfil_order: as before, plus issuing the vouchers in the same transaction.
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
  set status = 'paid', paid_at = now(), stripe_payment_intent = coalesce(nullif(p_payment_intent, ''), stripe_payment_intent), oversold = v_oversold
  where id = o.id;
  if o.newsletter then
    update public.buyers set newsletter_opt_in_at = coalesce(newsletter_opt_in_at, now()) where id = o.buyer_id;
  end if;
  perform public.issue_vouchers(o.id);
  return o.id;
end $$;

-- record_refund: a full refund takes the unused vouchers out of circulation.
create or replace function public.record_refund(p_payment_intent text, p_refunded int) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  v_total int;
begin
  select * into o from public.orders where stripe_payment_intent = p_payment_intent for update;
  if not found or o.status not in ('paid', 'partially_refunded', 'refunded') then return null; end if;
  v_total := greatest(o.refunded_cents, p_refunded);
  update public.orders
  set refunded_cents = v_total,
      status = case when v_total >= o.amount_cents then 'refunded'::public.order_status
                    when v_total > 0 then 'partially_refunded'::public.order_status
                    else o.status end
  where id = o.id;
  if v_total >= o.amount_cents then
    update public.vouchers set status = 'refunded' where order_id = o.id and status = 'valid';
  end if;
  return o.id;
end $$;

-- Is now inside the deal's redemption windows? (Empty list = any time; Zurich time, 1 = Monday.)
create or replace function public.in_redeem_window(p_windows jsonb, p_at timestamptz) returns boolean
language plpgsql stable set search_path = public as $$
declare
  local timestamp := p_at at time zone 'Europe/Zurich';
  dow int := extract(isodow from local)::int;
  t time := local::time;
  w jsonb;
begin
  if p_windows is null or jsonb_typeof(p_windows) <> 'array' or jsonb_array_length(p_windows) = 0 then return true; end if;
  for w in select * from jsonb_array_elements(p_windows) loop
    if w->'days' @> to_jsonb(dow) and t >= (w->>'from')::time and t < (w->>'to')::time then return true; end if;
  end loop;
  return false;
end $$;

-- Redeems a voucher for the signed-in user (row lock: never twice). Fixed deals and value
-- vouchers without partial use are redeemed in full; partial ones by `p_amount`.
create or replace function public.redeem_voucher(p_voucher uuid, p_amount int default null, p_source public.redemption_source default 'dashboard', p_location uuid default null, p_note text default null)
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
  if not public.can_redeem(v.tenant_id, v.partner_id) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
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

  insert into public.redemptions (tenant_id, voucher_id, amount_cents, user_id, partner_id, location_id, source, note)
  values (v.tenant_id, v.id, v_amount, auth.uid(), v.partner_id, p_location, p_source, nullif(trim(p_note), ''));
  update public.vouchers
  set remaining_cents = v_left,
      status = case when v_left is null or v_left = 0 then 'redeemed'::public.voucher_status else 'valid'::public.voucher_status end,
      redeemed_at = case when v_left is null or v_left = 0 then now() else redeemed_at end
  where id = v.id;
  return jsonb_build_object('ok', true, 'remaining', v_left);
end $$;

-- Undoes a redemption (owner/admin, within 7 days).
create or replace function public.undo_redemption(p_redemption uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.redemptions%rowtype;
  v public.vouchers%rowtype;
begin
  select * into r from public.redemptions where id = p_redemption for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not public.can_manage(r.tenant_id) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if r.undone_at is not null then return jsonb_build_object('ok', false, 'error', 'already_undone'); end if;
  if r.created_at < now() - interval '7 days' then return jsonb_build_object('ok', false, 'error', 'too_late'); end if;
  select * into v from public.vouchers where id = r.voucher_id for update;
  if v.status not in ('valid', 'redeemed') then return jsonb_build_object('ok', false, 'error', v.status::text); end if;
  update public.redemptions set undone_at = now(), undone_by = auth.uid() where id = r.id;
  update public.vouchers
  set remaining_cents = case when remaining_cents is null then null else remaining_cents + coalesce(r.amount_cents, 0) end,
      status = 'valid', redeemed_at = null
  where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- Voids an unused voucher (owner/admin), e.g. after a partial refund.
create or replace function public.void_voucher(p_voucher uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
begin
  select * into v from public.vouchers where id = p_voucher for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not public.can_manage(v.tenant_id) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if v.status <> 'valid' then return jsonb_build_object('ok', false, 'error', v.status::text); end if;
  update public.vouchers set status = 'void' where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- Finds a voucher by its code for someone who may redeem in this shop (spaces, dashes and case
-- do not matter). Returns the id or null.
create or replace function public.find_voucher(p_tenant uuid, p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select v.id from public.vouchers v
  where v.tenant_id = p_tenant
    and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(p_code, '[\s-]', '', 'g'))
    and public.can_redeem(v.tenant_id, v.partner_id)
  limit 1;
$$;

-- Public check page (/v/<token>): only what the holder may see.
create or replace function public.voucher_public(p_token text)
returns table (tenant_id uuid, title text, code text, code_format public.code_format, barcode_type public.barcode_type, status public.voucher_status, value_cents int, remaining_cents int, valid_until timestamptz, partner_name text, deal_slug text, currency text)
language sql stable security definer set search_path = public as $$
  select v.tenant_id, v.title, v.code, v.code_format, v.barcode_type,
         case when v.status = 'valid' and v.valid_until is not null and v.valid_until <= now() then 'expired'::public.voucher_status else v.status end,
         v.value_cents, v.remaining_cents, v.valid_until, p.name, d.slug, o.currency
  from public.vouchers v
  join public.orders o on o.id = v.order_id
  left join public.partners p on p.id = v.partner_id
  left join public.deals d on d.id = v.deal_id
  where v.token = p_token and length(p_token) >= 20;
$$;

revoke all on function public.issue_vouchers(uuid) from public, anon, authenticated;
grant execute on function public.issue_vouchers(uuid) to service_role;
revoke all on function public.voucher_code_text(int), public.random_digits(int), public.new_voucher_code(public.code_format, public.barcode_type) from public, anon, authenticated;
revoke all on function public.redeem_voucher(uuid, int, public.redemption_source, uuid, text), public.undo_redemption(uuid), public.void_voucher(uuid), public.find_voucher(uuid, text) from public, anon;
grant execute on function public.redeem_voucher(uuid, int, public.redemption_source, uuid, text), public.undo_redemption(uuid), public.void_voucher(uuid), public.find_voucher(uuid, text) to authenticated;
grant execute on function public.voucher_public(text) to anon, authenticated;

-- Orders paid before this migration get their vouchers now.
do $$
declare o record;
begin
  for o in select id from public.orders where status in ('paid', 'partially_refunded') loop
    perform public.issue_vouchers(o.id);
  end loop;
end $$;
