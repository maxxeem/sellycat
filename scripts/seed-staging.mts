/**
 * Staging seed (idempotent, refuses production): a staff super-admin and two demo customers with
 * different languages. Deals, partners and branding follow in phase 2 (same script, extended).
 *
 *   SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run seed:staging
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const root = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://staging.sellycat.com").hostname;

if (!url || !secret || !email || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
  process.exit(2);
}
if (process.env.SUPABASE_PRODUCTION_REF && url.includes(process.env.SUPABASE_PRODUCTION_REF)) {
  console.error("Refusing to seed production.");
  process.exit(2);
}

const db = createClient<Database>(url, secret, { auth: { persistSession: false } });

async function ensureUser(mail: string, pw: string): Promise<string> {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = data.users.find((u) => u.email?.toLowerCase() === mail.toLowerCase());
  if (existing) return existing.id;
  const { data: created, error } = await db.auth.admin.createUser({ email: mail, password: pw, email_confirm: true, user_metadata: { full_name: "Sellycat Admin" } });
  if (error || !created.user) throw error;
  return created.user.id;
}

async function ensureTenant(slug: string, name: string, locale: "de" | "en", ownerId: string) {
  const { data: found } = await db.from("tenants").select("id").eq("slug", slug).maybeSingle();
  const id = found?.id ?? (await db.from("tenants").insert({ name, slug, locale, status: "active", plan_id: "pro" }).select("id").single()).data!.id;
  await db.from("tenant_members").upsert({ tenant_id: id, user_id: ownerId, role: "owner" }, { onConflict: "tenant_id,user_id" });
  await db.from("tenant_domains").upsert({ tenant_id: id, hostname: `${slug}.${root}`, kind: "subdomain", status: "active", is_primary: true }, { onConflict: "hostname" });
  console.log(`  ${name}: https://${slug}.${root}`);
}

const adminId = await ensureUser(email, password);
await db.from("platform_staff").upsert({ user_id: adminId, role: "superadmin" }, { onConflict: "user_id" });
console.log(`Staff super-admin: ${email}`);
await ensureTenant("pizzeria-demo", "Pizzeria Demo", "de", adminId);
await ensureTenant("city-deals", "City Deals", "en", adminId);
console.log("Seed done.");
