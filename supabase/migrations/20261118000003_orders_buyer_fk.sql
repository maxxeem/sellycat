-- Deleting a tenant cascades to buyers and orders in one statement; RESTRICT is checked
-- immediately and could block that. Orders go with their buyer (only ever in a tenant delete).
alter table public.orders drop constraint orders_buyer_id_fkey;
alter table public.orders add constraint orders_buyer_id_fkey foreign key (buyer_id) references public.buyers (id) on delete cascade;
