"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once (explicit rendering, so forms that appear later work too). */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Cloudflare Turnstile «not a robot» check inside a form: the widget adds the hidden field
 * `cf-turnstile-response` that the server verifies (verifyTurnstile). Remount it (change `key`) after a
 * failed submit, because each token is valid once.
 */
export function Turnstile({ siteKey, locale, theme = "auto" }: { siteKey: string; locale: string; theme?: "auto" | "light" | "dark" }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | null = null;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        id = api.render(box.current, { sitekey: siteKey, language: locale, theme, appearance: "interaction-only" });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, locale, theme]);
  return <div ref={box} className="min-h-0" data-testid="turnstile" />;
}
