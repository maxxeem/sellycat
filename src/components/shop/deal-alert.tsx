"use client";

import { Bell, Mail, X } from "lucide-react";
import { useRef, useState, useTransition, type CSSProperties } from "react";
import { subscribeDealAlert } from "@/app/shop/[locale]/[tenant]/alert-actions";
import { fmt } from "@/lib/i18n";
import type { ShopTexts } from "./shop-texts";

/**
 * Deal alert in the shop header: a button that opens a small window (desktop, below the button) or
 * a sheet from the bottom (phone). Native modal dialog: focus, Escape and the top layer come with it.
 */
export function DealAlert({ shop, look, t, inert }: { shop: string; look: "filled" | "primary" | "text"; t: ShopTexts; inert: boolean }) {
  const a = t.dealAlert;
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState({ top: 88, right: 24 });
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const show = () => {
    if (inert) return;
    const r = button.current?.getBoundingClientRect();
    if (r) setPlace({ top: Math.max(12, r.bottom + 10), right: Math.max(16, document.documentElement.clientWidth - r.right) });
    setError(null);
    setOpen(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const send = () =>
    start(async () => {
      setError(null);
      const r = await subscribeDealAlert(email).catch(() => "failed" as const);
      if (r === "ok") setSent(true);
      else setError(r === "email" ? t.checkoutErrors.email : r === "limit" ? a.limit : a.failed);
    });

  return (
    <>
      <button ref={button} type="button" onClick={show} tabIndex={inert ? -1 : undefined} aria-haspopup="dialog" aria-expanded={open} className={`shop-alert-btn shop-alert-${look}`} data-testid="deal-alert-open">
        <Bell className="h-5 w-5 shrink-0" strokeWidth={1.75} absoluteStrokeWidth aria-hidden /> {a.title}
      </button>
      {inert ? null : (
        // A click on the backdrop hits the dialog itself.
        <dialog
          ref={dialog}
          className="shop-alert-dialog"
          aria-label={a.title}
          style={{ "--alert-top": `${place.top}px`, "--alert-right": `${place.right}px` } as CSSProperties}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          onClose={() => setOpen(false)}
          data-testid="deal-alert"
        >
          <div className="shop-alert-body">
            <span className="shop-alert-grab" aria-hidden />
            <button type="button" onClick={close} aria-label={a.close} className="absolute right-4 top-5 rounded-full p-2 text-[var(--shop-muted)] hover:text-[var(--shop-text)] sm:top-4">
              <X className="h-5 w-5" aria-hidden />
            </button>
            <span className="mb-4 grid h-13 w-13 place-items-center rounded-full bg-[var(--shop-primary)] text-[var(--shop-on-primary)]" aria-hidden>
              {sent ? <Mail className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
            </span>
            <p className="shop-heading text-2xl font-bold">{sent ? a.sentTitle : a.title}</p>
            <p className="mt-2 text-[0.95rem]" role={sent ? "status" : undefined} data-testid={sent ? "deal-alert-sent" : undefined}>{sent ? fmt(a.sent, { email }) : a.intro}</p>
            {sent ? (
              <p className="mt-4 text-xs text-[var(--shop-muted)]">
                {a.spam}{" "}
                <button type="button" className="underline hover:text-[var(--shop-text)]" onClick={() => setSent(false)}>{a.again}</button>
              </p>
            ) : (
              <form
                className="mt-4 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={a.placeholder}
                  aria-label={t.email}
                  className="h-12 w-full rounded-[min(var(--shop-radius),14px)] border border-[var(--shop-line)] bg-[var(--shop-bg)] px-4 text-base text-[var(--shop-text)] outline-none placeholder:text-[var(--shop-muted)] focus:border-[var(--shop-primary)]"
                  data-testid="deal-alert-email"
                />
                {error ? <p role="alert" className="text-sm font-semibold text-[var(--shop-warning)]">{error}</p> : null}
                <button type="submit" disabled={pending} className="shop-btn w-full" data-testid="deal-alert-send">{pending ? "…" : a.submit}</button>
                <p className="text-xs text-[var(--shop-muted)]">
                  {fmt(a.consent, { shop })}{" "}
                  <a href="/datenschutz" className="text-[var(--shop-text)] underline">{a.privacy}</a>
                </p>
              </form>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
