-- How the automatic deal alert works per shop: 'instant' (one mail per deal, within the sending
-- hours), 'scheduled' (one mail with the new deals on fixed weekdays and time) or 'manual' (nothing
-- by itself). No row = instant, around the clock. Times are Europe/Zurich.
create table public.deal_alert_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  mode text not null default 'instant' check (mode in ('instant', 'scheduled', 'manual')),
  window_from time not null default '00:00',
  window_to time not null default '24:00',
  weekdays int[] not null default '{1,2,3,4,5}' check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7] and array_length(weekdays, 1) >= 1),
  send_at time not null default '09:00',
  -- Deals that went live before never go out by themselves (set when automation is switched back on).
  auto_since timestamptz not null default '-infinity',
  updated_at timestamptz not null default now(),
  check (window_from < window_to)
);
create trigger deal_alert_settings_updated before update on public.deal_alert_settings for each row execute function public.set_updated_at();
alter table public.deal_alert_settings enable row level security;
create policy deal_alert_settings_read on public.deal_alert_settings for select to authenticated using (public.can_edit(tenant_id));
revoke all on public.deal_alert_settings from anon, authenticated;
grant select on public.deal_alert_settings to authenticated;

alter table public.deal_alerts drop constraint deal_alerts_kind_check;
alter table public.deal_alerts add constraint deal_alerts_kind_check check (kind in ('auto', 'digest', 'manual'));
alter table public.deal_alerts drop constraint deal_alerts_auto_deal;
alter table public.deal_alerts add constraint deal_alerts_auto_deal check (kind <> 'auto' or deal_id is not null);

-- The latest sending time that has passed, or null.
create function public.deal_alert_slot(p_weekdays int[], p_at time) returns timestamptz
language sql stable set search_path = public as $$
  select max(x.ts) from (
    select (((now() at time zone 'Europe/Zurich')::date - g) + p_at) at time zone 'Europe/Zurich' as ts, (now() at time zone 'Europe/Zurich')::date - g as day
    from generate_series(0, 7) g
  ) x where x.ts <= now() and extract(isodow from x.day)::int = any (p_weekdays)
$$;

-- Deals that may go out by themselves (live, new since switching on, never sent).
create function public.deal_alert_open(p_hours int) returns setof public.deals
language sql stable security definer set search_path = public as $$
  select d.* from public.deals d join public.tenants t on t.id = d.tenant_id
  left join public.deal_alert_settings s on s.tenant_id = d.tenant_id
  where t.deal_alert_at is not null and d.state = 'published'
    and greatest(d.published_at, d.sales_start) >= greatest(t.deal_alert_at, coalesce(s.auto_since, '-infinity'), now() - make_interval(hours => p_hours))
    and not exists (select 1 from public.deal_alerts a where a.deal_id = d.id)
    and not exists (select 1 from public.deal_alert_deals m where m.deal_id = d.id)
    and public.deal_alert_live(d)
$$;

-- One mail per deal, now.
create or replace function public.deal_alert_due() returns setof uuid
language sql stable security definer set search_path = public as $$
  select d.id from public.deal_alert_open(48) d
  left join public.deal_alert_settings s on s.tenant_id = d.tenant_id
  where coalesce(s.mode, 'instant') = 'instant'
    and (s.tenant_id is null or ((now() at time zone 'Europe/Zurich')::time >= s.window_from and (now() at time zone 'Europe/Zurich')::time < s.window_to))
$$;

-- Collected mails due now: the slot passed at most three hours ago, nothing was sent since, and
-- these deals were live by then (at most ten, the rest waits for the next slot).
create function public.deal_alert_digest_due() returns table (tenant_id uuid, deal_ids uuid[])
language sql stable security definer set search_path = public as $$
  with slots as (
    select s.tenant_id, public.deal_alert_slot(s.weekdays, s.send_at) as slot from public.deal_alert_settings s where s.mode = 'scheduled'
  ), open as (
    select d.tenant_id, d.id, greatest(d.published_at, d.sales_start) as live_at,
           row_number() over (partition by d.tenant_id order by greatest(d.published_at, d.sales_start), d.id) as n
    from slots s join public.deal_alert_open(192) d on d.tenant_id = s.tenant_id
    where s.slot >= now() - interval '3 hours' and greatest(d.published_at, d.sales_start) <= s.slot
      and not exists (select 1 from public.deal_alerts a where a.tenant_id = s.tenant_id and a.kind = 'digest' and a.created_at >= s.slot)
  )
  select o.tenant_id, array_agg(o.id order by o.n) from open o where o.n <= 10 group by o.tenant_id
