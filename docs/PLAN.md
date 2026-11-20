# Sellycat – Architektur- und Umsetzungsplan (Entwurf v1, 15.11.2026)

Status: **freigegeben am 15.11.2026.** Entscheidungen siehe Abschnitt 7.

---

## 1. Was ich gelesen habe

### 1.1 Brand Kit (`Sellycat-Brandkit/`)

Vorhanden: Logos (hell/dunkel, mono, Wortmarke, nur PNG), Katzen-Icon (Coral/Schwarz/Weiss), Favicons + Webmanifest, Inter (400/600/700, OFL), `brand.css`, `brand-colors.json`, Markenkit-PDF (5 Seiten).

Regeln aus dem Kit, die ich übernehme:
- Katze bleibt immer Coral; auf dunklem Grund die `on-dark`-Datei verwenden, nie invertieren.
- **Text auf Coral = Ink.** Weiss auf Coral nicht für kleine Schrift (rechnerisch nur 3.3:1, fällt bei WCAG AA durch).
- Logo erst ab 160 px Breite, darunter das Icon. Schutzraum ¼ der Icon-Höhe.
- Die Wortmarke ist eine Bildmarke, wird nie mit Inter nachgesetzt.

### 1.2 Abgeleitete Design-Tokens (Sellycat-eigene Oberflächen)

| Token | Wert | Herkunft / Zweck |
|---|---|---|
| `--sc-coral` | `#FF4B23` | Kit · Primärfarbe, Buttons (mit Ink-Text), Akzente |
| `--sc-coral-text` | `#C7381A` | **neu (Vorschlag)** · Coral als Linkfarbe auf Weiss, 5.2:1 (Original-Coral nur 3.3:1) |
| `--sc-ink` | `#111111` | Kit · Text, dunkle Flächen |
| `--sc-white` | `#FFFFFF` | Kit · Hintergrund |
| `--sc-mist` | `#F5F5F5` | Kit · Flächen, Karten-Hintergrund |
| `--sc-gray` | `#666666` | Kit · Sekundärtext (5.7:1 auf Weiss, ok) |
| `--sc-line` | `#E5E5E5` | **neu** · Trennlinien, Input-Rahmen |
| `--sc-success` | `#1A7F37` | **neu** · Erfolg (gültig, eingelöst) |
| `--sc-warning` | `#B25E00` | **neu** · Warnung (Pool knapp) |
| `--sc-danger` | `#B42318` | **neu** · Fehler; bewusst tiefer als Coral, damit «Fehler» nicht wie «Marke» aussieht |
| Dark Mode | Hintergrund `#111111`, Fläche `#1C1C1C`, Linie `#2A2A2A`, Text `#FFFFFF` / `#A3A3A3` | **neu** · aus Ink abgeleitet |
| Schrift | Inter 400 / 600 / 700 | Kit |
| H1 | 48/52 px, mobil 36/40, Bold | Kit |
| H2 | 32/38 px, mobil 28/34, Bold | Kit |
| Body | 16/24 px, Regular | Kit |
| Button | 16/20 px, SemiBold | Kit |
| Radius | 8 px (Inputs), 12 px (Buttons), 16 px (Karten), 999 px (Chips) | **neu** · weich wie die Logo-Formen |
| Schatten | `0 1px 2px rgb(17 17 17 / .06)`, `0 8px 24px rgb(17 17 17 / .08)` | **neu** · zurückhaltend |

**Nicht im Kit, bitte bestätigen:** alles mit «neu». Ausserdem fehlt eine Vektordatei (SVG) des Logos – für E-Mails und PDFs reicht PNG, für scharfe Darstellung auf grossen Bildschirmen wäre ein SVG besser.

**Schreibweise:** Wie Kit und Logo: **Sellycat** (kleines c), in Code und allen Texten (Entscheid vom 16.11.2026).

### 1.3 SwypeCast (`~/Documents/swypecast`) – was ich übernehme

| Bereich | SwypeCast | Für Sellycat |
|---|---|---|
| Framework | Next.js **16** (App Router, `proxy.ts` statt `middleware.ts`), React 19, TypeScript strict | gleich |
| Styling | Tailwind v4, Tokens als CSS-Variablen in `globals.css`, `next-themes` (Hell/Dunkel), `lucide-react` | gleich, mit Sellycat-Tokens |
| UI-Bausteine | `components/admin/ui.tsx`, `shell.tsx` (einklappbare Sidebar, Drawer mobil), `toast`, `color-picker`, `font-picker`, `dropzone`, `date-picker`, `copy-button`, `charts` (recharts) | übernehmen und auf Sellycat umfärben |
| Supabase | `@supabase/ssr`, drei Clients (Browser/Server/Proxy), Cookie-Domain `.root` für Apex + Subdomains, generierte Typen | gleich |
| Tenant-Auflösung | `tenantFromHost()` + Rewrite im Proxy, reservierte Subdomains | gleich, erweitert um **eigene Domains** (Lookup in DB, gecacht) |
| Staff-Admin | intern `/staff`, nur über Apex-`/admin` erreichbar, für Nicht-Staff 404, Pflicht-Authenticator (MFA), Rollen Super-Admin/Support, Impersonation mit Log, Audit-Log, Systemseite | gleich |
| Signup | Signup-Modi (offen / pausiert / Einladungscode) in Plattform-Einstellungen | gleich, Start: **pausiert** |
| Billing | Stripe Billing, Pläne mit Limits/Preisen/Stripe-IDs in Tabelle `plans`, `scripts/stripe-setup.mjs`, Testmodus auf Staging | gleich, plus Application-Fee-Felder |
| Support, Hilfe-Center | Tickets + Nachrichten, Hilfe-Artikel DE/EN mit Versionen und Feedback | gleich |
| Mail | Mailgun HTTP-API für Produktmails, Supabase-SMTP (Mailgun) für Auth-Mails, Vorlagen pro Sprache | gleich, plus Absendername/Reply-To pro Kunde und PDF-Anhang |
| i18n | Wörterbücher `dictionaries/{en,de}.ts`, Typ-Check gleiche Schlüssel, Cookie → Accept-Language | gleich; für den Shop zusätzlich Sprache pro Kunde; FR/IT = neue Datei |
| Domains | Vercel Domains API (`lib/vercel/domains.ts`) registriert jede Subdomain einzeln | gleich, ausgebaut um Status-Checks für eigene Domains |
| PDF / QR | `@react-pdf/renderer`, `qrcode` bereits im Einsatz | `@react-pdf/renderer` + `bwip-js` |
| Umgebungen | Zwei Supabase-Projekte; `main` → Staging (Vercel Preview), `release` → Production; Migrations per GitHub Action; Passwortschutz auf Staging; Seed-Skript; `/api/health`; Launch-Check | gleich |
| Tests | Vitest (Unit), Playwright (E2E, iPhone-Viewport) | gleich |
| Monitoring | Sentry, Rate-Limiter | gleich |

**Bewusst anders als bei SwypeCast:** SwypeCast legt das Kunden-Studio auf `{kunde}.swypecast.com/admin`. Für Sellycat empfehle ich das Dashboard zentral auf **`sellycat.com/dashboard`** (siehe 3.1) – die Shop-Domains bleiben so rein öffentlich, schnell cachebar und ohne Login-Cookies.

---

## 2. Empfehlungen zu den offenen Technik-Entscheidungen

### 2.1 Stripe Connect: **Standard-Accounts** (empfohlen)
- Der Kunde hat ein vollwertiges eigenes Stripe-Konto (oder verbindet sein bestehendes). Er sieht alle Zahlungen, Auszahlungen, Belege in seinem Stripe-Dashboard.
- **Haftung für Rückbuchungen/Betrug liegt beim Kunden**, nicht bei Sellycat. Bei Express haftet die Plattform – für ein junges SaaS ein unnötiges Risiko.
- Keine monatlichen Connect-Gebühren pro Konto (Express kostet pro aktivem Konto und Auszahlung).
- TWINT, Apple Pay, Google Pay werden in **seinem** Konto aktiviert; der Checkout zeigt automatisch, was dort aktiv ist. Genau das, was du willst.
- Zahlung: Direct Charges auf dem Kunden-Konto, `application_fee_amount` für Sellycat.

