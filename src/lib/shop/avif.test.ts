import { describe, expect, it } from "vitest";
import { fitSize, isAvif } from "./avif";

describe("AVIF uploads", () => {
  it("are recognised by type, or by name when the system reports none", () => {
    expect(isAvif({ name: "a.avif", type: "image/avif" })).toBe(true);
    expect(isAvif({ name: "A.AVIF", type: "" })).toBe(true);
    expect(isAvif({ name: "a.avif", type: "image/png" })).toBe(false);
    expect(isAvif({ name: "a.jpg", type: "" })).toBe(false);
  });
  it("shrink to the maximum, never grow", () => {
    expect(fitSize(5120, 2560)).toEqual({ width: 2560, height: 1280 });
    expect(fitSize(1000, 4000, 2000)).toEqual({ width: 500, height: 2000 });
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
