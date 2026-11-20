import { describe, expect, it } from "vitest";
import { assertPublic, fetchImage, fetchText, privateAddress } from "./safe-fetch";

describe("safe fetch", () => {
  it("refuses internal and odd addresses before any request", async () => {
    for (const u of ["http://127.0.0.1/", "http://10.0.0.5/x", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "ftp://example.com/", "http://example.com:8080/", "http://user:pw@example.com/"]) {
      await expect(assertPublic(new URL(u)), u).rejects.toThrow();
    }
    expect(await fetchImage("http://192.168.1.1/a.jpg")).toBeNull();
    expect(await fetchImage("not a url")).toBeNull();
  });

  it("sees IPv4 hidden in IPv6 and only allows global unicast", () => {
    for (const ip of ["::ffff:7f00:1", "::ffff:127.0.0.1", "::ffff:a9fe:a9fe", "::7f00:1", "::1", "::", "64:ff9b::a00:1", "2002:7f00:1::", "fe90::1", "fec0::1", "fc00::1", "ff02::1", "2001:db8::1", "2001:0:4136:e378::1", "100::1", "192.0.2.1", "198.18.0.1"]) {
      expect(privateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "2606:4700::1111", "::ffff:808:808", "64:ff9b::808:808", "2a00:1450:4001::200e"]) {
      expect(privateAddress(ip), ip).toBe(false);
    }
  });

  it("refuses the URL parser's rewritten forms", async () => {
    await expect(assertPublic(new URL("http://[::ffff:127.0.0.1]/"))).rejects.toThrow();
    await expect(assertPublic(new URL("http://0x7f000001/"))).rejects.toThrow();
  });

  it("refuses an internal answer at connect time too", async () => {
    // Past assertPublic (as after a DNS change), the guarded lookup still refuses localhost.
    const { pinnedFetch } = await import("./safe-fetch");
    await expect(pinnedFetch(new URL("http://localhost:3200/"), { timeoutMs: 2000 })).rejects.toThrow(/private address/);
  });

  it("fetches a public page through the pinned connection", async () => {
    const r = await fetchText("https://example.com/", "text/html");
    expect(r?.text).toContain("Example Domain");
  }, 15_000);
});
