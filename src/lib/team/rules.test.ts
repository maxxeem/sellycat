import { describe, expect, it } from "vitest";
import { canChangeRole, canInvite, canRemove, seatsLeft } from "./rules";

describe("team rules", () => {
  it("owners invite anyone, admins everyone but owners, others nobody", () => {
    expect(canInvite("owner", "owner")).toBe(true);
    expect(canInvite("admin", "admin")).toBe(true);
    expect(canInvite("admin", "owner")).toBe(false);
    expect(canInvite("editor", "redeemer")).toBe(false);
  });
  it("roles: never your own, admins never touch owners, the last owner stays", () => {
    const base = { actorId: "a", targetId: "b", owners: 2 };
    expect(canChangeRole({ ...base, actor: "owner", from: "editor", to: "admin" })).toBe(true);
    expect(canChangeRole({ ...base, actor: "admin", from: "editor", to: "owner" })).toBe(false);
    expect(canChangeRole({ ...base, actor: "admin", from: "owner", to: "editor" })).toBe(false);
    expect(canChangeRole({ ...base, actor: "owner", targetId: "a", from: "owner", to: "admin" })).toBe(false);
    expect(canChangeRole({ ...base, actor: "owner", from: "owner", to: "admin", owners: 1 })).toBe(false);
    expect(canChangeRole({ ...base, actor: "owner", from: "owner", to: "admin" })).toBe(true);
  });
  it("removing: yourself is fine unless you are the last owner", () => {
    expect(canRemove({ actor: "editor", actorId: "a", targetId: "a", role: "editor", owners: 1 })).toBe(true);
    expect(canRemove({ actor: "owner", actorId: "a", targetId: "a", role: "owner", owners: 1 })).toBe(false);
    expect(canRemove({ actor: "admin", actorId: "a", targetId: "b", role: "owner", owners: 2 })).toBe(false);
    expect(canRemove({ actor: "admin", actorId: "a", targetId: "b", role: "redeemer", owners: 1 })).toBe(true);
  });
  it("counts free seats", () => {
    expect(seatsLeft(3, 2)).toBe(1);
    expect(seatsLeft(3, 5)).toBe(0);
    expect(seatsLeft(null, 99)).toBe(Infinity);
  });
});
