-- Phase 7 (part 5): partner settlements. Per deal the shop decides whether its partner is paid out
-- through Sellycat statements (off / after sale / after redemption) and how (commission in % or a
-- fixed amount per voucher). A statement collects everything not yet settled up to a date; it is a
-- draft until finalised (then numbered and locked), and the shop pays the partner itself.

alter table public.deals
  add column settle_mode text not null default 'off' check (settle_mode in ('off', 'sale', 'redemption')),
  add column settle_kind text not null default 'percent' check (settle_kind in ('percent', 'fixed')),
  -- Commission the shop keeps (basis points of the price paid).
  add column settle_commission_bps int not null default 0 check (settle_commission_bps between 0 and 10000),
  -- Fixed payout to the partner per voucher (fixed kind).
  add column settle_payout_cents int check (settle_payout_cents is null or settle_payout_cents >= 0);

-- Billing details of a partner for statements: {"legal_name", "street", "zip", "city", "country", "vat_no", "iban"}.
alter table public.partners add column billing jsonb not null default '{}'::jsonb;

create table public.partner_settlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  partner_id uuid references public.partners (id) on delete set null,
  -- Sequential per shop, given when the statement is finalised (drafts have none).
  number int,
  status text not null default 'draft' check (status in ('draft', 'final', 'paid')),
  period_from date,
  period_to date not null,
  currency text not null,
  base_cents bigint not null default 0,
  commission_cents bigint not null default 0,
  payout_cents bigint not null default 0,
  -- Snapshot of the partner (name, billing, email) at creation / finalisation.
  partner jsonb not null default '{}'::jsonb,
  note text check (note is null or char_length(note) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  paid_at timestamptz,
  sent_at timestamptz,
  unique (tenant_id, number)
);
create index partner_settlements_tenant_idx on public.partner_settlements (tenant_id, created_at desc);
-- One open draft per partner: a new run replaces it.
create unique index partner_settlements_one_draft on public.partner_settlements (tenant_id, partner_id) where status = 'draft';

create table public.partner_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.partner_settlements (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in ('sale', 'redemption', 'correction')),
  voucher_id uuid references public.vouchers (id) on delete set null,
  redemption_id uuid references public.redemptions (id) on delete set null,
  corrects uuid references public.partner_settlement_lines (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  deal_title text not null,
  code text not null,
  occurred_at timestamptz not null,
  base_cents int not null,
  commission_cents int not null,
  payout_cents int not null
);
create index partner_settlement_lines_settlement_idx on public.partner_settlement_lines (settlement_id, occurred_at);
-- Nothing is settled twice.
create unique index partner_settlement_lines_sale on public.partner_settlement_lines (voucher_id) where kind = 'sale';
create unique index partner_settlement_lines_redemption on public.partner_settlement_lines (redemption_id) where kind = 'redemption';
create unique index partner_settlement_lines_correction on public.partner_settlement_lines (corrects) where kind = 'correction';

alter table public.partner_settlements enable row level security;
alter table public.partner_settlement_lines enable row level security;
-- Money matters: owners, admins and staff read; all writes through the functions below.
create policy partner_settlements_read on public.partner_settlements for select using (public.can_manage(tenant_id));
create policy partner_settlement_lines_read on public.partner_settlement_lines for select using (public.can_manage(tenant_id));

-- What is still to settle for a shop (one partner or all) up to a moment. Prices are the price paid,
-- net of refunds; after-redemption lines take the redeemed share of the voucher value.
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
      and not exists (
        select 1 from public.partner_settlement_lines l
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
      and not exists (select 1 from public.partner_settlement_lines c where c.kind = 'correction' and c.corrects = l.id)
  )
  select f.partner_id, f.kind, f.voucher_id, f.redemption_id, f.corrects, f.deal_id, f.deal_title, f.code, f.occurred_at,
         f.base_cents, f.commission_cents, f.base_cents - f.commission_cents
  from fresh f
  union all
  select x.partner_id, x.kind, x.voucher_id, x.redemption_id, x.corrects, x.deal_id, x.deal_title, x.code, x.occurred_at,
         x.base_cents, x.commission_cents, x.base_cents - x.commission_cents
  from reversed x;
$$;
revoke all on function public.settlement_candidates(uuid, uuid, timestamptz) from public, anon, authenticated;

-- End of a day in the shop's time zone (exclusive cutoff).
create or replace function public.settlement_cutoff(p_tenant uuid, p_until date) returns timestamptz
language sql stable security definer set search_path = public as $$
  select ((p_until + 1)::timestamp at time zone coalesce((select timezone from public.tenants where id = p_tenant), 'Europe/Zurich'));
$$;
revoke all on function public.settlement_cutoff(uuid, date) from public, anon, authenticated;

