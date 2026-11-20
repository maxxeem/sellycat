-- Phase 7 (part 3): analytics for shops and the platform.
-- Visits are counted per day only (no single events, no IP, no cookies): shop pages and deal
-- pages, in the shop's time zone. Sales, vouchers and redemptions come from their own tables.

create table public.analytics_daily (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  day date not null,
  metric text not null check (metric in ('shop_view', 'deal_view')),
  deal_id uuid references public.deals (id) on delete cascade,
  count int not null default 0 check (count >= 0),
  check ((metric = 'deal_view') = (deal_id is not null))
);
create unique index analytics_daily_key on public.analytics_daily
  (tenant_id, day, metric, coalesce(deal_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index analytics_daily_deal_idx on public.analytics_daily (deal_id) where deal_id is not null;

alter table public.analytics_daily enable row level security;
-- Read like orders (owner, admin, editor, staff). Rows are written only by the functions below.
create policy analytics_daily_read on public.analytics_daily for select using (public.can_see_orders(tenant_id));

-- Today in the shop's time zone.
create or replace function public.tenant_today(p_tenant uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.tenants where id = p_tenant), 'Europe/Zurich'))::date;
$$;

create or replace function public.bump_analytics(p_tenant uuid, p_metric text, p_deal uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.analytics_daily as a (tenant_id, day, metric, deal_id, count)
  values (p_tenant, public.tenant_today(p_tenant), p_metric, p_deal, 1)
  on conflict (tenant_id, day, metric, (coalesce(deal_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set count = a.count + 1;
$$;
revoke all on function public.bump_analytics(uuid, text, uuid) from public, anon, authenticated;

-- One visit of a live shop's start or category page (anyone; the page sends it once per session).
create or replace function public.track_shop_view(p_tenant uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.tenant_is_public(p_tenant) then
    perform public.bump_analytics(p_tenant, 'shop_view', null);
  end if;
end $$;
revoke all on function public.track_shop_view(uuid) from public;
grant execute on function public.track_shop_view(uuid) to anon, authenticated;

-- Deal views: the total counter (for "popular") plus the daily row.
create or replace function public.track_deal_view(p_deal uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tenant uuid;
begin
  perform set_config('sellycat.view_sync', '1', true);
  update public.deals d set view_count = view_count + 1
  where d.id = p_deal and d.state = 'published' and public.tenant_is_public(d.tenant_id)
  returning d.tenant_id into v_tenant;
  perform set_config('sellycat.view_sync', '', true);
  if v_tenant is not null then
    perform public.bump_analytics(v_tenant, 'deal_view', p_deal);
  end if;
end $$;
revoke all on function public.track_deal_view(uuid) from public;
grant execute on function public.track_deal_view(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- shop analytics
-- Everything the dashboard shows for one shop and period (days inclusive, shop time zone).
-- Revenue is net of refunds and counted on the day of payment.
create or replace function public.tenant_analytics(p_tenant uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
  v_result jsonb;
begin
  if not public.can_see_orders(p_tenant) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'bad range' using errcode = '22023';
  end if;
  select coalesce(timezone, 'Europe/Zurich') into v_tz from public.tenants where id = p_tenant;

  with
  paid as (
    select o.id, (o.paid_at at time zone v_tz)::date as day,
           o.amount_cents - o.refunded_cents as net_cents, o.fee_cents
    from public.orders o
    where o.tenant_id = p_tenant and o.paid_at is not null
      and o.status in ('paid', 'partially_refunded', 'refunded')
      and (o.paid_at at time zone v_tz)::date between p_from and p_to
  ),
  items as (
    select i.deal_id, i.title, i.qty, i.total_cents, p.day,
           -- Refunds lower the deal's revenue in proportion to its share of the order.
           case when o.amount_cents > 0 then round(i.total_cents::numeric * p.net_cents / o.amount_cents)::int else 0 end as net_cents
    from paid p
    join public.orders o on o.id = p.id
    join public.order_items i on i.order_id = p.id
  ),
  started as (
    select (o.created_at at time zone v_tz)::date as day, count(*)::int as n
    from public.orders o
    where o.tenant_id = p_tenant and (o.created_at at time zone v_tz)::date between p_from and p_to
    group by 1
  ),
  redeemed as (
    select (r.created_at at time zone v_tz)::date as day, count(*)::int as n
    from public.redemptions r
    where r.tenant_id = p_tenant and r.undone_at is null
      and (r.created_at at time zone v_tz)::date between p_from and p_to
    group by 1
  ),
  views as (
    select a.day, sum(a.count) filter (where a.metric = 'shop_view')::int as shop_views,
           sum(a.count) filter (where a.metric = 'deal_view')::int as deal_views
    from public.analytics_daily a
    where a.tenant_id = p_tenant and a.day between p_from and p_to
    group by 1
  ),
  days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  ),
  daily as (
    select d.day,
           coalesce((select sum(net_cents) from paid p where p.day = d.day), 0)::bigint as revenue_cents,
           coalesce((select sum(fee_cents) from paid p where p.day = d.day), 0)::bigint as fee_cents,
           coalesce((select count(*) from paid p where p.day = d.day), 0)::int as orders,
           coalesce((select sum(qty) from items i where i.day = d.day), 0)::int as vouchers,
           coalesce((select n from started s where s.day = d.day), 0) as checkouts,
           coalesce((select n from redeemed r where r.day = d.day), 0) as redemptions,
           coalesce(v.shop_views, 0) as shop_views,
           coalesce(v.deal_views, 0) as deal_views
    from days d left join views v on v.day = d.day
  ),
  deal_sales as (
    select deal_id, max(title) as title, sum(qty)::int as qty, sum(net_cents)::bigint as revenue_cents
    from items where deal_id is not null group by deal_id
  ),
  deal_views as (
    select deal_id, sum(count)::int as views
    from public.analytics_daily
    where tenant_id = p_tenant and metric = 'deal_view' and day between p_from and p_to
    group by deal_id
  ),
  deal_rows as (
    select coalesce(s.deal_id, v.deal_id) as deal_id,
           coalesce(d.title, s.title) as title, d.slug, p.name as partner,
           coalesce(v.views, 0) as views, coalesce(s.qty, 0) as qty, coalesce(s.revenue_cents, 0) as revenue_cents
    from deal_sales s
    full join deal_views v on v.deal_id = s.deal_id
    left join public.deals d on d.id = coalesce(s.deal_id, v.deal_id)
    left join public.partners p on p.id = d.partner_id
  )
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(to_jsonb(x) order by x.day) from daily x), '[]'::jsonb),
    'deals', coalesce((select jsonb_agg(to_jsonb(x) order by x.revenue_cents desc, x.views desc) from (select * from deal_rows order by revenue_cents desc, views desc limit 50) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;
revoke all on function public.tenant_analytics(uuid, date, date) from public, anon;
grant execute on function public.tenant_analytics(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------- platform analytics (staff)
-- Days in Zurich time. Money per currency (shops sell in CHF, EUR or USD).
create or replace function public.platform_analytics(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'bad range' using errcode = '22023';
  end if;

  with
  paid as (
    select o.tenant_id, o.currency, (o.paid_at at time zone 'Europe/Zurich')::date as day,
           o.amount_cents - o.refunded_cents as net_cents, o.fee_cents
    from public.orders o
    where o.paid_at is not null and o.status in ('paid', 'partially_refunded', 'refunded')
      and (o.paid_at at time zone 'Europe/Zurich')::date between p_from and p_to
  ),
  days as (select d::date as day from generate_series(p_from, p_to, interval '1 day') d),
  daily as (
    select d.day,
           (select count(*) from public.tenants t where (t.created_at at time zone 'Europe/Zurich')::date = d.day)::int as signups,
           (select count(*) from paid p where p.day = d.day)::int as orders,
           coalesce((select sum(a.count) from public.analytics_daily a where a.day = d.day), 0)::int as views
    from days d
  ),
  money as (
    select currency, sum(net_cents)::bigint as gmv_cents, sum(fee_cents)::bigint as fee_cents, count(*)::int as orders
    from paid group by currency
  ),
  money_daily as (
    select day, currency, sum(net_cents)::bigint as gmv_cents, sum(fee_cents)::bigint as fee_cents
    from paid group by day, currency
  ),
  top as (
    select t.id, t.name, t.slug::text as slug, t.plan_id, p.currency,
           sum(p.net_cents)::bigint as gmv_cents, sum(p.fee_cents)::bigint as fee_cents, count(*)::int as orders
    from paid p join public.tenants t on t.id = p.tenant_id
    group by t.id, t.name, t.slug, t.plan_id, p.currency
    order by sum(p.fee_cents) desc, sum(p.net_cents) desc
    limit 20
  ),
  plans as (
    select t.plan_id, count(*)::int as tenants,
           count(*) filter (where t.billing_status in ('active', 'trialing'))::int as paying
    from public.tenants t where t.status in ('trial', 'active')
    group by t.plan_id
  )
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(to_jsonb(x) order by x.day) from daily x), '[]'::jsonb),
    'money', coalesce((select jsonb_agg(to_jsonb(x) order by x.fee_cents desc) from money x), '[]'::jsonb),
    'money_daily', coalesce((select jsonb_agg(to_jsonb(x) order by x.day) from money_daily x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(to_jsonb(x)) from top x), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(to_jsonb(x) order by x.tenants desc) from plans x), '[]'::jsonb),
    'tenants_total', (select count(*) from public.tenants)::int,
    'live_deals', (select count(*) from public.deals where state = 'published' and archived_at is null)::int
  ) into v_result;
  return v_result;
end $$;
revoke all on function public.platform_analytics(date, date) from public, anon;
grant execute on function public.platform_analytics(date, date) to authenticated;
