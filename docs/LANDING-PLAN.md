# Plan: Landing Page sellycat.com + Einladungscodes & Warteliste

Stand 20.11.2026 · Entwurf zur Freigabe · Vorlage: SwypeCast (`~/Documents/swypecast`)

---

## 0. Was ich vorgefunden habe

**SwypeCast-Landing** (`src/app/page.tsx`, `src/components/site/*`):
- Dunkle Seite (`#070c1c`), Akzent Lime `#c8ff00`, zweite Farbe Navy `#1e2a78`, Inter.
- Durchgehend `max-w-6xl px-5 sm:px-8`, Abschnittsabstand `--site-gap` 4rem bzw. 6.5rem ab 1024px, Buttons und Pills `rounded-full`.
- Alle Animationen sind DOM/CSS/SVG plus React-Timer. Kein Video ausser HLS-Vorschauen der eigenen Showcase-Stories, kein framer-motion.
- Jede Schleife wird per IntersectionObserver pausiert. `prefers-reduced-motion` wird überall berücksichtigt (statische Raster statt Laufband und Slider).
- Reihenfolge: Header → Hero → Benefits (Laufband + Handy-Demo, Story-Tour mit 4 Kapiteln, 3 Kennzahlen) → Statement (Parallax-Karten) → Steps (3 Tabs + Laptop-Demo) → Feature-Slider (10 Karten, auf Desktop gepinnt) → App-Showcase (Abdunkeln beim Scrollen, Handy-Demo) → Inspiration (Kacheln mit Hover-Video) → Preise (aus DB, Jahr/Monat, FAQ, Vergleich) → Schluss-CTA → Footer.
- Texte liegen in einem kleinen CMS (`site_content`, Reihenfolge und Ausblenden pro Abschnitt), Grundtexte in `src/lib/site/content.ts`.
- SEO: Metadata mit Canonical/hreflang, OG-Bild über `next/og`, JSON-LD (Organization, WebSite, SoftwareApplication), sitemap, robots.
- Anrede: **du**, Schweizer Schreibweise.
- Die Landing reagiert **nicht** auf den Signup-Modus. Alle CTAs zeigen auf `/signup`.

**SwypeCast-Einladungscodes/Warteliste:** Grundlage vorhanden: Modi `open | invite | paused`, Codes mit Max-Nutzung, Ablauf, Plan, Trial und Notiz, Warteliste mit Staff-Einladung und CSV. Es gibt aber Lücken, die ich nicht 1:1 übernehme:
- Die Zählung ist nicht atomar (keine Prüfung `uses < max_uses`).
- Gezählt wird vor der Mail-Bestätigung.
- Die Code-Prüfung hat kein Rate-Limit.
- Fehlermeldungen verraten, ob ein Code existiert. Der Signup verrät, ob eine E-Mail schon ein Konto hat.
- Kein Double-Opt-in, kein Status, kein Bulk, keine Nutzungshistorie, kein Datenschutzhinweis.

Ich übernehme deshalb **Aufbau und Abläufe** von SwypeCast und baue Prüfung und Zählung sicher neu.

**Sellycat heute:**
- Apex-Startseite ist ein Platzhalter (`src/app/p/[locale]/page.tsx`).
- `platform_settings.signup_mode` kennt nur `open | paused`. Schalter unter `/admin/settings`.
- Pläne stehen in der DB und sind im Staff editierbar: Free 0.– (30 % Gebühr), Starter 49.–/Mt. (468.–/J.), Pro 149.–/Mt. (1428.–/J., Badge «Beliebt»), Business auf Anfrage. 7 Tage Trial. `/pricing` existiert.
- Mailgun, `platformBrand`-Mails, In-Memory-Rate-Limiter und Crons sind vorhanden.
- Rabatte (Stripe-Coupons) gibt es noch nicht.

**Brandkit:** Coral `#FF4B23`, Ink `#111111`, White, Mist `#F5F5F5`, Gray `#666666`, Inter 400/600/700. Logos nur als PNG (on-dark, on-light, Wortmarke, Icon Katze). Keine zweite Akzentfarbe.

---

## 1. Design-Übersetzung (Tokens)

