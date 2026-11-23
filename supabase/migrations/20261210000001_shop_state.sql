-- Shop online/offline. `building`: not opened yet, the shop shows «a new shop is coming» in
-- Sellycat's look; `online`: normal shop; `closed`: taken offline by the owner, the shop shows its
-- logo and a «closed» note. Vouchers, orders, legal pages and the redeem app keep working in all
-- states; only browsing and buying stop. Texts of both notes per shop in `shop_notice`
-- (building_title, building_text, closed_title, closed_text; empty = default text of the shop's
-- language). Only the server writes both columns.

alter table public.tenants add column if not exists shop_state text not null default 'building'
  check (shop_state in ('building', 'online', 'closed'));
alter table public.tenants add column if not exists shop_notice jsonb not null default '{}'::jsonb;
-- Shops that exist today are reachable already: keep them online.
update public.tenants set shop_state = 'online' where shop_state = 'building';
comment on column public.tenants.shop_state is 'building (not opened yet) | online | closed (taken offline). Server only.';
comment on column public.tenants.shop_notice is 'Texts of the building/closed notes: building_title, building_text, closed_title, closed_text. Server only.';

create or replace function public.tenants_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;
  if new.plan_id is distinct from old.plan_id or new.status is distinct from old.status
     or new.fee_override_bps is distinct from old.fee_override_bps or new.fee_override_fixed is distinct from old.fee_override_fixed
     or new.slug is distinct from old.slug or new.created_by is distinct from old.created_by
     or new.stripe_customer_id is distinct from old.stripe_customer_id or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.billing_status is distinct from old.billing_status or new.billing_interval is distinct from old.billing_interval
     or new.current_period_end is distinct from old.current_period_end or new.cancel_at_period_end is distinct from old.cancel_at_period_end
     or new.stripe_schedule_id is distinct from old.stripe_schedule_id or new.pending_plan_id is distinct from old.pending_plan_id
     or new.pending_interval is distinct from old.pending_interval or new.pending_at is distinct from old.pending_at
     or new.plan_parent_id is distinct from old.plan_parent_id
     or new.shop_state is distinct from old.shop_state or new.shop_notice is distinct from old.shop_notice then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return new;
end $$;

-- The public profile carries the state and the note texts (return type changes → drop first).
drop function if exists public.shop_profile(uuid);
create function public.shop_profile(p_tenant uuid)
returns table (tenant_id uuid, slug text, name text, locale text, currency text, theme jsonb, settings jsonb, legal_complete boolean, primary_host text, payments_ready boolean, shop_state text, shop_notice jsonb)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale, t.currency,
         coalesce((select th.published from public.shop_themes th where th.tenant_id = t.id), '{}'::jsonb),
         jsonb_build_object(
           'contact_email', t.shop_settings->>'contact_email',
           'contact_phone', t.shop_settings->>'contact_phone',
           'ga4_id', t.shop_settings->>'ga4_id',
           'meta_pixel_id', t.shop_settings->>'meta_pixel_id',
           'seo_description', t.shop_settings->>'seo_description',
           'deal_order', coalesce(t.shop_settings->>'deal_order', 'manual'),
           'branding', public.plan_allows(t.id, 'branding')
         ),
         public.shop_legal_complete(t.id),
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary),
         coalesce((select s.charges_enabled from public.stripe_accounts s where s.tenant_id = t.id), false),
         t.shop_state,
         jsonb_build_object(
           'building_title', t.shop_notice->>'building_title',
           'building_text', t.shop_notice->>'building_text',
           'closed_title', t.shop_notice->>'closed_title',
           'closed_text', t.shop_notice->>'closed_text'
         )
  from public.tenants t
  where t.id = p_tenant and t.status in ('trial', 'active');
$$;
revoke all on function public.shop_profile(uuid) from public;
grant execute on function public.shop_profile(uuid) to anon, authenticated, service_role;
