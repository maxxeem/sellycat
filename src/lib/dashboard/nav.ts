import type { Dictionary } from "@/lib/i18n";

/** Dashboard sections in menu order, with the phase that brings each one (docs/PLAN.md §5). */
export const DASHBOARD_SECTIONS = [
  { key: "deals", phase: 2 },
  { key: "partners", phase: 2 },
  { key: "orders", phase: 3 },
  { key: "vouchers", phase: 4 },
  { key: "redemptions", phase: 4 },
  { key: "design", phase: 2 },
  { key: "payments", phase: 3 },
  { key: "domains", phase: 6 },
  { key: "analytics", phase: 7 },
  { key: "team", phase: 7 },
  { key: "developers", phase: 7 },
  { key: "billing", phase: 7 },
  { key: "settings", phase: 2 },
  { key: "support", phase: 7 },
  { key: "help", phase: 7 },
] as const satisfies ReadonlyArray<{ key: keyof Dictionary["dashboard"]["nav"]; phase: number }>;

export type SectionKey = (typeof DASHBOARD_SECTIONS)[number]["key"];
export const isSection = (v: string): v is SectionKey => DASHBOARD_SECTIONS.some((s) => s.key === v);

/** Sections that already have their own page (the placeholder route skips them). */
export const BUILT_SECTIONS = new Set<SectionKey>(["deals", "partners", "orders", "design", "payments", "settings"]);
