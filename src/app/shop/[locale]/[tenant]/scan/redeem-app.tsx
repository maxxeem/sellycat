"use client";

import type { IScannerControls } from "@zxing/browser";
import type { DecodeHintType as HintType } from "@zxing/library";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { formatMoney } from "@/lib/shop/deal-status";
import type { VoucherError, VoucherInfo } from "@/lib/vouchers/redeem";
import { lookup, lookupPhoto, redeemNow, type PhotoResult } from "./actions";

export type RecentRedemption = { id: string; at: string; amountCents: number | null; undone: boolean; code: string; title: string; currency: string };

const field =
  "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-3 text-base text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

type Result = { tone: "ok"; text: string; detail?: string } | { tone: "error"; text: string };

/** Scan (camera) or type a code → voucher → redeem. Big, clear feedback for the counter. */
export function RedeemApp({ locale, email, initial, recent, texts }: { texts: Pick<Dictionary, "redeem" | "vouchers" | "shop">; locale: "de" | "en"; email: string; initial: VoucherInfo | null; recent: RecentRedemption[] }) {
  const dict = texts;
  const t = dict.redeem;
  const v = dict.vouchers;
  const router = useRouter();
  const [code, setCode] = useState("");
  // Opened from the check page (/redeem?t=…): the voucher is already looked up.
  const [voucher, setVoucher] = useState<VoucherInfo | null>(initial);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [pending, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const money = (c: number, cur: string) => formatMoney(c, cur, locale);
  const fail = (e: VoucherError) => setResult({ tone: "error", text: v.errors[e] });
  const dateTag = locale === "de" ? "de-CH" : "en-CH";
  const [reading, setReading] = useState(false);

  /** Error text of a lookup (camera, typed code or photo). */
  const errorText = (r: Exclude<PhotoResult, { ok: true }>) =>
    r.error === "other_partner" ? fmt(t.otherPartner, { partner: r.partner || "?" }) : r.error === "unreadable" || r.error === "unavailable" || r.error === "limit" ? t.photoErrors[r.error] : v.errors[r.error];

  const find = (input: string) =>
    start(async () => {
      setResult(null);
      setVoucher(null);
      setAmount("");
      const r = await lookup(input);
      if (r.ok) setVoucher(r.voucher);
      else setResult({ tone: "error", text: errorText(r) });
    });

  const stopScan = useCallback(() => {
    controls.current?.stop();
    controls.current = null;
    setScanning(false);
  }, []);

  const startScan = async () => {
    setCameraError(false);
    setResult(null);
    setVoucher(null);
    setScanning(true);
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      // Every symbol a voucher can carry, and "try harder": barcodes (EAN, Code 128 …) need it,
      // especially from a phone screen. A sharper picture helps thin bars the most.
      const hints = new Map<HintType, unknown>([
        [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.AZTEC]],
        [DecodeHintType.TRY_HARDER, true],
      ]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
      if (!video.current) return;
      const constraints: MediaStreamConstraints = { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } };
      controls.current = await reader.decodeFromConstraints(constraints, video.current, (res, _err, c) => {
        if (!res) return;
        c.stop();
        controls.current = null;
        setScanning(false);
        navigator.vibrate?.(60);
        find(res.getText());
      });
    } catch {
      setCameraError(true);
      setScanning(false);
    }
  };

  useEffect(() => stopScan, [stopScan]);

  /** «Code abfotografieren»: a still of the camera picture, read by the AI (printed codes, code words). */
  const photo = () => {
    const el = video.current;
    if (!el || !el.videoWidth) return;
    const scale = Math.min(1, 1600 / Math.max(el.videoWidth, el.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(el.videoWidth * scale);
    canvas.height = Math.round(el.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(el, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
    stopScan();
    setReading(true);
    start(async () => {
      try {
        const r = await lookupPhoto(jpeg);
        if (r.ok) {
          navigator.vibrate?.(60);
          setVoucher(r.voucher);
        } else setResult({ tone: "error", text: errorText(r) });
      } catch {
        setResult({ tone: "error", text: v.errors.failed });
      } finally {
        setReading(false);
      }
    });
  };

  const redeem = () =>
    start(async () => {
      if (!voucher) return;
      const r = await redeemNow(voucher.id, voucher.partial ? amount : null);
      if (!r.ok) {
        navigator.vibrate?.([80, 60, 80]);
        return fail(r.error);
      }
      navigator.vibrate?.(120);
      setResult({ tone: "ok", text: t.redeemedTitle, detail: r.remaining ? `${v.remaining}: ${money(r.remaining, voucher.currency)}` : voucher.title });
      setVoucher(null);
      setCode("");
      setAmount("");
      router.refresh();
    });

  const reset = () => {
    setResult(null);
    setVoucher(null);
    setCode("");
  };

  return (
    <div className="flex flex-col gap-5" data-testid="redeem-app">
      {result?.tone === "ok" ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--shop-radius)] bg-[#1a7f37] p-8 text-center text-white" role="status" data-testid="redeem-success">
          <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-2xl font-bold">{result.text}</p>
          {result.detail ? <p className="text-lg">{result.detail}</p> : null}
          <button type="button" onClick={reset} className="mt-2 rounded-full bg-white px-6 py-3 font-bold text-[#111]">
            {t.next}
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--shop-radius)] bg-black" hidden={!scanning}>
            <div className="relative aspect-[3/4] w-full">
              <video ref={video} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" />
            </div>
            <p className="p-3 text-center text-sm text-white">{t.cameraHint}</p>
          </div>
          {scanning ? (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={photo} className="shop-btn min-h-[3.5rem] w-full" data-testid="redeem-photo">
                {t.photo}
              </button>
              <p className="text-center text-xs text-[var(--shop-muted)]">{t.photoHint}</p>
              <button type="button" onClick={stopScan} className="w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] px-4 py-3 font-semibold">
                {t.stopScan}
              </button>
            </div>
          ) : (
            <button type="button" onClick={startScan} className="shop-btn min-h-[4rem] w-full text-lg" data-testid="redeem-scan">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" strokeLinecap="round" />
              </svg>
              {t.scan}
            </button>
          )}
          {cameraError ? (
            <p role="alert" className="text-sm font-semibold text-[var(--shop-warning)]">
              {t.cameraDenied}
            </p>
          ) : null}
          {reading ? (
            <p role="status" className="text-center text-sm font-semibold" data-testid="redeem-reading">
              {t.photoReading}
            </p>
          ) : null}

          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) find(code);
            }}
          >
            <span className="text-sm font-semibold text-[var(--shop-muted)]">{t.manual}</span>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className={`${field} font-mono uppercase tracking-wider`}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-label={v.code}
                data-testid="redeem-manual"
              />
              <button type="submit" disabled={pending || !code.trim()} className="shop-btn shrink-0 px-4">
                {t.find}
              </button>
            </div>
          </form>

          {voucher ? (
            <div className="shop-card flex flex-col gap-3 p-5" data-testid="redeem-voucher">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {voucher.partner ? <p className="text-xs font-bold uppercase tracking-wide text-[var(--shop-muted)]">{voucher.partner}</p> : null}
                  <p className="text-lg font-bold leading-snug">{voucher.title}</p>
                  <p className="font-mono text-sm text-[var(--shop-muted)]">{voucher.code}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${voucher.status === "valid" ? "bg-[#1a7f37]/15 text-[#1a7f37]" : "bg-[#b42318]/15 text-[#b42318]"}`}
                >
                  {dict.shop.voucherStatus[voucher.status]}
                </span>
              </div>
              {voucher.valueCents ? (
                <p>
                  {v.remaining}: <strong>{money(voucher.remainingCents ?? 0, voucher.currency)}</strong> / {money(voucher.valueCents, voucher.currency)}
                </p>
              ) : null}
              {voucher.validUntil ? (
                <p className="text-sm text-[var(--shop-muted)]">{fmt(dict.shop.voucherValidUntil, { date: new Date(voucher.validUntil).toLocaleDateString(dateTag, { timeZone: "Europe/Zurich" }) })}</p>
              ) : null}
              {voucher.status === "valid" ? (
                <div className="flex flex-col gap-2">
                  {voucher.partial ? (
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder={((voucher.remainingCents ?? 0) / 100).toFixed(2)}
                      className={field}
                      aria-label={v.redeemAmount}
                    />
                  ) : null}
                  <button type="button" onClick={redeem} disabled={pending} className="shop-btn min-h-[3.5rem] w-full text-lg" data-testid="redeem-confirm">
                    {pending ? "…" : voucher.partial && amount ? v.redeemAmount : voucher.partial ? v.redeemFull : v.redeem}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {result?.tone === "error" ? (
            <p className="rounded-[var(--shop-radius)] bg-[#b42318] p-4 text-center font-bold text-white" role="alert" data-testid="redeem-error">
              {result.text}
            </p>
          ) : null}
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--shop-muted)]">{t.recent}</h2>
        {recent.length ? (
          <ul className="flex flex-col divide-y divide-[var(--shop-line)] rounded-[var(--shop-radius)] border border-[var(--shop-line)]">
            {recent.map((r) => (
              <li key={r.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${r.undone ? "opacity-50" : ""}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block font-mono text-xs text-[var(--shop-muted)]">{r.code}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-[var(--shop-muted)]">
                  {r.amountCents ? <span className="block font-semibold text-[var(--shop-text)]">{money(r.amountCents, r.currency)}</span> : null}
                  {r.undone ? t.undone : new Date(r.at).toLocaleString(dateTag, { timeZone: "Europe/Zurich", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--shop-muted)]">{t.recentEmpty}</p>
        )}
      </section>

      <footer className="flex flex-col gap-1 text-center text-xs text-[var(--shop-muted)]">
        <p>{fmt(t.signedInAs, { email })}</p>
        <p>{t.install}</p>
      </footer>
    </div>
  );
}
