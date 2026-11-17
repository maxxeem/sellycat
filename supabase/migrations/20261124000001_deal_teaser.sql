-- Teaser: a deal announced before its sales start, without price and without buying. After the
-- sales start it is an ordinary live deal. Needs a sales start (the countdown counts down to it).
alter table public.deals add column teaser boolean not null default false;
alter table public.deals add constraint deals_teaser_needs_start check (not teaser or sales_start is not null);
