"use server";

import { revalidatePath } from "next/cache";
import { audit, requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markRequestDone(id: string): Promise<void> {
  const staff = await requireStaff();
  await createAdminClient().from("contact_requests").update({ handled_at: new Date().toISOString() }).eq("id", id);
  await audit(staff.id, "contact_request.done", { type: "contact_request", id });
  revalidatePath("/p/[locale]/staff/requests", "page");
}
