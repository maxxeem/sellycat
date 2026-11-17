-- Phase 6: shops on their own domain. Rows are written by the server (service role) after the
-- dashboard checked the role and the plan; customers only read them (domains_read).

alter table public.tenant_domains add column www boolean not null default false;
alter table public.tenant_domains add column provider text check (provider is null or provider in ('godaddy', 'infomaniak', 'hostpoint', 'cloudflare', 'other'));
alter table public.tenant_domains add column active_at timestamptz;

-- resolve_shop: plus `redirect_host`, the shop's own domain when it is the main address and
-- live. The proxy sends every other host of the shop there (308).
drop function if exists public.resolve_shop(text, text);
create or replace function public.resolve_shop(p_slug text default null, p_host text default null)
returns table (tenant_id uuid, slug text, name text, locale text, primary_host text, redirect_host text)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug::text, t.name, t.locale,
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary),
         (select d.hostname::text from public.tenant_domains d where d.tenant_id = t.id and d.is_primary and d.kind = 'custom' and d.status = 'active')
  from public.tenants t
  where t.status in ('trial', 'active')
    and (
      (p_slug is not null and t.slug = lower(p_slug))
      or (p_host is not null and exists (
        select 1 from public.tenant_domains d where d.tenant_id = t.id and d.hostname = lower(p_host) and d.status in ('dns_ok', 'active')
      ))
    )
  limit 1;
$$;
grant execute on function public.resolve_shop(text, text) to anon, authenticated;

-- Makes a domain the shop's main address (exactly one per shop). Service role only.
create or replace function public.set_primary_domain(p_tenant uuid, p_hostname text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.tenant_domains where tenant_id = p_tenant and hostname = lower(p_hostname) and (kind = 'subdomain' or status = 'active')) then
    return false;
  end if;
  update public.tenant_domains set is_primary = false where tenant_id = p_tenant and is_primary;
  update public.tenant_domains set is_primary = true where tenant_id = p_tenant and hostname = lower(p_hostname);
  return true;
end $$;
revoke all on function public.set_primary_domain(uuid, text) from public, anon, authenticated;
grant execute on function public.set_primary_domain(uuid, text) to service_role;
