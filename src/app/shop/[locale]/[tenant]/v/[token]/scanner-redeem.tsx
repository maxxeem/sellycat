"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { SwipeConfirm } from "@/components/shop/swipe-confirm";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { formatMoney } from "@/lib/shop/deal-status";
import type { VoucherInfo } from "@/lib/vouchers/redeem";
import { redeemNow } from "../../scan/actions";

const field =
  "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-3 text-base text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

/**
 * What a signed-in partner sees after scanning a voucher with the phone camera: the voucher and
 * "slide to redeem" (value vouchers with partial use: amount first). Large, clear outcome.
 */
export function ScannerRedeem({ voucher, locale, email, texts }: { texts: Pick<Dictionary, "redeem" | "vouchers" | "shop">; voucher: VoucherInfo; locale: "de" | "en"; email: string }) {
  const dict = texts;
  const r = dict.redeem;
  const v = dict.vouchers;
  const [state, setState] = useState(voucher);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const money = (c: number) => formatMoney(c, state.currency, locale);

  const confirm = () =>
    start(async () => {
      const res = await redeemNow(state.id, state.partial ? amount : null);
      if (!res.ok) {
        navigator.vibrate?.([80, 60, 80]);
        setResult({ ok: false, text: v.errors[res.error] });
        return;
      }
      navigator.vibrate?.(120);
      setState({ ...state, remainingCents: res.remaining, status: res.remaining ? "valid" : "redeemed" });
      setResult({ ok: true, text: res.remaining ? `${r.redeemedTitle} · ${v.remaining}: ${money(res.remaining)}` : r.redeemedTitle });
      setAmount("");
    });

  return (
    <div className="flex flex-col gap-4" data-testid="scanner-redeem">
      <div className="shop-card flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {state.partner ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{state.partner}</p> : null}
            <p className="shop-heading text-xl font-bold leading-tight">{state.title}</p>
            <p className="mt-1 font-mono text-sm text-[var(--shop-muted)]">{state.code}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${state.status === "valid" ? "bg-[#1a7f37]/15 text-[#1a7f37]" : "bg-[#b42318]/15 text-[#b42318]"}`}>
            {dict.shop.voucherStatus[state.status]}
          </span>
        </div>
        {state.valueCents ? (
          <p>
            {v.remaining}: <strong>{money(state.remainingCents ?? 0)}</strong> / {money(state.valueCents)}
          </p>
        ) : null}
        {state.validUntil ? (
          <p className="text-sm text-[var(--shop-muted)]">{fmt(dict.shop.voucherValidUntil, { date: new Date(state.validUntil).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { timeZone: "Europe/Zurich" }) })}</p>
        ) : null}
      </div>

      {result ? (
        <div className={`flex flex-col items-center gap-2 rounded-[var(--shop-radius)] p-6 text-center text-white ${result.ok ? "bg-[#1a7f37]" : "bg-[#b42318]"}`} role="status" data-testid={result.ok ? "redeem-success" : "redeem-error"}>
          <p className="text-2xl font-bold">{result.ok ? "✓" : "✕"}</p>
          <p className="text-lg font-semibold">{result.text}</p>
        </div>
      ) : null}

      {state.status === "valid" && !(result?.ok && !state.partial) ? (
        <div className="flex flex-col gap-3">
          {state.partial ? (
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={`${v.redeemAmount} (max. ${((state.remainingCents ?? 0) / 100).toFixed(2)})`} className={field} aria-label={v.redeemAmount} />
          ) : null}
          <SwipeConfirm key={`${state.remainingCents}-${result?.text ?? ""}`} label={r.swipe} busyLabel={r.swiping} busy={pending} onConfirm={confirm} />
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-1 text-xs text-[var(--shop-muted)]">
        <Link href="/scan" className="font-semibold text-[var(--shop-text)] underline underline-offset-2">
          {r.toScan}
        </Link>
        <span>{fmt(r.signedInAs, { email })}</span>
      </div>
    </div>
  );
}