Alles über CSS-Variablen in einem eigenen Marketing-Theme (`.site` in `globals.css`). Keine hart codierten Werte in Komponenten.

| SwypeCast | Rolle | Sellycat |
|---|---|---|
| `#070c1c` | Seitengrund | `--site-ground` = Ink `#111111` |
| `#0d1430` / `#0b1128` | Karten, Sheets | `--site-surface` `#1A1A1A` / `--site-sheet` `#161616` (aus Ink abgeleitet) |
| `#1f2b4f` | Linien | `--site-line` `#2A2A2A` |
| Lime `#c8ff00` (`--brand`) | Akzent, Buttons, Zahlen | Coral `#FF4B23`, Text darauf immer Ink (Kontrast 5.6:1) |
| Navy `#1e2a78`, `#2a3b9a` (Glows, Tints) | zweite Stimmung | `--site-glow` = Coral, tief gemischt mit Ink (`color-mix`), dazu warmes Grau. Die Seite bleibt im Brand. |
| Lime-Glow-Schatten | Hervorhebung | dasselbe Rezept in Coral |
| `logo-yellow.webp` | Logo | `sellycat-on-dark` (PNG → WebP, Höhe 36px) |
| Showcase-Stories (HLS) | Bildinhalte | code-gebaute Deal-Karten fiktiver Marken (siehe unten), kein Video |

Kontraste prüfe ich für jede Kombination nach WCAG AA (Text weiss/60 auf Ink = 7.5:1; Coral als Text nur ab 18px fett oder auf Ink mit 5.6:1).

---

## 2. Block-für-Block-Mapping

