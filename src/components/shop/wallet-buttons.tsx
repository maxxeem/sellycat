import type { Dictionary } from "@/lib/i18n";

/**
 * "Add to Apple Wallet" / "Add to Google Wallet" for one voucher (links to the shop's own
 * routes, which check the voucher token). Only shown for usable vouchers and configured wallets.
 */
export function WalletButtons({
  token,
  t,
  available,
  status,
  compact = false,
}: {
  token: string;
  t: Dictionary["wallet"];
  available: { apple: boolean; google: boolean };
  status: string;
  compact?: boolean;
}) {
  if (status !== "valid" || (!available.apple && !available.google)) return null;
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 font-semibold text-white hover:bg-neutral-800 ${compact ? "min-h-10 text-sm" : "min-h-12 w-full"}`;
  return (
    <div className={compact ? "flex flex-wrap justify-end gap-2" : "grid gap-2 sm:grid-cols-2"} data-testid="wallet-buttons">
      {available.apple ? (
        <a href={`/v/${token}/pkpass`} className={cls} data-testid="wallet-apple">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="3" fill="#fff" />
            <rect x="3" y="7" width="18" height="3" fill="#ff9f0a" />
            <rect x="3" y="10" width="18" height="3" fill="#30d158" />
            <rect x="3" y="13" width="18" height="3" fill="#0a84ff" />
          </svg>
          {t.addApple}
        </a>
      ) : null}
      {available.google ? (
        <a href={`/v/${token}/google`} className={cls} data-testid="wallet-google">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="3" fill="#4285f4" />
            <rect x="3" y="9" width="18" height="3" fill="#34a853" />
            <rect x="3" y="12" width="18" height="3" fill="#fbbc04" />
            <rect x="3" y="15" width="18" height="4" rx="0" fill="#ea4335" />
          </svg>
          {t.addGoogle}
        </a>
      ) : null}
    </div>
  );
}
