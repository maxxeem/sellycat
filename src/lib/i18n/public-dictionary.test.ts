import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_KEYS } from "./public-dictionary";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(f) ? [p] : [];
  });

/** Client components only used in the dashboard and the staff admin (they get the full dictionary). */
const DASHBOARD_ONLY = /components\/(dashboard|shop|analytics)\/|components\/(rich-text-editor|image-upload|hours-editor|place-search|font-picker|color-picker|color-field|voucher-ad-upload|preview-frame)\.tsx$/;

describe("public dictionary", () => {
  it("contains every text a public client component reads", () => {
    const missing: string[] = [];
    for (const f of [...files("src/app/p/[locale]").filter((x) => !/\/(dashboard|staff)\//.test(x)), ...files("src/components").filter((x) => !DASHBOARD_ONLY.test(x))]) {
      const s = readFileSync(f, "utf8");
      if (!/useI18n\(/.test(s)) continue;
      for (const m of s.matchAll(/\bt\.([a-zA-Z]+)\b/g)) if (!(PUBLIC_KEYS as readonly string[]).includes(m[1]!)) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
  it("is not used outside: public pages do not import dashboard components", () => {
    const bad: string[] = [];
    for (const f of files("src/app/p/[locale]").filter((x) => !/\/(dashboard|staff)\//.test(x))) {
      const s = readFileSync(f, "utf8");
      for (const m of s.matchAll(/from "@\/(components\/[^"]+)"/g)) if (DASHBOARD_ONLY.test(`${m[1]}.tsx`) && !m[1]!.startsWith("components/shop/")) bad.push(`${f}: ${m[1]}`);
    }
    expect(bad).toEqual([]);
  });
});
