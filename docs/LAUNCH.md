# Launch-Check (Stand 20.11.2026)

Ergebnis: **Die Software ist bereit, die Production-Umgebung gibt es noch nicht.** Staging läuft vollständig. Für Production fehlen Datenbank, Variablen, Domain und die Live-Konten. Die Schritte unten der Reihe nach; ✅ = erledigt, ⬜ = offen, 👤 = nur Jan (Konten, Zahlungen, Verträge).

## 1. Qualität (erledigt)

- ✅ Lint, Typecheck, 312 Tests (Unit + Cross-Tenant gegen Staging), Build.
- ✅ Performance (Lighthouse mobil, lokal mit Produktions-Build): Startseite 100, Preise 100, Shop 90, Deal 92. Bilder über den Next-Optimizer (WebP in Bildschirmgrösse statt Original bis 1,8 MB), Inter als WOFF2-Teilmenge (19 KB statt 170 KB pro Schnitt), Shop-Schriften inline statt als blockierende Stylesheets, kein Springen der Fusszeile (CLS 0).
- ✅ Sicherheits-Review (siehe `PLAN.md` §29): alle hohen und mittleren Befunde behoben.
- ✅ SEO: `robots.txt` sperrt private Bereiche; Startseite/Preise/Hilfe nur in Production indexierbar; Dashboard und Admin immer `noindex`; Shops mit eindeutigem Canonical.

## 2. Datenbank Production

- ⬜👤 Supabase-Projekt `sellycat-production` anlegen (Region eu-central-1 Frankfurt, Pro-Plan für tägliche Backups/PITR).
- ⬜ GitHub: Variable `SUPABASE_REF_PRODUCTION`, Secret `SUPABASE_DB_PASSWORD_PRODUCTION` (der Workflow `migrations.yml` spielt bei Push auf `release` alle Migrationen ein).
- ⬜ Auth-Einstellungen wie Staging: Site URL `https://sellycat.com`, Redirect-URLs nur `https://sellycat.com/**` und `https://*.sellycat.com/**` (keine fremden Wildcards), SMTP über Mailgun, Mail-Vorlagen, Rate-Limits, «Confirm email» an.
- ⬜ Storage-Buckets kommen aus den Migrationen; prüfen, dass `shop-media` öffentlich und `support` privat ist.
- ⬜ Erster Staff-Admin (`npm run seed:staging` nur für Staging; Production: Admin von Hand anlegen und in `platform_staff` eintragen, TOTP einrichten).

## 3. Vercel Production (Branch `release`)

Auf Vercel sind heute **nur Preview-Variablen** gesetzt. Für Production (Ziel «Production») neu setzen, mit Live-Werten:

| Variable | Hinweis |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://sellycat.com` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` | aus dem Production-Projekt |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_CONNECT_CLIENT_ID` | 👤 Live-Modus |
| `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_BILLING_WEBHOOK_SECRET` | 👤 aus den Live-Webhooks (Abschnitt 4) |
| `STRIPE_TAX` | 👤 `1`, falls MWST automatisch |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_API_BASE` | EU-Region |
| `CRON_SECRET` | neu erzeugen (nicht der Staging-Wert) |
| `APPLE_PASS_*`, `APPLE_TEAM_ID`, `APPLE_WWDR_CERT` | wie Staging (gleiches Zertifikat) |
| `GOOGLE_WALLET_*` | wie Staging; 👤 Freigabe bei Google beantragen (sonst nur Testkonten) |
| `GOOGLE_PLACES_API_KEY`, `ANTHROPIC_API_KEY` | eigene Schlüssel mit Budget-Limit empfohlen |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | für Shop-Domains |
| `SUPPORT_EMAIL`, `SALES_EMAIL` | ✅ `support@sellycat.com`, `hello@sellycat.com` (Preview und Production gesetzt, 20.11.2026); Postfächer müssen existieren |
| `STAGING_PASSWORD`, `PLATFORM_MFA_OPTIONAL` | **nicht** setzen |

- ⬜ Crons (`vercel.json`): reservations, mail, domains, wallet, webhooks; laufen in Production automatisch mit `CRON_SECRET`.
- ⬜ Region `fra1` (gesetzt).

## 4. Stripe Live

- ⬜👤 Konto aktivieren (Firmendaten, Bank), Connect «Standard» mit OAuth, Redirect-URI `https://sellycat.com/api/stripe/connect/callback`.
- ⬜👤 Webhook Connect → `https://sellycat.com/api/stripe/webhook` (Ereignisse wie Staging, «Connected accounts»).
- ⬜👤 Webhook Billing → `https://sellycat.com/api/stripe/billing`.
- ⬜ Pläne/Preise: in Staff → Pläne «mit Stripe abgleichen» (legt Live-Produkte an).
- ⬜👤 Stripe Tax einschalten (optional).

## 5. Domain und Mail

- ⬜👤 DNS bei GoDaddy: `sellycat.com` und `www` auf Vercel; für Shops entweder Nameserver zu Vercel (dann Wildcard `*.sellycat.com` mit Zertifikat) oder wie bei Staging jede Shop-Subdomain einzeln (geschieht automatisch über die Vercel-API).
- ⬜ Mailgun: `mail.sellycat.com` verifiziert (SPF, DKIM, MX, Tracking aus), DMARC-Eintrag für `sellycat.com`.
- ⬜ Apple Wallet Web-Service-URL zeigt auf `https://sellycat.com/api/passkit` (aus `NEXT_PUBLIC_SITE_URL`).

## 6. Rechtliches und Inhalte

- ✅ Sellycat-eigene AGB, Datenschutzerklärung, Impressum und Auftragsverarbeitung (DE/EN) unter `/legal/…`, Zustimmung bei der Registrierung (20.11.2026).
- ⬜👤 Rechtstexte von einer Fachperson prüfen lassen; UID/Handelsregister-Nummer der my105 GmbH im Impressum ergänzen; Verträge (DPA) mit Vercel, Supabase, Mailgun, Anthropic, Mapbox abschliessen bzw. akzeptieren.
- ⬜ Hilfe-Center-Artikel durchsehen (kommen aus den Migrationen).

## 7. Go-live

1. ⬜ Alles oben erledigt, Staging-Smoke-Test: Shop anlegen → Deal → Kauf (Testkarte) → Gutschein-Mail → Wallet → Einlösen → Rückerstattung → Webhook.
2. ⬜👤 `git push origin <sha>:release` (Migrationen laufen über GitHub Action, Build über Vercel).
3. ⬜ Production-Smoke-Test mit echtem Kauf über einen kleinen Betrag und Rückerstattung.
4. ⬜ Lighthouse auf Production wiederholen (echtes CDN, Ziel ≥ 95).

## Bekannte Restpunkte (bewusst akzeptiert)

- SVG-Uploads im öffentlichen Bucket `shop-media` (für Logos): werden nur von der Supabase-Domain ausgeliefert, nicht von sellycat.com; im Shop nur als `<img>` eingebunden (kein Skript).
- Rate-Limits pro Server-Instanz (Speicher); die harten Grenzen (Einlöse-Codes, Support-Anfragen, Checkout-Reservierung) liegen in der Datenbank.
- Teilrückerstattung lässt Gutscheine gültig (fachlicher Entscheid offen: welche Gutscheine bei Teilrückerstattung sperren?).
