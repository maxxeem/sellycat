import { describe, expect, it } from "vitest";
import { fetchAll } from "./fetch-all";

const source = (n: number) => async (from: number, to: number) => ({ data: Array.from({ length: Math.max(0, Math.min(n, to + 1) - from) }, (_, i) => from + i), error: null });

describe("fetchAll", () => {
  for (const n of [0, 1, 999, 1000, 1001, 4000, 4001, 9500])
    it(`reads all ${n} rows in order`, async () => {
      expect(await fetchAll(source(n))).toEqual(Array.from({ length: n }, (_, i) => i));
    });
  it("stops at max and reports errors", async () => {
    expect(await fetchAll(source(9000), 2500)).toHaveLength(2500);
    await expect(fetchAll(async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
  });
});