| # | SwypeCast-Block (Technik) | Sellycat-Inhalt | Grafik/Animation (gleiche Technik) |
|---|---|---|---|
| H | **Header**: Login (Outline), Preise, Hilfe-Center, Sprache; mobil Hamburger-Sheet | identisch: Login, Preise (`/#preise`), Hilfe-Center (`/help`), DE/EN | Sheet-Animation 1:1. Der Start-Button im Sheet folgt dem Signup-Modus. |
| 1 | **Hero**: Claim, Satz, 1 CTA, Ambient-Blobs | Claim (3 Varianten, siehe §4), Unterzeile, CTA je Modus | 3 weichgezeichnete Blobs (Coral sehr leise, warmes Grau), gleiche Keyframes |
| 2a | **Bands**: 2 Laufband-Reihen Story-Karten, Handy in der Mitte mit Story-Demo | 2 Reihen **Deal-Karten** fiktiver Marken (Café Kater, Radio Pfote, Bergbahn Miau-Alp, Velo Samtpfote …), Preis, Rabatt, «Noch 7» | Laufband 1:1 (CSS-Marquee, Kanten-Fades). **Handy-Demo «Kauf → Gutschein»**: Deal-Karte, «Nur noch 7 verfügbar», Tap auf Apple Pay, Erfolg, PDF-Gutschein und Wallet-Pass fliegen ein (Szenen-Timer wie `PhoneStoryDemo`). Karten-«Fotos» als code-gebaute Illustrationen (SVG-Formen, Verläufe), keine Stockbilder. |
| 2b | **Story-Tour**: 4 Kapitel, sticky Seitenleiste, grosse UI-Mocks + je 2 Karten | 1 **Ein Shop, viele Marken** · 2 **Deine Domain** · 3 **Volle Kontrolle** · 4 **Gutscheinformate** | 1: derselbe Shop wechselt animiert zwischen 3 fiktiven Brandings (Logo, Schrift, Farben) · 2: `deals.deine-firma.ch` wird getippt, Status tickt «DNS prüfen» → «Verbunden» → «SSL aktiv» · 3: Stückzahl-Zähler läuft runter, Countdown, Badge «Ausverkauft» · 4: Morph Zahlencode → QR → Barcode (SVG-Pfade aus `symbolVector`, also echte Symbole) |
| 2c | **Stats**: 3 Kennzahlen mit Quelle, mobil Swipe-Deck | **PLATZHALTER P1**, Block standardmässig ausgeblendet | Komponente 1:1 (Karten und Swipe-Deck), erscheint erst mit gelieferten Zahlen und Quellen |
| 3 | **Statement**: grosser Satz, Parallax-Karten, Hintergrund färbt sich ein | Satz zur Positionierung (§4), «Sellycat» in Coral | schwebende Deal-Karten **und Gutscheine/Wallet-Pässe** in 3 Tiefen, gleiche Scroll-Variablen |
| 4 | **Steps**: 3 Tabs links, Laptop-Demo mit Mauszeiger rechts, Scroll-Glow | 1 **Shop einrichten** (Logo, Farben, Domain) · 2 **Deal anlegen** (Partner, Preis, Stückzahl, Zeitraum) · 3 **Verkaufen & einlösen** | Laptop mit nachgebautem Sellycat-Dashboard (fiktive Daten), animierter Cursor, Crossfade 1:1 |
| 5 | **Feature-Slider**: 10 Karten mit animierter SVG-Art, auf Desktop gepinnt | 10 Karten: Eigene Marke · Eigene Domain · **Geld direkt an dich** · PDF-Gutschein · Apple & Google Wallet · Einlösen per Kamera · Stückzahl & Zeitraum · Partner & Abrechnung · **Auswertungen** · Team, API & Webhooks | je 1 animiertes SVG-Element. **Geld direkt**: Zahlung fliesst sichtbar vom Käufer zum Kunden (Stripe), Sellycat dezent im Hintergrund. **Auswertungen**: Umsatz, verkaufte und eingelöste Gutscheine als lebendige Mini-Charts. Übrige analog zum SwypeCast-Stil. |
| 6 | **App-Showcase**: Seite dunkelt ab, Handy mit 4-Szenen-App-Loop, 4 Punkte, Store-Badges | **Einlösen mit der Handykamera, ohne App** (`/scan`) | Abdunkeln 1:1. Handy-Szene **Scannen & prüfen**: Kamera erfasst QR, Prüfseite «Gültig ✓», Tap «Einlösen», Status «Eingelöst», Wallet-Pass aktualisiert sich. 4 Punkte: ohne Download · Teileinlösung · Rechte pro Partner · lückenloses Protokoll. Statt Store-Badges eine Pill «Läuft in jedem Browser». |
| 7 | **Inspiration**: 9:16-Kacheln echter Showcase-Stories, Hover spielt Video (ab md) | **Für wen**: Medienhäuser & Radio · Verbände & Vereine · Stadt- & Tourismusmarketing · Händler & Gastronomie · Agenturen | 9:16-Kacheln mit je einem fiktiven Shop dieser Branche. Hover startet eine kurze CSS-Animation (Shop scrollt, Deal ploppt) statt Video. Ab md wie SwypeCast. |
| 8 | **Preise**: Jahr/Monat, 4 Karten aus DB, Trial-Pill, FAQ, Vergleichstabelle | Free / Starter / Pro / Business **aus der Plan-Tabelle** (Staff-editierbar), Währung nach Standort wie bei SwypeCast | 1:1. Der Jahres-Badge wird aus den Daten berechnet (heute −20 %) statt fix «2 Monate geschenkt». Plan-CTAs folgen dem Signup-Modus. FAQ-Inhalte siehe **P3**. Bestehendes `/pricing` nutzt danach dieselbe Komponente. |
| 9 | **Schluss-CTA** | Satz + CTA je Modus. Bei Modus «geschlossen» wird die Box zum **Wartelisten-Formular** (Anker `#warteliste`). | Box mit Coral-Radial 1:1 |
| F | **Footer** | Impressum, Datenschutz, AGB (bestehende `/legal`), Hilfe-Center, Login, © my105 GmbH, Sprache | 1:1, ohne App-Store-Links |

**Bewusst nicht übernommen:** das Landing-CMS (`site_content`). Texte kommen nach Projektregel aus `src/lib/i18n` (DE/EN). Zum Ausblenden einzelner Blöcke (z. B. Stats) genügt eine Konstante. Ein CMS kann später folgen, wenn gewünscht.

**Code-Ablage:** `src/components/site/*` (Marketing, getrennt von der App), Demo-Bausteine (`useInView`, `useReducedMotion`, `useScenes`, `Scaled`, `PhoneFrame`, `LaptopFrame`, `Finger`, `Cursor`) als bereinigte Kopie aus SwypeCast. Copy unter `t.site.*`.

