"use client";

import { useState, useTransition } from "react";
import { ColorField } from "@/components/color-field";
import { Card, Notice, buttonClass } from "@/components/ui";
import { contrastRatio } from "@/lib/design/color";
import { useI18n } from "@/lib/i18n/context";
import { APPLE_STRIP, appleBarcode, googleLogoSource, googleOnDark, passRows, stripTitle, walletColors, type WalletDesign, type WalletShop, type WalletVoucher } from "@/lib/wallet/content";
import { saveWalletDesign } from "../actions";

type Props = {
  initial: WalletDesign;
  shop: WalletShop;
  logos: { light: string | null; dark: string | null; favicon: string | null };
  voucher: WalletVoucher;
  available: { apple: boolean; google: boolean };
};

/** Stand-in for the code symbol in the preview (the real pass carries the real one). */
function FakeCode({ linear }: { linear: boolean }) {
  if (linear)
    return (
      <svg viewBox="0 0 120 40" className="h-12 w-40" aria-hidden>
        {Array.from({ length: 38 }, (_, i) => (
          <rect key={i} x={2 + i * 3.1} y="2" width={i % 3 === 0 ? 2 : 1} height="36" fill="#111" />
        ))}
      </svg>
    );
  const cells = [0, 1, 2, 4, 6, 7, 9, 10, 12, 15, 17, 18, 20, 21, 23, 24, 26, 29, 30, 33, 35, 36, 38, 40, 41, 43, 44, 46, 48];
  return (
    <svg viewBox="0 0 7 7" className="h-24 w-24" shapeRendering="crispEdges" aria-hidden>
      {cells.map((c) => (
        <rect key={c} x={c % 7} y={Math.floor(c / 7)} width="1" height="1" fill="#111" />
      ))}
    </svg>
  );
}

/** Strip points as share of the pass width. */
const cq = (points: number) => `${(points / APPLE_STRIP.width) * 100}cqw`;

/** The deal image, or where it will be. Cut-out products (transparent) are shown whole. */
function DealImage({ v, label, color, className }: { v: WalletVoucher; label: string; color: string; className: string }) {
  const [cutOut, setCutOut] = useState(false);
  if (!v.image)
    return (
      <div className={`flex items-center justify-center border border-dashed text-xs ${className}`} style={{ color, borderColor: color }}>
        {label}
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={v.image}
      alt=""
      crossOrigin="anonymous"
      className={`w-full ${cutOut ? "object-contain" : "object-cover"} ${className}`}
      onLoad={(e) => setCutOut(hasTransparency(e.currentTarget))}
      data-testid="wallet-preview-image"
    />
  );
}

function hasTransparency(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 24, 24);
    return ctx.getImageData(0, 0, 24, 24).data.some((x, i) => i % 4 === 3 && x < 250);
  } catch {
    return false;
  }
}