### 2.2 Checkout: **Stripe Embedded Checkout** (Checkout Session, im Shop eingebettet)
- Bleibt optisch im Shop, unterstützt Apple Pay, Google Pay, Karte, TWINT, Stripe-Beleg automatisch.
- Liefert `checkout.session.completed` / `checkout.session.expired` – passt zur Reservationslogik.
- **Achtung:** Eine Stripe Checkout Session läuft **frühestens nach 30 Minuten** ab (Stripe-Minimum). Die Reservation dauert deshalb 30 statt 15 Minuten. Bricht der Käufer ab, gibt ein Hintergrundjob den Bestand trotzdem früher frei, sobald die Session aktiv abgebrochen wurde.
- Für Apple Pay muss jede Shop-Domain pro Kunden-Stripe-Konto registriert werden – das automatisieren wir (Stripe «Payment Method Domains» API) beim Aufschalten einer Domain.

### 2.3 Domains
- `{kunde}.sellycat.com`: ein **Wildcard-DNS-Eintrag** `*.sellycat.com` → Vercel bei deinem DNS-Anbieter; die App registriert jede neue Subdomain automatisch bei Vercel (wie SwypeCast). So musst du die Nameserver nicht zu Vercel umziehen.
- Eigene Domains (`deals.kundenfirma.ch`): Vercel Domains API, CNAME beim Kunden, Status-Polling.

### 2.4 Einlöse-PWA auf der Shop-Domain
Der QR-Code zeigt auf `https://{shop-domain}/v/{token}`. Damit «eingeloggt scannen → Einlöse-Button» auch auf eigenen Kundendomains funktioniert, läuft der Einlöse-Modus **auf jeder Shop-Domain** unter `/redeem` mit eigener Anmeldung (E-Mail + Passwort oder 6-stelliger E-Mail-Code). Ein Login aus `sellycat.com` wäre auf `deals.kundenfirma.ch` sonst nicht sichtbar (Browser blockieren das).

### 2.5 Wallet
- Apple: **eine** Pass Type ID für die ganze Plattform; Logo, Farben und Organisationsname kommen pro Kunde in den Pass. Update-Dienst unter `sellycat.com/api/passkit/…` (Apple verlangt eine feste URL).
- Google: ein Issuer-Account für Sellycat, eine Klasse pro Deal, ein Objekt pro Gutschein.
- Apple-Barcodes: nur QR, PDF417, Aztec, Code 128. Bei EAN/UPC/Code 39/ITF-14 zeigt der Apple-Pass den Code als Text plus QR-Prüflink; der Editor erklärt das.

### 2.6 Inhalte und Sprache
Shop-Oberfläche (Buttons, Checkout, Mails) in der gewählten Shop-Sprache (DE/EN, FR/IT später). Deal-Texte schreibt der Kunde in seiner Shop-Sprache (kein Mehrsprachen-Inhalt pro Deal in v1; das Datenmodell lässt es später zu).

---

## 3. Routen

### 3.1 Apex `sellycat.com`
| Pfad | Inhalt |
|---|---|
| `/` | Platzhalter (Logo + Login-Link). Route Group `(marketing)` für die spätere Landing Page |
| `/login`, `/signup`, `/forgot`, `/auth/callback`, `/set-password` | Kunden-Auth; `/signup` zeigt «pausiert», solange der Staff-Schalter zu ist |
| `/dashboard` | Kunden-Dashboard (mehrere Shops pro Login möglich → Shop-Wechsler). Unterseiten: `deals`, `partners`, `orders`, `buyers`, `vouchers`, `redemptions`, `design/shop`, `design/voucher`, `design/wallet`, `domains`, `payments` (Stripe Connect), `analytics`, `team`, `developers` (API-Keys, Webhooks), `billing`, `settings` (Rechnungsangaben, Rechtstexte), `support`, `help` |
| `/admin` | Staff-Admin (intern `/staff`, für alle anderen 404, Authenticator Pflicht): `tenants`, `plans`, `signup`, `support`, `help`, `analytics`, `audit`, `system` |
| `/api/stripe/webhook`, `/api/billing/webhook` | Connect- bzw. Billing-Webhooks (signiert, idempotent) |
| `/api/passkit/v1/…` | Apple Wallet Web Service |
| `/api/cron/*` | Reservationen freigeben, Ablauf, Geschenk-Versand, Ablauf-Erinnerung, Domain-Checks, Zertifikats-Warnung |
| `/api/v1/*` | Öffentliche Kunden-API (API-Key) |

### 3.2 Shop-Hosts `{kunde}.sellycat.com` und eigene Domains
Der Proxy erkennt den Host, schreibt intern auf `/shop/[host]/…` um (so kann Vercel jede Shop-Seite pro Tenant cachen und gezielt neu erzeugen).

| Pfad | Inhalt |
|---|---|
| `/` | Deal-Übersicht (Featured, Kategorien, Filter) |
| `/d/[slug]` | Deal-Detail (Galerie, Preis/Ersparnis, Verfügbarkeit, Countdown, Karte, FAQ) |
| `/checkout/[slug]` | Menge, E-Mail/Name, Geschenk-Option, Newsletter-Häkchen, Embedded Checkout |
| `/order/[id]` | Erfolgsseite: Gutscheine, PDF, Wallet-Buttons, Teilen |
| `/v/[token]` | Prüfseite (öffentlich: Status, Deal, Partner; eingeloggt: Einlöse-Button) |
| `/my` | «Meine Gutscheine» per Magic-Link |
| `/redeem` | Einlöse-PWA (Login, Scanner, manuelle Eingabe) |
| `/impressum`, `/agb`, `/datenschutz` | Rechtstexte des Kunden |
| `/og/d/[slug]` | dynamisches Social-Share-Bild |
| `/wallet/apple/[id]`, `/wallet/google/[id]` | Pass-Download / Save-Link |

---

## 4. Datenmodell (Postgres / Supabase, alles mit RLS)

Grundsatz wie bei SwypeCast: jede fachliche Tabelle hat `tenant_id`; Zugriff über `tenant_members`; RLS-Funktionen `is_member(tenant_id, min_role)`; Service-Role nur serverseitig für Webhooks/Crons. Geldbeträge in Rappen (`integer`), Zeiten `timestamptz`, Zeitzone der Logik `Europe/Zurich`.

**Plattform**
- `tenants` – Name, `slug` (Subdomain), Status (trial/active/suspended), `plan_id`, Shop-Sprache, Währung (Default CHF), Rechnungsangaben (Firma, Adresse, MWST-Nr.), Gebühren-Override, Mail-Absendername, Reply-To, Analytics-IDs (GA4/Meta)
- `tenant_members` – User ↔ Tenant, Rolle `owner | admin | editor | redeemer | partner`, bei `partner` zusätzlich `partner_id`
- `tenant_invites`
- `platform_staff` (superadmin/support), `platform_settings` (Signup-Schalter u. a.), `platform_audit_log`, `impersonation_log`
- `plans` – Limits, Preise, Stripe-IDs, Application Fee (Prozent + fix); `subscriptions`, `billing_events`
- `stripe_accounts` – Connect-Konto pro Tenant, Status (nicht verbunden / in Prüfung / aktiv), `charges_enabled`, `payouts_enabled`
- `tenant_domains` – Hostname, Art (Subdomain/eigene), Status (ausstehend / DNS ok / SSL aktiv / Fehler), Prüfdaten, `is_primary`
- `processed_events` – Idempotenz für Stripe-/Wallet-Webhooks; `webhook_log`, `mail_log`
- `support_tickets`, `support_messages`, `help_articles` (+ Versionen, Feedback) – aus SwypeCast