-- Open amounts per partner up to a day (for the overview before creating statements).
create or replace function public.settlement_open(p_tenant uuid, p_until date)
returns table (partner_id uuid, partner_name text, lines int, base_cents bigint, commission_cents bigint, payout_cents bigint, has_draft boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage(p_tenant) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select c.partner_id, p.name, count(*)::int, sum(c.base_cents)::bigint, sum(c.commission_cents)::bigint, sum(c.payout_cents)::bigint,
           exists (select 1 from public.partner_settlements s where s.tenant_id = p_tenant and s.partner_id = c.partner_id and s.status = 'draft')
    from public.settlement_candidates(p_tenant, null, public.settlement_cutoff(p_tenant, p_until)) c
    join public.partners p on p.id = c.partner_id
    group by c.partner_id, p.name
    order by p.name;
end $$;
revoke all on function public.settlement_open(uuid, date) from public, anon;
grant execute on function public.settlement_open(uuid, date) to authenticated;

-- (Re)creates the draft statement of one partner with everything open up to a day. Null when nothing is open.
create or replace function public.create_settlement(p_tenant uuid, p_partner uuid, p_until date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_partner public.partners;
begin
  if not public.can_manage(p_tenant) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_partner from public.partners where id = p_partner and tenant_id = p_tenant;
  if not found then raise exception 'unknown partner' using errcode = '22023'; end if;
  -- One run at a time per shop (numbers, uniqueness of lines).
  perform pg_advisory_xact_lock(hashtext('settlement:' || p_tenant::text));
  delete from public.partner_settlements where tenant_id = p_tenant and partner_id = p_partner and status = 'draft';
  insert into public.partner_settlements (tenant_id, partner_id, period_to, currency, partner, created_by)
  select p_tenant, p_partner, p_until, t.currency,
         jsonb_build_object('name', v_partner.name, 'email', v_partner.email, 'billing', v_partner.billing), auth.uid()
  from public.tenants t where t.id = p_tenant
  returning id into v_id;
  insert into public.partner_settlement_lines (settlement_id, tenant_id, kind, voucher_id, redemption_id, corrects, deal_id, deal_title, code, occurred_at, base_cents, commission_cents, payout_cents)
  select v_id, p_tenant, c.kind, c.voucher_id, c.redemption_id, c.corrects, c.deal_id, c.deal_title, c.code, c.occurred_at, c.base_cents, c.commission_cents, c.payout_cents
  from public.settlement_candidates(p_tenant, p_partner, public.settlement_cutoff(p_tenant, p_until)) c;
  if not found then
    delete from public.partner_settlements where id = v_id;
    return null;
  end if;
  update public.partner_settlements s set
    base_cents = x.base, commission_cents = x.commission, payout_cents = x.payout, period_from = x.first_day
  from (
    select sum(base_cents) as base, sum(commission_cents) as commission, sum(payout_cents) as payout,
           min((occurred_at at time zone coalesce((select timezone from public.tenants where id = p_tenant), 'Europe/Zurich'))::date) as first_day
    from public.partner_settlement_lines where settlement_id = v_id
  ) x
  where s.id = v_id;
  return v_id;
end $$;
revoke all on function public.create_settlement(uuid, uuid, date) from public, anon;
grant execute on function public.create_settlement(uuid, uuid, date) to authenticated;

-- draft → final (numbered, partner details refreshed) → paid; drafts can be deleted, final ones never.
create or replace function public.settlement_set_status(p_settlement uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.partner_settlements;
begin
  select * into s from public.partner_settlements where id = p_settlement for update;
  if not found or not public.can_manage(s.tenant_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status = 'final' and s.status = 'draft' then
    perform pg_advisory_xact_lock(hashtext('settlement:' || s.tenant_id::text));
    update public.partner_settlements set status = 'final', finalized_at = now(),
      number = coalesce((select max(number) from public.partner_settlements where tenant_id = s.tenant_id), 0) + 1,
      partner = coalesce((select jsonb_build_object('name', p.name, 'email', p.email, 'billing', p.billing) from public.partners p where p.id = s.partner_id), s.partner)
    where id = s.id;
  elsif p_status = 'paid' and s.status = 'final' then
    update public.partner_settlements set status = 'paid', paid_at = now() where id = s.id;
  elsif p_status = 'final' and s.status = 'paid' then
    update public.partner_settlements set status = 'final', paid_at = null where id = s.id;
  elsif p_status = 'deleted' and s.status = 'draft' then
    delete from public.partner_settlements where id = s.id;
  else
    raise exception 'bad transition' using errcode = '22023';
  end if;
end $$;
revoke all on function public.settlement_set_status(uuid, text) from public, anon;
grant execute on function public.settlement_set_status(uuid, text) to authenticated;

create or replace function public.settlement_mark_sent(p_settlement uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.partner_settlements set sent_at = now()
  where id = p_settlement and status in ('final', 'paid') and public.can_manage(tenant_id);
end $$;
revoke all on function public.settlement_mark_sent(uuid) from public, anon;
grant execute on function public.settlement_mark_sent(uuid) to authenticated;
