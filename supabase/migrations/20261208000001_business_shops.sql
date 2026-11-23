-- Business: no minimum fee per sale, and up to 5 shops in one plan (`limits.shops`, default 1).
-- An owner whose shop is on a plan with `shops` > 1 gets further shops on the same plan: the new
-- shop points at that main shop (`plan_parent_id`) and follows its plan from then on (plan change,
-- downgrade, deletion of the main shop). Only the server and SQL set these fields.

update public.plans set application_fee_min = 0, limits = limits || '{"shops": 5}'::jsonb where id = 'business';

alter table public.tenants add column if not exists plan_parent_id uuid references public.tenants (id) on delete set null;
create index if not exists tenants_plan_parent_idx on public.tenants (plan_parent_id) where plan_parent_id is not null;
comment on column public.tenants.plan_parent_id is 'Main shop whose plan includes this shop (Business: up to limits.shops shops); null = own plan.';

-- Shops a plan includes (1 without the key).
create or replace function public.plan_shops(p_plan text) returns int
language sql stable security definer set search_path = public as $$
  select greatest(1, coalesce((select (limits ->> 'shops')::int from public.plans where id = p_plan), 1));
$$;

-- Clients never change the plan link either (same rule as plan_id).
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
     or new.plan_parent_id is distinct from old.plan_parent_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return new;
end $$;

-- The main shop's plan changes: included shops follow (oldest first, up to the limit); the rest,
-- or all of them when the new plan includes only one shop, fall back to Free on their own.
create or replace function public.tenants_plan_follow() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_room int := public.plan_shops(new.plan_id) - 1;
begin
  if new.plan_id is not distinct from old.plan_id then return new; end if;
  update public.tenants c set plan_id = new.plan_id
  where c.id in (select id from public.tenants where plan_parent_id = new.id order by created_at limit v_room);
  update public.tenants c set plan_id = 'free', plan_parent_id = null
  where c.plan_parent_id = new.id
    and c.id not in (select id from public.tenants where plan_parent_id = new.id order by created_at limit v_room);
  return new;
end $$;

drop trigger if exists tenants_plan_follow on public.tenants;
create trigger tenants_plan_follow after update of plan_id on public.tenants for each row execute function public.tenants_plan_follow();

-- The main shop is deleted: its included shops continue on Free.
create or replace function public.tenants_parent_gone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.tenants set plan_id = 'free', plan_parent_id = null where plan_parent_id = old.id;
  return old;
end $$;

drop trigger if exists tenants_parent_gone on public.tenants;
create trigger tenants_parent_gone before delete on public.tenants for each row execute function public.tenants_parent_gone();

revoke all on function public.plan_shops(text) from public, anon;
grant execute on function public.plan_shops(text) to authenticated, service_role;
revoke all on function public.tenants_plan_follow() from public, anon, authenticated;
revoke all on function public.tenants_parent_gone() from public, anon, authenticated;

-- Self-service shop creation (unchanged rules), now with the plan of a main shop that has room.
create or replace function public.create_tenant(p_name text, p_slug text, p_root text, p_locale text default 'de')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
  v_parent uuid;
  v_plan text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  -- A main shop of this owner whose plan still has room for another shop.
  select t.id, t.plan_id into v_parent, v_plan
  from public.tenants t
  join public.tenant_members m on m.tenant_id = t.id and m.user_id = v_uid and m.role = 'owner'
  where t.plan_parent_id is null and t.status <> 'closed'
    and public.plan_shops(t.plan_id) > 1 + (select count(*) from public.tenants c where c.plan_parent_id = t.id)
  order by t.created_at
  limit 1;
  if not public.is_staff()
     and v_parent is null
     and (select signup_mode from public.platform_settings) <> 'open'
     and not exists (select 1 from public.invite_code_uses u where u.user_id = v_uid and u.status = 'confirmed' and u.tenant_id is null) then
    raise exception 'signup paused' using errcode = '42501';
  end if;
  if lower(p_root) not in ('sellycat.com', 'staging.sellycat.com', 'localhost') then
    raise exception 'invalid root domain' using errcode = '22023';
  end if;
  if v_parent is null then
    insert into public.tenants (name, slug, locale, created_by) values (trim(p_name), lower(p_slug), coalesce(p_locale, 'de'), v_uid) returning id into v_id;
  else
    insert into public.tenants (name, slug, locale, created_by, plan_id, plan_parent_id) values (trim(p_name), lower(p_slug), coalesce(p_locale, 'de'), v_uid, v_plan, v_parent) returning id into v_id;
  end if;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_uid, 'owner');
  insert into public.tenant_domains (tenant_id, hostname, kind, status, is_primary) values (v_id, lower(p_slug) || '.' || lower(p_root), 'subdomain', 'active', true);
  insert into public.platform_audit_log (actor_id, action, tenant_id, target_type, target_id, meta)
  values (v_uid, 'tenant.created', v_id, 'tenant', v_id::text, case when v_parent is null then '{}'::jsonb else jsonb_build_object('plan_parent_id', v_parent, 'plan_id', v_plan) end);
  return v_id;
end $$;

-- Can this account add a shop that is included in a plan (shown in the switcher and on /new-shop)?
create or replace function public.included_shop_room() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(max(public.plan_shops(t.plan_id) - 1 - (select count(*) from public.tenants c where c.plan_parent_id = t.id)), 0)::int
  from public.tenants t
  join public.tenant_members m on m.tenant_id = t.id and m.user_id = auth.uid() and m.role = 'owner'
  where t.plan_parent_id is null and t.status <> 'closed';
$$;
revoke all on function public.included_shop_room() from public, anon;
grant execute on function public.included_shop_room() to authenticated;
