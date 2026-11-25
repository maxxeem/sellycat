-- Redemption app: its own sign-in per shop and host instead of a full account session on the shop's
-- domain. The cookie holds a random secret (only its hash is here), is good for one shop only and
-- for nothing but finding and redeeming vouchers. Membership is checked on every use.
create table public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  host text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index scan_sessions_tenant_idx on public.scan_sessions (tenant_id);
create index scan_sessions_user_idx on public.scan_sessions (user_id);
create index scan_sessions_expires_idx on public.scan_sessions (expires_at);
alter table public.scan_sessions enable row level security;
revoke all on public.scan_sessions from anon, authenticated;

create function public.scan_member(p_tenant uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant and m.user_id = p_user and m.role in ('owner', 'admin', 'editor', 'redeemer', 'partner'));
$$;

-- The person behind a session of this shop and host, null when unknown, expired or no longer allowed.
create function public.scan_session_use(p_hash text, p_tenant uuid, p_host text) returns table (user_id uuid, email text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare s public.scan_sessions%rowtype;
begin
  select * into s from public.scan_sessions where token_hash = p_hash and tenant_id = p_tenant and host = p_host and expires_at > now();
  if not found or not public.scan_member(p_tenant, s.user_id) then return; end if;
  if s.last_used_at < now() - interval '1 hour' then update public.scan_sessions set last_used_at = now() where id = s.id; end if;
  return query select u.id, u.email::text from auth.users u where u.id = s.user_id and (u.banned_until is null or u.banned_until < now());
end $$;

-- Runs the existing checks (can_redeem, partner limits) as that person, without staff rights.
create function public.scan_become(p_user uuid) returns void
language sql security definer set search_path = public as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1')::text, true),
         set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', '', true);
$$;

create function public.scan_find(p_tenant uuid, p_user uuid, p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_hint text;
begin
  if not public.scan_member(p_tenant, p_user) then return jsonb_build_object('error', 'forbidden'); end if;
  perform public.scan_become(p_user);
  if p_token is not null then v_id := public.find_voucher_by_token(p_tenant, p_token); end if;
  if v_id is null and p_code is not null then v_id := public.find_voucher(p_tenant, p_code); end if;
  if v_id is not null then return jsonb_build_object('id', v_id); end if;
  v_hint := public.shared_code_hint(p_tenant, p_code);
  if v_hint is not null then return jsonb_build_object('shared', v_hint); end if;
  v_hint := public.voucher_partner_hint(p_tenant, coalesce(p_code, ''), coalesce(p_token, ''));
  if v_hint is not null then return jsonb_build_object('partner', v_hint); end if;
  return '{}'::jsonb;
end $$;

create function public.scan_redeem(p_tenant uuid, p_user uuid, p_voucher uuid, p_amount int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.scan_member(p_tenant, p_user) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  -- Never a voucher of another shop, even when the person works there too.
  if not exists (select 1 from public.vouchers v where v.id = p_voucher and v.tenant_id = p_tenant) then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public.scan_become(p_user);
  return public.redeem_voucher(p_voucher, p_amount, 'pwa');
end $$;

do $$
declare f text;
begin
  foreach f in array array['scan_member(uuid, uuid)', 'scan_session_use(text, uuid, text)', 'scan_become(uuid)', 'scan_find(uuid, uuid, text, text)', 'scan_redeem(uuid, uuid, uuid, int)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
