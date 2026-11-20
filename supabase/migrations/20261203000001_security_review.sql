-- Security review (Phase 7): findings closed in the database.

-- 1. Partner bank details and settlement terms are not public. Clients read partners only through
--    a column grant without `billing` (owners/admins get it on the server); anon reads deals without
--    the settle_* columns.
revoke select on public.partners from anon, authenticated;
grant select (id, tenant_id, name, description, logo_url, website_url, email, phone, created_at, updated_at) on public.partners to anon, authenticated;

revoke select on public.deals from anon;
grant select (
  archived_at, barcode_type, category_id, code_format, code_source, compare_at_cents, created_at, deal_type, description, faq, featured, id,
  max_per_buyer, max_per_order, partial_redemption, partner_id, pool_free, price_cents, published_at, redeem_days, redeem_until, redeem_validity,
  redeem_windows, reserved_qty, sales_end, sales_start, show_countdown, show_remaining, show_stock_bar, slug, sold_qty, sort_order, state,
  subtitle, teaser, tenant_id, terms, title, total_qty, updated_at, value_cents, view_count
) on public.deals to anon;

-- 2. Shop creation: only Sellycat's own root domains (otherwise a signup could claim a foreign
--    host as its active main address).
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
  if lower(p_root) not in ('sellycat.com', 'staging.sellycat.com', 'localhost') then
    raise exception 'invalid root domain' using errcode = '22023';
  end if;
  insert into public.tenants (name, slug, locale, created_by) values (trim(p_name), lower(p_slug), coalesce(p_locale, 'de'), v_uid) returning id into v_id;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_uid, 'owner');
  insert into public.tenant_domains (tenant_id, hostname, kind, status, is_primary) values (v_id, lower(p_slug) || '.' || lower(p_root), 'subdomain', 'active', true);
  insert into public.platform_audit_log (actor_id, action, tenant_id, target_type, target_id) values (v_uid, 'tenant.created', v_id, 'tenant', v_id::text);
  return v_id;
end $$;

-- 3. Redemption app sign-in: shop members only (no platform staff via a foreign shop), and every
--    guess is counted atomically before it is compared (parallel requests cannot exceed the limit).
create or replace function public.redeem_user_id(p_tenant uuid, p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant and m.user_id = u.id and m.role in ('owner', 'admin', 'editor', 'redeemer', 'partner'))
  limit 1;
$$;

create or replace function public.redeem_login_try(p_tenant uuid, p_email text, p_max int)
returns table (id uuid, code_hash text, attempts int)
language sql security definer set search_path = public as $$
  update public.redeem_logins r set attempts = r.attempts + 1
  where r.id = (select l.id from public.redeem_logins l where l.tenant_id = p_tenant and l.email = p_email order by l.created_at desc limit 1)
    and r.used_at is null and r.expires_at > now() and r.attempts < p_max
  returning r.id, r.code_hash, r.attempts;
$$;
revoke all on function public.redeem_login_try(uuid, text, int) from public, anon, authenticated;
grant execute on function public.redeem_login_try(uuid, text, int) to service_role;

-- 4. Redemption location must fit the voucher (shop and partner), also in the dashboard and app.
create or replace function public.redeem_apply(p_voucher uuid, p_amount int, p_source public.redemption_source, p_location uuid, p_note text, p_api_tenant uuid, p_api_key uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
  d public.deals%rowtype;
  v_amount int;
  v_left int;
begin
  select * into v from public.vouchers where id = p_voucher for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_api_tenant is null then
    if not public.can_redeem(v.tenant_id, v.partner_id) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  elsif v.tenant_id <> p_api_tenant then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  -- A location must belong to this shop and, for a partner's voucher, to that partner.
  if p_location is not null and not exists (
    select 1 from public.partner_locations l where l.id = p_location and l.tenant_id = v.tenant_id and (v.partner_id is null or l.partner_id = v.partner_id)
  ) then return jsonb_build_object('ok', false, 'error', 'location'); end if;
  if v.status = 'valid' and v.valid_until is not null and v.valid_until <= now() then
    update public.vouchers set status = 'expired' where id = v.id;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v.status <> 'valid' then return jsonb_build_object('ok', false, 'error', v.status::text); end if;
  select * into d from public.deals where id = v.deal_id;
  if found and not public.in_redeem_window(d.redeem_windows, now()) then return jsonb_build_object('ok', false, 'error', 'outside_window'); end if;

  if v.remaining_cents is not null then
    v_amount := case when v.partial then coalesce(p_amount, v.remaining_cents) else v.remaining_cents end;
    if v_amount is null or v_amount <= 0 or v_amount > v.remaining_cents then return jsonb_build_object('ok', false, 'error', 'amount'); end if;
    v_left := v.remaining_cents - v_amount;
  end if;

  insert into public.redemptions (tenant_id, voucher_id, amount_cents, user_id, partner_id, location_id, source, note, api_key_id)
  values (v.tenant_id, v.id, v_amount, case when p_api_tenant is null then auth.uid() end, v.partner_id, p_location, p_source, nullif(trim(p_note), ''), p_api_key);
  update public.vouchers
  set remaining_cents = v_left,
      status = case when v_left is null or v_left = 0 then 'redeemed'::public.voucher_status else 'valid'::public.voucher_status end,
      redeemed_at = case when v_left is null or v_left = 0 then now() else redeemed_at end
  where id = v.id;
  return jsonb_build_object('ok', true, 'remaining', v_left, 'voucher', v.id);
end $$;
revoke all on function public.redeem_apply(uuid, int, public.redemption_source, uuid, text, uuid, uuid) from public, anon, authenticated;

-- 5. Helper functions are not for anonymous callers (Supabase grants anon directly).
revoke execute on function public.plan_allows(uuid, text) from anon;
revoke execute on function public.plan_limit(uuid, text) from anon;
revoke execute on function public.team_seats_used(uuid) from anon;
revoke execute on function public.deal_has_sales(uuid) from anon;

-- 6. Shop media: no generic binary uploads (fonts are sent as font/woff2).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'font/woff2', 'application/font-woff2']
where id = 'shop-media';
