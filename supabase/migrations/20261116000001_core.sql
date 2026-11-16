-- Sellycat phase 1: platform core (tenants, members, domains, plans, staff, settings, audit).
-- Principles (docs/PLAN.md §4): every business table carries tenant_id, RLS is on everywhere,
-- writes that need cross-checks run in security-definer functions or server code with the
-- service role after authorisation. Money in minor units (Rappen), times timestamptz.

create extension if not exists citext;

-- ---------------------------------------------------------------- enums
create type public.tenant_status as enum ('trial', 'active', 'suspended', 'closed');
create type public.member_role as enum ('owner', 'admin', 'editor', 'redeemer', 'partner');
create type public.platform_role as enum ('superadmin', 'support');
create type public.domain_kind as enum ('subdomain', 'custom');
create type public.domain_status as enum ('pending', 'dns_ok', 'active', 'error');
create type public.signup_mode as enum ('open', 'paused');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- plans
create table public.plans (
  id text primary key check (id ~ '^[a-z0-9_-]{2,32}$'),
  name text not null,
  sort_order int not null default 0,
  is_public boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  prices jsonb not null default '{}'::jsonb,
  stripe jsonb not null default '{}'::jsonb,
  -- Sellycat's share per shop sale (Stripe application fee): basis points + fixed Rappen.
  application_fee_bps int not null default 0 check (application_fee_bps between 0 and 5000),
  application_fee_fixed int not null default 0 check (application_fee_fixed >= 0),
  trial_days int not null default 0 check (trial_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_updated before update on public.plans for each row execute function public.set_updated_at();

insert into public.plans (id, name, sort_order, limits, prices, application_fee_bps, trial_days) values
  ('starter', 'Starter', 1, '{"deals_live": 5, "seats": 2, "custom_domain": false}', '{"monthly": {"CHF": 0}}', 0, 0),
  ('pro', 'Pro', 2, '{"deals_live": 50, "seats": 10, "custom_domain": true}', '{"monthly": {"CHF": 0}}', 0, 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- tenants
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug citext not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$' and slug !~ '--'),
  status public.tenant_status not null default 'trial',
  plan_id text not null default 'starter' references public.plans (id),
  locale text not null default 'de' check (locale in ('de', 'en')),
  currency text not null default 'CHF' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Europe/Zurich',
  -- Invoice details shown on receipts: {"legal_name", "street", "zip", "city", "country", "vat_no"}.
  billing jsonb not null default '{}'::jsonb,
  -- Per-customer override of the plan's application fee (null = plan value). Staff only.
  fee_override_bps int check (fee_override_bps between 0 and 5000),
  fee_override_fixed int check (fee_override_fixed >= 0),
  mail_from_name text,
  reply_to text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tenants_updated before update on public.tenants for each row execute function public.set_updated_at();

create table public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  -- Set for role 'partner' (partners table arrives in phase 2).
  partner_id uuid,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_idx on public.tenant_members (user_id);

create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email citext not null,
  role public.member_role not null,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  hostname citext not null unique check (hostname ~ '^[a-z0-9.-]+$'),
  kind public.domain_kind not null,
  status public.domain_status not null default 'pending',
  is_primary boolean not null default false,
  verification jsonb not null default '[]'::jsonb,
  error text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tenant_domains_one_primary on public.tenant_domains (tenant_id) where is_primary;
create trigger tenant_domains_updated before update on public.tenant_domains for each row execute function public.set_updated_at();

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale text check (locale in ('de', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- platform
create table public.platform_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  id boolean primary key default true check (id),
  signup_mode public.signup_mode not null default 'paused',
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;
create trigger platform_settings_updated before update on public.platform_settings for each row execute function public.set_updated_at();

create table public.platform_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  tenant_id uuid references public.tenants (id) on delete set null,
  target_type text,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index platform_audit_log_created_idx on public.platform_audit_log (created_at desc);
create index platform_audit_log_tenant_idx on public.platform_audit_log (tenant_id, created_at desc);

-- ---------------------------------------------------------------- access helpers
-- security definer + fixed search_path: they read membership tables without recursing into RLS.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_staff where user_id = auth.uid());
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_staff where user_id = auth.uid() and role = 'superadmin');
$$;

create or replace function public.tenant_role(p_tenant uuid) returns public.member_role
language sql stable security definer set search_path = public as $$
  select role from public.tenant_members where tenant_id = p_tenant and user_id = auth.uid();
$$;

create or replace function public.has_tenant_role(p_tenant uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenant_members where tenant_id = p_tenant and user_id = auth.uid() and role = any (p_roles));
$$;

create or replace function public.is_tenant_member(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenant_members where tenant_id = p_tenant and user_id = auth.uid());
$$;

-- Customers may edit their tenant, but never their plan, status or fee: those are staff decisions.
create or replace function public.tenants_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;
  if new.plan_id is distinct from old.plan_id or new.status is distinct from old.status
     or new.fee_override_bps is distinct from old.fee_override_bps or new.fee_override_fixed is distinct from old.fee_override_fixed
     or new.slug is distinct from old.slug or new.created_by is distinct from old.created_by then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger tenants_guard before update on public.tenants for each row execute function public.tenants_guard();

-- ---------------------------------------------------------------- RLS
alter table public.plans enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_invites enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_staff enable row level security;
alter table public.platform_settings enable row level security;
alter table public.platform_audit_log enable row level security;

create policy plans_read on public.plans for select using (is_public or public.is_staff());
create policy plans_staff_write on public.plans for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy tenants_read on public.tenants for select using (public.is_tenant_member(id) or public.is_staff());
create policy tenants_update on public.tenants for update
  using (public.has_tenant_role(id, array['owner', 'admin']::public.member_role[]) or public.is_staff())
  with check (public.has_tenant_role(id, array['owner', 'admin']::public.member_role[]) or public.is_staff());
-- Inserts and deletes: only via create_tenant() / staff server code.

create policy members_read on public.tenant_members for select using (public.is_tenant_member(tenant_id) or public.is_staff());
-- Member writes go through server code (role rules: only owners grant owner).

create policy invites_read on public.tenant_invites for select
  using (public.has_tenant_role(tenant_id, array['owner', 'admin']::public.member_role[]) or public.is_staff());

create policy domains_read on public.tenant_domains for select using (public.is_tenant_member(tenant_id) or public.is_staff());

create policy profiles_own on public.profiles for select using (user_id = auth.uid() or public.is_staff());
create policy profiles_own_write on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_own_insert on public.profiles for insert with check (user_id = auth.uid());

create policy staff_read on public.platform_staff for select using (user_id = auth.uid() or public.is_staff());

-- Everyone (also anon) may read the signup switch; only super-admins change it.
create policy settings_read on public.platform_settings for select using (true);
create policy settings_write on public.platform_settings for update using (public.is_superadmin()) with check (public.is_superadmin());

create policy audit_read on public.platform_audit_log for select using (public.is_staff());

-- ---------------------------------------------------------------- functions
-- Creates a tenant with the caller as owner and <slug>.<root> as primary domain. Used by the
-- self-service signup (only while signup is open) and by staff (always).
create or replace function public.create_tenant(p_name text, p_slug text, p_root text, p_locale text default 'de')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not public.is_staff() and (select signup_mode from public.platform_settings) <> 'open' then
    raise exception 'signup paused' using errcode = '42501';
  end if;
  insert into public.tenants (name, slug, locale, created_by) values (trim(p_name), lower(p_slug), coalesce(p_locale, 'de'), v_uid) returning id into v_id;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_uid, 'owner');
  insert into public.tenant_domains (tenant_id, hostname, kind, status, is_primary) values (v_id, lower(p_slug) || '.' || lower(p_root), 'subdomain', 'active', true);
  insert into public.platform_audit_log (actor_id, action, tenant_id, target_type, target_id) values (v_uid, 'tenant.created', v_id, 'tenant', v_id::text);
  return v_id;
end $$;
revoke all on function public.create_tenant(text, text, text, text) from public, anon;
grant execute on function public.create_tenant(text, text, text, text) to authenticated;

-- Public shop resolution (anon): a host or slug → the live tenant behind it. Only non-sensitive
-- fields; suspended/closed tenants resolve to nothing.
create or replace function public.resolve_shop(p_slug text default null, p_host text default null)
returns table (tenant_id uuid, slug text, name text, locale text, primary_host text)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale,
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary)
  from public.tenants t
  where t.status in ('trial', 'active')
    and (
      (p_slug is not null and t.slug = lower(p_slug))
      or (p_host is not null and exists (
        select 1 from public.tenant_domains d where d.tenant_id = t.id and d.hostname = lower(p_host) and d.status in ('dns_ok', 'active')
      ))
    )
  limit 1;
$$;
grant execute on function public.resolve_shop(text, text) to anon, authenticated;

create or replace function public.slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.tenants where slug = lower(p_slug));
$$;
grant execute on function public.slug_available(text) to anon, authenticated;

-- Tenants the caller belongs to, with role (dashboard switcher).
create or replace function public.my_tenants()
returns table (tenant_id uuid, name text, slug text, role public.member_role, status public.tenant_status)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.slug::text, m.role, t.status
  from public.tenant_members m join public.tenants t on t.id = m.tenant_id
  where m.user_id = auth.uid()
  order by t.name;
$$;
grant execute on function public.my_tenants() to authenticated;

-- Public shop header data by tenant id (anon; used inside cached shop pages).
create or replace function public.shop_profile(p_tenant uuid)
returns table (tenant_id uuid, slug text, name text, locale text, currency text)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale, t.currency
  from public.tenants t
  where t.id = p_tenant and t.status in ('trial', 'active');
$$;
grant execute on function public.shop_profile(uuid) to anon, authenticated;