**Shop**
- `shop_themes` – Design-Tokens als JSON (Farben, Schriften, Radius, Layout, Hero …), Entwurf + veröffentlichte Version
- `shop_fonts` – hochgeladene woff2-Dateien
- `legal_pages` – Impressum, AGB, Datenschutz pro Tenant (Pflicht vor Livegang)
- `partners`, `partner_locations` (Adresse, Koordinaten)
- `categories`
- `deals` – Typ (`fixed | value`), Texte, Preis, Streichpreis, Partner, Kategorie, Status (`draft | scheduled | live | sold_out | ended`), Verkaufszeitraum, Einlösezeitraum (Datum oder X Tage), Einlösefenster (Wochentage/Uhrzeiten), Teileinlösung, Limits (`total_qty`, `max_per_order`, `max_per_buyer`), Zähler `sold_qty` / `reserved_qty`, Anzeige-Schalter (Restmenge, Countdown), Code-Format (`qr | numeric | barcode` + Barcode-Typ), Code-Quelle (`generated | pool`), Vorlagen-IDs
- `deal_images`, `deal_locations`
- `code_pool` – importierte Codes pro Deal, Status frei/vergeben

**Verkauf**
- `buyers` – pro Tenant: E-Mail, Name, Newsletter-Opt-in mit Zeitstempel
- `reservations` – Deal, Menge, Käufer-E-Mail, Checkout-Session, `expires_at`, Status
- `orders` – Käufer, Stripe-Session/PaymentIntent, Betrag, Gebühr, Währung, Status (`pending | paid | refunded | partially_refunded`), Geschenkangaben (Empfänger, Nachricht, Versandzeitpunkt)
- `order_items`
- `vouchers` – Deal, Bestellung, **lesbarer Code** (gruppiert, ohne 0/O/1/I/L) und **getrenntes Token** (≥128 Bit, nur für den QR-Link), Wert/Restwert, gültig bis, Status (`valid | redeemed | expired | refunded | void`), Apple-Seriennummer, Google-Objekt-ID
- `redemptions` – Gutschein, Betrag, Person, Partner/Ort, Quelle (PWA/API), Zeit, Storno (wer/wann)
- `buyer_links` – Magic-Links für «Meine Gutscheine»

**Design & Integration**
- `voucher_templates` (Layout, A4/A6, Felder, Code-Position, Hintergrund), `pass_templates` (Apple/Google)
- `apple_pass_devices` (Registrierungen für Push-Updates)
- `api_keys` (nur gehasht gespeichert, Präfix sichtbar), `webhook_endpoints`, `webhook_deliveries`
- `analytics_events` (Shop-/Deal-Views, Checkout-Start) + tägliche Verdichtung

**Kritische Datenbank-Funktionen (atomar, in einer Transaktion)**
- `reserve_stock(deal, qty, email)` – prüft Bestand, Pool, Limits pro Bestellung und pro Käufer, erhöht `reserved_qty` nur wenn Platz ist → kein Überverkauf bei gleichzeitigen Käufen
- `fulfil_order(session)` – Reservation → verkauft, Gutscheine + Codes erzeugen bzw. aus dem Pool ziehen; doppelter Webhook bewirkt nichts
- `release_reservation(...)` – bei Abbruch/Ablauf
- `redeem_voucher(voucher, amount, actor)` – nur wenn gültig, im Zeitfenster und Restwert reicht; doppelte Einlösung unmöglich
- `undo_redemption(...)` – innerhalb der Frist, nur Kunde-Admin

---

## 5. Phasen

Jede Phase endet lauffähig auf Staging, mit Tests, Build und einer Prüfliste für dich.

| # | Phase | Inhalt | Du brauchst bis dahin |
|---|---|---|---|
| 1 | **Fundament** | Eigenes Git-Repo, Next.js-16-Setup nach SwypeCast, Brand-Tokens, Inter, Favicons; Supabase Staging + Production, Migrations-Workflow; Auth (Login, Signup-pausiert, Passwort vergessen); Proxy mit Tenant-Auflösung; Kern-Datenmodell + RLS + Cross-Tenant-Tests; Staff-Admin-Gerüst (Tenants, Signup-Schalter, Audit, MFA); Dashboard-Shell; Platzhalter-Startseite; Staging-Passwortschutz; Seed (2 Demo-Kunden) | GitHub, Vercel, Supabase, DNS `sellycat.com` |
| 2 | **Deals & Shop** | Partner, Orte, Kategorien, Deal-Editor mit Live-Vorschau und allen Limits; Theme-Editor (Farben mit Kontrastprüfung, Schriften, Layouts, Hell/Dunkel, Rechtstexte, «Branding von Website übernehmen»); öffentlicher Shop (Übersicht, Detail, Karte, SEO, OG-Bilder, schema.org, Cookie-Hinweis) | Mapbox-Token (hast du von SwypeCast) |
| 3 | **Zahlung** | Stripe-Connect-Onboarding mit Status, Embedded Checkout, Reservation, Webhooks, Bestellungen, Rückerstattung, Application Fee | Stripe-Plattformkonto mit Connect |
| 4 | **Gutscheine** | Code-Generierung, CSV-Pools mit Warnung/Auto-Stopp, QR/Barcodes, PDF-Editor (3 Vorlagen, A4/A6) + Erzeugung, Mailgun-Mail mit PDF, Erfolgsseite, «Meine Gutscheine», Geschenk-Versand, Prüfseite, Einlöse-PWA, Einlöse-Log, Storno, CSV-Export | Mailgun-Domain `mail.sellycat.com` |
| 5 | **Wallet** | Apple- und Google-Pässe, Design-Editor mit Vorschau, Updates nach Einlösung/Ablauf, Ablauf-Erinnerung, Standort-Hinweise, Testversand | Apple Pass Type ID + Zertifikat, Google Wallet Issuer |
| 6 | **Domains** | Eigene Domain mit Vercel API, DNS-Anleitung (GoDaddy, Infomaniak, Hostpoint, Cloudflare), Status-Check, Haupt-Domain + Redirect, Apple-Pay-Domain-Registrierung | Vercel-API-Token |
| 7 | **SaaS-Betrieb** | Pläne/Subscriptions (Stripe Billing), Support, Knowledge Base, Kunden- und Plattform-Analytics, Partner-Abrechnung, öffentliche API + Webhooks, Team/Rollen-Feinschliff, Performance (Lighthouse ≥ 95), Sicherheits-Review, Launch-Check | Stripe-Billing-Produkte (Skript) |

Automatisierte Tests über alle Phasen: Cross-Tenant-Zugriffe (RLS), Überverkauf mit parallelen Käufen, Webhook-Idempotenz, Kauf → Gutschein → Wallet → Einlösung → Pass-Update, Doppel-Einlösung, Rückerstattung.

---

## 6. Externe Accounts, Zertifikate, Kosten

Preise: Stand meines Wissens, ungefähr – vor Abschluss jeweils auf der Anbieterseite prüfen. Die Schritt-für-Schritt-Anleitung bekommst du jeweils zu Beginn der Phase.

