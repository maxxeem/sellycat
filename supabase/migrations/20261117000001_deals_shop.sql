-- Sellycat phase 2: partners, redemption locations, categories, deals, shop theme, legal pages,
-- public storage. Public (anon) read only for shops that are live and deals that are published.

-- ---------------------------------------------------------------- enums
create type public.deal_type as enum ('fixed', 'value');
create type public.deal_state as enum ('draft', 'published', 'ended');
create type public.code_format as enum ('qr', 'numeric', 'barcode');
create type public.barcode_type as enum ('ean13', 'ean8', 'upca', 'code128', 'code39', 'itf14', 'datamatrix', 'pdf417');
create type public.code_source as enum ('generated', 'pool');
create type public.redeem_validity as enum ('none', 'until_date', 'days_after_purchase');
create type public.legal_kind as enum ('imprint', 'terms', 'privacy');

-- Editors and above may change shop content.
create or replace function public.can_edit(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_tenant_role(p_tenant, array['owner', 'admin', 'editor']::public.member_role[]) or public.is_staff();
$$;

-- A shop is public while its tenant is in trial or active.
create or replace function public.tenant_is_public(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenants where id = p_tenant and status in ('trial', 'active'));
$$;

-- ---------------------------------------------------------------- partners & locations
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text,
  logo_url text,
  website_url text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partners_tenant_idx on public.partners (tenant_id);
create trigger partners_updated before update on public.partners for each row execute function public.set_updated_at();

create table public.partner_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  street text,
  zip text,
  city text,
  country text not null default 'CH',
  lat double precision,
  lng double precision,
  opening_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_locations_partner_idx on public.partner_locations (partner_id);
create trigger partner_locations_updated before update on public.partner_locations for each row execute function public.set_updated_at();

-- tenant_members.partner_id (phase 1) now gets its foreign key.
alter table public.tenant_members add constraint tenant_members_partner_fk foreign key (partner_id) references public.partners (id) on delete set null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- ---------------------------------------------------------------- deals
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  partner_id uuid references public.partners (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  state public.deal_state not null default 'draft',
  deal_type public.deal_type not null default 'fixed',
  title text not null check (length(trim(title)) between 1 and 140),
  subtitle text,
  -- Rich text as Tiptap JSON; rendered to HTML on the server (only known nodes, so no raw HTML).
  description jsonb not null default '{}'::jsonb,
  terms text,
  faq jsonb not null default '[]'::jsonb,
  price_cents int not null check (price_cents >= 0),
  compare_at_cents int check (compare_at_cents is null or compare_at_cents >= 0),
  -- Value vouchers: the face value (may differ from the price, e.g. pay 40 get 50).
  value_cents int check (value_cents is null or value_cents > 0),
  partial_redemption boolean not null default false,
  -- Limits (all optional, combinable).
  total_qty int check (total_qty is null or total_qty >= 0),
  sold_qty int not null default 0 check (sold_qty >= 0),
  reserved_qty int not null default 0 check (reserved_qty >= 0),
  max_per_order int check (max_per_order is null or max_per_order >= 1),
  max_per_buyer int check (max_per_buyer is null or max_per_buyer >= 1),
  sales_start timestamptz,
  sales_end timestamptz,
  redeem_validity public.redeem_validity not null default 'none',
  redeem_until date,
  redeem_days int check (redeem_days is null or redeem_days between 1 and 3650),
  -- [{ "days": [1..7] (ISO weekday), "from": "HH:MM", "to": "HH:MM" }], empty = any time.
  redeem_windows jsonb not null default '[]'::jsonb,
  -- Shop display.
  show_remaining boolean not null default false,
  show_countdown boolean not null default false,
  featured boolean not null default false,
  sort_order int not null default 0,
  -- Voucher format (codes and pools arrive in phase 4).
  code_format public.code_format not null default 'qr',
  barcode_type public.barcode_type,
  code_source public.code_source not null default 'generated',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug),
  check (sales_end is null or sales_start is null or sales_end > sales_start),
  check (compare_at_cents is null or compare_at_cents > price_cents),
  check (deal_type = 'fixed' or value_cents is not null),
  check (redeem_validity <> 'until_date' or redeem_until is not null),
  check (redeem_validity <> 'days_after_purchase' or redeem_days is not null),
  check (code_format <> 'barcode' or barcode_type is not null),
  check (total_qty is null or sold_qty + reserved_qty <= total_qty)
);
create index deals_tenant_idx on public.deals (tenant_id, state, sort_order);
create trigger deals_updated before update on public.deals for each row execute function public.set_updated_at();

