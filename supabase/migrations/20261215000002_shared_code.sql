-- Shared code: every buyer of a deal gets the same code (own voucher, own check link). Plus fixes
-- of the code pool: no code in two deals, no publishing without codes.

-- ---------------------------------------------------------------- the code (never public)
-- Not a column of deals: those rows are readable by everyone once published.
create table public.deal_shared_codes (
  deal_id uuid primary key references public.deals (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null check (length(trim(code)) between 1 and 120),
  updated_at timestamptz not null default now()
);
create trigger deal_shared_codes_updated before update on public.deal_shared_codes for each row execute function public.set_updated_at();
alter table public.deal_shared_codes enable row level security;
create policy deal_shared_codes_read on public.deal_shared_codes for select using (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]));
create policy deal_shared_codes_insert on public.deal_shared_codes for insert with check ((public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[])) and exists (select 1 from public.deals d where d.id = deal_id and d.tenant_id = deal_shared_codes.tenant_id));
create policy deal_shared_codes_update on public.deal_shared_codes for update using (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[])) with check ((public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[])) and exists (select 1 from public.deals d where d.id = deal_id and d.tenant_id = deal_shared_codes.tenant_id));

-- ---------------------------------------------------------------- vouchers
alter table public.vouchers add column shared_code boolean not null default false;
alter table public.vouchers drop constraint vouchers_tenant_id_code_key;
create unique index vouchers_tenant_code_unique on public.vouchers (tenant_id, code) where not shared_code;
create index vouchers_shared_code_idx on public.vouchers (tenant_id, code) where shared_code;

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
  v_shared boolean;
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
      v_shared := false;
      if v_has_deal and d.code_source = 'pool' then
        -- The oldest free pool code that is not already used by a voucher of this shop.
        select p.id, p.code into v_pool, v_code from public.code_pool p
        where p.deal_id = d.id and p.voucher_id is null
          and not exists (select 1 from public.vouchers x where x.tenant_id = o.tenant_id and x.code = p.code)
        order by p.created_at limit 1 for update of p skip locked;
      end if;
      if v_has_deal and d.code_source = 'shared' then
        select s.code into v_code from public.deal_shared_codes s where s.deal_id = d.id;
        v_shared := v_code is not null;
      end if;
      -- Generated code: by choice, or because own codes ran out (paid after the reservation had
      -- expired): then the order is flagged, so the shop notices and can replace the code.
      if v_code is null and v_has_deal and d.code_source <> 'generated' then
        update public.orders set oversold = true where id = o.id;
      end if;
      if v_code is null then
        for attempt in 1 .. 8 loop
          v_code := public.new_voucher_code(coalesce(d.code_format, 'qr'), d.barcode_type);
          exit when not exists (select 1 from public.vouchers where tenant_id = o.tenant_id and code = v_code);
        end loop;
      end if;
      insert into public.vouchers (tenant_id, order_id, order_item_id, deal_id, partner_id, title, code_format, barcode_type, code, token, value_cents, remaining_cents, partial, valid_until, shared_code)
      values (
        o.tenant_id, o.id, i.id, i.deal_id, d.partner_id, i.title, coalesce(d.code_format, 'qr'), d.barcode_type, v_code,
        translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_'),
        case when d.deal_type = 'value' then d.value_cents end,
        case when d.deal_type = 'value' then d.value_cents end,
        coalesce(d.deal_type = 'value' and d.partial_redemption, false),
        case when v_has_deal then public.voucher_valid_until(d, coalesce(o.paid_at, now())) end,
        v_shared
      ) returning id into v_id;
      if v_pool is not null then update public.code_pool set voucher_id = v_id where id = v_pool; end if;
      -- The same code waiting in another deal's pool can never be handed out: it must not count as stock.
      if not v_shared then
        delete from public.code_pool where tenant_id = o.tenant_id and code = v_code and voucher_id is null;
      end if;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end $$;

