-- Phase 5: Apple and Google Wallet passes for vouchers.
-- wallet_passes: one per voucher (serial = voucher id, secret token for Apple's web service).
-- wallet_devices / wallet_registrations: iPhones that hold a pass (for push updates).
-- All of it is written by the server (service role) only; customers read their design.

create table public.wallet_designs (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  background text check (background is null or background ~ '^#[0-9a-fA-F]{6}$'),
  foreground text check (foreground is null or foreground ~ '^#[0-9a-fA-F]{6}$'),
  label text check (label is null or label ~ '^#[0-9a-fA-F]{6}$'),
  show_image boolean not null default true,
  show_locations boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger wallet_designs_updated before update on public.wallet_designs for each row execute function public.set_updated_at();
alter table public.wallet_designs enable row level security;
create policy wallet_designs_read on public.wallet_designs for select using (public.is_tenant_member(tenant_id) or public.is_staff());
create policy wallet_designs_insert on public.wallet_designs for insert with check (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]));
create policy wallet_designs_update on public.wallet_designs for update
  using (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]))
  with check (public.can_manage(tenant_id) or public.has_tenant_role(tenant_id, array['editor']::public.member_role[]));

create table public.wallet_passes (
  voucher_id uuid primary key references public.vouchers (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  auth_token text not null check (length(auth_token) >= 32),
  google_object_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index wallet_passes_tenant_idx on public.wallet_passes (tenant_id);
alter table public.wallet_passes enable row level security;

-- A device is not tied to one shop (it may hold passes of several); only the server reads it.
create table public.wallet_devices (
  device_id text primary key check (length(device_id) between 1 and 200),
  push_token text not null check (length(push_token) between 1 and 400),
  updated_at timestamptz not null default now()
);
alter table public.wallet_devices enable row level security;

create table public.wallet_registrations (
  device_id text not null references public.wallet_devices (device_id) on delete cascade,
  voucher_id uuid not null references public.wallet_passes (voucher_id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, voucher_id)
);
create index wallet_registrations_voucher_idx on public.wallet_registrations (voucher_id);
alter table public.wallet_registrations enable row level security;

-- Expiry reminder by mail (once per voucher).
alter table public.vouchers add column reminder_sent_at timestamptz;
