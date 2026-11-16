-- Optional stock barometer on a deal (needs a total quantity to mean anything).
alter table public.deals add column show_stock_bar boolean not null default false;