| Was | Wofür | Phase | Kosten ca. |
|---|---|---|---|
| GitHub: privates Repo `sellycat` | Code, Migrations-Workflow | 1 | gratis (bestehender Account) |
| Vercel Pro: neues Projekt `sellycat` (im bestehenden Team) | Hosting, Domains, Crons | 1 | ~20 USD/Monat pro Mitglied (falls schon Pro: keine Zusatzkosten) |
| Supabase: 2 Projekte `sellycat-staging` (Frankfurt), `sellycat` (Frankfurt/Zürich-nah) | DB, Auth, Storage | 1 | Pro-Org ~25 USD/Monat + ~10 USD/Monat pro zusätzlichem Projekt |
| DNS `sellycat.com`: Apex + `www` → Vercel, `*.sellycat.com` und `*.staging.sellycat.com` → Vercel | Shops auf Subdomains | 1 | – |
| Mapbox (vorhanden) | Karte der Einlöseorte | 2 | Gratis-Kontingent |
| Stripe: Plattformkonto für Sellycat, **Connect aktivieren (Standard)** | Zahlungen an Kunden + Gebühr | 3 | Connect Standard ohne Grundgebühr; Kartengebühren zahlt der Kunde |
| Mailgun: Domain `mail.sellycat.com` (SPF, DKIM, Tracking-CNAME) | Gutschein- und Systemmails, Auth-SMTP | 4 | ab ~15–35 USD/Monat je nach Volumen |
| Apple Developer Program (vorhanden von SwypeCast?) → **Pass Type ID** + Zertifikat (jährlich erneuern) | Apple Wallet | 5 | 99 USD/Jahr (falls schon bezahlt: 0) |
| Google Pay & Wallet Console: Issuer-Account, Google-Cloud-Projekt, Service-Account; Freischaltung für Live beantragen | Google Wallet | 5 | gratis |
| Vercel API-Token | Domains automatisch | 1/6 | – |
| Stripe Billing | Sellycat-Abos der Kunden | 7 | ~0.7 % des Abo-Volumens |
| Sentry (optional, vorhanden) | Fehler-Monitoring | 1 | Gratis-Stufe |

---

## 7. Entscheidungen (15.11.2026)

1. Design-Tokens wie in 1.2 vorgeschlagen (inkl. «neu»-Werte). Logo vorerst als PNG; ein SVG kommt in `Sellycat-Brandkit/logos/`, sobald vorhanden.
2. Kunden-Dashboard zentral auf `sellycat.com/dashboard`.
3. Stripe Connect mit Standard-Konten, Direct Charges; Geld fliesst nie über Sellycat, nur die Application Fee. Monatliche Gebührenabrechnung für Kunden in Phase 7.
4. Reservation während des Checkouts: 30 Minuten (Stripe-Minimum).
5. Bestehende Accounts aus SwypeCast werden weiterverwendet (Vercel-Team, Supabase-Org «105», Mailgun, Apple Developer, Sentry, GitHub).
6. DNS von `sellycat.com` liegt bei GoDaddy.
7. Eigenes Git-Repository im Ordner `sellycat`.

## 8. Stand Phase 1 (16.11.2026)

Erledigt (lokal, Build grün): eigenes Repo, Next.js 16 mit Cache Components, Brand-Tokens/Inter/Favicons, Proxy mit Tenant- und Sprachauflösung, Migration `core` (Tenants, Rollen, Domains, Pläne, Staff, Signup-Schalter, Audit, RLS, Definer-Funktionen), Login/Signup (pausiert)/Passwort vergessen/Einladungs-Links, Dashboard-Gerüst, Staff-Admin (Kunden, Kunde anlegen, Status/Plan/Gebühr, Signup-Schalter, Audit-Log, TOTP), Platzhalter-Startseite und -Shop, Staging-Passwortschutz, Health-Route, CI- und Migrations-Workflow, Seed-Skript, Cross-Tenant-Tests.

Infrastruktur (16.11.2026): Supabase `sellycat-staging` (Frankfurt) mit Migration, Auth-Einstellungen und Seed; GitHub `maxxeem/sellycat` mit CI und Migrations-Workflow (grün); Vercel-Projekt `sellycat` (Production-Branch `release`, `main` = Staging, Region fra1); DNS bei GoDaddy für `staging` und `*.staging`; staging.sellycat.com mit Passwortschutz online.

Offen für später: Production (Supabase-Projekt, Vercel-Production-Variablen, DNS für `sellycat.com` und `*`) vor dem ersten echten Kunden; Impersonation mit Phase 7.

## 9. Stand Phase 2 (17.11.2026)

Erledigt: Migration `deals_shop` (Partner, Einlöseorte, Kategorien, Deals mit allen Limitierungen, Bilder, Orte, Theme, Rechtstexte, Storage-Bucket `shop-media`, RLS + Tenant-Grenzen per Trigger); Dashboard: Partner/Orte (mit Geocoding, sobald Mapbox-Token gesetzt), Deal-Editor mit Live-Vorschau (Karte/Detail, Handy/Desktop), Einstellungen (Shop, Rechnungsangaben, Rechtstexte, Kategorien, Analytics-IDs), Theme-Editor (Farben mit WCAG-Prüfung, Google Fonts über eigenen Proxy, eigene woff2, Formen, Layouts, Hell/Dunkel, Hero, Logos, Favicon, Social-Bild, Footer, «Branding von Website übernehmen» mit SSRF-Schutz); öffentlicher Shop (Übersicht mit Top-Deal und Kategorien, Detailseite mit Galerie, Ersparnis, Verfügbarkeit, Countdown, Einlöseorten, Karte, FAQ, Bedingungen; Rechtstexte; schema.org-Offer; Share-Bild pro Deal; Cookie-Hinweis mit Einwilligung für GA4/Meta); Seed mit zwei unterschiedlich gestalteten Demo-Shops; Cross-Tenant-Tests für alle neuen Tabellen und den Bucket.

Offen/bewusst später: Kauf-Button führt auf einen Platzhalter (Phase 3); Code-Pool-Import (Phase 4); Shop-Besuchsstatistik (Phase 7); Karten erst mit Mapbox-Token.

## 10. Stand Phase 3 (18.11.2026)

Erledigt: Migration `payments` (Stripe-Konten, Käufer, Bestellungen, Positionen, Reservationen, verarbeitete Webhook-Events; Funktionen `start_checkout`, `fulfil_order`, `release_order`, `release_expired`, `record_refund`, `restock_order`, `application_fee`, nur für die Service-Role); Stripe Connect per OAuth (bestehendes Konto verbinden oder neues eröffnen) mit Status im Dashboard «Zahlungen», Trennen nur für Inhaber; Checkout im Shop: Menge, E-Mail, Name, Newsletter, AGB-Häkchen, dann Stripe Embedded Checkout auf dem Konto des Kunden (Direct Charge, Application Fee aus Abo bzw. Kunden-Override); Reservation 35 Min. (Stripe-Session 31 Min.), abgelaufene Reservationen geben den Bestand beim nächsten Kauf, beim Webhook `checkout.session.expired` und im täglichen Cron frei; Rückseite `/order/<id>` prüft die Session direkt bei Stripe; Webhook `/api/stripe/webhook` (idempotent); Dashboard «Bestellungen» mit Filter, Suche, Detail und Rückerstattung (Gebühr anteilig zurück, Bestand optional wieder frei); Kauf-Button erst aktiv, wenn Stripe Zahlungen erlaubt; Tests gegen Staging inkl. paralleler Käufe (kein Überverkauf).

Entscheidungen: Connect per OAuth statt Account Links, weil Kunden ihr bestehendes Stripe-Konto verbinden sollen. Gebühr pro Bestellung (Prozent + fix). Bezahlt jemand nach Ablauf der Reservation und ist nichts mehr frei, gilt der Kauf trotzdem (Hinweis «überverkauft» in der Bestellung).

Offen/bewusst später: Gutscheine und Mails nach dem Kauf (Phase 4); Geschenk-Option (Phase 4); Apple-Pay-Domainregistrierung für später hinzugefügte eigene Domains (Phase 6; die bestehenden Shop-Domains werden beim Verbinden registriert); Cron nur täglich (Vercel-Plan), die Freigabe läuft vorher über Webhook und nächsten Kauf.

## 11. Stand Phase 4, Teil 1 (19.11.2026)

Erledigt: Migration `vouchers` (Gutscheine, Code-Pools, Einlösungen; Funktionen `issue_vouchers` (in `fulfil_order`, nachträglich für alte Bestellungen), `redeem_voucher` (Zeilensperre, Einlösefenster, Teileinlösung), `undo_redemption` (Inhaber/Admin, 7 Tage), `void_voucher`, `find_voucher`, `voucher_public`; volle Rückerstattung setzt offene Gutscheine auf «erstattet»); Codes lesbar ohne 0/O/1/I/L, numerisch oder als gültiger Barcode (EAN/UPC/ITF mit Prüfziffer), getrenntes 128-Bit-Token für den Prüflink; QR/Barcodes mit bwip-js als SVG; Erfolgsseite zeigt die Gutscheine; Prüfseite `/v/<token>`; Dashboard «Ausgestellt» (Filter, Suche, Ungültig machen, CSV) und «Einlösungen» (Code eingeben, ganz oder Betrag einlösen, Log mit Rückgängig, CSV); Tests gegen Staging inkl. paralleler Doppel-Einlösung.

