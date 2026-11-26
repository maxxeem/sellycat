-- Partner code for the redemption app: per partner either authorised scanners (people with an email
-- code) or one code that anyone at the partner enters on the phone, never both. The code is stored
-- only as a bcrypt hash, in a table no client can read or write. A code session is a scan session
-- without a person: it finds and redeems the vouchers of that one partner and nothing else.
create table public.partner_scan_codes (
  partner_id uuid primary key references public.partners (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code_hash text not null,
  set_at timestamptz not null default now()
);
create index partner_scan_codes_tenant_idx on public.partner_scan_codes (tenant_id);
alter table public.partner_scan_codes enable row level security;
revoke all on public.partner_scan_codes from anon, authenticated;

alter table public.scan_sessions
  alter column user_id drop not null,
  add column partner_id uuid references public.partners (id) on delete cascade,
  add constraint scan_sessions_who check ((user_id is null) <> (partner_id is null));
create index scan_sessions_partner_idx on public.scan_sessions (partner_id);

-- Is this partner on a code (then its scanners have no access)?
create function public.partner_uses_code(p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_partner is not null and exists (select 1 from public.partner_scan_codes c where c.partner_id = p_partner);
$$;

-- Scanners of a partner on a code lose their rights everywhere (app, dashboard, find, redeem).
create or replace function public.can_redeem(p_tenant uuid, p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = auth.uid()
      and (m.role in ('owner', 'admin', 'editor', 'redeemer') or (m.role = 'partner' and m.partner_id is not null and m.partner_id = p_partner and not public.partner_uses_code(m.partner_id)))
  ) or public.is_staff();
$$;

create or replace function public.can_use_redeem(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = auth.uid()
      and (m.role in ('owner', 'admin', 'editor', 'redeemer') or (m.role = 'partner' and not public.partner_uses_code(m.partner_id)))
  ) or public.is_staff();
$$;

create or replace function public.scan_member(p_tenant uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = p_user
      and (m.role in ('owner', 'admin', 'editor', 'redeemer') or (m.role = 'partner' and not public.partner_uses_code(m.partner_id)))
  );
$$;

create or replace function public.redeem_user_id(p_tenant uuid, p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and public.scan_member(p_tenant, u.id)
  limit 1;
$$;

-- The session behind a cookie: a person (still allowed) or a partner (still on the same code).
drop function public.scan_session_use(text, uuid, text);
create function public.scan_session_use(p_hash text, p_tenant uuid, p_host text)
returns table (user_id uuid, email text, partner_id uuid, partner_name text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare s public.scan_sessions%rowtype;
begin
  select * into s from public.scan_sessions where token_hash = p_hash and tenant_id = p_tenant and host = p_host and expires_at > now();
  if not found then return; end if;
  if s.partner_id is not null then
    if not exists (select 1 from public.partner_scan_codes c where c.partner_id = s.partner_id and c.tenant_id = p_tenant and c.set_at <= s.created_at) then return; end if;
  elsif not public.scan_member(p_tenant, s.user_id) then
    return;
  end if;
  if s.last_used_at < now() - interval '1 hour' then update public.scan_sessions set last_used_at = now() where id = s.id; end if;
  if s.partner_id is not null then
    return query select null::uuid, null::text, p.id, p.name from public.partners p where p.id = s.partner_id;
  else
    return query select u.id, u.email::text, null::uuid, null::text from auth.users u where u.id = s.user_id and (u.banned_until is null or u.banned_until < now());
  end if;
end $$;

-- Sets (or replaces) a partner's code: no other partner of the shop may have the same one. Its
-- scanners are removed and every session of the partner ends.
create function public.partner_code_set(p_tenant uuid, p_partner uuid, p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code !~ '^[A-Z0-9]{8,32}$' then return 'invalid'; end if;
  if not exists (select 1 from public.partners where id = p_partner and tenant_id = p_tenant) then return 'not_found'; end if;
  if exists (select 1 from public.partner_scan_codes c where c.tenant_id = p_tenant and c.partner_id <> p_partner and c.code_hash = extensions.crypt(p_code, c.code_hash)) then return 'taken'; end if;
  insert into public.partner_scan_codes (partner_id, tenant_id, code_hash, set_at) values (p_partner, p_tenant, extensions.crypt(p_code, extensions.gen_salt('bf', 8)), now())
  on conflict (partner_id) do update set code_hash = excluded.code_hash, set_at = excluded.set_at;
  delete from public.scan_sessions where partner_id = p_partner;
  delete from public.tenant_members where tenant_id = p_tenant and role = 'partner' and partner_id = p_partner;
  return 'ok';
end $$;

-- Back to scanners: the code and its sessions are gone.
create function public.partner_code_clear(p_tenant uuid, p_partner uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.scan_sessions where partner_id = p_partner and tenant_id = p_tenant;
  delete from public.partner_scan_codes where partner_id = p_partner and tenant_id = p_tenant;
$$;

-- The partner whose code this is (null when none matches).
create function public.partner_code_match(p_tenant uuid, p_code text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select c.partner_id from public.partner_scan_codes c
  where c.tenant_id = p_tenant and p_code ~ '^[A-Z0-9]{8,32}$' and c.code_hash = extensions.crypt(p_code, c.code_hash)
  limit 1;
$$;

-- Find for a code session: only vouchers of that partner; another partner's voucher names it.
create function public.scan_find_partner(p_tenant uuid, p_partner uuid, p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v record; v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
begin
  if not public.partner_uses_code(p_partner) then return jsonb_build_object('error', 'forbidden'); end if;
  select x.id, x.partner_id, x.shared_code, x.code_format into v from public.vouchers x
  where x.tenant_id = p_tenant and p_token is not null and length(p_token) >= 20 and x.token = p_token limit 1;
  if not found and length(v_norm) >= 4 then
    select x.id, x.partner_id, x.shared_code, x.code_format into v from public.vouchers x
    where x.tenant_id = p_tenant and upper(regexp_replace(x.code, '[\s-]', '', 'g')) = v_norm
    order by x.shared_code, coalesce(x.partner_id = p_partner, false) desc limit 1;
  end if;
  if not found then return '{}'::jsonb; end if;
  if v.partner_id is distinct from p_partner then
    return jsonb_build_object('partner', coalesce((select name from public.partners where id = v.partner_id), ''));
  end if;
  -- A shared code is the same for many vouchers: only its QR (token) tells them apart.
  if v.shared_code and (p_token is null or length(p_token) < 20) then
    return jsonb_build_object('shared', case when v.code_format = 'qr' then 'qr' else 'partner' end);
  end if;
  return jsonb_build_object('id', v.id);
end $$;

create function public.scan_redeem_partner(p_tenant uuid, p_partner uuid, p_voucher uuid, p_amount int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.partner_uses_code(p_partner) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if not exists (select 1 from public.vouchers v where v.id = p_voucher and v.tenant_id = p_tenant and v.partner_id = p_partner) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  -- No person behind it: redeem_apply's server path (rights checked above), source = app.
  return public.redeem_apply(p_voucher, p_amount, 'pwa', null, null, p_tenant, null);
end $$;

do $$
declare f text;
begin
  foreach f in array array['partner_uses_code(uuid)', 'scan_session_use(text, uuid, text)', 'partner_code_set(uuid, uuid, text)', 'partner_code_clear(uuid, uuid)', 'partner_code_match(uuid, text)', 'scan_find_partner(uuid, uuid, text, text)', 'scan_redeem_partner(uuid, uuid, uuid, int)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
