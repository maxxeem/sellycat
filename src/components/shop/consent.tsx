"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { fmt } from "@/lib/i18n/fmt";
import type { ShopTexts } from "./shop-texts";

const KEY = "sc_consent";
const EVENT = "sc-consent";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}
function readChoice(): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

/** Pages whose address is a secret (vouchers, orders, sign-in links): never any tracking script there. */
const PRIVATE = /^\/(v|my|order|alert|scan|redeem)(\/|$)/;

/**
 * Cookie notice (revDSG/DSGVO): the shop's own analytics (GA4, Meta Pixel) load only after an
 * explicit "accept". Shown only when the shop configured such an id; the choice stays in the
 * visitor's browser.
 */
export function ConsentBanner({ ga4, metaPixel, t }: { ga4: string | null; metaPixel: string | null; t: ShopTexts }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => undefined);
  const path = usePathname();
  const loaded = useRef(false);
  useEffect(() => {
    // The address the visitor sees; inside Next it may be the internal one.
    if (choice !== "yes" || loaded.current || PRIVATE.test(window.location.pathname)) return;
    loaded.current = true;
    if (ga4 && /^G-[A-Z0-9]{4,20}$/.test(ga4)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
      document.head.appendChild(s);
      const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", ga4, { anonymize_ip: true, page_location: window.location.origin + window.location.pathname });
    }
    if (metaPixel && /^\d{6,20}$/.test(metaPixel)) {
      const s = document.createElement("script");
      s.async = true;
      s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixel}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }, [choice, ga4, metaPixel, path]);

  if (choice !== null) return null;
  const decide = (v: "yes" | "no") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  const tools = [ga4 ? "Google Analytics" : null, metaPixel ? "Meta Pixel" : null].filter(Boolean).join(", ");
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="sc-consent-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-bg)] p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] sm:bottom-5"
    >
      <p id="sc-consent-title" className="shop-heading flex items-center gap-2 text-base font-bold">
        <span aria-hidden>🍪</span> {t.cookieTitle}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--shop-muted)]">
        {fmt(t.cookieText, { tools })}{" "}
        <a href="/datenschutz" className="font-semibold text-[var(--shop-text)] underline underline-offset-2">
          {t.cookieMore}
        </a>
      </p>
      {/* Both choices equally visible (no nudging towards "accept"). */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => decide("no")}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--shop-radius-button)] border-2 border-[var(--shop-line)] px-3 text-sm font-bold text-[var(--shop-text)] transition hover:border-[var(--shop-text)]"
        >
          {t.cookieDecline}
        </button>
        <button type="button" onClick={() => decide("yes")} className="shop-btn min-h-11 px-3 text-sm">
          {t.cookieAccept}
        </button>
      </div>
    </div>
  );
}

/**
 * Footer link to change the choice (withdrawing consent must be as easy as giving it). After a
 * withdrawal the page reloads, so scripts that were already loaded are gone.
 */
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-left hover:text-[var(--shop-text)]"
      onClick={() => {
        const had = readChoice();
        try {
          localStorage.removeItem(KEY);
        } catch {}
        if (had === "yes") window.location.reload();
        else window.dispatchEvent(new Event(EVENT));
      }}
    >
      {label}
    </button>
  );
}