revoke all on function public.issue_vouchers(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- lookups: a shared code names no single voucher
create or replace function public.find_voucher(p_tenant uuid, p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select v.id from public.vouchers v
  where v.tenant_id = p_tenant and not v.shared_code
    and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(p_code, '[\s-]', '', 'g'))
    and public.can_redeem(v.tenant_id, v.partner_id)
  limit 1;
$$;

-- 'qr' = scan the QR code of the single voucher, 'partner' = redeemed in the partner's own system.
create or replace function public.shared_code_hint(p_tenant uuid, p_code text) returns text
language sql stable security definer set search_path = public as $$
  select case when bool_or(v.code_format = 'qr') then 'qr' when count(*) > 0 then 'partner' end
  from public.vouchers v
  where v.tenant_id = p_tenant and v.shared_code
    and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(p_code, '[\s-]', '', 'g'))
    and public.can_redeem(v.tenant_id, v.partner_id);
$$;
revoke all on function public.shared_code_hint(uuid, text) from public, anon;
grant execute on function public.shared_code_hint(uuid, text) to authenticated;

create or replace function public.voucher_partner_hint(p_tenant uuid, p_code text, p_token text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(p.name, '')
  from public.vouchers v left join public.partners p on p.id = v.partner_id
  where public.can_use_redeem(p_tenant)
    and v.tenant_id = p_tenant
    and (not v.shared_code or v.token = p_token)
    and not public.can_redeem(v.tenant_id, v.partner_id)
    and (
      (p_token is not null and length(p_token) >= 20 and v.token = p_token)
      or (p_code is not null and length(p_code) >= 4 and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(p_code, '[\s-]', '', 'g')))
    )
  limit 1;
$$;

create or replace function public.api_find_voucher(p_tenant uuid, p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select v.id from public.vouchers v
  where v.tenant_id = p_tenant and not v.shared_code
    and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'))
  limit 1;
$$;

create or replace function public.api_redeem_voucher(p_tenant uuid, p_key uuid, p_code text, p_amount int default null, p_location uuid default null, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
begin
  select * into v from public.vouchers x
  where x.tenant_id = p_tenant and not x.shared_code and upper(regexp_replace(x.code, '[\s-]', '', 'g')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'))
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', case when exists (
      select 1 from public.vouchers x where x.tenant_id = p_tenant and x.shared_code and upper(regexp_replace(x.code, '[\s-]', '', 'g')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'))
    ) then 'shared_code' else 'not_found' end);
  end if;
  if p_location is not null and not exists (
    select 1 from public.partner_locations l where l.id = p_location and l.tenant_id = p_tenant and (v.partner_id is null or l.partner_id = v.partner_id)
  ) then return jsonb_build_object('ok', false, 'error', 'location'); end if;
  return public.redeem_apply(v.id, p_amount, 'api', p_location, left(p_note, 500), p_tenant, p_key);
end $$;

-- ---------------------------------------------------------------- code pool
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
      -- Waiting in another deal of the shop: it would be sold twice.
      and not exists (select 1 from public.code_pool q where q.tenant_id = d.tenant_id and q.code = c and q.deal_id <> d.id)
    on conflict (deal_id, code) do nothing
    returning 1
  )
  select count(*) into v_added from ins;
  return jsonb_build_object('ok', true, 'added', v_added, 'skipped', coalesce(array_length(p_codes, 1), 0) - v_added);
end $$;

-- Free pool codes that a voucher of the shop already uses can never be handed out: not stock.
delete from public.code_pool p
where p.voucher_id is null and exists (select 1 from public.vouchers v where v.tenant_id = p.tenant_id and v.code = p.code);

-- Publishing (or switching a live deal's code source) needs a code to hand out.
create or replace function public.deals_require_codes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or new.state <> 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.state = 'published' and new.code_source = old.code_source then return new; end if;
  if new.code_source = 'pool' and not exists (select 1 from public.code_pool c where c.deal_id = new.id and c.voucher_id is null) then
    raise exception 'codes missing' using errcode = 'P0001';
  end if;
  if new.code_source = 'shared' and not exists (select 1 from public.deal_shared_codes s where s.deal_id = new.id) then
    raise exception 'codes missing' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.deals_require_codes() from public, anon, authenticated;
create trigger deals_require_codes before insert or update on public.deals for each row execute function public.deals_require_codes();