**Qualität:**
- Mobile-first, mit denselben Umschaltungen wie bei SwypeCast (z. B. Laufband → Raster unter 640px).
- `prefers-reduced-motion` überall, Animationen ausserhalb des Sichtbereichs pausiert.
- Ziel Lighthouse ≥ 95: Animationen laden lazy nach, Hero ohne JS, Logo als WebP.
- Zum Schluss Suche nach `swypecast|SwypeCast|c8ff00|070c1c|1e2a78|2a3b9a|0d1430|logo-yellow|my105.*swype` in `src/`, `public/` und `docs/`.

---

## 3. Signup-Modus, Einladungscodes, Warteliste

### Datenmodell (Migration `…_invites_waitlist.sql`, RLS auf jeder Tabelle, nur Staff liest, schreiben nur der Server)

Es sind Plattform-Tabellen ohne `tenant_id`, wie `platform_settings`.

- `signup_mode`: Enum um `invite` erweitern. Bedeutung: `paused` = geschlossen (nur Warteliste), `invite` = nur mit Code, `open` = offen.
- **`invite_codes`**:
  - `code` (normalisiert gross, eindeutig), `max_uses` (null = unbegrenzt), `uses`, `expires_at`, `disabled_at`
  - `plan_id` / `trial_days` / `stripe_coupon_id` (alle optional), `tag`, `note`
  - `waitlist_id` (persönlicher Code), `created_by`
  - `check (max_uses is null or uses <= max_uses)`
- **`invite_code_uses`**: `code_id`, `user_id`, `email`, `status pending|confirmed|released`, `created_at`, `confirmed_at`, `tenant_id`. Damit sieht man, wer wann eingelöst hat.
- **`waitlist`**:
  - Angaben: `email` (lower, eindeutig), `name`, `company`, `website`, `use_case` (Enum: Medien/Radio, Verband/Verein, Stadt/Tourismus, Handel/Gastro, Agentur, Andere), `message`, `locale`
  - Status: `status new|invited|registered|rejected`, `confirmed_at` (Double-Opt-in), `confirm_token_hash`, `staff_note`
  - Einladung: `invited_at`, `invite_code_id`, `reminded_at`, `registered_at`
  - Nachweis: `consent_at` und `consent_version`
- **`rate_hits`**: DB-gestütztes Rate-Limit mit gehashtem Schlüssel (IP/E-Mail), über alle Serverless-Instanzen zuverlässig. Wird regelmässig aufgeräumt.

### SQL-Funktionen (Security Definer, nur Service-Role)

- **`claim_invite_code(code, email, user_id)`**: Zeilensperre, prüft aktiv/Ablauf/Nutzung und erhöht `uses` nur mit `where uses < max_uses`. Legt eine `pending`-Nutzung an.
  - Atomar: kein Überbuchen bei gleichzeitigen Anmeldungen.
  - Bei jedem Fehler kommt dieselbe Antwort zurück.
- **`confirm_invite_use(user_id, tenant_id)`**: aus `provisionFromSignup` nach Mail-Bestätigung. Setzt die Nutzung auf `confirmed` und den Wartelisten-Eintrag auf `registered`.
- **`release_stale_invite_uses()`**: per Cron. Eine `pending`-Nutzung ohne Bestätigung nach 48 h wird freigegeben, der Slot ist wieder frei. So zählt nur, wer wirklich registriert ist, und trotzdem ist nichts überbuchbar.
- **`rate_hit(key, limit, window)`**: atomarer Zähler.

### Ablauf

- **Landing/Header/Preise/Schluss-CTA** lesen den Modus (gecacht mit Tag, Staff-Schalter aktualisiert sofort):

  | Modus | CTA |
  |---|---|
  | geschlossen | «Auf die Warteliste» → `#warteliste` |
  | Code | «Code einlösen» → `/signup` |
  | offen | «Jetzt starten» → `/signup` |