-- Sold/reserved counters are owned by the checkout (phase 3, service role); editors cannot touch them.
create or replace function public.deals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.sold_qty := 0;
    new.reserved_qty := 0;
  elsif new.sold_qty is distinct from old.sold_qty or new.reserved_qty is distinct from old.reserved_qty or new.tenant_id is distinct from old.tenant_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new.state = 'published' and (tg_op = 'INSERT' or old.state <> 'published') then new.published_at := now(); end if;
  return new;
end $$;
create trigger deals_guard before insert or update on public.deals for each row execute function public.deals_guard();

create table public.deal_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  url text not null,
  alt text,
  width int,
  height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index deal_images_deal_idx on public.deal_images (deal_id, sort_order);

create table public.deal_locations (
  deal_id uuid not null references public.deals (id) on delete cascade,
  location_id uuid not null references public.partner_locations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  primary key (deal_id, location_id)
);

-- Rows that point at other rows must stay inside one tenant.
create or replace function public.same_tenant_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_other uuid;
begin
  if tg_table_name = 'deals' then
    if new.partner_id is not null then
      select tenant_id into v_other from public.partners where id = new.partner_id;
      if v_other is distinct from new.tenant_id then raise exception 'partner of another tenant' using errcode = '42501'; end if;
    end if;
    if new.category_id is not null then
      select tenant_id into v_other from public.categories where id = new.category_id;
      if v_other is distinct from new.tenant_id then raise exception 'category of another tenant' using errcode = '42501'; end if;
    end if;
  elsif tg_table_name = 'partner_locations' then
    select tenant_id into v_other from public.partners where id = new.partner_id;
    if v_other is distinct from new.tenant_id then raise exception 'partner of another tenant' using errcode = '42501'; end if;
  elsif tg_table_name = 'deal_images' then
    select tenant_id into v_other from public.deals where id = new.deal_id;
    if v_other is distinct from new.tenant_id then raise exception 'deal of another tenant' using errcode = '42501'; end if;
  elsif tg_table_name = 'deal_locations' then
    select tenant_id into v_other from public.deals where id = new.deal_id;
    if v_other is distinct from new.tenant_id then raise exception 'deal of another tenant' using errcode = '42501'; end if;
    select tenant_id into v_other from public.partner_locations where id = new.location_id;
    if v_other is distinct from new.tenant_id then raise exception 'location of another tenant' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
create trigger deals_same_tenant before insert or update on public.deals for each row execute function public.same_tenant_guard();
create trigger locations_same_tenant before insert or update on public.partner_locations for each row execute function public.same_tenant_guard();
create trigger deal_images_same_tenant before insert or update on public.deal_images for each row execute function public.same_tenant_guard();
create trigger deal_locations_same_tenant before insert or update on public.deal_locations for each row execute function public.same_tenant_guard();

