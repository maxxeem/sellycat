-- The account behind an email that may use the redemption app of a shop (service role only:
-- used to send a sign-in code without revealing whether the address exists).
create or replace function public.redeem_user_id(p_tenant uuid, p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and (
      exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant and m.user_id = u.id and m.role in ('owner', 'admin', 'editor', 'redeemer', 'partner'))
      or exists (select 1 from public.platform_staff s where s.user_id = u.id)
    )
  limit 1;
$$;
revoke all on function public.redeem_user_id(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_user_id(uuid, text) to service_role;
