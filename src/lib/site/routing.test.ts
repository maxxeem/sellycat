import { describe, expect, it } from "vitest";
import { apexRoute, safeNext, shopRoute } from "./routing";

describe("apexRoute", () => {
  it("rewrites pages into the locale tree", () => {
    expect(apexRoute("/", "de")).toEqual({ type: "rewrite", path: "/p/de", area: "public" });
    expect(apexRoute("/login", "en")).toEqual({ type: "rewrite", path: "/p/en/login", area: "auth" });
    expect(apexRoute("/dashboard/deals", "de")).toEqual({ type: "rewrite", path: "/p/de/dashboard/deals", area: "dashboard" });
  });
  it("maps /admin to the internal staff tree", () => {
    expect(apexRoute("/admin", "de")).toEqual({ type: "rewrite", path: "/p/de/staff", area: "staff" });
    expect(apexRoute("/admin/tenants", "de")).toEqual({ type: "rewrite", path: "/p/de/staff/tenants", area: "staff" });
  });
  it("hides internal prefixes", () => {
    for (const p of ["/staff", "/staff/tenants", "/p/de", "/shop/de/x"]) expect(apexRoute(p, "de")).toEqual({ type: "not_found" });
  });
  it("does not mistake look-alike paths for internal ones", () => {
    expect(apexRoute("/pricing", "de").type).toBe("rewrite");
    expect(apexRoute("/administrator", "de")).toEqual({ type: "rewrite", path: "/p/de/administrator", area: "public" });
  });
  it("passes API routes through", () => expect(apexRoute("/api/health", "de")).toEqual({ type: "pass" }));
});

describe("shopRoute", () => {
  const tenant = { id: "t1", locale: "en" };
  it("rewrites into the shop tree with the shop's language", () => {
    expect(shopRoute("/", tenant)).toEqual({ type: "rewrite", path: "/shop/en/t1", area: "shop" });
    expect(shopRoute("/d/pizza", tenant)).toEqual({ type: "rewrite", path: "/shop/en/t1/d/pizza", area: "shop" });
  });
  it("is 404 for unknown shops and internal prefixes", () => {
    expect(shopRoute("/", null)).toEqual({ type: "not_found" });
    expect(shopRoute("/staff", tenant)).toEqual({ type: "not_found" });
  });
  it("never serves the dashboard or staff admin on shop hosts", () => {
    // They are rewritten into the shop tree, where no such page exists (404).
    expect(shopRoute("/admin", tenant)).toEqual({ type: "rewrite", path: "/shop/en/t1/admin", area: "shop" });
  });
});

describe("safeNext", () => {
  it("accepts relative paths", () => expect(safeNext("/dashboard/deals")).toBe("/dashboard/deals"));
  it("rejects external and protocol-relative targets", () => {
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
  });
});