function ApplePreview({ v, shop, design, logo, imageLabel }: { v: WalletVoucher; shop: WalletShop; design: WalletDesign; logo: string | null; imageLabel: string }) {
  const strip = stripTitle(v.title);
  const rows = passRows(v, shop);
  const c = walletColors(design, shop.primary);
  const barcode = appleBarcode(v);
  const linear = barcode?.format === "PKBarcodeFormatCode128";
  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[14px] shadow-lg" style={{ background: c.background, color: c.foreground }} data-testid="wallet-preview-apple">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="" className="h-7 max-w-[8rem] object-contain" /> : <span className="truncate text-sm font-semibold">{shop.name}</span>}
        {rows.header ? (
          <span className="text-right">
            <span className="block text-[9px] font-semibold uppercase tracking-wide" style={{ color: c.label }}>
              {rows.header.label}
            </span>
            <span className="block text-lg leading-tight">{rows.header.value}</span>
          </span>
        ) : null}
      </div>
      {design.showImage ? (
        // Like the real strip: title on top, the image below it, never over each other.
        <div className="@container mt-3">
          <div className="flex flex-col overflow-hidden" style={{ aspectRatio: `${APPLE_STRIP.width} / ${APPLE_STRIP.height}` }}>
            <div className="shrink-0" style={{ height: cq(strip.height), paddingInline: cq(APPLE_STRIP.inset) }}>
              <span className="overflow-hidden font-semibold" style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: strip.lines, fontSize: cq(strip.size), lineHeight: 1.2 }}>
                {v.title}
              </span>
            </div>
            <DealImage v={v} label={imageLabel} color={c.label} className="min-h-0 flex-1" />
          </div>
        </div>
      ) : (
        <p className="mt-3 px-4 pb-2 text-2xl font-semibold leading-tight">{v.title}</p>
      )}
      <div className="flex justify-between gap-3 px-4 py-3 text-sm">
        {v.partner ? (
          <span>
            <span className="block text-[9px] font-semibold uppercase tracking-wide" style={{ color: c.label }}>
              {shop.locale === "de" ? "Bei" : "At"}
            </span>
            {v.partner}
          </span>
        ) : null}
        <span className={v.partner ? "text-right" : undefined}>
          <span className="block text-[9px] font-semibold uppercase tracking-wide" style={{ color: c.label }}>
            {rows.validity.label}
          </span>
          {rows.validity.value}
        </span>
      </div>
      <div className="flex justify-center px-4 pb-4">
        <div className="flex flex-col items-center rounded-lg bg-white px-3 py-2 text-[#111]">
          {barcode ? <FakeCode linear={linear} /> : null}
          <span className={barcode ? "font-mono text-xs" : "font-mono text-lg font-bold tracking-wider"}>{v.code}</span>
        </div>
      </div>
    </div>
  );
}

function GooglePreview({ v, shop, design, logos, imageLabel }: { v: WalletVoucher; shop: WalletShop; design: WalletDesign; logos: Props["logos"]; imageLabel: string }) {
  const rows = passRows(v, shop);
  const c = walletColors(design, shop.primary);
  const onDark = googleOnDark(c.background);
  const text = onDark ? "#ffffff" : "#111111";
  // The wide logo takes the place of the round logo and the shop name.
  const wide = googleLogoSource({ logoLight: logos.light, logoDark: logos.dark, favicon: logos.favicon }, "wide", onDark);
  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[20px] shadow-lg" style={{ background: c.background, color: text }} data-testid="wallet-preview-google">
      <div className="flex items-center gap-2 px-4 pt-4 text-sm">
        {wide ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wide} alt={shop.name} className="h-8 max-w-[8rem] object-contain object-left" data-testid="wallet-preview-google-logo" />
        ) : (
          <>
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-bold text-[#111]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logos.favicon ? <img src={logos.favicon} alt="" className="h-5 w-5 object-contain" /> : shop.name.slice(0, 2)}
            </span>
            <span className="truncate">{shop.name}</span>
          </>
        )}
      </div>
      <div className="px-4 pb-3 pt-3">
        {v.partner ? <p className="text-xs opacity-80">{v.partner}</p> : null}
        <p className="text-xl font-medium leading-snug">{v.title}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 text-xs">
        {rows.header ? (
          <span>
            <span className="block opacity-70">{rows.header.label}</span>
            {rows.header.value}
          </span>
        ) : null}
        <span>
          <span className="block opacity-70">{rows.validity.label}</span>
          {rows.validity.value}
        </span>
      </div>
      <div className="flex justify-center pb-4">
        <div className="flex flex-col items-center rounded-xl bg-white px-3 py-2 text-[#111]">
          {v.codeFormat !== "numeric" ? <FakeCode linear={v.codeFormat === "barcode" && !["datamatrix", "pdf417"].includes(v.barcodeType ?? "")} /> : null}
          <span className={v.codeFormat !== "numeric" ? "font-mono text-xs" : "font-mono text-lg font-bold tracking-wider"}>{v.code}</span>
        </div>
      </div>
      {design.showImage ? <DealImage v={v} label={imageLabel} color={text} className="h-28" /> : null}
    </div>
  );
}

