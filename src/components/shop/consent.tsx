"use client";

import { useEffect, useSyncExternalStore } from "react";
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

/**
 * Cookie notice (revDSG/DSGVO): the shop's own analytics (GA4, Meta Pixel) load only after an
 * explicit "accept". Shown only when the shop configured such an id; the choice stays in the
 * visitor's browser.
 */
export function ConsentBanner({ ga4, metaPixel, t }: { ga4: string | null; metaPixel: string | null; t: ShopTexts }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => undefined);
  useEffect(() => {
    if (choice !== "yes") return;
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
      w.gtag("config", ga4, { anonymize_ip: true });
    }
    if (metaPixel && /^\d{6,20}$/.test(metaPixel)) {
      const s = document.createElement("script");
      s.async = true;
      s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixel}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }, [choice, ga4, metaPixel]);

  if (choice !== null) return null;
  const decide = (v: "yes" | "no") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-bg)] p-4 text-sm shadow-2xl sm:flex-row sm:items-center">
      <p className="flex-1">{t.cookieText}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => decide("no")} className="shop-chip">{t.cookieDecline}</button>
        <button type="button" onClick={() => decide("yes")} className="shop-btn min-h-0 py-2">{t.cookieAccept}</button>
      </div>
    </div>
  );
}
