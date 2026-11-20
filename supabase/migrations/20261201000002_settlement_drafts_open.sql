-- Items in a draft statement stay «open» in the overview (the draft is rebuilt on the next run).
create or replace function public.settlement_candidates(p_tenant uuid, p_partner uuid, p_cutoff timestamptz)
returns table (
  partner_id uuid, kind text, voucher_id uuid, redemption_id uuid, corrects uuid, deal_id uuid, deal_title text,
  code text, occurred_at timestamptz, base_cents int, commission_cents int, payout_cents int
)
language sql stable security definer set search_path = public as $$
  with priced as (
    select v.id as voucher_id, v.partner_id, v.deal_id, v.title, v.code, v.value_cents, v.status,
           d.settle_mode, d.settle_kind, d.settle_commission_bps, d.settle_payout_cents, o.paid_at,
           -- Price of this voucher after refunds of its order.
           case when o.amount_cents > 0
             then round(i.unit_cents::numeric * (o.amount_cents - o.refunded_cents) / o.amount_cents)
             else 0 end as price
    from public.vouchers v
    join public.deals d on d.id = v.deal_id
    join public.orders o on o.id = v.order_id
    left join public.order_items i on i.id = v.order_item_id
    where v.tenant_id = p_tenant and d.tenant_id = p_tenant and d.settle_mode <> 'off'
      and v.partner_id is not null and (p_partner is null or v.partner_id = p_partner)
      and o.paid_at is not null
  ),
  amounts as (
    -- share = part of the voucher this line stands for (1 = whole voucher).
    select p.*, s.share, s.kind, s.redemption_id, s.occurred_at
    from priced p
    cross join lateral (
      select 1::numeric as share, 'sale'::text as kind, null::uuid as redemption_id, p.paid_at as occurred_at
      where p.settle_mode = 'sale' and p.status not in ('refunded', 'void')
      union all
      select case when r.amount_cents is null or p.value_cents is null then 1::numeric
                  else least(1, r.amount_cents::numeric / p.value_cents) end,
             'redemption', r.id, r.created_at
      from public.redemptions r
      where p.settle_mode = 'redemption' and r.voucher_id = p.voucher_id and r.undone_at is null
    ) s
  ),
  fresh as (
    select a.partner_id, a.kind, a.voucher_id, a.redemption_id, null::uuid as corrects, a.deal_id, a.title as deal_title, a.code, a.occurred_at,
           round(a.price * a.share)::int as base_cents,
           case when a.settle_kind = 'fixed'
             then round(a.price * a.share)::int - round(coalesce(a.settle_payout_cents, 0) * a.share)::int
             else round(round(a.price * a.share) * a.settle_commission_bps / 10000.0)::int end as commission_cents
    from amounts a
    where a.occurred_at < p_cutoff
      -- Lines in a draft still count as open (the draft is rebuilt on the next run).
      and not exists (
        select 1 from public.partner_settlement_lines l
        join public.partner_settlements st on st.id = l.settlement_id and st.status <> 'draft'
        where (a.kind = 'sale' and l.kind = 'sale' and l.voucher_id = a.voucher_id)
           or (a.kind = 'redemption' and l.kind = 'redemption' and l.redemption_id = a.redemption_id)
      )
  ),
  -- Settled earlier, refunded or undone since: the line is reversed once.
  reversed as (
    select v.partner_id, 'correction'::text as kind, l.voucher_id, l.redemption_id, l.id as corrects, l.deal_id, l.deal_title, l.code,
           coalesce(r.undone_at, now()) as occurred_at, -l.base_cents as base_cents, -l.commission_cents as commission_cents
    from public.partner_settlement_lines l
    join public.partner_settlements st on st.id = l.settlement_id and st.status <> 'draft'
    join public.vouchers v on v.id = l.voucher_id
    left join public.redemptions r on r.id = l.redemption_id
    where l.tenant_id = p_tenant and l.kind in ('sale', 'redemption') and (p_partner is null or v.partner_id = p_partner)
      and ((l.kind = 'sale' and v.status in ('refunded', 'void')) or (l.kind = 'redemption' and r.undone_at is not null))
      and not exists (select 1 from public.partner_settlement_lines c join public.partner_settlements cs on cs.id = c.settlement_id and cs.status <> 'draft' where c.kind = 'correction' and c.corrects = l.id)
  )
  select f.partner_id, f.kind, f.voucher_id, f.redemption_id, f.corrects, f.deal_id, f.deal_title, f.code, f.occurred_at,
         f.base_cents, f.commission_cents, f.base_cents - f.commission_cents
  from fresh f
  union all
  select x.partner_id, x.kind, x.voucher_id, x.redemption_id, x.corrects, x.deal_id, x.deal_title, x.code, x.occurred_at,
         x.base_cents, x.commission_cents, x.base_cents - x.commission_cents
  from reversed x;
$$;
