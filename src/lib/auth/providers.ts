import "server-only";
import { cacheLife } from "next/cache";

/**
 * Is "Continue with Google" switched on in Supabase Auth? Read from the public settings endpoint
 * (cached), so the button only appears once Google is set up for the environment.
 */
export async function googleEnabled(): Promise<boolean> {
  "use cache";
  cacheLife("minutes");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(3000) });
    const json = (await res.json()) as { external?: { google?: boolean } };
    return json.external?.google === true;
  } catch {
    return false;
  }
}
