"use client";

import { CheckCircle2, Search, TicketCheck, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { VOUCHER_TONE } from "@/lib/dashboard/order-ui";
import { formatMoney } from "@/lib/shop/deal-status";
import { lookupVoucher, redeemVoucher, type VoucherError, type VoucherInfo } from "./actions";

/** Enter a code → see the voucher → redeem (in full, or an amount for partly usable value vouchers). */
export function RedeemBox() {
  const { t, locale } = useI18n();
  const v = t.vouchers;
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const money = (c: number, cur: string) => formatMoney(c, cur, locale);
  const fail = (e: VoucherError) => setResult({ tone: "error", text: v.errors[e] });

  const find = () =>
    start(async () => {
      setResult(null);
      setVoucher(null);
      setAmount("");
      const r = await lookupVoucher(code);
      if (r.ok) setVoucher(r.voucher);
      else fail(r.error);
    });

  const redeem = () =>
    start(async () => {
      if (!voucher) return;
      const r = await redeemVoucher(voucher.id, voucher.partial ? amount : null);
      if (!r.ok) return fail(r.error);
      setResult({ tone: "ok", text: r.remaining ? `${v.redeemed} ${v.remaining}: ${money(r.remaining, voucher.currency)}` : v.redeemed });
      setVoucher({ ...voucher, remainingCents: r.remaining, status: r.remaining ? "valid" : "redeemed" });
      setAmount("");
    });

  return (
    <section className="rounded-card border border-line bg-surface-2 p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-text">
          <TicketCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-base font-semibold">{v.redeemTitle}</h2>
          <p className="text-sm text-muted">{v.redeemHint}</p>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          find();
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          className={`${inputClass} font-mono uppercase tracking-wider`}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-label={v.code}
          data-testid="redeem-code"
        />
        <button type="submit" disabled={pending || !code.trim()} className={buttonClass.dark}>
          <Search className="h-4 w-4" aria-hidden /> {v.find}
        </button>
      </form>

      {voucher ? (
        <div className="mt-4 rounded-input border border-line p-4" data-testid="redeem-voucher">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {voucher.partner ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{voucher.partner}</p> : null}
              <p className="font-semibold">{voucher.title}</p>
              <p className="font-mono text-sm text-muted">{voucher.code}</p>
            </div>
            <Badge tone={VOUCHER_TONE[voucher.status]}>{t.shop.voucherStatus[voucher.status]}</Badge>
          </div>
          {voucher.valueCents ? (
            <p className="mt-2 text-sm">
              {v.remaining}: <strong>{money(voucher.remainingCents ?? 0, voucher.currency)}</strong> / {money(voucher.valueCents, voucher.currency)}
            </p>
          ) : null}
          {voucher.validUntil ? <p className="mt-1 text-sm text-muted">{fmt(t.shop.voucherValidUntil, { date: new Date(voucher.validUntil).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { timeZone: "Europe/Zurich" }) })}</p> : null}
          {voucher.status === "valid" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {voucher.partial ? (
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={((voucher.remainingCents ?? 0) / 100).toFixed(2)}
                  className={`${inputClass} w-32`}
                  aria-label={v.redeemAmount}
                />
              ) : null}
              <button type="button" onClick={redeem} disabled={pending} className={buttonClass.primary} data-testid="redeem-submit">
                {voucher.partial && amount ? v.redeemAmount : voucher.partial ? v.redeemFull : v.redeem}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <p className={`mt-4 flex items-center gap-2 text-sm font-semibold ${result.tone === "ok" ? "text-success" : "text-danger"}`} role="status">
          {result.tone === "ok" ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <XCircle className="h-5 w-5" aria-hidden />}
          {result.text}
        </p>
      ) : null}
    </section>
  );
}
