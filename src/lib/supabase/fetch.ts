/**
 * Fetch for the Supabase clients on the server. Serverless instances are frozen
 * between invocations; a kept-alive socket to Supabase can be dead by the next
 * request and the first call then fails at connection level ("fetch failed",
 * ECONNRESET, "other side closed"). supabase-js turns such a rejection into
 * `{ data: null, error }`, which the admin used to render as "no data".
 * Retrying once (with a fresh socket) makes those requests succeed instead.
 * Only requests that are safe to repeat are retried.
 */

/** RPCs that only read (stable functions); their POSTs can be repeated. */
export const READ_ONLY_RPCS = new Set(["is_staff", "is_staff_member", "is_superadmin", "resolve_shop", "slug_available", "my_tenants"]);

const CONNECTION_ERROR_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT"]);

/** True for failures that happened before a response arrived (connection-level). */
export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: unknown }).cause;
  const code = typeof cause === "object" && cause && "code" in cause ? String((cause as { code?: unknown }).code) : "";
  if (CONNECTION_ERROR_CODES.has(code)) return true;
  const message = `${error.message} ${cause instanceof Error ? cause.message : ""}`.toLowerCase();
  return message.includes("fetch failed") || message.includes("socket hang up") || message.includes("other side closed") || message.includes("econnreset");
}

/** GET/HEAD are idempotent; so are read-only RPC calls and a token refresh (GoTrue allows reuse within its window). */
export function isRetryableRequest(method: string, url: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") return true;
  if (m !== "POST") return false;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  if (pathname.endsWith("/auth/v1/token")) return true;
  const rpc = pathname.match(/\/rest\/v1\/rpc\/([^/?]+)$/);
  return Boolean(rpc && READ_ONLY_RPCS.has(rpc[1]));
}

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

export function createResilientFetch(base: typeof fetch = globalThis.fetch, retries = 1): typeof fetch {
  return async (input, init) => {
    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    const retryable = isRetryableRequest(method, requestUrl(input));
    let attempt = 0;
    for (;;) {
      try {
        return await base(input, init);
      } catch (error) {
        if (!retryable || attempt >= retries || !isConnectionError(error)) throw error;
        attempt += 1;
        await new Promise((r) => setTimeout(r, 50 * attempt));
      }
    }
  };
}

/** Shared instance; `globalThis.fetch` is resolved per call so local tracing hooks still apply. */
export const resilientFetch: typeof fetch = (input, init) => createResilientFetch(globalThis.fetch)(input, init);
