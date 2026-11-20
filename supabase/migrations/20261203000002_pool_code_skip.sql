-- Pool codes: skip a code that a voucher of the shop already uses (before, the same code was
-- picked again for every voucher and the pool fell back to generated codes).
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
        -- The oldest free pool code that is not already used by a voucher of this shop.
        select p.id, p.code into v_pool, v_code from public.code_pool p
        where p.deal_id = d.id and p.voucher_id is null
          and not exists (select 1 from public.vouchers x where x.tenant_id = o.tenant_id and x.code = p.code)
        order by p.created_at limit 1 for update of p skip locked;
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
