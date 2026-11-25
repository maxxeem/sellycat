-- Deal alert by hand: one mail with one or several live deals to all confirmed subscribers, with an
-- optional own subject and message. Automatic alerts stay one per deal; a deal that was already
-- sent by hand is not sent automatically any more.

alter table public.deal_alerts
  add column kind text not null default 'auto' check (kind in ('auto', 'manual')),
  add column subject text check (length(subject) <= 120),
  add column message text check (length(message) <= 600),
  add column created_by uuid references auth.users (id) on delete set null,
  alter column deal_id drop not null,
  add constraint deal_alerts_auto_deal check (kind = 'manual' or deal_id is not null);
alter table public.deal_alerts drop constraint deal_alerts_deal_id_key;
create unique index deal_alerts_auto_once on public.deal_alerts (deal_id) where kind = 'auto';

-- The deals of a manual alert, in their order.
create table public.deal_alert_deals (
  alert_id uuid not null references public.deal_alerts (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sort_order int not null default 0,
  primary key (alert_id, deal_id)
);
create index deal_alert_deals_deal_idx on public.deal_alert_deals (deal_id);
alter table public.deal_alert_deals enable row level security;
create policy deal_alert_deals_read on public.deal_alert_deals for select to authenticated using (public.can_manage(tenant_id));
revoke all on public.deal_alert_deals from anon, authenticated;
grant select on public.deal_alert_deals to authenticated;

-- Buyable by everyone right now, whether or not the deal is left out of the automatic alert.
create function public.deal_alert_sellable(d public.deals) returns boolean
language sql stable security definer set search_path = public as $$
  select d.state = 'published' and d.archived_at is null
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

create or replace function public.deal_alert_live(d public.deals) returns boolean
language sql stable security definer set search_path = public as $$
  select not d.alert_skip and public.deal_alert_sellable(d)
$$;

create or replace function public.deal_alert_due() returns setof uuid
language sql stable security definer set search_path = public as $$
  select d.id from public.deals d join public.tenants t on t.id = d.tenant_id
  where t.deal_alert_at is not null and d.state = 'published'
    and greatest(d.published_at, d.sales_start) >= greatest(t.deal_alert_at, now() - interval '48 hours')
    and not exists (select 1 from public.deal_alerts a where a.deal_id = d.id)
    and not exists (select 1 from public.deal_alert_deals m where m.deal_id = d.id)
    and public.deal_alert_live(d)
$$;

create or replace function public.deal_alert_start() returns int
language plpgsql security definer set search_path = public as $$
declare v_new int;
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
  return v_new;
end $$;

-- Queues a manual alert (service role, after the role check). At most one per shop in ten minutes,
-- so a double click or a second team member cannot mail everyone twice.
create function public.deal_alert_manual(p_tenant uuid, p_deals uuid[], p_subject text, p_message text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_count int := coalesce(array_length(p_deals, 1), 0);
  v_ok int;
  v_alert uuid;
  v_recipients int;
begin
  perform pg_advisory_xact_lock(hashtextextended('deal_alert_manual:' || p_tenant::text, 0));
  if v_count < 1 or v_count > 10 then return jsonb_build_object('ok', false, 'error', 'deals'); end if;
  if not exists (select 1 from public.tenants t where t.id = p_tenant and t.deal_alert_at is not null and public.plan_allows(t.id, 'deal_alert')) then
    return jsonb_build_object('ok', false, 'error', 'off');
  end if;
  select count(*) into v_ok from public.deals d where d.id = any (p_deals) and d.tenant_id = p_tenant and public.deal_alert_sellable(d);
  if v_ok <> v_count then return jsonb_build_object('ok', false, 'error', 'not_live'); end if;
  if exists (select 1 from public.deal_alerts a where a.tenant_id = p_tenant and a.kind = 'manual' and a.created_at > now() - interval '10 minutes') then
    return jsonb_build_object('ok', false, 'error', 'recent');
  end if;
  select count(*) into v_recipients from public.deal_alert_subscribers s where s.tenant_id = p_tenant and s.status = 'confirmed';
  if v_recipients = 0 then return jsonb_build_object('ok', false, 'error', 'recipients'); end if;
  insert into public.deal_alerts (tenant_id, kind, recipients, subject, message, created_by)
  values (p_tenant, 'manual', v_recipients, nullif(trim(p_subject), ''), nullif(trim(p_message), ''), p_user) returning id into v_alert;
  insert into public.deal_alert_deals (alert_id, deal_id, tenant_id, sort_order)
  select v_alert, x.id, p_tenant, x.n from unnest(p_deals) with ordinality as x(id, n);
  insert into public.deal_alert_sends (alert_id, subscriber_id, tenant_id)
  select v_alert, s.id, p_tenant from public.deal_alert_subscribers s where s.tenant_id = p_tenant and s.status = 'confirmed';
  return jsonb_build_object('ok', true, 'recipients', v_recipients);
end $$;

drop function public.deal_alert_claim(int);
create function public.deal_alert_claim(p_limit int)
returns table (alert_id uuid, subscriber_id uuid, tenant_id uuid, deal_id uuid, email text, token text, kind text, deal_ids uuid[], subject text, message text)
language plpgsql security definer set search_path = public as $$
begin
  update public.deal_alert_sends s set status = 'skipped'
  from public.deal_alerts a
  where a.id = s.alert_id and s.status = 'pending' and not exists (
    select 1 from public.deals d
    where (a.kind = 'auto' and d.id = a.deal_id and public.deal_alert_live(d))
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

drop function public.deal_alert_history(uuid);
create function public.deal_alert_history(p_tenant uuid)
returns table (id uuid, deal_id uuid, title text, created_at timestamptz, recipients int, sent bigint, open bigint, failed bigint, kind text)
language sql stable security definer set search_path = public as $$
  select a.id, a.deal_id,
    coalesce(d.title, (select string_agg(x.title, ', ' order by m.sort_order) from public.deal_alert_deals m join public.deals x on x.id = m.deal_id where m.alert_id = a.id), '–'),
    a.created_at, a.recipients,
    greatest(0, a.recipients - count(s.*) filter (where s.status <> 'sent')),
    count(s.*) filter (where s.status in ('pending', 'sending')),
    count(s.*) filter (where s.status = 'failed'),
    a.kind
  from public.deal_alerts a left join public.deals d on d.id = a.deal_id
  left join public.deal_alert_sends s on s.alert_id = a.id
  where a.tenant_id = p_tenant and (public.can_manage(p_tenant) or auth.role() = 'service_role')
  group by a.id, d.title
  order by a.created_at desc limit 30
$$;

do $$
declare f text;
begin
  foreach f in array array['deal_alert_sellable(public.deals)', 'deal_alert_manual(uuid, uuid[], text, text, uuid)', 'deal_alert_claim(int)', 'deal_alert_history(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
grant execute on function public.deal_alert_history(uuid) to authenticated;
