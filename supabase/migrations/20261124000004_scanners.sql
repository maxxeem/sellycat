-- Authorised scanners of a partner are tenant members with role 'partner' and its partner_id.
-- Inviting one needs the account behind an email (service role only, never to customers).
create or replace function public.auth_user_id(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.auth_user_id(text) from public, anon, authenticated;
grant execute on function public.auth_user_id(text) to service_role;

-- A partner member always names its partner.
alter table public.tenant_members add constraint tenant_members_partner_needs_id check (role <> 'partner' or partner_id is not null) not valid;
