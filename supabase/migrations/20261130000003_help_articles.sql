-- Help center: first articles (DE/EN). Staff edits them in /admin/help; this only inserts missing ones.

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('shop-starten', 'getting-started', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Dein Shop in zehn Minuten$md$, $md$Mit Sellycat verkaufst du Gutscheine und Deals in deinem eigenen Shop. So kommst du vom Konto zum ersten Verkauf.

## 1. Konto und Shop anlegen

1. Registriere dich auf sellycat.com mit Firmenname, Shop-Adresse und E-Mail.
2. Bestätige den Link in der Mail. Erst dann wird dein Shop angelegt.
3. Dein Shop ist sofort unter **deine-adresse.sellycat.com** erreichbar.

## 2. Rechtstexte hinterlegen

Ohne **Impressum**, **AGB** und **Datenschutz** lässt sich kein Deal veröffentlichen. Du findest sie unter **Einstellungen**. Mehr dazu im Artikel [Impressum, AGB und Datenschutz](/help/getting-started/rechtstexte).

## 3. Zahlungen einrichten

Unter **Zahlungen** verbindest du dein Stripe-Konto. Käufer zahlen direkt an dich. Siehe [Stripe verbinden](/help/payments/stripe-verbinden).

## 4. Partner und ersten Deal anlegen

1. Lege unter **Partner** an, wo der Gutschein eingelöst wird.
2. Erstelle unter **Deals** deinen ersten Deal und veröffentliche ihn.

> Tipp: Mit **Mit KI aus Link übernehmen** füllt Sellycat Titel, Beschreibung und Bilder aus einer bestehenden Angebotsseite.

## 5. Shop gestalten

Unter **Design** passt du Farben, Schriften und Logo an. Die Vorschau zeigt jede Änderung sofort.$md$, now() from a
union all
select id, 'en', $md$Your shop in ten minutes$md$, $md$With Sellycat you sell vouchers and deals in your own shop. This is how you get from an account to your first sale.

## 1. Create your account and shop

1. Sign up on sellycat.com with your company name, shop address and email.
2. Confirm the link in the email. Only then is your shop created.
3. Your shop is online right away at **your-address.sellycat.com**.

## 2. Add the legal texts

No deal can be published without an **imprint**, **terms** and a **privacy policy**. You find them under **Settings**. More in [Imprint, terms and privacy](/help/getting-started/rechtstexte).

## 3. Set up payments

Under **Payments** you connect your Stripe account. Buyers pay you directly. See [Connect Stripe](/help/payments/stripe-verbinden).

## 4. Add a partner and your first deal

1. Under **Partners**, add where the voucher is redeemed.
2. Under **Deals**, create your first deal and publish it.

> Tip: **Import from link with AI** fills in title, description and images from an existing offer page.

## 5. Design your shop

Under **Design** you adjust colours, fonts and logo. The preview shows every change at once.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('rechtstexte', 'getting-started', 20)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Impressum, AGB und Datenschutz$md$, $md$Jeder Shop braucht drei Rechtstexte. Sie erscheinen im Fuss deines Shops und sind Pflicht, bevor du einen Deal veröffentlichen kannst.

## Wo du sie bearbeitest

1. Öffne **Einstellungen**.
2. Fülle **Impressum**, **AGB** und **Datenschutz** aus.
3. Speichere. Die Texte sind sofort im Shop sichtbar.

## Was hineingehört

- **Impressum**: Firmenname, Adresse, Kontakt, Handelsregister und MWST-Nummer, falls vorhanden.
- **AGB**: Bedingungen für den Kauf und die Einlösung der Gutscheine, etwa Gültigkeit, Rückgabe und Barauszahlung.
- **Datenschutz**: welche Daten du über Käufer bearbeitest und wofür. Zahlungen laufen über Stripe, Mails über Sellycat.

> Hinweis: Sellycat stellt keine Rechtsberatung bereit. Lass deine Texte im Zweifel von einer Fachperson prüfen.$md$, now() from a
union all
select id, 'en', $md$Imprint, terms and privacy$md$, $md$Every shop needs three legal texts. They appear in your shop's footer and are required before you can publish a deal.

## Where to edit them

1. Open **Settings**.
2. Fill in **Imprint**, **Terms** and **Privacy**.
3. Save. The texts show in your shop right away.

## What goes in

- **Imprint**: company name, address, contact, commercial register and VAT number if you have one.
- **Terms**: conditions for buying and redeeming vouchers, such as validity, returns and cash payout.
- **Privacy**: which buyer data you process and why. Payments run through Stripe, emails through Sellycat.

> Note: Sellycat does not provide legal advice. If in doubt, have your texts checked by a professional.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('deal-erstellen', 'deals', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Einen Deal erstellen$md$, $md$Ein Deal ist ein Angebot in deinem Shop, zum Beispiel ein Wertgutschein oder ein Menü zum Spezialpreis.

## Deal anlegen

1. Öffne **Deals** und wähle **Neuer Deal**.
2. Gib Titel, Preis und, falls es einen gibt, den regulären Preis ein. Der Shop zeigt die Ersparnis automatisch.
3. Wähle den **Partner**, bei dem der Gutschein eingelöst wird.
4. Schreibe Beschreibung, Bedingungen und häufige Fragen.
5. Lade Bilder hoch. Das erste Bild ist das Titelbild.

## Menge und Verkaufsfenster

- **Menge**: Wie viele Gutscheine es insgesamt gibt. Ist alles verkauft, zeigt der Shop «ausverkauft».
- **Verkaufszeitraum**: Vor dem Start ist der Deal «geplant», danach «beendet».
- **Gültigkeit**: Bis wann der Gutschein eingelöst werden kann.

## Veröffentlichen

Mit **Veröffentlichen** geht der Deal live. Dafür müssen deine Rechtstexte vollständig sein. Mit **Als Top-Deal hervorheben** steht er im Shop zuoberst.

> Tipp: **Mit KI aus Link übernehmen** liest eine bestehende Angebotsseite und füllt Texte und Bilder für dich vor. Prüfe das Ergebnis, bevor du speicherst.$md$, now() from a
union all
select id, 'en', $md$Create a deal$md$, $md$A deal is an offer in your shop, for example a value voucher or a menu at a special price.

## Create the deal

1. Open **Deals** and choose **New deal**.
2. Enter title, price and, if there is one, the regular price. The shop shows the saving automatically.
3. Choose the **partner** where the voucher is redeemed.
4. Write the description, conditions and frequently asked questions.
5. Upload images. The first image is the cover.

## Quantity and sales window

- **Quantity**: how many vouchers there are in total. When everything is sold, the shop shows “sold out”.
- **Sales period**: before the start the deal is “scheduled”, afterwards “ended”.
- **Validity**: until when the voucher can be redeemed.

## Publish

**Publish** puts the deal live. Your legal texts must be complete for this. **Highlight as top deal** puts it at the very top of your shop.

> Tip: **Import from link with AI** reads an existing offer page and pre-fills texts and images for you. Check the result before you save.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('partner-und-orte', 'deals', 20)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Partner und Einlöseorte$md$, $md$Partner sind die Betriebe, bei denen Käufer ihre Gutscheine einlösen, zum Beispiel ein Restaurant oder ein Freizeitpark.

## Partner anlegen

1. Öffne **Partner** und lege einen neuen Partner an.
2. Ergänze Name, Logo, Beschreibung und Kontakt.
3. Füge mit **Ort hinzufügen** jede Filiale hinzu, mit Adresse und Öffnungszeiten.

Die Orte erscheinen auf der Deal-Seite mit Karte und Routenlink.

## Scanner für einen Partner

Mitarbeitende eines Partners können Gutscheine selbst einlösen, ohne Zugang zu deinem Dashboard. Lade sie beim Partner unter **Berechtigte Scanner** ein. Sie melden sich mit ihrer E-Mail an und bekommen einen Code, ganz ohne Passwort. Mehr in [Gutscheine einlösen](/help/vouchers/gutscheine-einloesen).$md$, now() from a
union all
select id, 'en', $md$Partners and redemption locations$md$, $md$Partners are the businesses where buyers redeem their vouchers, for example a restaurant or a leisure park.

## Add a partner

1. Open **Partners** and add a new partner.
2. Add name, logo, description and contact.
3. Use **Add location** for every branch, with address and opening hours.

The locations appear on the deal page with a map and a route link.

## Scanners for a partner

A partner's staff can redeem vouchers themselves without access to your dashboard. Invite them at the partner under **Authorised scanners**. They sign in with their email and get a code, no password needed. More in [Redeem vouchers](/help/vouchers/gutscheine-einloesen).$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('archivieren-loeschen', 'deals', 30)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Deals archivieren und löschen$md$, $md$Alte Deals räumst du mit dem Archiv auf. So bleibt die Liste übersichtlich, ohne dass Bestellungen oder Gutscheine verloren gehen.

## Archivieren

1. Beende oder entferne den Deal aus dem Shop.
2. Wähle in der Deal-Liste **Archivieren**.

Archivierte Deals findest du über den Filter in der Deal-Liste. Mit **Wieder anzeigen** holst du einen Deal zurück.

## Löschen

- **Ohne Verkäufe**: Inhaber und Admins können den Deal endgültig löschen.
- **Mit Verkäufen**: Der Deal lässt sich nur archivieren. Bestellungen und Gutscheine der Käufer bleiben gültig. Muss er wirklich weg, hilft dir unser Support.$md$, now() from a
union all
select id, 'en', $md$Archive and delete deals$md$, $md$Use the archive to tidy up old deals. The list stays clear without losing orders or vouchers.

## Archive

1. End the deal or take it out of the shop.
2. Choose **Archive** in the deal list.

You find archived deals with the filter in the deal list. **Show again** brings a deal back.

## Delete

- **Without sales**: owners and admins can delete the deal for good.
- **With sales**: the deal can only be archived. Buyers' orders and vouchers stay valid. If it really has to go, our support can help.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('stripe-verbinden', 'payments', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Stripe verbinden$md$, $md$Käufer zahlen direkt auf dein eigenes Stripe-Konto. Sellycat behält pro Verkauf nur seine Gebühr ein.

## So verbindest du Stripe

1. Öffne **Zahlungen** und wähle **Stripe verbinden**.
2. Melde dich mit deinem bestehenden Stripe-Konto an oder eröffne ein neues.
3. Ergänze bei Stripe alle verlangten Angaben, zum Beispiel Bankkonto und Ausweis.
4. Zurück in Sellycat zeigt der Status **Bereit für Zahlungen**.

Solange Stripe noch Angaben braucht, bleibt der Kauf-Button in deinem Shop gesperrt.

## Zahlungsmittel

Karten, Apple Pay, Google Pay und TWINT schaltest du direkt in deinem Stripe-Konto ein.

## Auszahlungen

Stripe zahlt dein Guthaben automatisch auf dein Bankkonto aus. Den Rhythmus legst du im Stripe-Dashboard fest.$md$, now() from a
union all
select id, 'en', $md$Connect Stripe$md$, $md$Buyers pay directly into your own Stripe account. Sellycat only keeps its fee per sale.

## How to connect Stripe

1. Open **Payments** and choose **Connect Stripe**.
2. Sign in with your existing Stripe account or open a new one.
3. Complete everything Stripe asks for, such as bank account and ID.
4. Back in Sellycat the status shows **Ready for payments**.

As long as Stripe still needs details, the buy button in your shop stays locked.

## Payment methods

Cards, Apple Pay, Google Pay and TWINT are switched on directly in your Stripe account.

## Payouts

Stripe pays out your balance to your bank account automatically. You set the schedule in the Stripe dashboard.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('bestellungen-rueckerstattung', 'payments', 20)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Bestellungen und Rückerstattungen$md$, $md$Unter **Bestellungen** siehst du jeden Kauf mit Käufer, Betrag, Gebühr und den ausgestellten Gutscheinen.

## Mail nochmals senden

Hat ein Käufer seine Gutscheine nicht bekommen, öffne die Bestellung und sende die Mail nochmals. Bitte ihn auch, im Spam-Ordner nachzusehen.

## Zurückerstatten

1. Öffne die Bestellung.
2. Gib unter **Rückerstattung** den Betrag ein, ganz oder teilweise.
3. Wähle **Zurückerstatten** und bestätige.

Das Geld geht auf das Zahlungsmittel des Käufers zurück. Sellycat erstattet seine Gebühr anteilig. Bei einer vollen Rückerstattung kannst du die Menge wieder zum Verkauf freigeben.

> Hinweis: Rückerstattungen lassen sich nicht rückgängig machen. Nur Inhaber und Admins können erstatten.$md$, now() from a
union all
select id, 'en', $md$Orders and refunds$md$, $md$Under **Orders** you see every purchase with buyer, amount, fee and the issued vouchers.

## Send the email again

If a buyer did not receive their vouchers, open the order and send the email again. Also ask them to check their spam folder.

## Refund

1. Open the order.
2. Under **Refund**, enter the amount, in full or in part.
3. Choose **Refund** and confirm.

The money goes back to the buyer's payment method. Sellycat refunds its fee proportionally. With a full refund you can release the quantity for sale again.

> Note: refunds cannot be undone. Only owners and admins can refund.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('gutscheine-einloesen', 'vouchers', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Gutscheine einlösen$md$, $md$Jeder Gutschein hat einen Code und einen QR-Code oder Barcode. Eingelöst wird im Dashboard, in der Einlöse-App oder direkt auf der Gutschein-Seite.

## Im Dashboard

1. Öffne **Einlösungen**.
2. Gib den Code ein oder scanne ihn.
3. Löse den ganzen Betrag oder einen Teilbetrag ein.

## Mit der Einlöse-App

Die App läuft auf deiner Shop-Adresse unter **/scan**, zum Beispiel deine-adresse.sellycat.com/scan. Sie lässt sich auf dem Handy wie eine App installieren.

1. Melde dich mit deiner E-Mail an. Du bekommst einen Code per Mail.
2. Scanne den QR-Code oder Barcode mit der Kamera, tippe den Code ein oder fotografiere ihn ab.
3. Bestätige die Einlösung.

## Wer darf einlösen?

- Teammitglieder ab der Rolle **Einlöser**.
- **Scanner** eines Partners, aber nur Gutscheine dieses Partners. Gehört ein Gutschein zu einem anderen Partner, sagt die App das klar.

> Tipp: Eine Einlösung lässt sich im Dashboard unter **Einlösungen** rückgängig machen, falls etwas schiefging.$md$, now() from a
union all
select id, 'en', $md$Redeem vouchers$md$, $md$Every voucher has a code and a QR code or barcode. You redeem in the dashboard, in the redemption app or directly on the voucher page.

## In the dashboard

1. Open **Redemptions**.
2. Enter the code or scan it.
3. Redeem the full amount or part of it.

## With the redemption app

The app runs on your shop address under **/scan**, for example your-address.sellycat.com/scan. It can be installed on a phone like an app.

1. Sign in with your email. You receive a code by email.
2. Scan the QR code or barcode with the camera, type the code or take a photo of it.
3. Confirm the redemption.

## Who can redeem?

- Team members with the role **Redeemer** or higher.
- A partner's **scanners**, but only that partner's vouchers. If a voucher belongs to another partner, the app says so clearly.

> Tip: a redemption can be undone in the dashboard under **Redemptions** if something went wrong.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('code-pools', 'vouchers', 20)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Eigene Codes (Code-Pool)$md$, $md$Bekommst du die Gutschein-Codes von einem Partner, zum Beispiel Tickets mit eigenen Barcodes, lädst du sie als Code-Pool hoch. Jeder Käufer erhält einen davon.

## Codes hochladen

1. Öffne den Deal und wähle als Code-Quelle den **Code-Pool**.
2. Lade eine CSV- oder Textdatei hoch oder füge die Codes ein, einer pro Zeile.
3. Sellycat erkennt Kopfzeilen, doppelte und zu lange Codes.

## Bestand

Die Zahl der freien Codes ist der Bestand des Deals. Sind alle vergeben, ist der Deal automatisch ausverkauft. Sind nur noch wenige Codes frei, warnt dich Sellycat im Editor und in der Deal-Liste.

> Hinweis: Barcodes bleiben Barcodes. Besteht ein Code nur aus Zahlen oder Buchstaben, zeigen Gutschein, PDF und Wallet ihn gross als Text, ohne QR-Code.$md$, now() from a
union all
select id, 'en', $md$Your own codes (code pool)$md$, $md$If a partner gives you the voucher codes, for example tickets with their own barcodes, upload them as a code pool. Every buyer gets one of them.

## Upload codes

1. Open the deal and choose the **code pool** as the code source.
2. Upload a CSV or text file or paste the codes, one per line.
3. Sellycat detects header rows, duplicates and codes that are too long.

## Stock

The number of free codes is the deal's stock. When all are used, the deal is sold out automatically. When only a few codes are left, Sellycat warns you in the editor and in the deal list.

> Note: barcodes stay barcodes. If a code consists only of digits or letters, voucher, PDF and wallet show it large as text, without a QR code.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('shop-gestalten', 'design', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Shop gestalten und Deals anordnen$md$, $md$Dein Shop soll aussehen wie deine Marke. Unter **Design** passt du alles an und siehst es sofort in der Vorschau.

## Design

- **Farben**: Hauptfarbe, Hintergrund und Text. Sellycat prüft, ob der Kontrast gut lesbar ist.
- **Schriften**: aus Google Fonts oder eine eigene Schrift.
- **Logo, Favicon und Social-Bild**.
- **Layout**: zum Beispiel Top-Deal mit Raster darunter.

> Tipp: Mit **Branding von Website übernehmen** liest Sellycat Farben und Logo von deiner Website.

## Anordnung

Unter **Anordnung** legst du fest, in welcher Reihenfolge die Deals erscheinen:

- **Manuell**: du ziehst die Deals in die Reihenfolge.
- **Neueste zuerst**, **Aktionsdatum**, **Relevanz** (meist geöffnet) oder **Top-Seller**.

Der Top-Deal steht immer zuoberst.$md$, now() from a
union all
select id, 'en', $md$Design your shop and arrange deals$md$, $md$Your shop should look like your brand. Under **Design** you adjust everything and see it in the preview right away.

## Design

- **Colours**: main colour, background and text. Sellycat checks that the contrast is easy to read.
- **Fonts**: from Google Fonts or your own font.
- **Logo, favicon and social image**.
- **Layout**: for example a top deal with a grid below.

> Tip: **Import branding from website** reads colours and logo from your website.

## Arrangement

Under **Arrangement** you set the order in which deals appear:

- **Manual**: you drag the deals into order.
- **Newest first**, **Campaign date**, **Relevance** (most opened) or **Top sellers**.

The top deal always stays at the top.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('gutschein-pdf-wallet', 'design', 20)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Gutschein-PDF und Wallet$md$, $md$Käufer bekommen ihre Gutscheine per Mail, als PDF zum Ausdrucken und auf Wunsch in Apple Wallet oder Google Wallet.

## PDF-Vorlage

1. Öffne **Design** und dort **Gutschein-PDF**.
2. Wähle eine Vorlage: **Klassisch**, **Ticket** oder **Minimal**, im Format A4 oder A6.
3. Wähle die Farbe und ob Bild, Einlöseorte und Bedingungen erscheinen.

Die Vorschau zeigt einen Beispiel-Gutschein mit Daten aus deinem Shop. QR-Codes und Logos werden als Vektoren gedruckt und bleiben auch auf Papier scharf.

## Wallet

Unter **Design** → **Wallet** gestaltest du die Karte für Apple Wallet und Google Wallet. Ändert sich ein Gutschein, etwa durch eine Einlösung, aktualisiert sich die Karte im Handy des Käufers automatisch.$md$, now() from a
union all
select id, 'en', $md$Voucher PDF and wallet$md$, $md$Buyers receive their vouchers by email, as a PDF to print and, if they like, in Apple Wallet or Google Wallet.

## PDF template

1. Open **Design** and then **Voucher PDF**.
2. Choose a template: **Classic**, **Ticket** or **Minimal**, in A4 or A6.
3. Choose the colour and whether image, redemption locations and conditions appear.

The preview shows a sample voucher with data from your shop. QR codes and logos are printed as vectors and stay sharp on paper.

## Wallet

Under **Design** → **Wallet** you design the card for Apple Wallet and Google Wallet. When a voucher changes, for example after a redemption, the card on the buyer's phone updates automatically.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('team-einladen', 'team-account', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Team einladen und Rollen$md$, $md$Arbeite mit Kolleginnen und Kollegen am Shop, jede Person mit ihrem eigenen Login.

## Jemanden einladen

1. Öffne **Team**.
2. Gib Name, E-Mail und Rolle ein und wähle **Einladen**.
3. Die Person bekommt eine Mail mit einem Link, der 14 Tage gilt. Neue Personen wählen dort ein Passwort; wer schon ein Konto hat, meldet sich an.

## Rollen

- **Inhaber**: alles, auch Abo, Zahlungen und andere Inhaber.
- **Admin**: alles ausser Inhaber verwalten.
- **Editor**: Deals, Partner, Design und Bestellungen.
- **Einlöser**: nur Gutscheine einlösen.

Jede Rolle sieht im Menü nur, was sie öffnen darf.

## Plätze

Wie viele Personen zum Team gehören können, hängt von deinem Plan ab. Offene Einladungen zählen mit. Scanner von Partnern brauchen keinen Platz.$md$, now() from a
union all
select id, 'en', $md$Invite your team and roles$md$, $md$Work on the shop with colleagues, each person with their own login.

## Invite someone

1. Open **Team**.
2. Enter name, email and role and choose **Invite**.
3. The person receives an email with a link valid for 14 days. New people choose a password there; those who already have an account sign in.

## Roles

- **Owner**: everything, including plan, payments and other owners.
- **Admin**: everything except managing owners.
- **Editor**: deals, partners, design and orders.
- **Redeemer**: only redeem vouchers.

Each role only sees in the menu what it may open.

## Seats

How many people can be on the team depends on your plan. Open invitations count too. Partners' scanners need no seat.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('plaene-gebuehren', 'billing', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Pläne und Verkaufsgebühren$md$, $md$Sellycat kostet ein monatliches oder jährliches Abo plus eine Gebühr pro Verkauf. Je höher der Plan, desto tiefer die Gebühr.

## Die Pläne

- **Free**: ohne Abo, mit Sellycat-Hinweis im Shop und der höchsten Verkaufsgebühr.
- **Starter**, **Pro**: mehr Live-Deals, mehr Teamplätze, tiefere Gebühren, eigene Domain und eigener Mail-Absender.
- **Business**: für grosse Anbieter, auf Anfrage.

Die aktuellen Preise siehst du auf [sellycat.com/pricing](/pricing). Die Währung richtet sich nach deinem Standort: CHF in der Schweiz, EUR in der EU, sonst USD.

## Plan wechseln

1. Öffne **Abo**.
2. Wähle den neuen Plan. Ein Upgrade gilt sofort und wird anteilig verrechnet. Ein Downgrade gilt ab der nächsten Abrechnungsperiode.

Rechnungen und Zahlungsmittel verwaltest du über **Rechnungen & Zahlungsmittel** im Abo.

## Verkaufsgebühr

Die Gebühr wird bei jedem Verkauf automatisch von Stripe abgezogen. Bei einer Rückerstattung erstattet Sellycat sie anteilig zurück.$md$, now() from a
union all
select id, 'en', $md$Plans and sales fees$md$, $md$Sellycat costs a monthly or yearly subscription plus a fee per sale. The higher the plan, the lower the fee.

## The plans

- **Free**: no subscription, with a Sellycat badge in the shop and the highest sales fee.
- **Starter**, **Pro**: more live deals, more team seats, lower fees, your own domain and mail sender.
- **Business**: for large providers, on request.

Current prices are on [sellycat.com/pricing](/pricing). The currency depends on your location: CHF in Switzerland, EUR in the EU, otherwise USD.

## Change your plan

1. Open **Plan**.
2. Choose the new plan. An upgrade applies at once and is charged proportionally. A downgrade applies from the next billing period.

You manage invoices and payment methods through **Invoices & payment methods** in the plan section.

## Sales fee

The fee is deducted automatically by Stripe with every sale. With a refund, Sellycat refunds it proportionally.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('eigene-domain', 'technical', 10)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Eigene Domain verbinden$md$, $md$Statt deine-adresse.sellycat.com kann dein Shop unter deiner eigenen Adresse laufen, zum Beispiel **gutscheine.deinefirma.ch**.

## So geht es

1. Öffne **Domains** und gib deine Adresse ein.
2. Sellycat zeigt dir die DNS-Einträge, die du bei deinem Domain-Anbieter eintragen musst, oft mit einer Anleitung für deinen Anbieter.
3. Trage die Einträge ein. Sobald sie gefunden werden, wechselt der Status auf aktiv. Das dauert meist Minuten, selten bis zu einem Tag.
4. Lege die eigene Domain als **Hauptadresse** fest. Die Sellycat-Adresse leitet dann automatisch weiter.

Das SSL-Zertifikat für https richtet Sellycat automatisch ein.

## Eigener Mail-Absender

Je nach Plan verschickt Sellycat die Gutschein-Mails auch von deiner eigenen Domain. Auch dafür zeigt dir Sellycat die nötigen DNS-Einträge.

> Hinweis: Eigene Domains und Mail-Absender sind ab einem bezahlten Plan verfügbar.$md$, now() from a
union all
select id, 'en', $md$Connect your own domain$md$, $md$Instead of your-address.sellycat.com, your shop can run at your own address, for example **vouchers.yourcompany.com**.

## How it works

1. Open **Domains** and enter your address.
2. Sellycat shows the DNS records you need to add at your domain provider, often with instructions for your provider.
3. Add the records. As soon as they are found, the status changes to active. This usually takes minutes, rarely up to a day.
4. Set your own domain as the **main address**. The Sellycat address then redirects automatically.

Sellycat sets up the SSL certificate for https automatically.

## Your own mail sender

Depending on your plan, Sellycat also sends voucher emails from your own domain. Here too, Sellycat shows the DNS records you need.

> Note: own domains and mail senders are available from a paid plan.$md$, now() from a;

with a as (
  insert into public.help_articles (slug, category, sort_order) values ('auswertungen', 'technical', 20)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Auswertungen lesen$md$, $md$Unter **Auswertungen** siehst du, wie dein Shop läuft.

## Kennzahlen

- **Umsatz**: nach Rückerstattungen, gezählt am Tag der Zahlung.
- **Bestellungen** und **verkaufte Gutscheine**.
- **Deal-Aufrufe** und **Conversion**: wie viele Aufrufe zu einer Bestellung führen.
- **Einlösungen** und die **Sellycat-Gebühr**.

Jede Zahl wird mit dem gleich langen Zeitraum davor verglichen.

## Verlauf und Deals

Das Diagramm zeigt den Verlauf pro Tag, Woche oder Monat. Darunter siehst du den Weg vom Shop-Besuch bis zur Zahlung und eine Liste deiner Deals mit Aufrufen, Verkäufen und Umsatz.

## Datenschutz

Aufrufe zählt Sellycat ohne Cookies und ohne persönliche Daten, als eine Zahl pro Tag. Möchtest du zusätzlich Google Analytics oder das Meta-Pixel nutzen, trägst du die IDs unter **Einstellungen** ein. Diese laufen nur mit Einwilligung der Besucher.$md$, now() from a
union all
select id, 'en', $md$Reading analytics$md$, $md$Under **Analytics** you see how your shop is doing.

## Key figures

- **Revenue**: after refunds, counted on the day of payment.
- **Orders** and **vouchers sold**.
- **Deal views** and **conversion**: how many views lead to an order.
- **Redemptions** and the **Sellycat fee**.

Every figure is compared with the same period before.

## Trend and deals

The chart shows the trend per day, week or month. Below you see the path from shop visit to payment and a list of your deals with views, sales and revenue.

## Privacy

Sellycat counts views without cookies or personal data, as one number per day. If you also want to use Google Analytics or the Meta Pixel, enter the IDs under **Settings**. They only run with the visitors' consent.$md$, now() from a;
