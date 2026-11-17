-- Deal order in the shop (shop_settings.deal_order: newest | schedule | popular | bestseller |
-- manual) and how often each deal page was opened (for "popular").

alter table public.deals add column view_count int not null default 0 check (view_count >= 0);

-- Customers may not set counters themselves: view_count joins sold/reserved/pool in the guard.
create or replace function public.deals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.sold_qty := 0;
    new.reserved_qty := 0;
    new.pool_free := 0;
    new.view_count := 0;
  elsif new.sold_qty is distinct from old.sold_qty or new.reserved_qty is distinct from old.reserved_qty or new.tenant_id is distinct from old.tenant_id
     or (new.pool_free is distinct from old.pool_free and coalesce(current_setting('sellycat.pool_sync', true), '') <> '1')
     or (new.view_count is distinct from old.view_count and coalesce(current_setting('sellycat.view_sync', true), '') <> '1') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new.state = 'published' and (tg_op = 'INSERT' or old.state <> 'published') then new.published_at := now(); end if;
  return new;
end $$;

-- One more view of a published deal of a live shop (anyone; the page sends it once per visit).
create or replace function public.track_deal_view(p_deal uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('sellycat.view_sync', '1', true);
  update public.deals d set view_count = view_count + 1
  where d.id = p_deal and d.state = 'published' and public.tenant_is_public(d.tenant_id);
  perform set_config('sellycat.view_sync', '', true);
end $$;
revoke all on function public.track_deal_view(uuid) from public;
grant execute on function public.track_deal_view(uuid) to anon, authenticated;

-- shop_profile: plus the deal order in settings.
drop function if exists public.shop_profile(uuid);
create or replace function public.shop_profile(p_tenant uuid)
returns table (tenant_id uuid, slug text, name text, locale text, currency text, theme jsonb, settings jsonb, legal_complete boolean, primary_host text, payments_ready boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale, t.currency,
         coalesce((select th.published from public.shop_themes th where th.tenant_id = t.id), '{}'::jsonb),
         jsonb_build_object(
           'contact_email', t.shop_settings->>'contact_email',
           'contact_phone', t.shop_settings->>'contact_phone',
           'ga4_id', t.shop_settings->>'ga4_id',
           'meta_pixel_id', t.shop_settings->>'meta_pixel_id',
           'seo_description', t.shop_settings->>'seo_description',
           'deal_order', coalesce(t.shop_settings->>'deal_order', 'manual')
         ),
         public.shop_legal_complete(t.id),
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary),
         coalesce((select s.charges_enabled from public.stripe_accounts s where s.tenant_id = t.id), false)
  from public.tenants t
  where t.id = p_tenant and t.status in ('trial', 'active');
$$;
grant execute on function public.shop_profile(uuid) to anon, authenticated;
