-- Server (API key): voucher id by code within the key's shop (spaces, dashes and case do not matter).
create or replace function public.api_find_voucher(p_tenant uuid, p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select v.id from public.vouchers v
  where v.tenant_id = p_tenant
    and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'))
  limit 1;
$$;
revoke all on function public.api_find_voucher(uuid, text) from public, anon, authenticated;
grant execute on function public.api_find_voucher(uuid, text) to service_role;
