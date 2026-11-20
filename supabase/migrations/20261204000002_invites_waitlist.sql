-- Access control for the platform signup: invite codes (with use history), waitlist with
-- double opt-in, and a database-backed rate limit. Platform tables (no tenant_id, like
-- platform_settings): staff read them, only the server (service role) writes, after authorisation.

-- ---------------------------------------------------------------- settings
alter table public.platform_settings
  -- Days after an invitation without signup until one reminder goes out (0 = never).
  add column if not exists invite_reminder_days int not null default 7 check (invite_reminder_days between 0 and 60);

-- ---------------------------------------------------------------- invite codes
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  -- Normalised: upper case, A-Z 0-9 and dashes (see src/lib/access/codes.ts).
  code text not null unique check (code ~ '^[A-Z0-9](?:[A-Z0-9-]{2,38}[A-Z0-9])$'),
  max_uses int check (max_uses is null or max_uses >= 1),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz,
  disabled_at timestamptz,
  -- Optional perks: plan granted at signup, trial days and Stripe coupon for the first booking.
  plan_id text references public.plans (id) on delete set null,
  trial_days int check (trial_days between 0 and 365),
  stripe_coupon_id text check (stripe_coupon_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  tag text check (length(tag) <= 60),
  note text check (length(note) <= 500),
  waitlist_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (max_uses is null or uses <= max_uses)
);
create index invite_codes_created_idx on public.invite_codes (created_at desc);
create index invite_codes_tag_idx on public.invite_codes (tag) where tag is not null;

create type public.invite_use_status as enum ('pending', 'confirmed', 'released');

