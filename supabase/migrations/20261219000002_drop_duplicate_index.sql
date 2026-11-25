-- The launch review added an index that existed already under another name.
do $$
declare r record;
begin
  for r in
    select b.indexrelid::regclass as idx from pg_index a join pg_index b on a.indrelid = b.indrelid and a.indexrelid <> b.indexrelid
      and a.indkey::text = b.indkey::text and a.indclass::text = b.indclass::text and a.indoption::text = b.indoption::text and a.indpred is null and b.indpred is null and a.indexprs is null and b.indexprs is null
    where b.indrelid = 'public.orders'::regclass and b.indexrelid::regclass::text in ('orders_tenant_created_idx', 'public.orders_tenant_created_idx') and not b.indisunique
  loop
    execute format('drop index %s', r.idx);
  end loop;
end $$;
