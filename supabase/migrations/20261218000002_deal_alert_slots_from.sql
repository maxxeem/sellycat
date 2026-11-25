-- Saving a time that has just passed must not send at once: only slots from here on count.
alter table public.deal_alert_settings add column slots_from timestamptz not null default '-infinity';

create or replace function public.deal_alert_digest_due() returns table (tenant_id uuid, deal_ids uuid[])
language sql stable security definer set search_path = public as $$
  with slots as (
    select s.tenant_id, public.deal_alert_slot(s.weekdays, s.send_at) as slot from public.deal_alert_settings s
    where s.mode = 'scheduled' and public.deal_alert_slot(s.weekdays, s.send_at) >= s.slots_from
  ), open as (
    select d.tenant_id, d.id, greatest(d.published_at, d.sales_start) as live_at,
           row_number() over (partition by d.tenant_id order by greatest(d.published_at, d.sales_start), d.id) as n
    from slots s join public.deal_alert_open(192) d on d.tenant_id = s.tenant_id
    where s.slot >= now() - interval '3 hours' and greatest(d.published_at, d.sales_start) <= s.slot
      and not exists (select 1 from public.deal_alerts a where a.tenant_id = s.tenant_id and a.kind = 'digest' and a.created_at >= s.slot)
  )
  select o.tenant_id, array_agg(o.id order by o.n) from open o where o.n <= 10 group by o.tenant_id
$$;
