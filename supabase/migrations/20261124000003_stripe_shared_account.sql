-- One Stripe account may serve several shops of the same company (each shop still has its own
-- orders, fees and payouts in Stripe's reporting by metadata). Only the per-shop row stays unique.
alter table public.stripe_accounts drop constraint if exists stripe_accounts_account_id_key;
create index if not exists stripe_accounts_account_idx on public.stripe_accounts (account_id);
