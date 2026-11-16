import { describe, expect, it, vi } from "vitest";
import { createResilientFetch, isConnectionError, isRetryableRequest } from "./fetch";

const connectionError = () => new TypeError("fetch failed", { cause: Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" }) });

describe("isRetryableRequest", () => {
  it("retries reads, token refreshes and read-only rpcs only", () => {
    expect(isRetryableRequest("GET", "https://x.supabase.co/rest/v1/flows?select=id")).toBe(true);
    expect(isRetryableRequest("HEAD", "https://x.supabase.co/rest/v1/flows")).toBe(true);
    expect(isRetryableRequest("POST", "https://x.supabase.co/auth/v1/token?grant_type=refresh_token")).toBe(true);
    expect(isRetryableRequest("POST", "https://x.supabase.co/rest/v1/rpc/resolve_shop")).toBe(true);
    expect(isRetryableRequest("POST", "https://x.supabase.co/rest/v1/rpc/toggle_reaction")).toBe(false);
    expect(isRetryableRequest("POST", "https://x.supabase.co/rest/v1/flows")).toBe(false);
    expect(isRetryableRequest("PATCH", "https://x.supabase.co/rest/v1/flows?id=eq.1")).toBe(false);
    expect(isRetryableRequest("DELETE", "https://x.supabase.co/rest/v1/flows?id=eq.1")).toBe(false);
  });
});

describe("isConnectionError", () => {
  it("recognises undici connection failures and nothing else", () => {
    expect(isConnectionError(connectionError())).toBe(true);
    expect(isConnectionError(new TypeError("fetch failed"))).toBe(true);
    expect(isConnectionError(Object.assign(new Error("x"), { cause: { code: "ECONNRESET" } }))).toBe(true);
    expect(isConnectionError(new Error("JSON parse error"))).toBe(false);
    expect(isConnectionError("nope")).toBe(false);
  });
});

describe("createResilientFetch", () => {
  it("retries a GET once after a connection error", async () => {
    const base = vi.fn<typeof fetch>().mockRejectedValueOnce(connectionError()).mockResolvedValueOnce(new Response("ok"));
    const f = createResilientFetch(base);
    const res = await f("https://x.supabase.co/rest/v1/flows");
    expect(await res.text()).toBe("ok");
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("gives up after the configured retries", async () => {
    const base = vi.fn<typeof fetch>().mockRejectedValue(connectionError());
    await expect(createResilientFetch(base, 1)("https://x.supabase.co/rest/v1/flows")).rejects.toThrow("fetch failed");
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("never repeats a write and never retries non-connection errors", async () => {
    const write = vi.fn<typeof fetch>().mockRejectedValue(connectionError());
    await expect(createResilientFetch(write)("https://x.supabase.co/rest/v1/flows", { method: "POST" })).rejects.toThrow();
    expect(write).toHaveBeenCalledTimes(1);
    const other = vi.fn<typeof fetch>().mockRejectedValue(new Error("boom"));
    await expect(createResilientFetch(other)("https://x.supabase.co/rest/v1/flows")).rejects.toThrow("boom");
    expect(other).toHaveBeenCalledTimes(1);
  });
});
