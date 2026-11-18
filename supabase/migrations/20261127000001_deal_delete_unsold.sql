-- Deals without any sale may be deleted by the shop's owners/admins; once something was sold
-- (or a checkout is running), they can only be archived and only Sellycat staff deletes them.

create or replace function public.deal_has_sales(p_deal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.deals d where d.id = p_deal and (d.sold_qty > 0 or d.reserved_qty > 0))
      or exists (select 1 from public.vouchers v where v.deal_id = p_deal)
      or exists (select 1 from public.reservations r where r.deal_id = p_deal and r.status = 'active')
      or exists (
        select 1 from public.order_items i join public.orders o on o.id = i.order_id
        where i.deal_id = p_deal and o.status in ('pending', 'paid', 'partially_refunded', 'refunded')
      );
$$;
revoke all on function public.deal_has_sales(uuid) from public;
grant execute on function public.deal_has_sales(uuid) to authenticated;

create policy deals_delete_unsold on public.deals for delete
  using (public.can_manage(tenant_id) and not public.deal_has_sales(id));