- **`/signup`**:
  - geschlossen: Wartelisten-Formular.
  - Code: Schritt 1 ist der Code mit Link zur Warteliste. `?code=` füllt vor und springt nach serverseitiger Prüfung direkt zu Schritt 2.
  - offen: das Formular direkt.
  - Im Code-Modus akzeptiert auch der offene Modus einen Code, damit Plan, Trial und Rabatt greifen.
- **Signup-Action**: Modus serverseitig prüfen, dann `claim_invite_code`. Code-ID, Plan, Trial und Coupon kommen in die User-Metadaten, `provisionFromSignup` übernimmt sie.
  - Plan und Trial gelten für den Shop.
  - Trial-Tage und Coupon greifen beim ersten Stripe-Abo-Checkout.
- **Brute-Force-Schutz**: Code-Prüfung max. 10/h pro IP und 20 Fehlversuche/h global pro /24-Netz (DB-Rate-Limit). Codes haben 10 Zeichen aus 31 eindeutigen Zeichen (`crypto`), also rund 2^50 Möglichkeiten. Es gibt nur eine Meldung: «Dieser Code ist ungültig oder nicht mehr verfügbar.»
- **Keine E-Mail-Rückschlüsse**:
  - Signup antwortet immer «Prüfe dein Postfach», wie heute.
  - Die Warteliste antwortet immer gleich. Bereits bestätigte Einträge bekommen keine zweite Opt-in-Mail, die Antwort ist trotzdem identisch.
- **Warteliste**:
  - Formular mit E-Mail*, Name, Firma, Website, Branche/Use Case, Freitext und Datenschutzhinweis mit Link (revDSG/DSGVO, Pflicht-Häkchen).
  - Spamschutz: Honeypot, Mindest-Ausfüllzeit, Rate-Limit, Cloudflare Turnstile wenn Schlüssel gesetzt (siehe Frage D).
  - Double-Opt-in-Mail (Mailgun, `platformBrand`-Design, DE/EN), Bestätigungsseite `/waitlist/confirm?token=…`.
  - Erst bestätigte Einträge erscheinen in der Liste als «neu». Unbestätigte nach 14 Tagen löschen (Datensparsamkeit).

### Staff-Admin (`/admin/access`, eigener Menüpunkt, Bearbeiten nur Superadmin wie beim heutigen Schalter)

- **Signup-Modus**: 3-Wege-Schalter mit Erklärung, Audit-Eintrag.
- **Einladungscodes**:
  - Erstellen: einzeln (eigener oder generierter Code) oder im Bulk (Anzahl, Präfix). Einstellungen: Max-Nutzung bzw. einmalig, Ablauf, Plan, Trial-Tage, Stripe-Coupon, Tag, Notiz.
  - Liste mit Suche und Filter (Status, Tag), Aktivieren/Deaktivieren, Detail mit Nutzungen (wer, wann, Shop).
  - Link kopieren (`sellycat.com/signup?code=…`), CSV-Export der Codes und der Nutzungen.
- **Warteliste**:
  - Liste mit Suche, Filter (Status, Branche, bestätigt), Detail mit Notizen und Status ändern (inkl. ablehnen), CSV-Export.
  - Einladen einzeln oder im Bulk: erzeugt einen persönlichen Einmal-Code (Plan, Trial, Ablauf wählbar, Standard 30 Tage) und sendet die Einladungsmail. Status → eingeladen.
  - Erneut einladen deaktiviert den alten Code. Schlägt der Mailversand fehl, wird der Code zurückgerollt.
  - Registrierung setzt den Status automatisch auf «registriert».
  - **Erinnerung**: täglicher Cron (bestehender `/api/cron/mail`) schickt nach X Tagen (in den Einstellungen, Standard 7, 0 = aus) einmal eine Erinnerung, solange der Code nicht eingelöst und nicht abgelaufen ist.
- **Mails** (alle in `templates.ts`, DE/EN, `platformBrand`): `waitlistConfirmMail`, `waitlistWelcomeMail` (nach Bestätigung), `waitlistInviteMail`, `waitlistReminderMail`.

### Tests