$$;

create or replace function public.deal_alert_start() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_new int;
  r record;
  v_deals uuid[];
  v_alert uuid;
begin
  with started as (
    insert into public.deal_alerts (tenant_id, deal_id, recipients)
    select d.tenant_id, d.id, (select count(*) from public.deal_alert_subscribers s where s.tenant_id = d.tenant_id and s.status = 'confirmed')
    from public.deals d where d.id in (select public.deal_alert_due())
    on conflict (deal_id) where kind = 'auto' do nothing returning id, tenant_id
  ), queued as (
    insert into public.deal_alert_sends (alert_id, subscriber_id, tenant_id)
    select a.id, s.id, a.tenant_id from started a join public.deal_alert_subscribers s on s.tenant_id = a.tenant_id and s.status = 'confirmed'
  )
  select count(*) into v_new from started;
  for r in select x.tenant_id from public.deal_alert_digest_due() x loop
    -- Parallel runs: one at a time per shop, then look again.
    perform pg_advisory_xact_lock(hashtextextended('deal_alert_digest:' || r.tenant_id::text, 0));
    select x.deal_ids into v_deals from public.deal_alert_digest_due() x where x.tenant_id = r.tenant_id;
    continue when v_deals is null;
    insert into public.deal_alerts (tenant_id, kind, recipients)
    values (r.tenant_id, 'digest', (select count(*) from public.deal_alert_subscribers s where s.tenant_id = r.tenant_id and s.status = 'confirmed')) returning id into v_alert;
    insert into public.deal_alert_deals (alert_id, deal_id, tenant_id, sort_order) select v_alert, x.id, r.tenant_id, x.n from unnest(v_deals) with ordinality as x(id, n);
    insert into public.deal_alert_sends (alert_id, subscriber_id, tenant_id)
    select v_alert, s.id, r.tenant_id from public.deal_alert_subscribers s where s.tenant_id = r.tenant_id and s.status = 'confirmed';
    v_new := v_new + 1;
  end loop;
  return v_new;
end $$;

create or replace function public.deal_alert_claim(p_limit int)
returns table (alert_id uuid, subscriber_id uuid, tenant_id uuid, deal_id uuid, email text, token text, kind text, deal_ids uuid[], subject text, message text)
language plpgsql security definer set search_path = public as $$
begin
  update public.deal_alert_sends s set status = 'skipped'
  from public.deal_alerts a
  where a.id = s.alert_id and s.status = 'pending' and not exists (
    select 1 from public.deals d
    where (a.kind = 'auto' and d.id = a.deal_id and public.deal_alert_live(d))
       or (a.kind = 'digest' and d.id in (select m.deal_id from public.deal_alert_deals m where m.alert_id = a.id) and public.deal_alert_live(d))
       or (a.kind = 'manual' and d.id in (select m.deal_id from public.deal_alert_deals m where m.alert_id = a.id) and public.deal_alert_sellable(d))
  );
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
  select k.alert_id, k.subscriber_id, k.tenant_id, a.deal_id, u.email, u.token, a.kind,
         case when a.kind = 'auto' then array[a.deal_id] else array(select m.deal_id from public.deal_alert_deals m where m.alert_id = a.id order by m.sort_order) end,
         a.subject, a.message
  from taken k join public.deal_alerts a on a.id = k.alert_id join public.deal_alert_subscribers u on u.id = k.subscriber_id;
end $$;

create or replace function public.deal_alert_wake() returns void
language plpgsql security definer set search_path = public as $$
declare v_url text; v_token text;
begin
  select url into v_url from public.deal_alert_tick;
  if v_url is null then return; end if;
  if not exists (select 1 from public.deal_alert_sends where status in ('pending', 'sending') and next_at <= now())
     and not exists (select 1 from public.deal_alert_due())
     and not exists (select 1 from public.deal_alert_digest_due()) then return; end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  update public.deal_alert_tick set token = v_token;
  perform net.http_post(url := v_url, headers := jsonb_build_object('content-type', 'application/json', 'x-deal-alert-token', v_token), body := '{}'::jsonb);
end $$;

do $$
declare f text;
begin
  foreach f in array array['deal_alert_slot(int[], time)', 'deal_alert_open(int)', 'deal_alert_digest_due()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
