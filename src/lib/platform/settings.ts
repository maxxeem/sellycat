import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/admin";

export const SETTINGS_TAG = "platform-settings";

/** Signup switch (cached for a minute; the staff toggle refreshes the tag immediately). */
export async function getSignupMode(): Promise<"open" | "paused"> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("minutes");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "paused";
  const { data } = await createPublicClient().from("platform_settings").select("signup_mode").maybeSingle();
  return data?.signup_mode === "open" ? "open" : "paused";
}
