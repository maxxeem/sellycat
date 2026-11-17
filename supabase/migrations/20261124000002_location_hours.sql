-- Structured opening hours per weekday (see src/lib/shop/hours.ts) and the Google place a
-- location was taken from. The old free-text column stays for existing data only.
alter table public.partner_locations add column hours jsonb check (hours is null or jsonb_typeof(hours) = 'object');
alter table public.partner_locations add column google_place_id text check (google_place_id is null or length(google_place_id) <= 300);