-- One row per signup that used a code: pending until the e-mail is confirmed (the slot is held),
-- confirmed with the shop, released when it was never confirmed (the slot is free again).
create table public.invite_code_uses (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.invite_codes (id) on delete cascade,
  email citext not null,
  user_id uuid references auth.users (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  status public.invite_use_status not null default 'pending',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  released_at timestamptz
);
create index invite_code_uses_code_idx on public.invite_code_uses (code_id, created_at desc);
create index invite_code_uses_user_idx on public.invite_code_uses (user_id) where user_id is not null;
create index invite_code_uses_pending_idx on public.invite_code_uses (created_at) where status = 'pending';

alter table public.tenants add column if not exists invite_code_id uuid references public.invite_codes (id) on delete set null;

-- ---------------------------------------------------------------- waitlist
create type public.waitlist_status as enum ('new', 'invited', 'registered', 'rejected');
create type public.waitlist_use_case as enum ('media', 'association', 'city_tourism', 'retail_gastro', 'agency', 'other');

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique check (length(email) <= 254),
  name text check (length(name) <= 120),
  company text check (length(company) <= 120),
  website text check (length(website) <= 200),
  use_case public.waitlist_use_case,
  message text check (length(message) <= 1000),
  locale text not null default 'de' check (locale in ('de', 'en')),
  status public.waitlist_status not null default 'new',
  -- Double opt-in: only confirmed entries count; unconfirmed ones are deleted after 14 days.
  confirm_token_hash text unique,
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  consent_at timestamptz not null,
  consent_version text not null,
  staff_note text check (length(staff_note) <= 2000),
  invited_at timestamptz,
  invite_code_id uuid references public.invite_codes (id) on delete set null,
  reminded_at timestamptz,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger waitlist_updated before update on public.waitlist for each row execute function public.set_updated_at();
create index waitlist_created_idx on public.waitlist (created_at desc);
create index waitlist_status_idx on public.waitlist (status, created_at desc);

alter table public.invite_codes add constraint invite_codes_waitlist_fk foreign key (waitlist_id) references public.waitlist (id) on delete set null;

-- ---------------------------------------------------------------- rate limit
-- Fixed windows per key (hashed IP / e-mail, never in clear), shared by all server instances.
create table public.rate_hits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------- RLS
alter table public.invite_codes enable row level security;
alter table public.invite_code_uses enable row level security;
alter table public.waitlist enable row level security;
alter table public.rate_hits enable row level security;

create policy invite_codes_staff_read on public.invite_codes for select using (public.is_staff());
create policy invite_uses_staff_read on public.invite_code_uses for select using (public.is_staff());
create policy waitlist_staff_read on public.waitlist for select using (public.is_staff());
-- rate_hits: no policy, service role only.

-- Secrets never reach a client, not even staff.
revoke select on public.waitlist from anon, authenticated;
grant select (id, email, name, company, website, use_case, message, locale, status, confirmed_at, consent_at, consent_version, staff_note,
  invited_at, invite_code_id, reminded_at, registered_at, created_at, updated_at) on public.waitlist to authenticated;
revoke insert, update, delete on public.invite_codes, public.invite_code_uses, public.waitlist, public.rate_hits from anon, authenticated;
revoke select on public.rate_hits from anon, authenticated;

-- ---------------------------------------------------------------- functions (service role only)

-- Counts one hit in the current window; false once the limit is reached (atomic).
create or replace function public.rate_hit(p_key text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_hits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = public.rate_hits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Holds one use of a code for a signup. Atomic (row lock; uses only grows below max_uses).
-- Every failure returns null: the caller cannot tell unknown, disabled, expired and used-up apart.
create or replace function public.claim_invite_code(p_code text, p_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.invite_codes%rowtype;
  v_use uuid;
begin
  select * into c from public.invite_codes where code = upper(trim(p_code)) for update;
  if not found or c.disabled_at is not null or (c.expires_at is not null and c.expires_at <= now()) then return null; end if;
  -- A personal code only works for its waitlist address.
  if c.waitlist_id is not null and not exists (select 1 from public.waitlist w where w.id = c.waitlist_id and w.email = lower(trim(p_email))) then return null; end if;
  update public.invite_codes set uses = uses + 1 where id = c.id and (max_uses is null or uses < max_uses);
  if not found then return null; end if;
  insert into public.invite_code_uses (code_id, email) values (c.id, lower(trim(p_email))) returning id into v_use;
  return v_use;
end $$;

-- Gives a held use back (signup failed or the address already had an account).
create or replace function public.release_invite_use(p_use uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  u public.invite_code_uses%rowtype;
begin
  select * into u from public.invite_code_uses where id = p_use for update;
  if not found or u.status <> 'pending' then return; end if;
  update public.invite_code_uses set status = 'released', released_at = now() where id = p_use;
  update public.invite_codes set uses = greatest(uses - 1, 0) where id = u.code_id;
end $$;

create or replace function public.attach_invite_user(p_use uuid, p_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.invite_code_uses set user_id = p_user where id = p_use and user_id is null and status = 'pending';
$$;

-- After the e-mail is confirmed: the user's use becomes confirmed. A use released in the meantime
-- is taken again if the code still allows it. Returns the code's perks, or null.
create or replace function public.confirm_invite_use(p_user uuid) returns table (code_id uuid, plan_id text, trial_days int, stripe_coupon_id text)
language plpgsql security definer set search_path = public as $$
declare
  u public.invite_code_uses%rowtype;
  c public.invite_codes%rowtype;
begin
  select * into u from public.invite_code_uses where user_id = p_user and status in ('pending', 'released', 'confirmed')
  order by (status = 'confirmed') desc, (status = 'pending') desc, created_at desc limit 1 for update;
  if not found then return; end if;
  select * into c from public.invite_codes where id = u.code_id for update;
  if u.status = 'released' then
    if c.disabled_at is not null or (c.expires_at is not null and c.expires_at <= now()) then return; end if;
    update public.invite_codes set uses = uses + 1 where id = c.id and (max_uses is null or uses < max_uses);
    if not found then return; end if;
  end if;
  if u.status <> 'confirmed' then
    update public.invite_code_uses set status = 'confirmed', confirmed_at = now(), released_at = null where id = u.id;
  end if;
  return query select c.id, c.plan_id, c.trial_days, c.stripe_coupon_id;
end $$;

-- The shop created for a confirmed use: links both and marks the waitlist entry as registered.
create or replace function public.finish_invite_signup(p_user uuid, p_tenant uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_code uuid;
  v_plan text;
  v_email citext;
begin
  update public.invite_code_uses set tenant_id = p_tenant
  where id = (select id from public.invite_code_uses where user_id = p_user and status = 'confirmed' and tenant_id is null order by confirmed_at desc limit 1)
  returning code_id, email into v_code, v_email;
  if v_code is not null then
    select plan_id into v_plan from public.invite_codes where id = v_code;
    update public.tenants set invite_code_id = v_code, plan_id = coalesce(v_plan, plan_id) where id = p_tenant;
    update public.waitlist set status = 'registered', registered_at = now()
    where status <> 'registered' and (id = (select waitlist_id from public.invite_codes where id = v_code) or email = v_email);
  else
    -- Open signup without a code: a waitlist entry with the same address is registered too.
    update public.waitlist set status = 'registered', registered_at = now()
    where status <> 'registered' and email = (select lower(email) from auth.users where id = p_user);
  end if;
end $$;

-- Held uses never confirmed within p_hours go back to the code; unconfirmed waitlist entries
-- and old rate-limit windows are deleted.
create or replace function public.access_housekeeping(p_hours int default 72) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_released int := 0;
  v_waitlist int;
  r record;
begin
  for r in select id from public.invite_code_uses where status = 'pending' and created_at < now() - make_interval(hours => p_hours) loop
    perform public.release_invite_use(r.id);
    v_released := v_released + 1;
  end loop;
  delete from public.waitlist where confirmed_at is null and created_at < now() - interval '14 days';
  get diagnostics v_waitlist = row_count;
  delete from public.rate_hits where window_start < now() - interval '2 days';
  return jsonb_build_object('released', v_released, 'waitlist_deleted', v_waitlist);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.rate_hit(text, int, int)', 'public.claim_invite_code(text, text)', 'public.release_invite_use(uuid)',
    'public.attach_invite_user(uuid, uuid)', 'public.confirm_invite_use(uuid)', 'public.finish_invite_signup(uuid, uuid)',
    'public.access_housekeeping(int)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- shop creation
-- Self-service: open signup, or a confirmed invite use that has no shop yet (any mode, so a
-- personal invitation also works while signup is closed). Staff always.
create or replace function public.create_tenant(p_name text, p_slug text, p_root text, p_locale text default 'de')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not public.is_staff()
     and (select signup_mode from public.platform_settings) <> 'open'
     and not exists (select 1 from public.invite_code_uses u where u.user_id = v_uid and u.status = 'confirmed' and u.tenant_id is null) then
    raise exception 'signup paused' using errcode = '42501';
  end if;
  if lower(p_root) not in ('sellycat.com', 'staging.sellycat.com', 'localhost') then
    raise exception 'invalid root domain' using errcode = '22023';
  end if;
  insert into public.tenants (name, slug, locale, created_by) values (trim(p_name), lower(p_slug), coalesce(p_locale, 'de'), v_uid) returning id into v_id;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_uid, 'owner');
  insert into public.tenant_domains (tenant_id, hostname, kind, status, is_primary) values (v_id, lower(p_slug) || '.' || lower(p_root), 'subdomain', 'active', true);
  insert into public.platform_audit_log (actor_id, action, tenant_id, target_type, target_id) values (v_uid, 'tenant.created', v_id, 'tenant', v_id::text);
  return v_id;
end $$;
