import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";

/** Shop design | voucher PDF | wallet pass. */
export function DesignTabs({ active, t, walletLabel }: { active: "shop" | "voucher" | "wallet"; t: Dictionary["voucherDesign"]; walletLabel: string }) {
  const tab = (key: "shop" | "voucher" | "wallet", href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`rounded-input px-3 py-1.5 text-sm font-semibold ${active === key ? "bg-ink text-surface-2" : "text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="inline-flex gap-1 self-start rounded-button border border-line bg-surface p-1" aria-label="Design">
      {tab("shop", "/dashboard/design", t.tabShop)}
      {tab("voucher", "/dashboard/design/voucher", t.tabVoucher)}
      {tab("wallet", "/dashboard/design/wallet", walletLabel)}
    </nav>
  );
}
