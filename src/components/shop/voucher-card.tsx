import type { ReactNode } from "react";
import { fmt } from "@/lib/i18n";
import { formatMoney } from "@/lib/shop/deal-status";
import { voucherSymbol, type BarcodeType, type CodeFormat } from "@/lib/vouchers/symbol";
import type { ShopTexts } from "./shop-texts";

export type VoucherView = {
  title: string;
  code: string;
  codeFormat: CodeFormat;
  barcodeType: BarcodeType | null;
  status: "valid" | "redeemed" | "expired" | "refunded" | "void";
  validUntil: string | null;
  valueCents: number | null;
  remainingCents: number | null;
  partner: string | null;
  /** Check page of this voucher (also what the QR code encodes). */
  link: string;
};

const dateText = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

/**
 * One voucher as the buyer sees it: scannable symbol on white (scanners need contrast), the code
 * to type, status, validity and remaining value. Used and invalid vouchers are greyed out.
 */
export function VoucherCard({ v, t, locale, currency, linkLabel, actions }: { v: VoucherView; t: ShopTexts; locale: string; currency: string; linkLabel?: string; actions?: ReactNode }) {
  const symbol = voucherSymbol({ codeFormat: v.codeFormat, barcodeType: v.barcodeType, code: v.code, link: v.link });
  const usable = v.status === "valid";
  const money = (c: number) => formatMoney(c, currency, locale);
  return (
    <div className="shop-card overflow-hidden" data-testid="voucher" data-status={v.status}>
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          {v.partner ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{v.partner}</p> : null}
          <p className="shop-heading text-lg font-bold leading-tight">{v.title}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${usable ? "bg-[color-mix(in_srgb,var(--shop-success)_15%,transparent)] text-[var(--shop-success)]" : "bg-[var(--shop-line)] text-[var(--shop-muted)]"}`}
        >
          {t.voucherStatus[v.status]}
        </span>
      </div>
      <div className={`flex flex-col items-center gap-3 p-5 ${usable ? "" : "opacity-40 grayscale"}`}>
        {symbol ? (
          <div
            className={`rounded-xl bg-white p-3 [&_svg]:h-auto [&_svg]:w-full ${symbol.kind === "linear" ? "w-full max-w-xs" : "w-48"}`}
            // bwip-js output: paths only, built from our own code/link.
            dangerouslySetInnerHTML={{ __html: symbol.svg }}
          />
        ) : null}
        <p className={`select-all text-center font-mono font-bold tracking-wider ${symbol ? "text-xl" : "py-3 text-3xl"}`} data-testid="voucher-code">{v.code}</p>
        {usable ? <p className="text-center text-xs text-[var(--shop-muted)]">{t.voucherShow}</p> : null}
      </div>
      <div className="flex flex-col gap-1 border-t border-[var(--shop-line)] px-5 py-3 text-sm text-[var(--shop-muted)]">
        <span>{v.validUntil ? fmt(t.voucherValidUntil, { date: dateText(v.validUntil, locale) }) : t.voucherNoExpiry}</span>
        {v.valueCents && v.remainingCents !== null && v.remainingCents !== v.valueCents ? (
          <span>{fmt(t.voucherRemaining, { value: money(v.remainingCents), total: money(v.valueCents) })}</span>
        ) : null}
        {linkLabel ? (
          <a href={v.link} className="mt-1 font-semibold text-[var(--shop-text)] underline underline-offset-2">
            {linkLabel}
          </a>
        ) : null}
      </div>
      {actions ? <div className="border-t border-[var(--shop-line)] p-3">{actions}</div> : null}
    </div>
  );
}
