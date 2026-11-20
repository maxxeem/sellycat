import { apiJson, apiRoute } from "@/lib/api/v1";

/** GET /api/v1/partners – partners with their redemption locations. */
export const GET = apiRoute<Record<string, never>>("read", async ({ db, tenantId }) => {
  const { data, error } = await db
    .from("partners")
    .select("id, name, email, phone, website_url, created_at, partner_locations(id, name, street, zip, city, country, lat, lng)")
    .eq("tenant_id", tenantId)
    .order("name")
    .limit(2000);
  if (error) throw new Error(error.message);
  return apiJson({ data: (data ?? []).map(({ partner_locations, ...p }) => ({ ...p, locations: partner_locations })) });
});
