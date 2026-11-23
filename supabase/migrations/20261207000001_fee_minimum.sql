-- Minimum application fee per sale (in minor units, the same number for CHF, EUR and USD) and the
-- new fee rates: Free 19.5 %, Starter 9.5 %, Pro 3.5 %, Business 2.5 %, each at least 1.00.

alter table public.plans
  add column if not exists application_fee_min int not null default 0 check (application_fee_min >= 0);

comment on column public.plans.application_fee_min is 'Minimum Sellycat fee per order in minor units (100 = 1 CHF/EUR/USD); never above the order amount.';

-- Fee of a tenant for an amount: percentage (tenant override, else plan) plus the fixed part, at
-- least the plan minimum, never above the amount.
create or replace function public.application_fee(p_tenant uuid, p_amount int) returns int
language sql stable security definer set search_path = public as $$
  select least(p_amount, greatest(0, p.application_fee_min,
    round(p_amount * coalesce(t.fee_override_bps, p.application_fee_bps) / 10000.0)::int
    + coalesce(t.fee_override_fixed, p.application_fee_fixed)))
  from public.tenants t join public.plans p on p.id = t.plan_id
  where t.id = p_tenant;
$$;

revoke all on function public.application_fee(uuid, int) from public, anon, authenticated;
grant execute on function public.application_fee(uuid, int) to service_role;

update public.plans set application_fee_bps = 1950, application_fee_min = 100 where id = 'free';
update public.plans set application_fee_bps = 950, application_fee_min = 100 where id = 'starter';
update public.plans set application_fee_bps = 350, application_fee_min = 100 where id = 'pro';
update public.plans set application_fee_bps = 250, application_fee_min = 100 where id = 'business';
