-- Launch review: staff rights in the database need the authenticator code too, row security without
-- per-row function calls on the big tables, missing indexes, faster analytics.

-- ---------------------------------------------------------------- staff: second factor (AAL2)
-- Before, only the app asked for it; with a staff password the REST API gave full staff rights.
create function public.is_staff_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_staff where user_id = auth.uid());
$$;
comment on function public.is_staff_member() is 'Staff account, with or without second factor (only for showing the way to /admin). Rights: is_staff().';

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' and exists (select 1 from public.platform_staff where user_id = auth.uid());
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' and exists (select 1 from public.platform_staff where user_id = auth.uid() and role = 'superadmin');
$$;

create or replace function public.tenants_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;
  if new.plan_id is distinct from old.plan_id or new.status is distinct from old.status
     or new.fee_override_bps is distinct from old.fee_override_bps or new.fee_override_fixed is distinct from old.fee_override_fixed
     or new.slug is distinct from old.slug or new.created_by is distinct from old.created_by
     or new.stripe_customer_id is distinct from old.stripe_customer_id or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.billing_status is distinct from old.billing_status or new.billing_interval is distinct from old.billing_interval
     or new.current_period_end is distinct from old.current_period_end or new.cancel_at_period_end is distinct from old.cancel_at_period_end
     or new.stripe_schedule_id is distinct from old.stripe_schedule_id or new.pending_plan_id is distinct from old.pending_plan_id
     or new.pending_interval is distinct from old.pending_interval or new.pending_at is distinct from old.pending_at
     or new.plan_parent_id is distinct from old.plan_parent_id
     or new.shop_state is distinct from old.shop_state or new.shop_notice is distinct from old.shop_notice
     or new.deal_alert_at is distinct from old.deal_alert_at
     or new.invite_code_id is distinct from old.invite_code_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return new;
end $$;

-- The voucher behind a QR code (with its code): server only. The page asks the owner for an email code first.
revoke all on function public.voucher_public(text) from public, anon, authenticated;
grant execute on function public.voucher_public(text) to service_role;

alter function public.set_updated_at() set search_path = public;

-- ---------------------------------------------------------------- row security once per query
create function public.my_tenant_ids(p_roles public.member_role[]) returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_members where user_id = auth.uid() and role = any (p_roles);
$$;
create function public.my_partner_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select partner_id from public.tenant_members where user_id = auth.uid() and role = 'partner' and partner_id is not null;
$$;

drop policy orders_read on public.orders;
create policy orders_read on public.orders for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy order_items_read on public.order_items;
create policy order_items_read on public.order_items for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy buyers_read on public.buyers;
create policy buyers_read on public.buyers for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy reservations_read on public.reservations;
create policy reservations_read on public.reservations for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy mail_log_read on public.mail_log;
create policy mail_log_read on public.mail_log for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy analytics_daily_read on public.analytics_daily;
create policy analytics_daily_read on public.analytics_daily for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy code_pool_read on public.code_pool;
create policy code_pool_read on public.code_pool for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()));
drop policy redemptions_read on public.redemptions;
create policy redemptions_read on public.redemptions for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor']::public.member_role[])) or (select public.is_staff()) or user_id = (select auth.uid()));
drop policy vouchers_read on public.vouchers;
create policy vouchers_read on public.vouchers for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin', 'editor', 'redeemer']::public.member_role[])) or partner_id in (select public.my_partner_ids()) or (select public.is_staff()));
drop policy partner_settlements_read on public.partner_settlements;
create policy partner_settlements_read on public.partner_settlements for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));
drop policy partner_settlement_lines_read on public.partner_settlement_lines;
create policy partner_settlement_lines_read on public.partner_settlement_lines for select using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));
drop policy deal_alert_subscribers_read on public.deal_alert_subscribers;
create policy deal_alert_subscribers_read on public.deal_alert_subscribers for select to authenticated using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));
drop policy deal_alerts_read on public.deal_alerts;
create policy deal_alerts_read on public.deal_alerts for select to authenticated using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));
drop policy deal_alert_deals_read on public.deal_alert_deals;
create policy deal_alert_deals_read on public.deal_alert_deals for select to authenticated using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));
drop policy webhook_events_select on public.webhook_events;
create policy webhook_events_select on public.webhook_events for select to authenticated using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));
drop policy webhook_deliveries_select on public.webhook_deliveries;
create policy webhook_deliveries_select on public.webhook_deliveries for select to authenticated using (tenant_id in (select public.my_tenant_ids(array['owner', 'admin']::public.member_role[])) or (select public.is_staff()));

drop policy profiles_own on public.profiles;
create policy profiles_own on public.profiles for select using (user_id = (select auth.uid()) or (select public.is_staff()));
drop policy profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles for insert with check (user_id = (select auth.uid()));
drop policy profiles_own_write on public.profiles;
create policy profiles_own_write on public.profiles for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy staff_read on public.platform_staff;
create policy staff_read on public.platform_staff for select using (user_id = (select auth.uid()) or (select public.is_staff()));

-- ---------------------------------------------------------------- analytics
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
      and o.paid_at >= (p_from::timestamp at time zone v_tz) and o.paid_at < ((p_to + 1)::timestamp at time zone v_tz)
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
    where o.tenant_id = p_tenant and o.created_at >= (p_from::timestamp at time zone v_tz) and o.created_at < ((p_to + 1)::timestamp at time zone v_tz)
    group by 1
  ),
  redeemed as (
    select (r.created_at at time zone v_tz)::date as day, count(*)::int as n
    from public.redemptions r
    where r.tenant_id = p_tenant and r.undone_at is null
      and r.created_at >= (p_from::timestamp at time zone v_tz) and r.created_at < ((p_to + 1)::timestamp at time zone v_tz)
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
  paid_days as (
    select day, sum(net_cents)::bigint as revenue_cents, sum(fee_cents)::bigint as fee_cents, count(*)::int as orders from paid group by 1
  ),
  item_days as (
    select day, sum(qty)::int as vouchers from items group by 1
  ),
  daily as (
    select d.day,
           coalesce(p.revenue_cents, 0)::bigint as revenue_cents,
           coalesce(p.fee_cents, 0)::bigint as fee_cents,
           coalesce(p.orders, 0)::int as orders,
           coalesce(i.vouchers, 0)::int as vouchers,
           coalesce(s.n, 0) as checkouts,
           coalesce(r.n, 0) as redemptions,
           coalesce(v.shop_views, 0) as shop_views,
           coalesce(v.deal_views, 0) as deal_views
    from days d
    left join paid_days p on p.day = d.day left join item_days i on i.day = d.day
    left join started s on s.day = d.day left join redeemed r on r.day = d.day
    left join views v on v.day = d.day
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

-- ---------------------------------------------------------------- an index for every foreign key
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, t.relname, array_agg(a.attname order by k.n) as cols
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    cross join lateral unnest(c.conkey) with ordinality as k(att, n)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.att
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indpred is null and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey)
    group by c.oid, c.conrelid, t.relname
  loop
    execute format('create index if not exists %I on %s (%s)', left(r.relname || '_' || array_to_string(r.cols, '_'), 55) || '_fk_idx', r.tbl, (select string_agg(quote_ident(x), ', ') from unnest(r.cols) x));
  end loop;
end $$;
create index if not exists orders_tenant_created_idx on public.orders (tenant_id, created_at desc);
create index if not exists orders_tenant_paid_idx on public.orders (tenant_id, paid_at) where paid_at is not null;
