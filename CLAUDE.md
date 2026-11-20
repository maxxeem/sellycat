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
- **Gutscheine (Phase 4)**: Ausgabe nur über `issue_vouchers` (aus `fulfil_order`), Einlösung nur über `redeem_voucher`/`undo_redemption`/`void_voucher` (Rechte in SQL via `can_redeem`/`can_manage`, Zeilensperre). `code` = lesbar, `token` = Geheimnis für `/v/<token>` (nie als Text zeigen). Symbole: `src/lib/vouchers/symbol.ts` (bwip-js/generic, SVG nur Pfade). CSV-Export: `/api/dashboard/export?kind=vouchers|redemptions`.
- **Mails (Phase 4)**: Mailgun EU (`src/lib/mail/`). Absender pro Shop über `loadSender` (eigene Domain nur wenn `mail_domains.status = active` und `plan_allows(…, 'custom_mail_domain')`, sonst `mail.sellycat.com`). Versand nur über `deliverOrder`/`deliverGift` (Claim über `mail_sent_at`/`gift_sent_at`, Protokoll in `mail_log`). PDF: `src/lib/vouchers/pdf.tsx` (react-pdf, sharp; lädt nur Bilder aus dem eigenen Storage). Planfunktionen immer über `plan_allows` prüfen, nie fest pro Abo-ID.
- **Einlöse-App (Phase 4)**: `/scan` auf der Shop-Domain (`shop/[locale]/[tenant]/scan`), Aktionen ermitteln den Shop immer aus dem Host, nie aus Browser-Daten; Rechte über `can_use_redeem`/`can_redeem`. Anmeldung per Code: `src/lib/vouchers/redeem-login.ts`. Gemeinsame Einlöse-Logik (Dashboard + App): `src/lib/vouchers/redeem.ts`, Scan-Erkennung `scan.ts`.
- **Scanner**: Einlöse-App `/scan` (nur E-Mail-Code), Wisch-Einlösung direkt auf `/v/<token>` für angemeldete Scanner (`v/[token]/scanner-redeem.tsx`). Scanner verwalten: `src/lib/vouchers/scanners.ts` (Mitglieder mit Rolle `partner`).
- **Code-Pools**: `deals.pool_free` zählt freie Codes (Trigger), zählt bei `code_source = 'pool'` als Bestand (`remaining()`, `start_checkout`).
- **Symbole im PDF** immer als Vektoren aus `symbolVector` (Modulmatrix), nie als Rasterbild; eingebettete Bilder als Echtfarben (keine Paletten-PNGs).
- **PDF-Vorlagen**: `src/lib/vouchers/design.ts` (Layout classic/ticket/minimal, A4/A6), Tabelle `voucher_designs` (eine pro Shop), `pdf.tsx` rendert alle Varianten (Test `pdf.test.ts`, mit `PDF_OUT=<ordner>` lokal ansehen).
- **Eigene Domains (Phase 6)**: `src/lib/site/custom-domain.ts` (rein, getestet: Eingabe, DNS-Einträge, Anbieter), `src/lib/site/shop-domains.ts` (Vercel, Status, Hauptadresse), Vercel-Aufrufe in `src/lib/vercel/domains.ts`. Zeilen in `tenant_domains` schreibt nur der Server. Der Proxy leitet auf `redirect_host` (aktive eigene Hauptdomain) um.
- **Wallet (Phase 5)**: `src/lib/wallet/` – `content.ts` (rein, getestet: Felder für Apple/Google), `apple.ts` (pkpass), `apns.ts` (Push), `google.ts` (JWT/REST), `passes.ts` (Laden, `walletUpdate` nach jeder Statusänderung per `after()`), `webservice.ts` (Apple-Update-Dienst unter `/api/passkit/v1`). Schlüssel lokal aus `WALLET_KEYS_DIR` (nur Entwicklung), sonst aus Variablen. Live-Test Google: `WALLET_LIVE=1 npx vitest run src/lib/wallet/google.live.test.ts`.
- **Archiv**: `deals.archived_at` (nur Inhaber/Admin, nie `published`). Löschen: ohne Verkäufe Inhaber/Admin (Policy `deals_delete_unsold`, `deal_has_sales`), mit Verkäufen nur Staff (`deleteDealForever`, nur archivierte, mit Audit).
- **Deal-Anordnung**: Modus in `shop_settings.deal_order` (`manual|newest|schedule|popular|bestseller`), Sortierung nur über `sortDeals` (`src/lib/shop/deal-order.ts`), Top-Deal immer zuerst. Aufrufe in `deals.view_count` nur über `track_deal_view`. Dashboard-Liste: `src/lib/dashboard/deal-list.ts`.
- **Pläne & Abos (Phase 7)**: `src/lib/billing/` – `plans.ts`/`currency.ts`/`map.ts` rein und getestet, `stripe.ts` (Pläne laden, `syncPlan`, Kunde, Portal), `apply.ts` (Abo → Shop). Staff `/admin/plans`, Preisseite `/pricing`, Kunden `/dashboard/billing`, Webhook `/api/stripe/billing` (`STRIPE_BILLING_WEBHOOK_SECRET`). Limits nur über `plan_allows`/`plan_limit`, nie fest pro Plan-ID; Plan- und Abo-Felder schreibt nur der Server.
- **Team (Phase 7)**: `src/lib/team/` (`rules.ts` rein, `team.ts` Server), Einladungen nur mit Token-Hash, Annehmen nur über `accept_invite`; Menü filtert nach `SECTION_MIN_ROLE`. Rollen-Leiter isomorph in `src/lib/auth/roles.ts`.
- **Öffnungszeiten**: immer strukturiert (`src/lib/shop/hours.ts`, Spalte `partner_locations.hours`), nie Freitext; Google Places nur serverseitig (`src/lib/places/google.ts`).
- **Externe Abrufe** von Kunden-URLs nur über `src/lib/net/safe-fetch.ts` (SSRF-Schutz).
- **KI**: Claude über `@anthropic-ai/sdk` (`src/lib/deals/import-ai.ts`), Modell `claude-opus-5-5`, strukturierte Ausgabe mit Zod.
- **Supabase-Clients**: `lib/supabase/server.ts` (Cookies, RLS), `client.ts` (Browser), `proxy.ts` (Session-Refresh), `admin.ts` (Service-Role + öffentlicher Client).

## Next.js 16

Weicht von älteren Trainingsdaten ab. Vor Framework-Code die Guides unter `node_modules/next/dist/docs/` lesen (siehe `AGENTS.md`).
