# CLAUDE.md

@AGENTS.md

Produkt: **Sellycat** (immer mit kleinem c; die frühere Schreibweise mit grossem C ist seit 16.11.2026 abgeschafft), Multi-Tenant-SaaS für gebrandete Deal-Shops mit Gutscheinen (PDF, Apple/Google Wallet). Plan und Entscheidungen: `docs/PLAN.md`. Vorbild für Stack und Konventionen: SwypeCast (`~/Documents/swypecast`).
Stack: Next.js 16 App Router (Cache Components, `proxy.ts`), TypeScript strict, Tailwind v4, Supabase (Postgres, Auth, Storage, RLS), Vitest, Playwright.

## Regeln

- Code und Kommentare Englisch, UI-Texte über `src/lib/i18n` (DE/EN, EN = Fallback, Schweizer Schreibweise ohne ß). Neue Texte immer in beiden Wörterbüchern (Test prüft gleiche Schlüssel).
- Begriffe konsistent: Kunde/Tenant, Partner, Deal, Käufer, Gutschein/Voucher, Staff.
- Jede DB-Änderung als Migration in `supabase/migrations/`; RLS auf jeder Tabelle; jede fachliche Tabelle mit `tenant_id`. Cross-Tenant-Tests in `tests/rls/` erweitern.
- Service-Role (`createAdminClient`) nur serverseitig und erst nach Autorisierung (`requireStaff`, Rollenprüfung).
- Keine Secrets im Code; Variablen in `.env.example` dokumentieren.
- Nach jeder Phase: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, dann Commit (`user.email = jan@my105.ch`).

## Commands

- `npm run dev` – Dev-Server. Shops lokal: `http://<slug>.localhost:3000` (mit `NEXT_PUBLIC_SITE_URL=http://localhost:3000`).
- `npm test` – Vitest (Unit + `tests/rls` gegen Staging, übersprungen ohne `.env.local`).
- `npm run test:e2e` – Playwright (iPhone 14, Port 3100).
- `npm run typecheck` – vorher `npx next typegen`.
- `npm run db:push` / `npm run db:types` – Migrationen auf Staging / Typen nach `src/lib/supabase/types.ts` (`scripts/db.mjs`). Production nur über Push auf `release` (GitHub Action).
- `npm run seed:staging` – Staff-Admin + Demo-Kunden.

## Architektur

- **Routing** (`src/proxy.ts`, Logik pur und getestet in `src/lib/site/`): Host → `apex` (sellycat.com, staging.sellycat.com, localhost, *.vercel.app) oder Shop (`<slug>.<root>` bzw. eigene Domain via `resolve_shop`).
  - Apex wird intern auf `/p/[locale]/…` umgeschrieben (Sprache aus Cookie `sc_lang` / Accept-Language), `/admin/*` auf `/p/[locale]/staff/*` (nur Staff, sonst 404).
  - Shops werden auf `/shop/[locale]/[tenantId]/…` umgeschrieben (Sprache des Shops).
  - Direkte Aufrufe von `/p`, `/shop`, `/staff` → 404. `/api/*` läuft auf allen Hosts durch.
- **Zwei Root-Layouts** (`src/app/p/[locale]/layout.tsx`, `src/app/shop/[locale]/layout.tsx`) + `global-not-found.tsx`.
- **Cache Components**: Alles, was Cookies/Session liest, liegt hinter `<Suspense>`. Öffentliche Shop-Daten mit `"use cache"` + `cacheTag("shop:<id>")` und `createPublicClient()` (ohne Cookies).
- **Auth**: Supabase, Cookies auf `.sellycat.com` geteilt. Mail-Links landen auf `/auth/continue` (Code, token_hash oder Fragment). Signup legt den Shop erst nach Bestätigung an (`provisionFromSignup`). Staff braucht TOTP (AAL2); lokal `PLATFORM_MFA_OPTIONAL=1`.
- **Design-Tokens** in `src/app/globals.css` (Coral `#FF4B23`, Ink, Mist, Gray; Text auf Coral immer Ink). UI-Bausteine in `src/components/ui.tsx`.
- **Shop (Phase 2)**: Daten in `src/lib/shop/queries.ts` (anon, `"use cache"`, Tag `shop:<tenantId>`, `cacheLife("minutes")` wegen Verkaufsfenstern). Jede Dashboard-Änderung, die der Shop zeigt, ruft `refreshShop(tenantId)` (`src/lib/dashboard/context.ts`). Darstellung in `src/components/shop/*` (reine Komponenten, auch für die Live-Vorschauen im Dashboard), Design-Tokens in `src/lib/shop/theme.ts` (CSS-Variablen `--shop-*`, Kontrastprüfung). Kategorien als eigene URL `/k/<slug>` statt Query-String (cachebar).
- **Cache-Components-Fallen**: `generateMetadata` darf bei unbekannten Parametern keine URL-Daten lesen, sonst bricht der Build (Deal-Seiten setzen `<title>`/`<meta>` deshalb im gecachten Seiteninhalt); `opengraph-image.tsx` mit Parametern hat denselben Effekt, darum ist das Deal-Share-Bild ein Route-Handler unter `/og/<slug>`; gecachte Funktionen geben nur einfache Objekte zurück (keine `URL`); `new Date()` nur in `"use cache"` oder nach Cookies/`connection()`.
- **Deals**: Editorstatus `draft | published | ended` in der DB, sichtbarer Status (geplant/live/ausverkauft/beendet) berechnet `dealStatus()`. Zähler `sold_qty`/`reserved_qty` darf nur die Service-Role ändern (Trigger). Veröffentlichen verlangt Impressum, AGB, Datenschutz (Trigger). Beschreibung als Tiptap-JSON, gerendert nur mit bekannten Knoten (`rich-text-server.ts`).
- **Zahlungen (Phase 3)**: Stripe Connect Standard per OAuth (`/api/stripe/connect/callback`, Status in `stripe_accounts`). Checkout = Server Action im Shop (`checkout/[slug]/actions.ts`): `start_checkout` (reserviert unter Zeilensperre) → Stripe Embedded Checkout (`ui_mode: "embedded_page"`) mit `{ stripeAccount }` und `application_fee_amount`. Bestandsänderungen nur über die SQL-Funktionen (Service-Role). Zustandswechsel idempotent in `src/lib/payments/orders.ts` (Webhook, Rückseite `/order/<id>`, Cron). `revalidateTag` nicht während des Renderns aufrufen (`completeSession(…, { refresh: false })`).
- **Supabase-Clients**: `lib/supabase/server.ts` (Cookies, RLS), `client.ts` (Browser), `proxy.ts` (Session-Refresh), `admin.ts` (Service-Role + öffentlicher Client).

## Next.js 16

Weicht von älteren Trainingsdaten ab. Vor Framework-Code die Guides unter `node_modules/next/dist/docs/` lesen (siehe `AGENTS.md`).
