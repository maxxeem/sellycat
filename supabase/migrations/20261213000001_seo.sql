-- SEO: optional own search title/description per deal and a switch to keep it out of search
-- engines (empty = generated from the deal); shop title and Google verification in shop_settings.
alter table public.deals
  add column seo_title text check (char_length(seo_title) <= 120),
  add column seo_description text check (char_length(seo_description) <= 320),
  add column seo_noindex boolean not null default false;
-- anon reads deals through a column grant (security review).
grant select (seo_title, seo_description, seo_noindex) on public.deals to anon;

create or replace function public.shop_profile(p_tenant uuid)
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
           'seo_title', t.shop_settings->>'seo_title',
           'google_verification', t.shop_settings->>'google_verification',
           'deal_order', coalesce(t.shop_settings->>'deal_order', 'manual'),
           'branding', public.plan_allows(t.id, 'branding'),
           'deal_alert', t.deal_alert_at is not null and public.plan_allows(t.id, 'deal_alert')
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
