import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Server-only environment access. Getters are lazy so builds don't need secrets. */
export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get supabaseConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  /** PLATFORM_MFA_OPTIONAL=1 skips the staff authenticator locally and in e2e; never in production. */
  get staffMfaOptional(): boolean {
    return process.env.PLATFORM_MFA_OPTIONAL === "1" && process.env.VERCEL_ENV !== "production";
  },
};
