-- FAQ library of a shop: general questions and answers to pick from in the deal editor.
create table public.faq_library (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  question text not null check (length(trim(question)) between 1 and 300),
  answer text not null check (length(trim(answer)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faq_library_tenant_idx on public.faq_library (tenant_id, created_at);
create trigger faq_library_updated before update on public.faq_library for each row execute function public.set_updated_at();
alter table public.faq_library enable row level security;
create policy faq_library_all on public.faq_library for all using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));
revoke all on public.faq_library from anon;

-- Advertising on the voucher PDF per deal: the shop's own setting (default), an own visual, or none.
-- No grant for anon: the shop does not need it.
alter table public.deals
  add column ad_mode text not null default 'default' check (ad_mode in ('default', 'own', 'off')),
  add column ad_image text check (ad_image is null or length(ad_image) <= 500);