- Unit: Code-Format/Normalisierung, Modus → CTA, Formular-Validierung, Spamschutz-Regeln.
- `tests/rls/`: anon/authenticated sehen keine dieser Tabellen; Staff liest; niemand schreibt ausser der Service-Role.
- SQL-Test: gleichzeitige Claims überbuchen nicht, Freigabe nach 48 h.
- Playwright: alle 3 Modi, `?code=`-Vorfüllung, ungültiger Code (gleiche Meldung), Warteliste mit Double-Opt-in, Staff-Einladung → Registrierung → Status.

---

## 4. Texte (Entwurf, du-Form wie SwypeCast, siehe Frage B)

**Hero: 3 Varianten**
1. **«Deals verkaufen. Im eigenen Shop.»**
2. **«Aus Deals wird dein Geschäft.»**
3. **«Dein Deal-Shop. Deine Marke. Dein Geld.»**

Unterzeile (für alle drei): «Starte deinen Deal-Shop im eigenen Look und auf deiner Domain. Das Geld landet direkt auf deinem Konto, Käufer erhalten den Gutschein sofort als PDF und im Wallet.»

**Statement:** «Sellycat macht aus Deals ein eigenes Geschäft: dein Shop, deine Marke, deine Kasse. Und Gutscheine, die man gern vorzeigt.»

**Kernbotschaften → Blöcke:**
- Marke/Domain → Tour 1+2, Feature
- Geld direkt (Stripe) → Feature + Steps 3
- Gutschein sofort → Hero-Handy + Feature
- Kamera ohne App → Showcase
- Kontrolle → Tour 3
- Kein Entwickler → Steps-Überschrift «In drei Schritten live. Ohne eine Zeile Code.»

**Katze:** dezent, z. B. Kategorien-Eyebrow «Samtpfotig einlösen» beim Scan-Block, die fiktiven Marken (Café Kater, Radio Pfote) und die 404-Seite. Keine Wortspiele in Headlines.

Alle Texte DE und EN, Schweizer Schreibweise (ss), keine erfundenen Zahlen und keine Zeitversprechen.

**SEO:**
- Title «Sellycat – Dein eigener Deal-Shop mit Gutscheinen im Wallet», Description ≈150 Zeichen.
- Canonical/hreflang (`/de`, `/en`, x-default).
- OG-Bild als Route-Handler `/og/site` (Ink-Grund, Coral-Glow, Logo, Claim je Sprache, wegen der Cache-Components-Falle nicht als `opengraph-image` mit Parameter).
- JSON-LD: Organization (my105 GmbH), WebSite, SoftwareApplication mit Offers aus den Plänen.
- sitemap und robots ergänzen.

---

## 5. Reihenfolge der Umsetzung

1. Migration, SQL-Funktionen, RLS-Tests, `db:push` Staging, Typen.
2. Signup/Provisionierung mit Codes, Warteliste und Mails, Unit-Tests.
3. Staff-Admin (Modus, Codes, Warteliste, CSV, Erinnerungs-Cron).
4. Landing: Tokens + Grundgerüst (Header, Hero, Footer, Preise, CTA nach Modus), danach die Animationsblöcke einzeln.
5. SEO/OG, Reduced-Motion-, Kontrast- und Lighthouse-Prüfung (mobil und Desktop), Suche nach SwypeCast-Resten.
6. lint, typecheck, test, build, Commit, Staging-Deploy, Testcheckliste und Platzhalterliste.

---

## 6. Platzhalter, die du liefern bzw. bestätigen musst

- **P1 Kennzahlen**: 3 Zahlen mit Quelle für den Stats-Block, sonst bleibt er ausgeblendet.
- **P2 Preise**: Stimmen Free / Starter 49.– / Pro 149.– / Business auf Anfrage, Gebühren 30/10/5/2.5 % und 7 Tage Trial so für den Launch? Sie sind im Staff änderbar, die Landing liest sie live.
- **P3 FAQ**: Ich schreibe die Antworten aus dem tatsächlichen Funktionsumfang. Offen sind die Stripe-Gebühren und Auszahlungsrhythmus (Text verweist auf Stripe) und die Kündigungsfristen.
- **P4 Testimonials/Kundenlogos**: SwypeCast hat keine. Ich baue keine ein.
- **P5 Turnstile-Schlüssel** (falls gewünscht).
