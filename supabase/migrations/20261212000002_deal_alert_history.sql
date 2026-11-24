-- Unsubscribing deletes the address with its send rows: "sent" counts from the recipients instead,
-- so the history does not shrink afterwards.
create or replace function public.deal_alert_history(p_tenant uuid)
returns table (id uuid, deal_id uuid, title text, created_at timestamptz, recipients int, sent bigint, open bigint, failed bigint)
language sql stable security definer set search_path = public as $$
  select a.id, a.deal_id, d.title, a.created_at, a.recipients,
    greatest(0, a.recipients - count(s.*) filter (where s.status <> 'sent')),
    count(s.*) filter (where s.status in ('pending', 'sending')),
    count(s.*) filter (where s.status = 'failed')
  from public.deal_alerts a join public.deals d on d.id = a.deal_id
  left join public.deal_alert_sends s on s.alert_id = a.id
  where a.tenant_id = p_tenant and (public.can_manage(p_tenant) or auth.role() = 'service_role')
  group by a.id, d.title
  order by a.created_at desc limit 30
$$;
