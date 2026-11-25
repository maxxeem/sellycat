import type { Dictionary } from "@/lib/i18n";

/** Apple Wallet: stacked cards. */
export function AppleWalletIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3.5" fill="#1c1c1e" />
      <rect x="3" y="7.5" width="18" height="3" fill="#ff9f0a" />
      <rect x="3" y="10.5" width="18" height="3" fill="#30d158" />
      <rect x="3" y="13.5" width="18" height="3.2" fill="#0a84ff" />
    </svg>
  );
}

/** Google Wallet: four coloured bands. */
export function GoogleWalletIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="3.5" fill="#ea4335" />
      <rect x="3" y="5" width="18" height="10.5" rx="3.5" fill="#fbbc04" />
      <rect x="3" y="5" width="18" height="7" rx="3.5" fill="#34a853" />
      <rect x="3" y="5" width="18" height="3.5" rx="1.75" fill="#4285f4" />
    </svg>
  );
}

function PdfIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 11v6m-3-3 3 3 3-3" />
    </svg>
  );
}

/**
 * What a buyer can do with one voucher, always in the same place and order: PDF, Apple Wallet,
 * Google Wallet. Equal buttons that never wrap (icon above the label on phones, beside it from
 * `sm`). Wallets only for usable vouchers and only where they are configured.
 */
export function VoucherActions({
  token,
  fileKey,
  pdfHref,
  t,
  available,
  status,
}: {
  token: string;
  /** Opens the files without an email code (only on pages whose visitor is known to be the owner). */
  fileKey: string;
  pdfHref?: string;
  t: Dictionary["wallet"];
  available: { apple: boolean; google: boolean };
  status: string;
}) {
  const wallets = status === "valid";
  const items = [
    { key: "pdf", href: pdfHref ?? `/v/${token}/pdf?k=${fileKey}`, label: t.pdf, title: t.pdfTitle, icon: <PdfIcon />, newTab: true },
    ...(wallets && available.apple ? [{ key: "apple", href: `/v/${token}/pkpass?k=${fileKey}`, label: "Apple Wallet", title: t.addApple, icon: <AppleWalletIcon />, newTab: false }] : []),
    ...(wallets && available.google ? [{ key: "google", href: `/v/${token}/google?k=${fileKey}`, label: "Google Wallet", title: t.addGoogle, icon: <GoogleWalletIcon />, newTab: false }] : []),
  ];
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} data-testid="voucher-actions">
      {items.map((i) => (
        <a
          key={i.key}
          href={i.href}
          {...(i.newTab ? { target: "_blank", rel: "noopener" } : {})}
          aria-label={i.title}
          title={i.title}
          className="flex min-h-12 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-[var(--shop-radius-button)] border border-[var(--shop-line)] bg-[var(--shop-bg)] px-2 py-2 text-xs font-semibold text-[var(--shop-text)] transition hover:border-[var(--shop-text)] sm:flex-row sm:gap-2 sm:text-sm"
          data-testid={`voucher-action-${i.key}`}
        >
          {i.icon}
          <span className="truncate">{i.label}</span>
        </a>
      ))}
    </div>
  );
}