## 12. Stand Phase 4, Teil 2 (20.11.2026)

Erledigt: Migration `mail` (Geschenkfelder und Mailstatus auf `orders`, `mail_log`, `buyer_links` (nur SHA-256 des Tokens), `mail_domains`, Funktion `plan_allows(tenant, feature)`); Gutschein-PDF (A4, eine Seite pro Gutschein, Logo, Deal-Bild, Code mit QR/Barcode, Wert, Gültigkeit, Einlöseorte, Bedingungen; @react-pdf/renderer + sharp, Bilder nur aus dem eigenen Storage) zum Herunterladen auf Erfolgsseite, Prüfseite und «Meine Gutscheine»; Mail an Käufer mit PDF direkt nach der Zahlung (`after()` in `completeSession`, in der Datenbank beansprucht, also nie doppelt; Fehlversuche holt der Cron `/api/cron/mail` täglich 06:00 UTC nach); Geschenk-Option im Checkout (Name, E-Mail, Von, Nachricht, Versand sofort oder an einem Tag bis ein Jahr im Voraus; der Cron versendet geplante Geschenke am Morgen); «Meine Gutscheine» `/my` mit Link per Mail (24 Std., höchstens 5 pro Stunde und Adresse, gleiche Antwort für unbekannte Adressen); Dashboard: Bestellung zeigt Geschenk und Mail-Protokoll, Mail erneut senden; neue Seite «Domains» mit Shop-Adresse und **eigener Absender-Domain** (Kunde gibt z.B. `mail.firma.ch` ein, Sellycat legt sie per API bei Mailgun (EU) an, zeigt die DNS-Einträge mit Kopier-Knöpfen und prüft sie; Mails gehen erst nach erfolgreicher Prüfung über die eigene Domain, sonst über `mail.sellycat.com` im Namen des Shops).

**Abo-Steuerung:** Planlimits `custom_mail_domain` und `custom_domain` (eigene Shop-Domain, Phase 6) sind vorerst für alle Abos `true`. Später im Staff-Bereich pro Abo auf `false` setzen: Der Absender fällt dann automatisch auf Sellycat zurück, die eingerichtete Domain bleibt gespeichert.

Nächster Teil: Teil 3 Einlöse-PWA auf der Shop-Domain, CSV-Import für Code-Pools (Warnung/Auto-Stopp), PDF-Vorlagen-Editor (3 Vorlagen, A4/A6).

## 13. Stand Phase 4, Teil 3 (21.11.2026)