export function WalletDesignEditor({ initial, shop, logos, voucher, available }: Props) {
  const { t } = useI18n();
  const w = t.wallet;
  const [design, setDesign] = useState<WalletDesign>(initial);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const colors = walletColors(design, shop.primary);
  const lowContrast = contrastRatio(colors.background, colors.foreground) < 4.5;
  const logo = colors.foreground === "#ffffff" ? logos.dark || logos.light : logos.light || logos.dark;
  const dirty = JSON.stringify(design) !== JSON.stringify(initial);
  const set = <K extends keyof WalletDesign>(key: K, value: WalletDesign[K]) => {
    setMessage(null);
    setDesign((d) => ({ ...d, [key]: value }));
  };
  const save = () =>
    start(async () => {
      const r = await saveWalletDesign(design);
      setMessage(r.ok ? { tone: "success", text: w.saved } : { tone: "error", text: w.failed });
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <h1 className="text-xl font-bold">{w.title}</h1>
        <div className="ml-auto">
          <button type="button" className={buttonClass.primary} disabled={pending || !dirty} onClick={save} data-testid="wallet-design-save">
            {pending ? "…" : t.common.save}
          </button>
        </div>
      </div>
      <p className="text-sm text-muted">{w.intro}</p>
      {!available.apple && !available.google ? <Notice tone="warning">{w.notConfigured}</Notice> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <Card title={w.colors}>
            <div className="flex flex-col gap-4">
              {(
                [
                  ["background", w.background],
                  ["foreground", w.foreground],
                  ["label", w.labelColor],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-2">
                  <ColorField label={label} value={colors[key]} onChange={(hex) => set(key, hex.toLowerCase())} presets={[shop.primary, "#111111", "#ffffff"]} doneLabel={t.common.close} />
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={design[key] === null} onChange={(e) => set(key, e.target.checked ? null : colors[key])} className="h-4 w-4 accent-[var(--coral)]" />
                    {w.auto}
                  </label>
                </div>
              ))}
              {lowContrast ? <Notice tone="warning">{w.contrastWarning}</Notice> : null}
            </div>
          </Card>
          <Card title={t.voucherDesign.show}>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={design.showImage} onChange={(e) => set("showImage", e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" />
                {w.showImage}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={design.showLocations} onChange={(e) => set("showLocations", e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" />
                {w.showLocations}
              </label>
              {voucher.codeFormat === "barcode" ? <p className="mt-2 text-xs text-muted">{w.barcodeNote}</p> : null}
            </div>
          </Card>
          <Card title={w.test} description={w.testHint}>
            <div className="flex flex-wrap gap-2">
              {available.apple ? (
                <a href="/api/dashboard/wallet-test?platform=apple" className={buttonClass.secondary} data-testid="wallet-test-apple">
                  {w.testApple}
                </a>
              ) : null}
              {available.google ? (
                <a href="/api/dashboard/wallet-test?platform=google" target="_blank" rel="noopener" className={buttonClass.secondary} data-testid="wallet-test-google">
                  {w.testGoogle}
                </a>
              ) : null}
            </div>
            {dirty ? <p className="mt-2 text-xs text-warn">{w.testUsesSaved}</p> : null}
          </Card>
        </div>
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card title={w.preview}>
            <p className="mb-4 text-xs text-muted">{w.previewHint}</p>
            <div className="grid gap-6 rounded-input bg-surface p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-center text-xs font-semibold text-muted">Apple Wallet</span>
                <ApplePreview v={voucher} shop={shop} design={design} logo={logo} imageLabel={t.voucherDesign.showImage} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-center text-xs font-semibold text-muted">Google Wallet</span>
                <GooglePreview v={voucher} shop={shop} design={design} logos={logos} imageLabel={t.voucherDesign.showImage} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
