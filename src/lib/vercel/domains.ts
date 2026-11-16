import "server-only";

/**
 * Adds a hostname (<slug>.sellycat.com, later custom domains) to the Vercel project so it gets a
 * certificate (adapted from SwypeCast). Needs VERCEL_API_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID).
 * On staging (preview deployments) the domain is bound to the `main` branch. Without a token the
 * domain is stored anyway and staff adds it by hand.
 */
export async function registerDomain(host: string): Promise<{ ok: boolean; message: string }> {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !project) return { ok: false, message: `${host}: no VERCEL_API_TOKEN, add the domain in Vercel by hand.` };
  const query = team ? `?teamId=${encodeURIComponent(team)}` : "";
  const body: Record<string, string> = { name: host };
  if (process.env.VERCEL_ENV === "preview") body.gitBranch = process.env.VERCEL_GIT_COMMIT_REF || "main";
  const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains${query}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, message: `${host} added to Vercel.` };
  const err = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  if (err.error?.code === "domain_already_in_use" || err.error?.code === "domain_already_exists" || res.status === 409) return { ok: true, message: `${host} already on Vercel.` };
  return { ok: false, message: `Vercel: ${err.error?.message ?? res.statusText}` };
}