Erledigt: Migration `redeem_pool_designs` (+ `redeem_user`). **Code-Pools**: Import im Deal-Editor (Datei CSV/TXT oder einfügen, erste Spalte, Kopfzeile/Duplikate/zu lange Codes werden erkannt, bis 20'000 pro Import; Funktionen `import_pool_codes`, `clear_pool_codes`), Zähler `deals.pool_free` per Trigger (nur der Trigger darf ihn ändern), **Auto-Stopp**: `start_checkout` und der Shop verkaufen höchstens `pool_free − reserved_qty`, leerer Pool = ausverkauft; Warnung «Codes knapp» (unter 10 bzw. unter 10 %) im Editor und in der Deal-Liste. **Einlöse-App** `/redeem` auf jeder Shop-Domain (installierbar, Manifest `/redeem/manifest`): eigene Anmeldung auf dem Shop-Host mit 6-stelligem Code per Mail (10 Min., 5 Versuche, 5 Codes pro Stunde, gleiche Antwort für unbekannte Adressen; Sitzung über `generateLink` + `verifyOtp` direkt auf diesem Host) oder Passwort; Kamera-Scan (ZXing, QR und Barcodes) oder Code eintippen, Einlösen ganz/Teilbetrag (Quelle `pwa`), grosse Bestätigung, Liste der eigenen letzten Einlösungen; Prüfseite `/v/<token>` zeigt angemeldeten Teammitgliedern «Jetzt einlösen». Der Proxy frischt die Sitzung nur für `/redeem` und `/v/<token>` auf (Rest des Shops bleibt ohne Sitzung). **Gutschein-PDF-Vorlagen**: Design → «Gutschein-PDF» mit drei Vorlagen (Klassisch, Ticket, Minimal), A4/A6, Farbe (Shop-Farbe oder eigene), Bild/Einlöseorte/Bedingungen ein/aus, Hinweistext; Live-Vorschau mit Beispieldaten aus dem Shop (`/api/dashboard/voucher-preview`). Fehler aus Teil 2 behoben: PDFs mit Geschenknachricht brachen ab (Kursivschrift fehlte).

Offen/bewusst später: Teammitglieder einladen (Rolle Einlöser/Partner) kommt mit Phase 7 – bis dahin nutzen Inhaber und Admins die Einlöse-App; Einlöseort-Auswahl beim Einlösen; Vorlage pro Deal statt pro Shop; Offline-Modus der App.

## 14. Stand Phase 6 (22.11.2026)

Phase 6 vor Phase 5 gezogen: Für Wallet fehlen noch Apple-Zertifikat und Google-Issuer, für Domains war alles vorhanden.

Erledigt: Migration `custom_domains` (`tenant_domains.www`, `provider`, `active_at`; `resolve_shop` liefert zusätzlich `redirect_host`; `set_primary_domain` nur Service-Role). Dashboard → Domains: eigene Shop-Domain verbinden (bis 3 pro Shop, Abo-Funktion `custom_domain`), Warnung bei Hauptdomain (bestehende Website), optional `www` mit Weiterleitung; die Domain wird per Vercel-API zum Projekt hinzugefügt (eine Domain eines anderen Projekts wird nie übernommen); DNS-Einträge mit Kopier-Knöpfen nach Vercels Empfehlung (CNAME für Subdomains, A-Einträge für Hauptdomains, TXT falls Vercel einen Besitznachweis will); Anleitung für GoDaddy, Infomaniak, Hostpoint, Cloudflare und andere, Anbieter wird über die Nameserver erkannt; Status «DNS fehlt» → «Zertifikat wird erstellt» → «Aktiv» (Aktiv erst, wenn `https://<domain>/api/health` antwortet), Prüfung alle 20 s solange die Seite offen ist, sonst täglich per Cron `/api/cron/domains`. Hauptadresse: aktive Domain als Hauptadresse wählen → Mails, PDFs, QR-Codes verwenden sie, alle anderen Adressen des Shops leiten per 308 dorthin (Proxy); fällt die Domain aus, springt die Hauptadresse automatisch auf die Sellycat-Adresse zurück. Apple Pay: aktive Domains werden beim Stripe-Konto des Shops registriert. Staging-Passwortschutz funktioniert auch auf eigenen Domains.

Offen: Echte Domain noch nicht end-to-end getestet (braucht eine Test-Domain); die Anmeldung der Einlöse-App gilt pro Domain (nach dem Umschalten einmal neu anmelden).

## 15. Stand Phase 5 (23.11.2026)

Konten eingerichtet: Apple Pass Type ID `pass.com.sellycat.voucher` (Team my105 GmbH `32J9N54M74`, Zertifikat gültig bis **17.12.2027 – rechtzeitig erneuern**), Google Wallet Issuer `3388000000023229714` (Console my105 GmbH, Demo-Modus), Cloud-Projekt `sellycat-wallet` mit Dienstkonto `sellycat-wallet@…` (Rolle Entwickler in der Wallet-Console; öffentlicher Schlüssel hochgeladen, die Organisationsregel `iam.disableServiceAccountKeyUpload` ist nur für dieses Projekt aus). Private Schlüssel nur lokal in `sellycat-keys/` (git-ignoriert) und als Vercel-Variablen.

Erledigt: Migration `wallet` (`wallet_designs`, `wallet_passes` mit Token pro Gutschein, `wallet_devices`, `wallet_registrations`, `vouchers.reminder_sent_at`) und `mail_reminder`. **Apple**: signierter Coupon-Pass (passkit-generator, joi per override auf gepatchte Version), Logo passend zum Hintergrund, Deal-Bild als Streifen, Rückseite mit Bedingungen, Einlöseorten und Links, Standorte für Hinweise auf dem Sperrbildschirm, QR zum Prüflink (Apple kann nur QR/PDF417/Aztec/Code 128; andere Barcodes als Text), Update-Dienst `/api/passkit/v1/…` (Registrieren, Änderungen, neuester Pass, Log) und Push über APNs. **Google**: generischer Pass, eine Klasse pro Shop, Speichern-Link per signiertem JWT, Aktualisierung des Objekts über die REST-API. **Updates** nach Einlösen, Rückgängig, Ungültig, Rückerstattung und Ablauf (Cron `/api/cron/wallet`). **Ablauf-Erinnerung** per Mail 7 Tage vorher (einmal, an den Inhaber, im Mail-Protokoll). Knöpfe «Zu Apple/Google Wallet hinzufügen» auf Prüfseite, Erfolgsseite, «Meine Gutscheine» und in den Mails. **Design → Wallet-Pass**: Farben (automatisch oder eigene, Kontrastwarnung), Bild und Standort-Hinweise ein/aus, Vorschau Apple/Google, Testpass für beide.

Offen: Google «Publishing access» beantragen (erst dann für alle Kunden); offizielle Apple/Google-Badges statt eigener Knöpfe; Test auf echten Geräten.

## 16. Verbesserungen (24.11.2026)

- Header nach Klick auf einen Deal sofort sichtbar: Next 16 hält die vorherige Seite versteckt im DOM; die Header-Regeln zählen nur noch eine sichtbare Hero-Fläche.
- Eigener Datum/Zeit-Picker (Monatskalender, Stunden/Minuten, «Jetzt»/«Heute», «Löschen») im Deal-Editor und bei Öffnungszeiten.
- Upload-Kacheln (Logos, Favicon, Social-Bild) sauber gerastert: feste Kopfhöhe, Knopfzeile reserviert, SVG-Logos werden immer gezeichnet.
- Google-Fonts-Auswahl im App-Stil mit Suche; jede Schrift in ihrer eigenen Form (lädt erst beim Sichtbarwerden, über unseren Proxy) und grosse Vorschau der gewählten.
- **Deal-Teaser** (Migration `deal_teaser`): Deal schon sichtbar, ohne Preis, Rabatt, Bestand und Kaufen, mit Countdown zum Verkaufsstart; danach automatisch normal. Kein Angebot in schema.org, Share-Bild ohne Preis. Hinweis: Der Preis ist über die öffentliche Datenbank-Schnittstelle technisch weiterhin abrufbar (für Marketing reicht das; echte Geheimhaltung bräuchte eine eigene Ansicht).
- **Öffnungszeiten strukturiert** (Migration `location_hours`, `partner_locations.hours`): Wochentags-Raster mit Zeitspannen statt Freitext, Kopieren Mo→Mo–Fr/alle, im Shop einheitlich gruppiert («Mo–Fr 09:00–18:00»). **Google-Ortssuche** (Places API New, serverseitig, `GOOGLE_PLACES_API_KEY`): Betrieb suchen, Adresse, Koordinaten und Öffnungszeiten werden übernommen.
- **Ein Stripe-Konto für mehrere Shops** (Migration `stripe_shared_account`): Status-Updates gehen an alle Shops des Kontos; Trennen in einem Shop entzieht den Zugriff bei Stripe erst, wenn kein anderer Shop das Konto nutzt.
- **KI-Übernahme aus Link** (Deal-Editor): Seite über den SSRF-sicheren Abruf (`src/lib/net/safe-fetch.ts`) lesen, Text und bis 8 Bilder an Claude Opus 5.5 (strukturierte Ausgabe, Fallback bei Ablehnung), Titel/Untertitel/Beschreibung/Bedingungen/FAQ/Bilder als Entwurf ins Formular; Bilder im eigenen Speicher. Braucht `ANTHROPIC_API_KEY`.

## 17. Gutschein-Ansicht und Scannen (24.11.2026)

- Einheitliche Knopfzeile pro Gutschein (Erfolgsseite, Prüfseite, «Meine Gutscheine»): **PDF · Apple Wallet · Google Wallet**, gleich gross, einzeilig, mit Icons. Kunden sehen keinen Einlöse-Knopf mehr. Mail: Wallet-Knöpfe nebeneinander mit PNG-Icons (`public/mail/`).
- **Scannen**: Einlöse-App unter `/scan` (alt `/redeem` leitet weiter), Anmeldung nur per E-Mail-Code. Scannt ein angemeldeter Scanner den QR-Code mit der Handykamera, zeigt `/v/<token>` statt der Kundenansicht den Gutschein mit **Wisch-Regler «Zum Einlösen wischen»** (Teilbetrag vorher eingeben). Code von Hand: auf `/scan`. Kunden-Prüfseite verlinkt «Partner? Zum Einlösen anmelden» (`/scan?next=/v/<token>`, nach Anmeldung zurück).
- **Berechtigte Scanner** (Dashboard → Partner): Name und E-Mail, Einladung per Mail mit Link zu `/scan`; technisch Mitglieder mit Rolle `partner` und `partner_id` (Konto ohne Passwort wird bei Bedarf angelegt). Ein Scanner löst nur Gutscheine **seines Partners in diesem Shop** ein (in SQL über `can_redeem`, getestet in `tests/rls/scanners.test.ts`).

## 18. Dealliste und Anordnung im Shop (25.11.2026)

- **Dealliste im Dashboard**: Suche (Titel, Untertitel, Slug, Partner; ohne Gross-/Kleinschreibung und Akzente), Status-Chips mit Anzahl (Alle, Live, Geplant, Teaser, Entwurf, Ausverkauft, Beendet), Sortierung nach Erstellt, Geändert, Verkaufsstart, Endet bald, Verkauft, Aufrufe, Titel, Preis. Alles steht in der URL (`?q=&status=&sort=`), Logik rein und getestet in `src/lib/dashboard/deal-list.ts`.
- **Shop → Anordnung** (`dashboard/arrangement`): fünf Varianten, gespeichert als `tenants.shop_settings.deal_order` (über `shop_profile` gelesen): Manuell (Drag & Drop, auf dem Handy Pfeile; `deals.sort_order`), Neueste, Aktionsdatum (laufende nach Ende, dann geplante nach Start), Relevanz (Aufrufe), Top Seller (Verkäufe). Der Top-Deal bleibt immer zuerst. Sortierung rein und getestet in `src/lib/shop/deal-order.ts` (`sortDeals`).
- **Aufrufe** (Migration `deal_order`): `deals.view_count`, erhöht nur über `track_deal_view` (Security Definer, nur veröffentlichte Deals öffentlicher Shops), einmal pro Browser-Sitzung beim Öffnen der Dealseite (`d/[slug]/track-view.tsx`). Kunden können den Wert nicht setzen (`deals_guard`, getestet in `tests/rls/deal-views.test.ts`). Gezählt wird ab diesem Stand, alte Deals starten bei 0.

## 19. Archiv, KI-Übernahme, Editor, Druck-PDF (26.11.2026)

- **Deals archivieren** (Migration `deal_archive`, `deals.archived_at`): Inhaber/Admins archivieren im Deal-Editor; ein laufender Deal wird dabei beendet, der Top-Deal-Status entfernt. Archivierte Deals sind nie öffentlich (Check: nicht `published`), erscheinen in der Dealliste nur unter dem Chip «Archiv» und lassen sich wiederherstellen (bleiben Entwurf/beendet). Das Archivieren prüft der Trigger `deals_guard` (`can_manage`).
- **Endgültig löschen nur durch Sellycat-Staff** (mit Authenticator-Code), nur archivierte Deals, protokolliert im Staff-Audit (`deal.delete`). Kunden können Deals gar nicht mehr löschen: Die Policy `deals_write` (erlaubte bisher auch `delete`) ist durch `deals_insert`/`deals_update` ersetzt. Bestellungen und Gutscheine bleiben erhalten (`deal_id` wird null). Getestet in `tests/rls/deal-archive.test.ts`.
- **KI-Übernahme zuverlässiger**: Seitenabruf mit 20 s statt 8 s und bis zu drei Versuchen (langsame Seiten antworteten beim ersten Aufruf zu spät), Bilder 15 s; Claude mit Wiederholung und zweitem Versuch ohne Bilder; scheitert die KI ganz, werden Titel, Beschreibung und Bilder direkt von der Seite übernommen (Hinweis an den Nutzer). `maxDuration = 300` auf der Editor-Seite. Im Browser: Fehler der Server Action werden abgefangen (Verbindungsabbruch → ein automatischer zweiter Versuch; neue Sellycat-Version → «Seite neu laden»), Sekundenanzeige während der Übernahme.
- **Text-Editor im Dashboard**: eigene Stile `.editor-prose` (Aufzählungen, Nummerierung, Einzüge, Überschriften, Zitate) – vorher fehlten sie, weil `.shop-prose` nur im Shop geladen wird. Im Shop engere Abstände in Listen.
- **Druck-PDF**: QR-Codes und Barcodes werden als Vektoren aus der Modulmatrix (`bwip-js raw`, `symbolVector`) gezeichnet, mit Ruhezone und ohne Verzerrung (vorher Rasterbild, das beim Drucken verschwamm). Logos werden immer als Echtfarben-PNG eingebettet (Paletten-PNGs wurden falsch dargestellt).

## 20. Löschen ohne Verkäufe (27.11.2026)

- Deals, bei denen **noch nichts verkauft** wurde, können Inhaber und Admins des Shops löschen (Papierkorb im Deal-Editor, auch aus dem Archiv). Editoren nicht.
- «Verkauft» bestimmt die Datenbank (`deal_has_sales`): Verkaufszähler oder Reservation über 0, ein Gutschein, eine laufende Reservation oder eine offene, bezahlte oder erstattete Bestellung. Abgelaufene Checkouts zählen nicht.
- Danach nur noch archivieren; endgültig löschen dann nur Sellycat-Staff aus dem Archiv. Umgesetzt als Policy `deals_delete_unsold` (Migration `deal_delete_unsold`), getestet in `tests/rls/deal-archive.test.ts`.

## 21. Wallet: Barcode bleibt Barcode (27.11.2026)

- Pässe zeigen je nach Codeformat des Deals: **QR** → QR-Code zur Prüfseite; **Zahlen-/Buchstabencode** → kein Symbol, der Code gross als Text (Apple: Feld auf der Vorderseite; Google: Textmodul); **Barcode** → immer ein Barcode mit dem Code selbst, nie ein QR-Code.
- Google zeigt jeden Typ exakt. Apple kennt nur QR, PDF417, Aztec und Code 128: EAN, UPC, ITF und Code 39 werden dort als Code 128 mit denselben Zeichen gezeigt (Kassenscanner lesen denselben Code), Data Matrix als Aztec (`appleBarcode`/`googleBarcode` in `src/lib/wallet/content.ts`, getestet).
- Bereits gespeicherte Pässe bekommen die neue Darstellung bei der nächsten Aktualisierung (Statuswechsel).

## 22. Einlöse-App: Barcodes, Foto-Erkennung, klare Meldung (28.11.2026)

- Kamera liest Barcodes zuverlässiger: höhere Auflösung (bis 1920×1080), alle Gutschein-Symbole ausdrücklich (QR, EAN-13/8, UPC, Code 128/39, ITF, Data Matrix, PDF417, Aztec) und «Try harder».
- **«Code abfotografieren»** während die Kamera läuft: Standbild → Claude Haiku liest sichtbare Codes (Zahlen, Buchstaben, Codewörter) → jeder Kandidat wird wie ein eingetippter Code gesucht (`src/lib/vouchers/read-code-ai.ts`, `lookupPhoto`, 30 Fotos pro 10 Min. und Person).
- Gehört ein Gutschein zu einem anderen Partner desselben Shops, sagt die App das mit Namen statt «nicht gefunden» (`voucher_partner_hint`, nur für Personen mit Einlöse-Recht im Shop, getestet in `tests/rls/scanners.test.ts`). Ursache der Meldung von Jan: Scanner von Santa Lucia, Barcode-Gutschein von Aare Adventure Park.

## 23. Phase 7, Teil 1: Pläne, Preise, Abos (28.11.2026)

Vorbild SwypeCast (Preise, Währung nach Ort, Stripe Billing, Upgrade/Downgrade). Entscheid Jan: gleiche Basispreise wie SwypeCast, Gebühr 10 % / 5 % / 2.5 %, Business «Kontakt aufnehmen», Free mit Branding und 30 %; Preise in CHF, EUR, USD gleich hoch, Währung nach Zugriffsort (CH/LI → CHF, Europa → EUR, Rest → USD); alles im Staff-Dashboard änderbar.

| Plan | Monatlich | Jährlich | Gebühr | Live-Deals | Team | Eigene Domain / Absender | Branding | Test |
|---|---|---|---|---|---|---|---|---|
| Free | 0 | 0 | 30 % | 3 | 1 | – | ja | – |
| Starter | 49 | 468 (= 39/Mt.) | 10 % | 15 | 3 | – | nein | 7 Tage |
| Pro | 149 | 1428 (= 119/Mt.) | 5 % | 100 | 10 | ja | nein | 7 Tage |
| Business | auf Anfrage | auf Anfrage | 2.5 % | unbegrenzt | 50 | ja | nein | – |

- **Staff → Pläne & Preise** (`/admin/plans`, nur Superadmin speichert): Name, Sichtbarkeit, «Kontakt statt Preis», Testphase, Gebühr in %, Limits, Preise (monatlich/jährlich × CHF/EUR/USD), Texte für die Preisseite (DE/EN). Speichern gleicht Stripe an (`syncPlan`: Produkt pro Plan, Preis in CHF mit EUR/USD als `currency_options`, geänderter Betrag = neuer Preis, alter archiviert; Ids pro Modus test/live in `plans.stripe`). Audit `plan.update`. **Staff → Anfragen**: Business-Anfragen von der Preisseite (`contact_requests`, optional Mail an `SALES_EMAIL`).
- **Preisseite** `sellycat.com/pricing`: Pläne aus der DB, Währung aus `x-vercel-ip-country` (umschaltbar, `?currency=EUR`), Monat/Jahr mit berechnetem Rabatt, Business mit Kontaktformular (Honeypot, Rate-Limit).
- **Dashboard → Einstellungen → Abo** (`/dashboard/billing`, nur Inhaber/Admin ändern): aktueller Plan mit Status, Gebühr, Live-Deals-Nutzung, Testphase/Verlängerung/Ende; Planwahl: ohne Abo Stripe Checkout (Testphase nur beim ersten Abo), Upgrade sofort anteilig, Downgrade zum Periodenende (Subscription Schedule, «Behalten» hebt auf); Stripe-Kundenportal für Rechnungen, Zahlungsmittel, Kündigung zum Periodenende. Währung: von Stripe gesperrt → Rechnungsland → Standort.
- **Webhook** `/api/stripe/billing` (Plattform-Konto, eigenes Secret `STRIPE_BILLING_WEBHOOK_SECRET`, idempotent über `billing_events`): Abo → Shop (`applySubscription`); beendet oder unbezahlt → Free. Stripe Tax nur mit `STRIPE_TAX=1`.
- **Durchgesetzt**: Kunden ändern Plan/Abo-Felder nie selbst (`tenants_guard`); Live-Deals-Limit beim Veröffentlichen (Trigger `deals_plan_limit`, Meldung im Editor); eigene Domain/Absender über `plan_allows`; Free zeigt im Shop ein «Erstellt mit Sellycat»-Abzeichen, bezahlte Pläne kein Sellycat-Branding (`shop_profile.settings.branding`). Neue Shops starten auf Free. Getestet in `tests/rls/billing.test.ts`, `src/lib/billing/billing.test.ts`.
- **Eingerichtet (19.11.2026, Stripe-Test-Modus «Sellycat Sandbox»)**: Produkte und Preise für Starter und Pro (CHF mit EUR/USD, Lookup-Keys `sellycat_<plan>_<interval>`), Kundenportal-Konfiguration, Webhook `https://staging.sellycat.com/api/stripe/billing` (6 Events), Secret in Vercel (Preview/Development) und `.env.local`. Offen: Stripe Tax (`STRIPE_TAX=1`), `SALES_EMAIL`, Live-Modus mit Production.
- **Später in Phase 7**: Team/Rollen mit Sitz-Limit, Analytics, Support/Knowledge Base, Partner-Abrechnung, API/Webhooks, Performance, Sicherheits-Review, Launch.

## 24. Phase 7, Teil 2: Team & Rollen (20.11.2026)

- **Dashboard → Einstellungen → Team** (`/dashboard/team`): Mitglieder mit Rolle, letzter Anmeldung, Rolle ändern, entfernen, selbst austreten; offene Einladungen (erneut senden = neuer Link und 14 Tage, zurückziehen); Einladen mit Name, E-Mail, Rolle. Rollen: Inhaber (alles), Admin (alles ausser Inhaber verwalten), Editor (Deals, Partner, Design, Bestellungen ansehen), Einlöser (nur einlösen). Scanner bleiben beim Partner und belegen keinen Platz.
- **Regeln** rein und getestet (`src/lib/team/rules.ts`): nie die eigene Rolle ändern, Admins fassen Inhaber nicht an, der letzte Inhaber bleibt. **Plätze** = Mitglieder + offene Einladungen gegen `plan_limit(…, 'seats')` (`team_seats_used`).
- **Einladung**: eigene Mail (Shop-Absender, `teamInviteMail`) mit Link `sellycat.com/invite/<token>`; gespeichert wird nur der SHA-256 des Tokens (`tenant_invites.token_hash`), 14 Tage gültig. Neue Adressen bekommen beim Einladen ein Konto ohne Passwort und setzen es auf der Einladungsseite (nur solange das Konto nie benutzt wurde), bestehende melden sich an und nehmen an. Annehmen nur über `accept_invite` (SQL: richtige Adresse, offen, nicht abgelaufen; ein bestehender Inhaber wird nie herabgestuft). Getestet in `tests/rls/team.test.ts`, End-to-End lokal durchgespielt.
- **Menü nach Rolle** (`SECTION_MIN_ROLE` in `src/lib/dashboard/nav.ts`, Rollenleiter `src/lib/auth/roles.ts`): jede Rolle sieht nur, was sie öffnen darf.
- **Behoben**: «Date.now() while prerendering» im Dashboard (Supabase-Client liest beim Start die Uhr) – `connection()` in `createClient` (`src/lib/supabase/server.ts`).

## 25. Phase 7, Teil 3: Auswertungen (20.11.2026)

Erledigt: Shop- und Deal-Aufrufe als Tageszähler (`analytics_daily`, Shop-Zeitzone, einmal pro Browser-Sitzung, ohne Cookies und ohne persönliche Daten). Dashboard → Auswertungen: Zeitraum 7/30/90 Tage/12 Monate mit Vergleich zum Zeitraum davor; Kennzahlen Umsatz (nach Rückerstattungen, am Zahltag), Bestellungen, verkaufte Gutscheine, Ø Bestellung, Deal-Aufrufe, Conversion, Einlösungen, Sellycat-Gebühr; Verlauf als Säulendiagramm (pro Tag, Woche oder 30 Tage, auch als Tabelle); Trichter Shop-Aufruf → Deal-Aufruf → Kasse → bezahlt; Deals mit Aufrufen, Verkäufen, Umsatz. Staff → Auswertungen: Umsatz und Gebühren je Währung, Bestellungen, neue Shops, Shops nach Plan, Top-Shops nach Gebühren. Cross-Tenant-Tests in `tests/rls/analytics.test.ts`.

Hinweis: Tagesaufrufe zählen ab 20.11.2026; Conversion wird erst angezeigt, wenn der ganze Zeitraum Aufrufe hat.

## 26. Phase 7, Teil 4: Support und Hilfe-Center (20.11.2026)

Erledigt (Vorbild SwypeCast): **Support** im Dashboard (Anfrage mit Kategorie und Anhang bis 10 MB, Verlauf, Antworten; Inhaber und Admins sehen alle Anfragen ihres Shops, andere nur ihre eigenen; 5 Anfragen pro Stunde). Staff → Support: Eingang mit Statusfilter, Antworten (per Mail in der Sprache des Kunden, mit Link zurück ins Dashboard), «Antworten und erledigen», Status, interne Notiz, Benachrichtigung an ausgewählte Staff-Mitglieder und/oder eine Adresse (Rückfall `SUPPORT_EMAIL`). **Hilfe-Center** öffentlich unter sellycat.com/help: 8 Kategorien, Artikel DE/EN mit Inhaltsverzeichnis, vorherigem/nächstem Artikel, Volltextsuche, «War das hilfreich?» mit Kommentar; fehlt eine Sprache, erscheint die andere mit Hinweis. Staff → Hilfe-Artikel: anlegen, Entwurf/Veröffentlichen je Sprache, Vorschau, Bilder hochladen, frühere Fassungen zurückholen, Reihenfolge, archivieren, löschen (Superadmin), Feedback ansehen. 15 Startartikel auf Deutsch und Englisch. Cross-Tenant-Tests in `tests/rls/support.test.ts`.

Bewusst nicht übernommen: der automatische Funktions-Scan und die Screenshot-Pipeline aus SwypeCast (später, wenn das Produkt stabil ist).

## 27. Phase 7, Teil 5: Partner-Abrechnung (01.12.2026)

Entscheid Jan: Abrechnung pro Deal ein- oder ausschaltbar; Grundlage pro Deal (nach Verkauf oder nach Einlösung); Anteil pro Deal (Provision in % oder Fixbetrag pro Gutschein); Sellycat erstellt die Abrechnung als PDF, der Betreiber überweist selbst.

Erledigt: Deal-Editor → «Partner-Abrechnung» mit Beispielrechnung; Partner → «Abrechnungsangaben» (Firma, Adresse, MWST-Nr., IBAN mit Prüfziffer); Verkauf → Abrechnungen (nur Inhaber/Admin): offene Beträge pro Partner bis zu einem Datum (Standard: Ende Vormonat), Entwürfe pro Partner, Abschliessen (fortlaufende Nummer, danach unveränderlich), PDF (A4, Beträge mit Rappen, Bankverbindung), CSV, Versand per Mail an den Partner (Absender des Shops, PDF im Anhang), als bezahlt markieren. Nichts wird doppelt abgerechnet; Rückerstattungen und rückgängig gemachte Einlösungen nach dem Abschluss erscheinen als Korrektur auf der nächsten Abrechnung. Hilfe-Artikel «Partner-Abrechnungen». Tests: `tests/rls/settlements.test.ts`, `src/lib/settlements/*.test.ts`.

Zusätzlich (Wunsch Jan): **Gebührenübersicht Sellycat ↔ Kunde** unter Abo: Monate der letzten 12 Monate mit Bestellungen, Umsatz und Netto-Gebühr (nach anteiliger Rückerstattung), je Monat PDF (Sellycat an Kunde, «Übersicht, keine Rechnung») und CSV.

Offen: Swiss-QR-Zahlteil auf der Abrechnung (nicht nötig, da der Betreiber zahlt).

