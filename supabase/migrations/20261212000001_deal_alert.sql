-- Deal alert (plan feature `deal_alert`, Pro and up): visitors subscribe in the shop header (double
-- opt-in) and get one mail for every deal that goes live. `tenants.deal_alert_at` = switched on
-- since (null = off); deals that were live before are never mailed. A deal is mailed once
-- (`deal_alerts.deal_id` unique), within 48 hours of going live.

update public.plans set limits = limits || jsonb_build_object('deal_alert', id in ('pro', 'business'));

alter table public.tenants add column if not exists deal_alert_at timestamptz;
comment on column public.tenants.deal_alert_at is 'Deal alert on since (null = off). Server only.';
alter table public.deals add column if not exists alert_skip boolean not null default false;
comment on column public.deals.alert_skip is 'Do not send this deal through the deal alert.';

create table public.deal_alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (email = lower(email) and length(email) <= 200),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  token text not null unique,
  confirm_hash text,
  confirm_sent_at timestamptz,
  confirm_count int not null default 0,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (tenant_id, email)
);
comment on table public.deal_alert_subscribers is 'Deal alert subscribers of a shop. Unsubscribing deletes the row. Token columns are server only.';
alter table public.deal_alert_subscribers enable row level security;
create policy deal_alert_subscribers_read on public.deal_alert_subscribers for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.deal_alert_subscribers from anon, authenticated;
grant select (id, tenant_id, email, status, created_at, confirmed_at) on public.deal_alert_subscribers to authenticated;

create table public.deal_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  deal_id uuid not null unique references public.deals (id) on delete cascade,
  recipients int not null default 0,
  created_at timestamptz not null default now()
);
create index deal_alerts_tenant_idx on public.deal_alerts (tenant_id, created_at desc);
alter table public.deal_alerts enable row level security;
create policy deal_alerts_read on public.deal_alerts for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.deal_alerts from anon, authenticated;
grant select on public.deal_alerts to authenticated;