-- ---------------------------------------------------------------- theme & legal
create table public.shop_themes (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  -- Design tokens (src/lib/shop/theme.ts); the shop, PDFs, wallet passes and mails read the published set.
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger shop_themes_updated before update on public.shop_themes for each row execute function public.set_updated_at();

create table public.legal_pages (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind public.legal_kind not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (tenant_id, kind)
);
create trigger legal_pages_updated before update on public.legal_pages for each row execute function public.set_updated_at();

-- Shop settings that are public by nature (contact, analytics ids shown only after consent).
alter table public.tenants add column if not exists shop_settings jsonb not null default '{}'::jsonb;
comment on column public.tenants.shop_settings is '{"contact_email","contact_phone","ga4_id","meta_pixel_id","seo_description"}';

-- Imprint, terms and privacy filled in: required before deals can go live.
create or replace function public.shop_legal_complete(p_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select count(*) = 3 from public.legal_pages where tenant_id = p_tenant and length(trim(content)) >= 20;
$$;
grant execute on function public.shop_legal_complete(uuid) to anon, authenticated;

create or replace function public.deals_require_legal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.state = 'published' and (tg_op = 'INSERT' or old.state <> 'published') and not public.shop_legal_complete(new.tenant_id) then
    raise exception 'legal pages missing' using errcode = 'P0001', hint = 'imprint, terms and privacy are required before publishing';
  end if;
  return new;
end $$;
create trigger deals_require_legal before insert or update on public.deals for each row execute function public.deals_require_legal();

-- ---------------------------------------------------------------- RLS
alter table public.partners enable row level security;
alter table public.partner_locations enable row level security;
alter table public.categories enable row level security;
alter table public.deals enable row level security;
alter table public.deal_images enable row level security;
alter table public.deal_locations enable row level security;
alter table public.shop_themes enable row level security;
alter table public.legal_pages enable row level security;

-- Members read their tenant; editors+ write; anon reads what a live shop shows.
create policy partners_member on public.partners for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy partners_public on public.partners for select using (
  public.tenant_is_public(tenant_id) and exists (select 1 from public.deals d where d.partner_id = partners.id and d.state = 'published')
);
create policy partners_write on public.partners for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

create policy locations_member on public.partner_locations for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy locations_public on public.partner_locations for select using (
  public.tenant_is_public(tenant_id) and exists (
    select 1 from public.deal_locations dl join public.deals d on d.id = dl.deal_id where dl.location_id = partner_locations.id and d.state = 'published'
  )
);
create policy locations_write on public.partner_locations for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

create policy categories_member on public.categories for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy categories_public on public.categories for select using (public.tenant_is_public(tenant_id));
create policy categories_write on public.categories for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

create policy deals_member on public.deals for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy deals_public on public.deals for select using (state = 'published' and public.tenant_is_public(tenant_id));
create policy deals_write on public.deals for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

create policy deal_images_member on public.deal_images for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy deal_images_public on public.deal_images for select using (
  public.tenant_is_public(tenant_id) and exists (select 1 from public.deals d where d.id = deal_images.deal_id and d.state = 'published')
);
create policy deal_images_write on public.deal_images for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

create policy deal_locations_member on public.deal_locations for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy deal_locations_public on public.deal_locations for select using (
  public.tenant_is_public(tenant_id) and exists (select 1 from public.deals d where d.id = deal_locations.deal_id and d.state = 'published')
);
create policy deal_locations_write on public.deal_locations for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

-- Theme: members see draft and published; anon reads through shop_public_theme() (published only).
create policy themes_member on public.shop_themes for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy themes_write on public.shop_themes for all
  using (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']::public.member_role[]) or public.is_staff())
  with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']::public.member_role[]) or public.is_staff());

create policy legal_member on public.legal_pages for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy legal_public on public.legal_pages for select using (public.tenant_is_public(tenant_id));
create policy legal_write on public.legal_pages for all
  using (public.has_tenant_role(tenant_id, array['owner', 'admin']::public.member_role[]) or public.is_staff())
  with check (public.has_tenant_role(tenant_id, array['owner', 'admin']::public.member_role[]) or public.is_staff());

-- Public shop header: name, language, currency, published theme, public settings.
drop function if exists public.shop_profile(uuid);
create or replace function public.shop_profile(p_tenant uuid)
returns table (tenant_id uuid, slug text, name text, locale text, currency text, theme jsonb, settings jsonb, legal_complete boolean, primary_host text)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale, t.currency,
         coalesce((select th.published from public.shop_themes th where th.tenant_id = t.id), '{}'::jsonb),
         jsonb_build_object(
           'contact_email', t.shop_settings->>'contact_email',
           'contact_phone', t.shop_settings->>'contact_phone',
           'ga4_id', t.shop_settings->>'ga4_id',
           'meta_pixel_id', t.shop_settings->>'meta_pixel_id',
           'seo_description', t.shop_settings->>'seo_description'
         ),
         public.shop_legal_complete(t.id),
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary)
  from public.tenants t
  where t.id = p_tenant and t.status in ('trial', 'active');
$$;
grant execute on function public.shop_profile(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- One public bucket for shop media (deal images, logos, fonts). Paths start with the tenant id;
-- editors of that tenant may write there. Reading is public (the shop is public).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-media', 'shop-media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'font/woff2', 'application/font-woff2', 'application/octet-stream'])
on conflict (id) do nothing;

create policy shop_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-media' and public.can_edit(((storage.foldername(name))[1])::uuid));
create policy shop_media_update on storage.objects for update to authenticated
  using (bucket_id = 'shop-media' and public.can_edit(((storage.foldername(name))[1])::uuid));
create policy shop_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shop-media' and public.can_edit(((storage.foldername(name))[1])::uuid));
