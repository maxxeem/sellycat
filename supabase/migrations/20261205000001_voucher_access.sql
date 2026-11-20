-- "Show voucher" after a scan: the owner (buyer, or the recipient of a gift) gets a six-digit code
-- by email and may then see the voucher on this device for 30 days. Only the server touches
-- these rows (service role); codes and device secrets are stored as hashes.

create table public.voucher_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  voucher_id uuid not null references public.vouchers (id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  device_hash text unique,
  device_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index voucher_access_lookup_idx on public.voucher_access (voucher_id, created_at desc);
alter table public.voucher_access enable row level security;
revoke all on public.voucher_access from anon, authenticated;

-- Where the code goes: the gift recipient if the order is a gift, otherwise the buyer.
create or replace function public.voucher_owner(p_token text)
returns table (voucher_id uuid, tenant_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select v.id, v.tenant_id, (case when o.gift and o.gift_email is not null then o.gift_email else o.email end)::text
  from public.vouchers v
  join public.orders o on o.id = v.order_id
  where v.token = p_token
  limit 1;
$$;
revoke all on function public.voucher_owner(text) from public, anon, authenticated;
grant execute on function public.voucher_owner(text) to service_role;

-- One guess at the newest open code, counted before it is compared (parallel guesses cannot
-- exceed the limit). Returns the row only while the code is open and below the limit.
create or replace function public.voucher_access_try(p_voucher uuid, p_max int)
returns table (id uuid, code_hash text, attempts int)
language sql security definer set search_path = public as $$
  update public.voucher_access a set attempts = a.attempts + 1
  where a.id = (select x.id from public.voucher_access x where x.voucher_id = p_voucher and x.verified_at is null order by x.created_at desc limit 1)
    and a.expires_at > now() and a.attempts < p_max
  returning a.id, a.code_hash, a.attempts;
$$;
revoke all on function public.voucher_access_try(uuid, int) from public, anon, authenticated;
grant execute on function public.voucher_access_try(uuid, int) to service_role;
