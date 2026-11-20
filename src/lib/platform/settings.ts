import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSignupMode, type SignupMode } from "@/lib/access/rules";
import { createPublicClient } from "@/lib/supabase/admin";

export const SETTINGS_TAG = "platform-settings";

/** Signup mode (cached for a minute; the staff switch refreshes the tag immediately). */
export async function getSignupMode(): Promise<SignupMode> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("minutes");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "paused";
  const { data } = await createPublicClient().from("platform_settings").select("signup_mode").maybeSingle();
  return isSignupMode(data?.signup_mode) ? data.signup_mode : "paused";
}
