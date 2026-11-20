-- Monthly overview of Sellycat's sales fees per shop (for the shop's accounting). Fees are kept by
-- Stripe with every payment and refunded pro rata with refunds, so the net fee follows the refund.

create or replace function public.fee_months(p_tenant uuid, p_months int default 12)
returns table (month date, currency text, orders int, amount_cents bigint, refunded_cents bigint, fee_cents bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_tz text;
begin
  if not public.can_manage(p_tenant) then raise exception 'not allowed' using errcode = '42501'; end if;
  select coalesce(timezone, 'Europe/Zurich') into v_tz from public.tenants where id = p_tenant;
  return query
    select date_trunc('month', o.paid_at at time zone v_tz)::date, o.currency, count(*)::int,
           sum(o.amount_cents)::bigint, sum(o.refunded_cents)::bigint,
           sum(case when o.amount_cents > 0 then round(o.fee_cents::numeric * (o.amount_cents - o.refunded_cents) / o.amount_cents) else 0 end)::bigint
    from public.orders o
    where o.tenant_id = p_tenant and o.paid_at is not null and o.status in ('paid', 'partially_refunded', 'refunded')
      and o.paid_at >= (date_trunc('month', now() at time zone v_tz) - make_interval(months => greatest(0, least(p_months, 60)) - 1)) at time zone v_tz
    group by 1, 2
    order by 1 desc, 2;
end $$;
revoke all on function public.fee_months(uuid, int) from public, anon;
grant execute on function public.fee_months(uuid, int) to authenticated;

create or replace function public.fee_lines(p_tenant uuid, p_month date)
returns table (number text, paid_at timestamptz, currency text, amount_cents int, refunded_cents int, fee_cents int, net_fee_cents int)
language plpgsql stable security definer set search_path = public as $$
declare v_tz text;
begin
  if not public.can_manage(p_tenant) then raise exception 'not allowed' using errcode = '42501'; end if;
  select coalesce(timezone, 'Europe/Zurich') into v_tz from public.tenants where id = p_tenant;
  return query
    select o.number, o.paid_at, o.currency, o.amount_cents, o.refunded_cents, o.fee_cents,
           (case when o.amount_cents > 0 then round(o.fee_cents::numeric * (o.amount_cents - o.refunded_cents) / o.amount_cents) else 0 end)::int
    from public.orders o
    where o.tenant_id = p_tenant and o.paid_at is not null and o.status in ('paid', 'partially_refunded', 'refunded')
      and o.paid_at >= (date_trunc('month', p_month)::timestamp at time zone v_tz)
      and o.paid_at < ((date_trunc('month', p_month) + interval '1 month')::timestamp at time zone v_tz)
    order by o.paid_at;
end $$;
revoke all on function public.fee_lines(uuid, date) from public, anon;
grant execute on function public.fee_lines(uuid, date) to authenticated;
