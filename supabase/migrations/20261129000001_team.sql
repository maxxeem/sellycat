-- Phase 7, part 2: team members and invitations (owner, admin, editor, redeemer). Scanners
-- (role partner) are managed per partner and do not take a seat. The plan's `seats` limit counts
-- members plus open invitations.

alter table public.tenant_invites
  add column if not exists token_hash text unique,
  add column if not exists name text check (name is null or length(name) <= 120),
  add column if not exists accepted_by uuid references auth.users (id) on delete set null;
alter table public.tenant_invites drop constraint if exists tenant_invites_role_check;
alter table public.tenant_invites add constraint tenant_invites_role_check check (role in ('owner', 'admin', 'editor', 'redeemer'));

-- Seats in use: team members (not scanners) plus invitations still open.
create or replace function public.team_seats_used(p_tenant uuid) returns int
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.tenant_members m where m.tenant_id = p_tenant and m.role in ('owner', 'admin', 'editor', 'redeemer'))::int
       + (select count(*) from public.tenant_invites i where i.tenant_id = p_tenant and i.accepted_at is null and i.expires_at > now())::int
$$;
revoke all on function public.team_seats_used(uuid) from public;
grant execute on function public.team_seats_used(uuid) to authenticated, service_role;

-- What an invitation link shows before anyone is signed in: shop, role, the invited address
-- (masked) and whether it is still open. The token itself is the secret.
create or replace function public.invite_preview(p_token text)
returns table (tenant_name text, role public.member_role, email_masked text, open boolean, expired boolean)
language sql stable security definer set search_path = public as $$
  select t.name, i.role,
         regexp_replace(i.email::text, '^(.)[^@]*(@.*)$', '\1•••\2'),
         i.accepted_at is null and i.expires_at > now(),
         i.expires_at <= now()
  from public.tenant_invites i join public.tenants t on t.id = i.tenant_id
  where length(p_token) >= 32 and i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1
$$;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- Accepting: only the invited address (signed in), only while open; the seat was already counted
-- when inviting. An existing scanner of the shop becomes a team member with the new role.
create or replace function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v public.tenant_invites;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v from public.tenant_invites
  where length(p_token) >= 32 and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
  if v.accepted_at is not null then raise exception 'invite used' using errcode = 'P0001'; end if;
  if v.expires_at <= now() then raise exception 'invite expired' using errcode = 'P0001'; end if;
  if lower(v.email::text) <> v_email then raise exception 'invite for another address' using errcode = '42501'; end if;
  insert into public.tenant_members (tenant_id, user_id, role)
  values (v.tenant_id, auth.uid(), v.role)
  on conflict (tenant_id, user_id) do update
    set role = case when tenant_members.role = 'partner' then excluded.role else tenant_members.role end,
        partner_id = case when tenant_members.role = 'partner' then null else tenant_members.partner_id end;
  update public.tenant_invites set accepted_at = now(), accepted_by = auth.uid() where id = v.id;
  return v.tenant_id;
end $$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