create table public.deal_alert_sends (
  alert_id uuid not null references public.deal_alerts (id) on delete cascade,
  subscriber_id uuid not null references public.deal_alert_subscribers (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  next_at timestamptz not null default now(),
  error text,
  primary key (alert_id, subscriber_id)
);
create index deal_alert_sends_open_idx on public.deal_alert_sends (next_at) where status in ('pending', 'sending');
create index deal_alert_sends_subscriber_idx on public.deal_alert_sends (subscriber_id);
alter table public.deal_alert_sends enable row level security;
revoke all on public.deal_alert_sends from anon, authenticated;

-- Can this deal be bought by everyone right now?
create function public.deal_alert_live(d public.deals) returns boolean
language sql stable security definer set search_path = public as $$
  select d.state = 'published' and d.archived_at is null and not d.alert_skip
    and (d.sales_start is null or d.sales_start <= now()) and (d.sales_end is null or d.sales_end > now())
    and (d.total_qty is null or d.sold_qty < d.total_qty)
    and (d.code_source <> 'pool' or d.pool_free > 0)
    and exists (
      select 1 from public.tenants t
      where t.id = d.tenant_id and t.deal_alert_at is not null and t.status in ('trial', 'active') and t.shop_state = 'online'
        and public.plan_allows(t.id, 'deal_alert') and public.shop_legal_complete(t.id)
        and exists (select 1 from public.stripe_accounts s where s.tenant_id = t.id and s.charges_enabled)
    )
$$;

create function public.deal_alert_due() returns setof uuid
language sql stable security definer set search_path = public as $$
  select d.id from public.deals d join public.tenants t on t.id = d.tenant_id
  where t.deal_alert_at is not null and d.state = 'published'
    and greatest(d.published_at, d.sales_start) >= greatest(t.deal_alert_at, now() - interval '48 hours')
    and not exists (select 1 from public.deal_alerts a where a.deal_id = d.id)
    and public.deal_alert_live(d)
$$;

-- Queues the mails of every deal that just went live; returns the number of new alerts.
create function public.deal_alert_start() returns int
language plpgsql security definer set search_path = public as $$
declare v_new int;
begin
  with started as (
    insert into public.deal_alerts (tenant_id, deal_id, recipients)
    select d.tenant_id, d.id, (select count(*) from public.deal_alert_subscribers s where s.tenant_id = d.tenant_id and s.status = 'confirmed')
    from public.deals d where d.id in (select public.deal_alert_due())
    on conflict (deal_id) do nothing returning id, tenant_id
  ), queued as (
    insert into public.deal_alert_sends (alert_id, subscriber_id, tenant_id)
    select a.id, s.id, a.tenant_id from started a join public.deal_alert_subscribers s on s.tenant_id = a.tenant_id and s.status = 'confirmed'
  )
  select count(*) into v_new from started;
  return v_new;
end $$;

-- Takes up to p_limit mails for sending (safe for parallel runs; a run that died gives its mails
-- back after 15 minutes). Mails of a deal that is no longer live are dropped.
create function public.deal_alert_claim(p_limit int)
returns table (alert_id uuid, subscriber_id uuid, tenant_id uuid, deal_id uuid, email text, token text)
language plpgsql security definer set search_path = public as $$
begin
  update public.deal_alert_sends s set status = 'skipped'
  from public.deal_alerts a join public.deals d on d.id = a.deal_id
  where a.id = s.alert_id and s.status = 'pending' and not public.deal_alert_live(d);
  return query
  with picked as (
    select s.alert_id, s.subscriber_id from public.deal_alert_sends s
    where s.status in ('pending', 'sending') and s.next_at <= now()
    order by s.next_at limit greatest(1, least(p_limit, 200)) for update skip locked
  ), taken as (
    update public.deal_alert_sends s set status = 'sending', attempts = s.attempts + 1, next_at = now() + interval '15 minutes'
    from picked p where s.alert_id = p.alert_id and s.subscriber_id = p.subscriber_id
    returning s.alert_id, s.subscriber_id, s.tenant_id
  )
  select k.alert_id, k.subscriber_id, k.tenant_id, a.deal_id, u.email, u.token
  from taken k join public.deal_alerts a on a.id = k.alert_id join public.deal_alert_subscribers u on u.id = k.subscriber_id;
end $$;

create function public.deal_alert_done(p_alert uuid, p_subscriber uuid, p_ok boolean, p_error text default null) returns void
language sql security definer set search_path = public as $$
  update public.deal_alert_sends
  set status = case when p_ok then 'sent' when attempts >= 3 then 'failed' else 'pending' end,
      next_at = now() + interval '10 minutes', error = left(p_error, 300)
  where alert_id = p_alert and subscriber_id = p_subscriber
$$;

-- Numbers of the dashboard list.
create function public.deal_alert_history(p_tenant uuid)
returns table (id uuid, deal_id uuid, title text, created_at timestamptz, recipients int, sent bigint, open bigint, failed bigint)
language sql stable security definer set search_path = public as $$
  select a.id, a.deal_id, d.title, a.created_at, a.recipients,
    (select count(*) from public.deal_alert_sends s where s.alert_id = a.id and s.status = 'sent'),
    (select count(*) from public.deal_alert_sends s where s.alert_id = a.id and s.status in ('pending', 'sending')),
    (select count(*) from public.deal_alert_sends s where s.alert_id = a.id and s.status = 'failed')
  from public.deal_alerts a join public.deals d on d.id = a.deal_id
  where a.tenant_id = p_tenant and (public.can_manage(p_tenant) or auth.role() = 'service_role')
  order by a.created_at desc limit 30
$$;

-- Every five minutes the database wakes the app, only when there is something to send. The app's
-- address is stored by the server; the one-time token proves that the call comes from here.
create table public.deal_alert_tick (id boolean primary key default true check (id), url text, token text);
insert into public.deal_alert_tick default values;
alter table public.deal_alert_tick enable row level security;
revoke all on public.deal_alert_tick from anon, authenticated;

create function public.deal_alert_tick_claim(p_token text) returns boolean
language sql security definer set search_path = public as $$
  with hit as (update public.deal_alert_tick set token = null where token is not null and token = p_token returning 1)
  select exists (select 1 from hit)
$$;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create function public.deal_alert_wake() returns void
language plpgsql security definer set search_path = public as $$
declare v_url text; v_token text;
begin
  select url into v_url from public.deal_alert_tick;
  if v_url is null then return; end if;
  if not exists (select 1 from public.deal_alert_sends where status in ('pending', 'sending') and next_at <= now())
     and not exists (select 1 from public.deal_alert_due()) then return; end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  update public.deal_alert_tick set token = v_token;
  perform net.http_post(url := v_url, headers := jsonb_build_object('content-type', 'application/json', 'x-deal-alert-token', v_token), body := '{}'::jsonb);
end $$;
select cron.schedule('deal-alert', '*/5 * * * *', 'select public.deal_alert_wake()');

do $$
declare f text;
begin
  foreach f in array array['deal_alert_live(public.deals)', 'deal_alert_due()', 'deal_alert_start()', 'deal_alert_claim(int)', 'deal_alert_done(uuid, uuid, boolean, text)', 'deal_alert_tick_claim(text)', 'deal_alert_wake()', 'deal_alert_history(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
grant execute on function public.deal_alert_history(uuid) to authenticated;

-- Only the server switches the alert.
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
     or new.deal_alert_at is distinct from old.deal_alert_at then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return new;
end $$;

-- The public profile tells the shop whether to offer the alert.
create or replace function public.shop_profile(p_tenant uuid)
returns table (tenant_id uuid, slug text, name text, locale text, currency text, theme jsonb, settings jsonb, legal_complete boolean, primary_host text, payments_ready boolean, shop_state text, shop_notice jsonb)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale, t.currency,
         coalesce((select th.published from public.shop_themes th where th.tenant_id = t.id), '{}'::jsonb),
         jsonb_build_object(
           'contact_email', t.shop_settings->>'contact_email',
           'contact_phone', t.shop_settings->>'contact_phone',
           'ga4_id', t.shop_settings->>'ga4_id',
           'meta_pixel_id', t.shop_settings->>'meta_pixel_id',
           'seo_description', t.shop_settings->>'seo_description',
           'deal_order', coalesce(t.shop_settings->>'deal_order', 'manual'),
           'branding', public.plan_allows(t.id, 'branding'),
           'deal_alert', t.deal_alert_at is not null and public.plan_allows(t.id, 'deal_alert')
         ),
         public.shop_legal_complete(t.id),
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary),
         coalesce((select s.charges_enabled from public.stripe_accounts s where s.tenant_id = t.id), false),
         t.shop_state,
         jsonb_build_object(
           'building_title', t.shop_notice->>'building_title',
           'building_text', t.shop_notice->>'building_text',
           'closed_title', t.shop_notice->>'closed_title',
           'closed_text', t.shop_notice->>'closed_text'
         )
  from public.tenants t
  where t.id = p_tenant and t.status in ('trial', 'active');
$$;
revoke all on function public.shop_profile(uuid) from public;
grant execute on function public.shop_profile(uuid) to anon, authenticated, service_role;
