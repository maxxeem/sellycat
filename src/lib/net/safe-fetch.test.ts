import { describe, expect, it } from "vitest";
import { assertPublic, fetchImage } from "./safe-fetch";

describe("safe fetch", () => {
  it("refuses internal and odd addresses before any request", async () => {
    for (const u of ["http://127.0.0.1/", "http://10.0.0.5/x", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "ftp://example.com/", "http://example.com:8080/", "http://user:pw@example.com/"]) {
      await expect(assertPublic(new URL(u)), u).rejects.toThrow();
    }
    expect(await fetchImage("http://192.168.1.1/a.jpg")).toBeNull();
    expect(await fetchImage("not a url")).toBeNull();
  });
});
