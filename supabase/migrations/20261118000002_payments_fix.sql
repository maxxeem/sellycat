-- fulfil_order: an empty payment intent (free checkout) is stored as null, not ''.
create or replace function public.fulfil_order(p_session text, p_payment_intent text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  r record;
  d public.deals%rowtype;
  v_oversold boolean := false;
begin
  select * into o from public.orders where stripe_session_id = p_session for update;
  if not found then return null; end if;
  if o.status not in ('pending', 'expired') then return o.id; end if;

  for r in select * from public.reservations where order_id = o.id and status <> 'converted' order by deal_id for update loop
    select * into d from public.deals where id = r.deal_id for update;
    if r.status = 'active' then
      update public.deals set reserved_qty = greatest(reserved_qty - r.qty, 0), sold_qty = sold_qty + r.qty where id = r.deal_id;
    else
      -- Released before the payment arrived: sell from free stock; if there is none, the
      -- buyer still gets the voucher (they paid) and the shop's quantity grows to match.
      if d.total_qty is not null and d.total_qty - d.sold_qty - d.reserved_qty < r.qty then
        v_oversold := true;
        update public.deals set total_qty = d.sold_qty + d.reserved_qty + r.qty, sold_qty = sold_qty + r.qty where id = r.deal_id;
      else
        update public.deals set sold_qty = sold_qty + r.qty where id = r.deal_id;
      end if;
    end if;
    update public.reservations set status = 'converted' where id = r.id;
  end loop;

  update public.orders
  set status = 'paid', paid_at = now(), stripe_payment_intent = coalesce(nullif(p_payment_intent, ''), stripe_payment_intent), oversold = v_oversold
  where id = o.id;
  if o.newsletter then
    update public.buyers set newsletter_opt_in_at = coalesce(newsletter_opt_in_at, now()) where id = o.buyer_id;
  end if;
  return o.id;
end $$;
