import { afterAll, describe, expect, it } from "vitest";
import { admin, anon, rlsEnabled } from "./helpers";

/** The signup link must work in a browser that did not start the signup, and confirm the address. */
describe.skipIf(!rlsEnabled)("signup confirmation link", () => {
  const email = `auth-link-${Date.now()}@example.com`;
  let id = "";
  afterAll(async () => {
    if (id) await admin().auth.admin.deleteUser(id);
  });

  it("confirms an unconfirmed account once, in a fresh client", async () => {
    const password = `Pw-${crypto.randomUUID()}`;
    const link = await admin().auth.admin.generateLink({ type: "signup", email, password, options: { data: { shop_slug: "x" } } });
    expect(link.error).toBeNull();
    id = link.data.user!.id;
    expect((await anon().auth.signInWithPassword({ email, password })).error?.code).toBe("email_not_confirmed");
    const { hashed_token, verification_type } = link.data.properties!;
    const fresh = anon();
    const ok = await fresh.auth.verifyOtp({ token_hash: hashed_token, type: verification_type as "signup" });
    expect(ok.error).toBeNull();
    expect(ok.data.user?.email_confirmed_at).toBeTruthy();
    expect(ok.data.user?.user_metadata.shop_slug).toBe("x");
    expect((await anon().auth.verifyOtp({ token_hash: hashed_token, type: "signup" })).error).not.toBeNull();
    expect((await anon().auth.signInWithPassword({ email, password })).error).toBeNull();
  });

  it("a resent (recovery) link confirms an unconfirmed account too", async () => {
    const address = `auth-relink-${Date.now()}@example.com`;
    const created = await admin().auth.admin.generateLink({ type: "signup", email: address, password: `Pw-${crypto.randomUUID()}` });
    const userId = created.data.user!.id;
    try {
      const link = await admin().auth.admin.generateLink({ type: "recovery", email: address });
      const ok = await anon().auth.verifyOtp({ token_hash: link.data.properties!.hashed_token, type: "recovery" });
      expect(ok.error).toBeNull();
      expect(ok.data.user?.email_confirmed_at).toBeTruthy();
    } finally {
      await admin().auth.admin.deleteUser(userId);
    }
  });
});
