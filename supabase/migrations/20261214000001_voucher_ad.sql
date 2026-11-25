-- Voucher PDF: half of the page for an advertising visual (image from the shop's own storage).
alter table public.voucher_designs
  add column ad_enabled boolean not null default false,
  add column ad_image text check (ad_image is null or length(ad_image) <= 500);
