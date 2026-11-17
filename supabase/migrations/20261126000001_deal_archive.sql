-- Archived deals: hidden from the shop and the default dashboard list, kept for orders and vouchers.
-- Customers archive (owner/admin); only Sellycat staff deletes for good (service role).

alter table public.deals add column archived_at timestamptz;
alter table public.deals add constraint deals_archived_not_published check (archived_at is null or state <> 'published');

create or replace function public.deals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.sold_qty := 0;
    new.reserved_qty := 0;
    new.pool_free := 0;
    new.view_count := 0;
    new.archived_at := null;
  elsif new.sold_qty is distinct from old.sold_qty or new.reserved_qty is distinct from old.reserved_qty or new.tenant_id is distinct from old.tenant_id
     or (new.pool_free is distinct from old.pool_free and coalesce(current_setting('sellycat.pool_sync', true), '') <> '1')
     or (new.view_count is distinct from old.view_count and coalesce(current_setting('sellycat.view_sync', true), '') <> '1')
     or (new.archived_at is distinct from old.archived_at and not public.can_manage(new.tenant_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new.state = 'published' and (tg_op = 'INSERT' or old.state <> 'published') then new.published_at := now(); end if;
  return new;
end $$;

-- Editors insert and update; nobody but the service role deletes.
drop policy if exists deals_write on public.deals;
create policy deals_insert on public.deals for insert with check (public.can_edit(tenant_id));
create policy deals_update on public.deals for update using (public.can_edit(tenant_id)) with check (public.can_edit(tenant_id));

create index deals_archived_idx on public.deals (tenant_id) where archived_at is not null;
