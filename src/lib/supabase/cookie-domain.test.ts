import { describe, expect, it } from "vitest";
import { ownsAccountSession } from "./cookie-domain";

describe("ownsAccountSession", () => {
  it("is true on our own hosts and in development, never on a customer's domain", () => {
    for (const h of ["localhost:3000", "shop.localhost:3000", "127.0.0.1", "sellycat-abc.vercel.app"]) expect(ownsAccountSession(h), h).toBe(true);
    for (const h of ["deals.my105.ch", "sellycat.com.evil.ch", "evil-sellycat.com", "localhost.evil.ch", "vercel.app.evil.ch", "", null]) expect(ownsAccountSession(h), String(h)).toBe(false);
  });
});
