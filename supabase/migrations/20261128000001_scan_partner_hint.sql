-- Redemption app: when a code or token belongs to a voucher of this shop that the signed-in
-- person may not redeem (a scanner of another partner), say whose voucher it is instead of
-- "not found". Only for people who may use the redemption app of this shop at all.
create or replace function public.voucher_partner_hint(p_tenant uuid, p_code text, p_token text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(p.name, '')
  from public.vouchers v left join public.partners p on p.id = v.partner_id
  where public.can_use_redeem(p_tenant)
    and v.tenant_id = p_tenant
    and not public.can_redeem(v.tenant_id, v.partner_id)
    and (
      (p_token is not null and length(p_token) >= 20 and v.token = p_token)
      or (p_code is not null and length(p_code) >= 4 and upper(regexp_replace(v.code, '[\s-]', '', 'g')) = upper(regexp_replace(p_code, '[\s-]', '', 'g')))
    )
  limit 1;
$$;
revoke all on function public.voucher_partner_hint(uuid, text, text) from public, anon;
grant execute on function public.voucher_partner_hint(uuid, text, text) to authenticated;
