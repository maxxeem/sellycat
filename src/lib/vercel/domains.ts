import "server-only";

/**
 * Adds a hostname (<slug>.sellycat.com, later custom domains) to the Vercel project so it gets a
 * certificate (adapted from SwypeCast). Needs VERCEL_API_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID).
 * On staging (preview deployments) the domain is bound to the `main` branch. Without a token the
 * domain is stored anyway and staff adds it by hand.
 */
/** The API token; a value pasted with line breaks or spaces would break the header (and leak into errors). */
function vercelToken(): string | null {
  const raw = process.env.VERCEL_API_TOKEN?.trim();
  if (!raw) return null;
  const token = raw.split(/\s+/)[0];
  if (token !== raw) console.error("[vercel] VERCEL_API_TOKEN contains whitespace or line breaks; using the first value. Fix the variable.");
  return token;
}

/** Never let a token end up in a message we log or show. */
const redact = (message: string) => message.replace(/Bearer\s+\S+/g, "Bearer ***").replace(/vc[a-z]_[A-Za-z0-9]{20,}/g, "***");

export async function registerDomain(host: string): Promise<{ ok: boolean; message: string }> {
  const token = vercelToken();
  const project = process.env.VERCEL_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !project) return { ok: false, message: `${host}: no VERCEL_API_TOKEN, add the domain in Vercel by hand.` };
  // Local development (`<slug>.localhost`) never belongs in the Vercel project.
  if (host === "localhost" || host.endsWith(".localhost") || host.includes(".localhost:")) return { ok: true, message: `${host}: local, not registered.` };
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
  return { ok: false, message: `Vercel: ${redact(err.error?.message ?? res.statusText)}` };
}

// ---------------------------------------------------------------- shops' own domains

type VercelVerification = { type: string; domain: string; value: string; reason?: string };
export type ProjectDomain = { name: string; verified: boolean; verification: VercelVerification[]; redirect: string | null };
export type DomainConfig = { misconfigured: boolean; cname: string; ipv4: string[]; nameservers: string[] };
export type VercelResult<T> = { ok: true; value: T } | { ok: false; status: number; code: string; message: string };

const FALLBACK_CNAME = "cname.vercel-dns.com";
const FALLBACK_IPV4 = ["76.76.21.21"];

async function vercel<T>(path: string, init: RequestInit = {}): Promise<VercelResult<T>> {
  const token = vercelToken();
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !process.env.VERCEL_PROJECT_ID) return { ok: false, status: 0, code: "not_configured", message: "VERCEL_API_TOKEN/VERCEL_PROJECT_ID missing" };
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}${team ? `teamId=${encodeURIComponent(team)}` : ""}`;
  try {
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15000) });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } };
    if (!res.ok) return { ok: false, status: res.status, code: json.error?.code ?? String(res.status), message: redact(json.error?.message ?? res.statusText) };
    return { ok: true, value: json };
  } catch (e) {
    return { ok: false, status: 0, code: "network", message: e instanceof Error ? redact(e.message) : "Vercel not reachable" };
  }
}

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID ?? "");
const asDomain = (j: Partial<ProjectDomain> & { name?: string }): ProjectDomain => ({ name: j.name ?? "", verified: Boolean(j.verified), verification: j.verification ?? [], redirect: j.redirect ?? null });

/**
 * Adds a shop's own domain to the project (optionally redirecting to another one, for www).
 * A domain that another project already uses is never taken over: `in_use`.
 */
export async function addProjectDomain(name: string, redirect?: string): Promise<VercelResult<ProjectDomain>> {
  const body: Record<string, unknown> = { name };
  if (redirect) Object.assign(body, { redirect, redirectStatusCode: 308 });
  if (process.env.VERCEL_ENV === "preview") body.gitBranch = process.env.VERCEL_GIT_COMMIT_REF || "main";
  const r = await vercel<ProjectDomain>(`/v10/projects/${project()}/domains`, { method: "POST", body: JSON.stringify(body) });
  if (!r.ok && (r.code === "domain_already_in_use" || r.code === "domain_already_exists" || r.status === 409)) {
    // Already on this very project (e.g. a retry)? Then it is ours.
    const mine = await getProjectDomain(name);
    if (mine.ok) return mine;
    return { ok: false, status: 409, code: "in_use", message: r.message };
  }
  return r.ok ? { ok: true, value: asDomain(r.value) } : r;
}

export async function getProjectDomain(name: string): Promise<VercelResult<ProjectDomain>> {
  const r = await vercel<ProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(name)}`);
  return r.ok ? { ok: true, value: asDomain(r.value) } : r;
}

/** Asks Vercel to check the TXT ownership record again. */
export async function verifyProjectDomain(name: string): Promise<VercelResult<ProjectDomain>> {
  const r = await vercel<ProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(name)}/verify`, { method: "POST" });
  return r.ok ? { ok: true, value: asDomain(r.value) } : r;
}

export async function removeProjectDomain(name: string): Promise<boolean> {
  const r = await vercel(`/v9/projects/${project()}/domains/${encodeURIComponent(name)}`, { method: "DELETE" });
  return r.ok || (!r.ok && r.status === 404);
}

/** DNS state of a domain and the values Vercel recommends. */
export async function domainConfig(name: string): Promise<VercelResult<DomainConfig>> {
  type Raw = { misconfigured?: boolean; nameservers?: string[]; recommendedCNAME?: Array<{ rank: number; value: string }>; recommendedIPv4?: Array<{ rank: number; value: string[] }> };
  const r = await vercel<Raw>(`/v6/domains/${encodeURIComponent(name)}/config`);
  if (!r.ok) return r;
  const best = <T extends { rank: number }>(list: T[] | undefined) => [...(list ?? [])].sort((a, b) => a.rank - b.rank)[0];
  return {
    ok: true,
    value: {
      misconfigured: r.value.misconfigured !== false,
      cname: (best(r.value.recommendedCNAME)?.value ?? FALLBACK_CNAME).replace(/\.$/, ""),
      ipv4: best(r.value.recommendedIPv4)?.value ?? FALLBACK_IPV4,
      nameservers: r.value.nameservers ?? [],
    },
  };
}
