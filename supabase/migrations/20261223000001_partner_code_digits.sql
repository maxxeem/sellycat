-- Partner code: 4 to 8 digits (quick on a phone's number pad) instead of 8 to 32 letters or digits.
-- Codes set before keep working only if they already are 4 to 8 digits.
create or replace function public.partner_code_set(p_tenant uuid, p_partner uuid, p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code !~ '^[0-9]{4,8}$' then return 'invalid'; end if;
  if not exists (select 1 from public.partners where id = p_partner and tenant_id = p_tenant) then return 'not_found'; end if;
  if exists (select 1 from public.partner_scan_codes c where c.tenant_id = p_tenant and c.partner_id <> p_partner and c.code_hash = extensions.crypt(p_code, c.code_hash)) then return 'taken'; end if;
  insert into public.partner_scan_codes (partner_id, tenant_id, code_hash, set_at) values (p_partner, p_tenant, extensions.crypt(p_code, extensions.gen_salt('bf', 8)), now())
  on conflict (partner_id) do update set code_hash = excluded.code_hash, set_at = excluded.set_at;
  delete from public.scan_sessions where partner_id = p_partner;
  delete from public.tenant_members where tenant_id = p_tenant and role = 'partner' and partner_id = p_partner;
  return 'ok';
end $$;

create or replace function public.partner_code_match(p_tenant uuid, p_code text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select c.partner_id from public.partner_scan_codes c
  where c.tenant_id = p_tenant and p_code ~ '^[0-9]{4,8}$' and c.code_hash = extensions.crypt(p_code, c.code_hash)
  limit 1;
$$;
