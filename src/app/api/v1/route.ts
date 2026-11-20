import { apiJson, apiRoute } from "@/lib/api/v1";

/** GET /api/v1 – which shop this key belongs to and what it may do (connection test). */
export const GET = apiRoute<Record<string, never>>("read", async ({ db, tenantId, scopes }) => {
  const { data: shop } = await db.from("tenants").select("id, name, slug, locale").eq("id", tenantId).single();
  const { data: domain } = await db.from("tenant_domains").select("hostname").eq("tenant_id", tenantId).eq("is_primary", true).maybeSingle();
  return apiJson({ shop: { id: shop?.id, name: shop?.name, slug: shop?.slug, locale: shop?.locale, url: domain ? `https://${domain.hostname}` : null }, scopes });
});
