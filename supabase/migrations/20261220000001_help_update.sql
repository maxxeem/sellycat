-- Help center brought up to date: existing articles corrected, new ones for the features since
-- 21.11.2026. Texts edited by staff (updated_by set) stay untouched; replaced texts go to the history.

create function pg_temp.help_put(p_slug text, p_category text, p_order int, p_locale text, p_title text, p_body text) returns void language plpgsql as $$
declare v_id uuid;
begin
  insert into public.help_articles (slug, category, sort_order) values (p_slug, p_category, p_order) on conflict (slug) do nothing;
  select id into v_id from public.help_articles where slug = p_slug;
  insert into public.help_article_history (article_id, locale, title, body)
  select v.article_id, v.locale, v.title, v.body from public.help_article_versions v
  where v.article_id = v_id and v.locale = p_locale and v.updated_by is null and v.title <> '' and (v.title, v.body) is distinct from (p_title, p_body);
  insert into public.help_article_versions as v (article_id, locale, title, body, published_at) values (v_id, p_locale, p_title, p_body, now())
  on conflict (article_id, locale) do update set title = excluded.title, body = excluded.body, published_at = excluded.published_at
  where v.updated_by is null and (v.title, v.body) is distinct from (excluded.title, excluded.body);
end $$;

select pg_temp.help_put('shop-starten', 'getting-started', 10, 'de', $md$Dein Shop in zehn Minuten$md$, $md$Mit Sellycat verkaufst du Gutscheine und Deals in deinem eigenen Shop. So kommst du vom Konto zum ersten Verkauf.

![Ansicht im Dashboard](/help-img/shop-starten-de.jpg)

## 1. Konto und Shop anlegen

1. Registriere dich auf sellycat.com mit Firmenname, Shop-Adresse und E-Mail oder mit deinem Google-Konto.
2. Bestätige den Link in der Mail. Erst dann wird dein Shop angelegt.
3. Deine Adresse ist **deine-adresse.sellycat.com**. Bis du den Shop publizierst, sehen Besucher dort «Hier entsteht ein neuer Shop».

Die **Übersicht** zeigt dir unter **Erste Schritte**, was noch fehlt.

## 2. Shop gestalten

Unter **Design** passt du Farben, Schriften und Logo an. Die Vorschau zeigt jede Änderung sofort, der Shop übernimmt sie mit **Veröffentlichen**. Mehr in [Shop gestalten und Deals anordnen](/help/design/shop-gestalten).

## 3. Rechtstexte hinterlegen

Ohne **Impressum**, **AGB** und **Datenschutz** lässt sich kein Deal veröffentlichen. Du findest sie unter **Einstellungen**. Mehr dazu im Artikel [Impressum, AGB und Datenschutz](/help/getting-started/rechtstexte).

## 4. Partner und ersten Deal anlegen

1. Lege unter **Partner** an, wo der Gutschein eingelöst wird. Das kannst du auch selbst sein.
2. Erstelle unter **Deals** deinen ersten Deal und veröffentliche ihn.

> Tipp: **Mit KI aus Link übernehmen** füllt Titel, Beschreibung und Bilder aus einer bestehenden Angebotsseite. Siehe [Deal mit KI aus einem Link erstellen](/help/deals/ki-uebernahme).

## 5. Zahlungen einrichten

Unter **Zahlungen** verbindest du dein Stripe-Konto. Käufer zahlen direkt an dich. Siehe [Stripe verbinden](/help/payments/stripe-verbinden).

## 6. Shop publizieren

Wähle unter **Erste Schritte** **Shop publizieren**. Ab jetzt sehen Besucher deine Deals. Siehe [Shop publizieren und offline nehmen](/help/getting-started/shop-publizieren).$md$);

select pg_temp.help_put('shop-starten', 'getting-started', 10, 'en', $md$Your shop in ten minutes$md$, $md$With Sellycat you sell vouchers and deals in your own shop. This is how you get from an account to your first sale.

![View in the dashboard](/help-img/shop-starten-en.jpg)

## 1. Create your account and shop

1. Sign up on sellycat.com with your company name, shop address and email, or with your Google account.
2. Confirm the link in the email. Only then is your shop created.
3. Your address is **your-address.sellycat.com**. Until you publish the shop, visitors see “A new shop is coming” there.

**Overview** shows under **Getting started** what is still missing.

## 2. Design your shop

Under **Design** you adjust colours, fonts and logo. The preview shows every change at once, and **Publish** brings it to your shop. More in [Design your shop and arrange deals](/help/design/shop-gestalten).

## 3. Add the legal texts

No deal can be published without an **imprint**, **terms** and a **privacy policy**. You find them under **Settings**. More in [Imprint, terms and privacy](/help/getting-started/rechtstexte).

## 4. Add a partner and your first deal

1. Under **Partners**, add where the voucher is redeemed. This can be you, too.
2. Under **Deals**, create your first deal and publish it.

> Tip: **Take over from a link with AI** fills in title, description and images from an existing offer page. See [Create a deal from a link with AI](/help/deals/ki-uebernahme).

## 5. Set up payments

Under **Payments** you connect your Stripe account. Buyers pay you directly. See [Connect Stripe](/help/payments/stripe-verbinden).

## 6. Publish your shop

Under **Getting started**, choose **Publish shop**. From now on visitors see your deals. See [Publish your shop and take it offline](/help/getting-started/shop-publizieren).$md$);

select pg_temp.help_put('rechtstexte', 'getting-started', 20, 'de', $md$Impressum, AGB und Datenschutz$md$, $md$Jeder Shop braucht drei Rechtstexte. Sie erscheinen im Fuss deines Shops und sind Pflicht, bevor du einen Deal veröffentlichen kannst.

![Ansicht im Dashboard](/help-img/rechtstexte-de.jpg)

## Wo du sie bearbeitest

1. Öffne **Einstellungen** → **Allgemein** und dort **Rechtstexte**.
2. Fülle **Impressum**, **AGB** und **Datenschutzerklärung** aus.
3. Speichere. Die Texte sind sofort im Shop sichtbar.

Im Editor formatierst du Text mit Fett, Kursiv, Unterstrichen, Aufzählungen, Nummerierung und Links: Text markieren und oben den Knopf wählen.

## Was hineingehört

- **Impressum**: Firmenname, Adresse, Kontakt, Handelsregister und MWST-Nummer, falls vorhanden.
- **AGB**: Bedingungen für den Kauf und die Einlösung der Gutscheine, etwa Gültigkeit, Rückgabe und Barauszahlung.
- **Datenschutz**: welche Daten du über Käufer bearbeitest und wofür. Zahlungen laufen über Stripe, Mails über Sellycat. Nutzt du den Deal-Alarm, Google Analytics oder das Meta-Pixel, gehört auch das hinein.

> Hinweis: Sellycat stellt keine Rechtsberatung bereit. Lass deine Texte im Zweifel von einer Fachperson prüfen.$md$);

select pg_temp.help_put('rechtstexte', 'getting-started', 20, 'en', $md$Imprint, terms and privacy$md$, $md$Every shop needs three legal texts. They appear in your shop's footer and are required before you can publish a deal.

![View in the dashboard](/help-img/rechtstexte-en.jpg)

## Where to edit them

1. Open **Settings** → **General** and find **Legal pages**.
2. Fill in **Imprint**, **Terms and conditions** and **Privacy policy**.
3. Save. The texts show in your shop right away.

The editor formats text with bold, italic, underline, bullets, numbering and links: select text and choose the button above.

## What goes in

- **Imprint**: company name, address, contact, commercial register and VAT number if you have one.
- **Terms**: conditions for buying and redeeming vouchers, such as validity, returns and cash payout.
- **Privacy**: which buyer data you process and why. Payments run through Stripe, emails through Sellycat. If you use the deal alert, Google Analytics or the Meta Pixel, include that too.

> Note: Sellycat does not provide legal advice. If in doubt, have your texts checked by a professional.$md$);

select pg_temp.help_put('deal-erstellen', 'deals', 10, 'de', $md$Einen Deal erstellen$md$, $md$Ein Deal ist ein Angebot in deinem Shop, zum Beispiel ein Wertgutschein oder ein Menü zum Spezialpreis.

![Ansicht im Dashboard](/help-img/deal-erstellen-de.jpg)

## Grundlagen und Inhalt

1. Öffne **Deals** und wähle **Neuer Deal**.
2. Gib Titel und Untertitel ein und wähle **Partner**, Einlöseorte und Kategorie.
3. Lade Bilder hoch, als JPG, PNG, WebP oder AVIF bis 10 MB. Das erste Bild ist das Titelbild.
4. Schreibe Beschreibung, Bedingungen und häufige Fragen. Mit **Aus früheren Deals** übernimmst du Bedingungen, Fragen holst du aus der [FAQ-Bibliothek](/help/deals/faq-bibliothek).

> Tipp: **Mit KI aus Link übernehmen** füllt Texte und Bilder aus einer bestehenden Angebotsseite vor. Siehe [Deal mit KI aus einem Link erstellen](/help/deals/ki-uebernahme).

## Preis und Typ

- **Festangebot**: eine bestimmte Leistung, zum Beispiel zwei Pizzas.
- **Wertgutschein**: ein Betrag. Auf Wunsch mit Teileinlösung, dann lässt sich der Restwert später nutzen.

Gibst du einen **Normalpreis** an, zeigt der Shop die Ersparnis automatisch.

## Limitierungen

- **Gesamtstückzahl**: wie viele Gutscheine es gibt. Leer heisst unbegrenzt. Ist alles verkauft, zeigt der Shop «Ausverkauft».
- **Max. pro Bestellung** und **Max. pro Käufer**.
- **Verkaufsstart** und **Verkaufsende**, in Schweizer Zeit. Vor dem Start ist der Deal «Geplant», danach «Beendet».

## Einlösung

Der Gutschein gilt unbefristet, bis zu einem Datum oder eine Anzahl Tage ab Kauf. Auf Wunsch nur an bestimmten Tagen und Zeiten.

## Gutschein-Format

Wähle **QR-Code**, **Zahlencode** oder **Barcode** und woher die Codes kommen: von Sellycat, aus deiner Liste ([Code-Pool](/help/vouchers/code-pools)) oder [ein gemeinsamer Code](/help/vouchers/gemeinsamer-code) für alle.

## Anzeige im Shop

- **«Nur noch X verfügbar»**, **Countdown** und **Bestands-Barometer**.
- **Als Top-Deal hervorheben**: steht im Shop zuoberst.
- **Als Teaser ankündigen**: schon sichtbar, aber ohne Preis und ohne Kaufen. Ab Verkaufsstart wird er automatisch zum normalen Deal.

Weiter unten legst du fest, ob der Deal über den [Deal-Alarm](/help/deals/deal-alarm) verschickt wird und wie er bei [Google und in der KI-Suche](/help/technical/google-ki-suche) erscheint. Auch [Partner-Abrechnung](/help/payments/partner-abrechnung) und [Werbung auf dem Gutschein](/help/design/werbung-gutschein) stellst du im Deal ein.

## Veröffentlichen

Mit **Veröffentlichen** geht der Deal live. Dafür müssen deine Rechtstexte vollständig sein, und bei eigenen Codes braucht es mindestens einen freien Code. Wie viele Deals gleichzeitig live sein können, hängt von deinem Plan ab.$md$);

select pg_temp.help_put('deal-erstellen', 'deals', 10, 'en', $md$Create a deal$md$, $md$A deal is an offer in your shop, for example a value voucher or a menu at a special price.

![View in the dashboard](/help-img/deal-erstellen-en.jpg)

## Basics and content

1. Open **Deals** and choose **New deal**.
2. Enter title and subtitle and choose **partner**, redemption locations and category.
3. Upload images as JPG, PNG, WebP or AVIF up to 10 MB. The first image is the cover.
4. Write the description, conditions and frequently asked questions. **From earlier deals** reuses conditions, and questions come from the [FAQ library](/help/deals/faq-bibliothek).

> Tip: **Take over from a link with AI** pre-fills texts and images from an existing offer page. See [Create a deal from a link with AI](/help/deals/ki-uebernahme).

## Price and type

- **Fixed offer**: one specific service, for example two pizzas.
- **Gift voucher**: an amount. Optionally with partial redemption, so the remaining value can be used later.

If you enter a **regular price**, the shop shows the saving automatically.

## Limits

- **Total quantity**: how many vouchers there are. Empty means unlimited. When everything is sold, the shop shows “Sold out”.
- **Max. per order** and **Max. per buyer**.
- **Sales start** and **Sales end**, in Swiss time. Before the start the deal is “Scheduled”, afterwards “Ended”.

## Redemption

The voucher has no time limit, is valid until a date or for a number of days from purchase. Optionally only on certain days and times.

## Voucher format

Choose **QR code**, **Number code** or **Barcode** and where the codes come from: from Sellycat, from your list ([code pool](/help/vouchers/code-pools)) or [one shared code](/help/vouchers/gemeinsamer-code) for everyone.

## Display in the shop

- **“Only X left”**, **countdown** and **stock barometer**.
- **Feature this deal**: puts it at the very top of your shop.
- **Announce as a teaser**: already visible, but without price and without buying. From the sales start it becomes a normal deal by itself.

Further down you decide whether the deal goes out with the [deal alert](/help/deals/deal-alarm) and how it appears on [Google and in AI search](/help/technical/google-ki-suche). [Partner settlement](/help/payments/partner-abrechnung) and [advertising on the voucher](/help/design/werbung-gutschein) are set in the deal, too.

## Publish

**Publish** puts the deal live. Your legal texts must be complete for this, and with your own codes at least one free code is needed. How many deals can be live at the same time depends on your plan.$md$);

select pg_temp.help_put('partner-und-orte', 'deals', 20, 'de', $md$Partner und Einlöseorte$md$, $md$Partner sind die Betriebe, bei denen Käufer ihre Gutscheine einlösen, zum Beispiel ein Restaurant oder ein Freizeitpark. Du kannst auch dich selbst als Partner erfassen.

![Ansicht im Dashboard](/help-img/partner-und-orte-de.jpg)

## Partner anlegen

1. Öffne **Partner** und wähle **Partner hinzufügen**.
2. Ergänze Name, Logo, Kurzbeschreibung und Kontakt.
3. Füge mit **Ort hinzufügen** jede Filiale hinzu.

## Adresse und Öffnungszeiten

Mit **Bei Google suchen** übernimmst du Adresse, Standort und Öffnungszeiten eines Betriebs. Prüfe sie kurz. Von Hand geht es auch: Den Montag überträgst du mit einem Klick auf Mo–Fr oder alle Tage.

Die Orte erscheinen auf der Deal-Seite mit Karte und Routenlink.

## Abrechnungsangaben

Rechnest du mit dem Partner über Sellycat ab, trägst du hier Firmenname, Adresse und IBAN ein. Nur Inhaber und Admins sehen diese Angaben. Siehe [Partner-Abrechnungen](/help/payments/partner-abrechnung).

## Scanner für einen Partner

Mitarbeitende eines Partners können Gutscheine selbst einlösen, ohne Zugang zu deinem Dashboard. Inhaber und Admins laden sie beim Partner unter **Berechtigte Scanner** ein. Sie melden sich mit ihrer E-Mail an und bekommen einen Code, ganz ohne Passwort. Mehr in [Gutscheine einlösen](/help/vouchers/gutscheine-einloesen).$md$);

select pg_temp.help_put('partner-und-orte', 'deals', 20, 'en', $md$Partners and redemption locations$md$, $md$Partners are the businesses where buyers redeem their vouchers, for example a restaurant or a leisure park. You can add yourself as a partner, too.

![View in the dashboard](/help-img/partner-und-orte-en.jpg)

## Add a partner

1. Open **Partners** and choose **Add partner**.
2. Add name, logo, short description and contact.
3. Use **Add location** for every branch.

## Address and opening hours

**Search on Google** takes over the address, position and opening hours of a business. Check them briefly. You can also enter them by hand: one click copies Monday to Mon–Fri or every day.

The locations appear on the deal page with a map and a route link.

## Billing details

If you settle with the partner through Sellycat, enter company name, address and IBAN here. Only owners and admins see these details. See [Partner settlements](/help/payments/partner-abrechnung).

## Scanners for a partner

A partner's staff can redeem vouchers themselves without access to your dashboard. Owners and admins invite them at the partner under **Authorised scanners**. They sign in with their email and get a code, no password needed. More in [Redeem vouchers](/help/vouchers/gutscheine-einloesen).$md$);

select pg_temp.help_put('archivieren-loeschen', 'deals', 30, 'de', $md$Deals beenden, archivieren und löschen$md$, $md$Alte Deals räumst du mit dem Archiv auf. So bleibt die Liste übersichtlich, ohne dass Bestellungen oder Gutscheine verloren gehen.

![Ansicht im Dashboard](/help-img/archivieren-loeschen-de.jpg)

## Beenden

Mit **Deal beenden** stoppst du den Verkauf. Mit **Zurück auf Entwurf** nimmst du den Deal ganz aus dem Shop und kannst ihn später wieder veröffentlichen.

## Archivieren

Wähle im Deal oben das Archiv-Symbol (**Archivieren**). Er verschwindet aus dem Shop und aus der Liste, ein laufender Deal wird dabei beendet. Archivierte Deals findest du über den Filter **Archiv**, mit **Wiederherstellen** holst du sie zurück. Archivieren können Inhaber und Admins.

## Löschen

- **Ohne Verkäufe**: Inhaber und Admins können den Deal endgültig löschen.
- **Mit Verkäufen**: Der Deal lässt sich nur archivieren. Bestellungen und Gutscheine der Käufer bleiben gültig. Muss er wirklich weg, hilft dir unser Support.$md$);

select pg_temp.help_put('archivieren-loeschen', 'deals', 30, 'en', $md$End, archive and delete deals$md$, $md$Use the archive to tidy up old deals. The list stays clear without losing orders or vouchers.

![View in the dashboard](/help-img/archivieren-loeschen-en.jpg)

## End

**End deal** stops the sale. **Back to draft** takes the deal out of the shop completely, and you can publish it again later.

## Archive

Choose the archive icon (**Archive**) at the top of the deal. It disappears from the shop and from the list, and a running deal is ended. You find archived deals with the filter **Archive**, and **Restore** brings them back. Owners and admins can archive.

## Delete

- **Without sales**: owners and admins can delete the deal for good.
- **With sales**: the deal can only be archived. Buyers' orders and vouchers stay valid. If it really has to go, our support can help.$md$);

select pg_temp.help_put('bestellungen-rueckerstattung', 'payments', 20, 'de', $md$Bestellungen und Rückerstattungen$md$, $md$Unter **Bestellungen** siehst du jeden Kauf mit Käufer, Betrag, Gebühr und den ausgestellten Gutscheinen. Suchen kannst du nach E-Mail oder Bestellnummer.

![Ansicht im Dashboard](/help-img/bestellungen-rueckerstattung-de.jpg)

## Mail nochmals senden

Hat ein Käufer seine Gutscheine nicht bekommen, öffne die Bestellung und wähle **Gutschein-Mail erneut senden**. Bitte ihn auch, im Spam-Ordner nachzusehen. Unter **E-Mails** siehst du, welche Mails raus sind und ob es einen Fehler gab. Bei Geschenken sendest du die Mail an die beschenkte Person mit **Geschenk-Mail jetzt senden**.

## Zurückerstatten

1. Öffne die Bestellung.
2. Gib unter **Rückerstattung** den Betrag ein, ganz oder teilweise.
3. Wähle **Zurückerstatten** und bestätige.

Das Geld geht auf das Zahlungsmittel des Käufers zurück. Sellycat erstattet seine Gebühr anteilig. Bei einer vollen Rückerstattung kannst du die Menge wieder zum Verkauf freigeben.

> Hinweis: Rückerstattungen lassen sich nicht rückgängig machen. Nur Inhaber und Admins können erstatten.

## Warnhinweis bei einer Bestellung

Hat jemand erst nach Ablauf der Reservation bezahlt oder waren keine eigenen Codes mehr frei, markiert Sellycat die Bestellung. Die Menge wurde dann erhöht oder ein Code von Sellycat erzeugt. Prüfe in diesem Fall die Gutscheine.

## Alle Gutscheine

Unter **Gutscheine** → **Ausgestellt** suchst du nach Code oder E-Mail, exportierst die Liste als CSV und machst einzelne Gutscheine ungültig.$md$);

select pg_temp.help_put('bestellungen-rueckerstattung', 'payments', 20, 'en', $md$Orders and refunds$md$, $md$Under **Orders** you see every purchase with buyer, amount, fee and the issued vouchers. You can search by email or order number.

![View in the dashboard](/help-img/bestellungen-rueckerstattung-en.jpg)

## Send the email again

If a buyer did not receive their vouchers, open the order and choose **Resend voucher email**. Also ask them to check their spam folder. **Emails** shows which emails went out and whether there was an error. For gifts, **Send gift email now** sends the email to the recipient.

## Refund

1. Open the order.
2. Under **Refund**, enter the amount, in full or in part.
3. Choose **Refund** and confirm.

The money goes back to the buyer's payment method. Sellycat refunds its fee proportionally. With a full refund you can release the quantity for sale again.

> Note: refunds cannot be undone. Only owners and admins can refund.

## Warning on an order

If someone paid only after the reservation had expired, or no own codes were left, Sellycat flags the order. The quantity was then raised or a code was generated by Sellycat. Check the vouchers in this case.

## All vouchers

Under **Vouchers** → **Issued** you search by code or email, export the list as CSV and void single vouchers.$md$);

select pg_temp.help_put('gutscheine-einloesen', 'vouchers', 10, 'de', $md$Gutscheine einlösen$md$, $md$Jeder Gutschein hat einen Code, je nach Deal mit QR-Code oder Barcode. Eingelöst wird im Dashboard, in der Einlöse-App oder direkt auf der Gutschein-Seite.

![Ansicht im Dashboard](/help-img/gutscheine-einloesen-de.jpg)

## Im Dashboard

1. Öffne **Einlösungen**.
2. Gib den Code ein. Gross- und Kleinschreibung, Leerzeichen und Striche spielen keine Rolle.
3. Löse den Gutschein ganz ein, bei Wertgutscheinen mit Teileinlösung auch einen Teilbetrag.

## Mit der Einlöse-App

Die App läuft auf deiner Shop-Adresse unter **/scan**, zum Beispiel deine-adresse.sellycat.com/scan. Füge die Seite zum Home-Bildschirm hinzu, dann öffnet sie sich wie eine App.

1. Melde dich mit deiner E-Mail an. Du bekommst einen 6-stelligen Code per Mail.
2. Scanne den QR-Code oder Barcode mit der Kamera, tippe den Code ein oder fotografiere ihn ab.
3. Bestätige die Einlösung.

## Direkt mit der Handykamera

Scanne den QR-Code mit der normalen Kamera. Bist du angemeldet, öffnet sich der Gutschein, und du löst ihn mit **Zum Einlösen wischen** ein. Sonst wählst du **Gutschein scannen** und meldest dich an.

## Wer darf einlösen?

- Teammitglieder ab der Rolle **Einlöser**.
- **Scanner** eines Partners, aber nur Gutscheine dieses Partners. Gehört ein Gutschein zu einem anderen Partner, sagt die App das klar.

## Rückgängig machen

Inhaber und Admins machen eine Einlösung unter **Einlösungen** rückgängig, innerhalb von 7 Tagen. Der Gutschein ist danach wieder gültig.

> Hinweis: Bei einem [gemeinsamen Code](/help/vouchers/gemeinsamer-code) ohne QR-Code wird im System des Partners eingelöst, nicht in Sellycat.$md$);

select pg_temp.help_put('gutscheine-einloesen', 'vouchers', 10, 'en', $md$Redeem vouchers$md$, $md$Every voucher has a code and, depending on the deal, a QR code or barcode. You redeem in the dashboard, in the redemption app or directly on the voucher page.

![View in the dashboard](/help-img/gutscheine-einloesen-en.jpg)

## In the dashboard

1. Open **Redemptions**.
2. Enter the code. Case, spaces and dashes do not matter.
3. Redeem the voucher in full, or part of it for gift vouchers with partial redemption.

## With the redemption app

The app runs on your shop address under **/scan**, for example your-address.sellycat.com/scan. Add the page to your home screen and it opens like an app.

1. Sign in with your email. You receive a 6-digit code by email.
2. Scan the QR code or barcode with the camera, type the code or take a photo of it.
3. Confirm the redemption.

## Directly with the phone camera

Scan the QR code with the normal camera. If you are signed in, the voucher opens and you redeem it with **Slide to redeem**. Otherwise choose **Scan voucher** and sign in.

## Who can redeem?

- Team members with the role **Redeemer** or higher.
- A partner's **scanners**, but only that partner's vouchers. If a voucher belongs to another partner, the app says so clearly.

## Undo

Owners and admins undo a redemption under **Redemptions**, within 7 days. The voucher is then valid again.

> Note: with a [shared code](/help/vouchers/gemeinsamer-code) without a QR code, vouchers are redeemed in the partner's system, not in Sellycat.$md$);

select pg_temp.help_put('code-pools', 'vouchers', 20, 'de', $md$Eigene Codes (Code-Pool)$md$, $md$Bekommst du die Gutschein-Codes von einem Partner, zum Beispiel Tickets mit eigenen Barcodes, lädst du sie als Code-Pool hoch. Jeder Käufer erhält einen davon.

![Ansicht im Dashboard](/help-img/code-pools-de.jpg)

## Codes hochladen

1. Öffne den Deal und wähle unter **Gutschein-Format** **Eigene Codes importieren (CSV)**.
2. Wähle eine CSV- oder Textdatei oder füge die Codes ein, einer pro Zeile.
3. Wähle **Codes importieren** oder speichere den Deal, dann werden sie ebenfalls importiert.

Pro Import sind bis zu 20'000 Codes möglich, jeder höchstens 120 Zeichen lang. Kopfzeilen und doppelte Codes erkennt Sellycat. Codes, die schon vergeben sind oder in einem anderen Deal liegen, werden übersprungen.

## Bestand

Die Zahl der freien Codes ist der Bestand des Deals. Sind alle vergeben, ist der Deal automatisch ausverkauft. Sind nur noch wenige Codes frei, warnt dich Sellycat im Editor und in der Deal-Liste.

- **Veröffentlichen** geht nur mit mindestens einem freien Code.
- Ist die Gesamtstückzahl höher als die Zahl der Codes, weist dich Sellycat darauf hin. Verkauft wird nur, was durch Codes gedeckt ist.
- Mit **Freie Codes löschen** entfernst du nicht vergebene Codes. Vergebene bleiben.

## So erscheint der Code

- **QR-Code**: der QR-Code führt zur Gutschein-Seite.
- **Barcode**: dein Code im gewählten Barcode-Typ, zum Beispiel EAN-13 oder Code 128.
- **Zahlencode**: gross als Text, ohne QR-Code, ideal für Online-Shops.

> Tipp: Haben alle Käufer denselben Code, nutze [ein gemeinsamer Code](/help/vouchers/gemeinsamer-code).$md$);

select pg_temp.help_put('code-pools', 'vouchers', 20, 'en', $md$Your own codes (code pool)$md$, $md$If a partner gives you the voucher codes, for example tickets with their own barcodes, upload them as a code pool. Every buyer gets one of them.

![View in the dashboard](/help-img/code-pools-en.jpg)

## Upload codes

1. Open the deal and choose **Import your own codes (CSV)** under **Voucher format**.
2. Choose a CSV or text file or paste the codes, one per line.
3. Choose **Import codes**, or save the deal and they are imported too.

Each import takes up to 20,000 codes of at most 120 characters. Sellycat detects header rows and duplicates. Codes that were already handed out or are in another deal are skipped.

## Stock

The number of free codes is the deal's stock. When all are used, the deal is sold out automatically. When only a few codes are left, Sellycat warns you in the editor and in the deal list.

- **Publish** needs at least one free code.
- If the total quantity is higher than the number of codes, Sellycat tells you. Only what is covered by codes is sold.
- **Delete free codes** removes codes not handed out yet. Used codes stay.

## How the code appears

- **QR code**: the QR code leads to the voucher page.
- **Barcode**: your code in the chosen barcode type, for example EAN-13 or Code 128.
- **Number code**: large as text, without a QR code, ideal for online shops.

> Tip: if all buyers have the same code, use [one shared code](/help/vouchers/gemeinsamer-code).$md$);

select pg_temp.help_put('shop-gestalten', 'design', 10, 'de', $md$Shop gestalten und Deals anordnen$md$, $md$Dein Shop soll aussehen wie deine Marke. Unter **Design** passt du alles an und siehst es sofort in der Vorschau, für Desktop und Handy.

![Ansicht im Dashboard](/help-img/shop-gestalten-de.jpg)

Änderungen werden als Entwurf gespeichert. Erst mit **Veröffentlichen** übernimmt sie der Shop.

## Marke

- **Logos & Bilder**: Logo für helle und dunkle Flächen, Favicon und Bild für geteilte Links.
- **Farben**: Sellycat prüft, ob alles gut lesbar ist. Dazu wählst du helle oder dunkle Darstellung.
- **Schriften**: alle Google Fonts mit lateinischer Schrift oder deine eigene als WOFF2, WOFF, TTF oder OTF, bis 5 MB.

## Aufbau der Seite

- **Kopfbereich**: als Streifen oder als ein Block mit dem Titelbereich.
- **Hero-Bereich**: Titel, Untertitel und Hintergrund, getrennt für Desktop und Handy als Bild, Farbe, Verlauf oder nur Text. Der **Fokuspunkt** bestimmt, was vom Bild nie abgeschnitten wird.
- **Deals & Buttons**: Raster, Liste oder Top-Deal mit Raster, dazu Karten, Ecken und Buttons.
- **Footer**: eigenes Logo, Links und Icons zu deiner Website und deinen Profilen, zum Beispiel Instagram, TikTok oder LinkedIn.

> Tipp: Mit **Branding von Website übernehmen** schlägt Sellycat Logo, Farben und Schriften deiner Website vor. Übernommen wird erst, wenn du es bestätigst.

## Anordnung

Unter **Anordnung** legst du fest, in welcher Reihenfolge die Deals erscheinen:

- **Manuell**: du ziehst die Deals in die Reihenfolge.
- **Neueste zuerst**: zuletzt veröffentlichte Deals oben.
- **Aktionsdatum**: laufende Deals, die bald enden, zuerst.
- **Relevanz**: am häufigsten geöffnete Deals zuerst.
- **Top-Seller**: am meisten verkaufte Deals zuerst.

Der Top-Deal steht immer zuoberst.

## Kategorien

Kategorien legst du unter **Einstellungen** an. Im Shop erscheinen sie als Filter, jede mit eigener Adresse.$md$);

select pg_temp.help_put('shop-gestalten', 'design', 10, 'en', $md$Design your shop and arrange deals$md$, $md$Your shop should look like your brand. Under **Design** you adjust everything and see it in the preview right away, for desktop and phone.

![View in the dashboard](/help-img/shop-gestalten-en.jpg)

Changes are saved as a draft. Your shop only takes them over when you choose **Publish**.

## Brand

- **Logos & images**: logo for light and dark backgrounds, favicon and image for shared links.
- **Colours**: Sellycat checks that everything is easy to read. You also choose a light or dark appearance.
- **Fonts**: all Google Fonts with Latin script, or your own as WOFF2, WOFF, TTF or OTF up to 5 MB.

## Page structure

- **Header**: as a bar or as one block with the hero.
- **Hero area**: headline, subline and background, separately for desktop and phone as a picture, colour, gradient or text only. The **focus point** decides which part of the picture is never cropped.
- **Deals & buttons**: grid, list or featured deal with a grid, plus cards, corners and buttons.
- **Footer**: your own logo, links and icons to your website and profiles, for example Instagram, TikTok or LinkedIn.

> Tip: **Take branding from website** suggests the logo, colours and fonts of your website. Nothing changes until you apply it.

## Arrangement

Under **Arrangement** you set the order in which deals appear:

- **Manual**: you drag the deals into order.
- **Newest first**: most recently published deals at the top.
- **Promotion date**: running deals ending soon first.
- **Relevance**: most opened deals first.
- **Top sellers**: best-selling deals first.

The top deal always stays at the top.

## Categories

You add categories under **Settings**. They appear as filters in your shop, each with its own address.$md$);

select pg_temp.help_put('gutschein-pdf-wallet', 'design', 20, 'de', $md$Gutschein-PDF und Wallet$md$, $md$Käufer bekommen ihre Gutscheine per Mail, als PDF zum Ausdrucken und auf Wunsch in Apple Wallet oder Google Wallet.

![Ansicht im Dashboard](/help-img/gutschein-pdf-wallet-de.jpg)

## PDF-Vorlage

1. Öffne **Design** und dort **Gutschein-PDF**.
2. Wähle eine Vorlage: **Klassisch**, **Ticket** oder **Minimal**, im Format A4 oder A6.
3. Wähle die Farbe und ob Bild, Einlöseorte und Bedingungen erscheinen. Ein kurzer Hinweis ist auch möglich.

Die Vorschau zeigt einen Beispiel-Gutschein mit Daten aus deinem Shop. QR-Codes und Barcodes bleiben auch auf Papier scharf.

Die untere Seitenhälfte kannst du für ein Visual nutzen, siehe [Werbung auf dem Gutschein](/help/design/werbung-gutschein).

## Wallet

Unter **Design** → **Wallet-Pass** gestaltest du die Karte für Apple Wallet und Google Wallet: Farben, Deal-Bild und einen Hinweis auf dem Sperrbildschirm in der Nähe eines Einlöseorts (Apple). Mit dem **Testpass** probierst du das gespeicherte Design auf deinem Handy aus.

Ändert sich ein Gutschein, etwa durch eine Einlösung, aktualisiert sich die Karte im Handy des Käufers automatisch.

> Hinweis: Apple Wallet kennt nicht jeden Barcode-Typ. EAN, UPC, ITF und Code 39 erscheinen dort als Code 128 mit denselben Ziffern, Data Matrix als Aztec-Code. Google Wallet zeigt jeden Typ.$md$);

select pg_temp.help_put('gutschein-pdf-wallet', 'design', 20, 'en', $md$Voucher PDF and wallet$md$, $md$Buyers receive their vouchers by email, as a PDF to print and, if they like, in Apple Wallet or Google Wallet.

![View in the dashboard](/help-img/gutschein-pdf-wallet-en.jpg)

## PDF template

1. Open **Design** and then **Voucher PDF**.
2. Choose a template: **Classic**, **Ticket** or **Minimal**, in A4 or A6.
3. Choose the colour and whether image, redemption places and terms appear. You can also add a short note.

The preview shows a sample voucher with data from your shop. QR codes and barcodes stay sharp on paper.

You can use the lower half of the page for a visual, see [Advertising on the voucher](/help/design/werbung-gutschein).

## Wallet

Under **Design** → **Wallet pass** you design the card for Apple Wallet and Google Wallet: colours, deal image and a lock screen hint near a redemption place (Apple). With the **test pass** you try the saved design on your phone.

When a voucher changes, for example after a redemption, the card on the buyer's phone updates automatically.

> Note: Apple Wallet does not know every barcode type. EAN, UPC, ITF and Code 39 appear there as Code 128 with the same digits, Data Matrix as an Aztec code. Google Wallet shows every type.$md$);

select pg_temp.help_put('team-einladen', 'team-account', 10, 'de', $md$Team einladen und Rollen$md$, $md$Arbeite mit Kolleginnen und Kollegen am Shop, jede Person mit ihrem eigenen Login.

![Ansicht im Dashboard](/help-img/team-einladen-de.jpg)

## Jemanden einladen

1. Öffne **Einstellungen** → **Team**. Einladen können Inhaber und Admins.
2. Wähle **Einladen** und gib Name, E-Mail und Rolle ein.
3. Wähle **Einladung senden**. Die Person bekommt eine Mail mit einem Link, der 14 Tage gilt. Neue Personen wählen dort ein Passwort; wer schon ein Konto hat, meldet sich an.

Unter **Offene Einladungen** sendest du eine Einladung erneut oder ziehst sie zurück.

## Rollen

- **Inhaber**: alles, auch Abo, Zahlungen und andere Inhaber.
- **Admin**: alles ausser Inhaber verwalten.
- **Editor**: Deals, Partner, FAQ-Bibliothek, Design, Auswertungen, Bestellungen ansehen.
- **Einlöser**: nur Gutscheine einlösen.

Jede Rolle sieht im Menü nur, was sie öffnen darf. Einstellungen, Domains, Deal-Alarm, Abrechnungen, Zahlungen und API sind Inhabern und Admins vorbehalten.

## Plätze

Wie viele Personen zum Team gehören können, hängt von deinem Plan ab. Offene Einladungen zählen mit. Scanner von Partnern brauchen keinen Platz.$md$);

select pg_temp.help_put('team-einladen', 'team-account', 10, 'en', $md$Invite your team and roles$md$, $md$Work on the shop with colleagues, each person with their own login.

![View in the dashboard](/help-img/team-einladen-en.jpg)

## Invite someone

1. Open **Settings** → **Team**. Owners and admins can invite.
2. Choose **Invite** and enter name, email and role.
3. Choose **Send invitation**. The person receives an email with a link valid for 14 days. New people choose a password there; those who already have an account sign in.

Under **Open invitations** you send an invitation again or withdraw it.

## Roles

- **Owner**: everything, including subscription, payments and other owners.
- **Admin**: everything except managing owners.
- **Editor**: deals, partners, FAQ library, design, analytics, view orders.
- **Redeemer**: only redeem vouchers.

Each role only sees in the menu what it may open. Settings, domains, deal alert, settlements, payments and API are reserved for owners and admins.

## Seats

How many people can be on the team depends on your plan. Open invitations count too. Partners' scanners need no seat.$md$);

select pg_temp.help_put('plaene-gebuehren', 'billing', 10, 'de', $md$Pläne und Verkaufsgebühren$md$, $md$Du startest gratis und zahlst nur eine Gebühr pro Verkauf. Mit einem monatlichen oder jährlichen Abo sinkt die Gebühr, und du bekommst mehr Funktionen.

![Ansicht im Dashboard](/help-img/plaene-gebuehren-de.jpg)

## Die Pläne

- **Free**: ohne Fixkosten, mit Sellycat-Hinweis im Shop und der höchsten Verkaufsgebühr.
- **Starter**: mehr Live-Deals und Teamplätze, ohne Sellycat-Hinweis, tiefere Gebühr.
- **Pro**: zusätzlich eigene Domain, eigener Mail-Absender, [Deal-Alarm](/help/deals/deal-alarm) sowie [API und Webhooks](/help/technical/api-webhooks).
- **Business**: unbegrenzt Live-Deals, bis zu [5 Shops](/help/billing/mehrere-shops), keine Mindestgebühr, persönliche Betreuung. Auf Anfrage.

Die aktuellen Preise, Gebühren und Limiten siehst du auf [sellycat.com/pricing](/pricing). Die Währung richtet sich nach deinem Standort: CHF in der Schweiz und in Liechtenstein, EUR im übrigen Europa, sonst USD. Preise verstehen sich inklusive MWST.

## Plan wechseln

1. Öffne **Einstellungen** → **Abo**. Wechseln können Inhaber und Admins.
2. Wähle den neuen Plan. Ein Upgrade gilt sofort und wird anteilig verrechnet. Ein Wechsel nach unten gilt ab dem Ende der bezahlten Periode.

Rechnungen, Zahlungsmittel und Kündigung findest du unter **Rechnungen & Zahlungsmittel**. Nach einer Kündigung läuft dein Plan bis zum Ende der bezahlten Periode, danach wechselt der Shop auf Free.

## Verkaufsgebühr

Die Gebühr ist ein Prozentsatz pro Verkauf, in den Plänen Free, Starter und Pro mit einem Mindestbetrag. Stripe zieht sie bei jeder Zahlung automatisch ab, dazu kommen die Kartengebühren von Stripe. Bei einer Rückerstattung erstattet Sellycat seine Gebühr anteilig zurück.

Für die Buchhaltung gibt es die [Gebührenübersicht](/help/billing/gebuehrenuebersicht) pro Monat.$md$);

select pg_temp.help_put('plaene-gebuehren', 'billing', 10, 'en', $md$Plans and sales fees$md$, $md$You start for free and only pay a fee per sale. With a monthly or yearly subscription the fee goes down and you get more features.

![View in the dashboard](/help-img/plaene-gebuehren-en.jpg)

## The plans

- **Free**: no fixed costs, with a Sellycat badge in the shop and the highest sales fee.
- **Starter**: more live deals and team seats, no Sellycat badge, lower fee.
- **Pro**: adds your own domain, your own mail sender, the [deal alert](/help/deals/deal-alarm) and [API and webhooks](/help/technical/api-webhooks).
- **Business**: unlimited live deals, up to [5 shops](/help/billing/mehrere-shops), no minimum fee, personal support. On request.

Current prices, fees and limits are on [sellycat.com/pricing](/pricing). The currency depends on your location: CHF in Switzerland and Liechtenstein, EUR in the rest of Europe, otherwise USD. Prices include VAT.

## Change your plan

1. Open **Settings** → **Subscription**. Owners and admins can change the plan.
2. Choose the new plan. An upgrade applies at once and is charged proportionally. A switch down applies from the end of the paid period.

Invoices, payment methods and cancellation are under **Invoices & payment methods**. After cancelling, your plan runs until the end of the paid period, then the shop moves to Free.

## Sales fee

The fee is a percentage per sale, with a minimum amount in the Free, Starter and Pro plans. Stripe deducts it automatically with every payment, and Stripe's card fees come on top. With a refund, Sellycat refunds its fee proportionally.

For your accounting there is the monthly [fee overview](/help/billing/gebuehrenuebersicht).$md$);

select pg_temp.help_put('eigene-domain', 'technical', 10, 'de', $md$Eigene Domain verbinden$md$, $md$Statt deine-adresse.sellycat.com kann dein Shop unter deiner eigenen Adresse laufen, zum Beispiel **deals.deinefirma.ch**. Das ist in den Abos Pro und Business enthalten, mit bis zu 3 Domains pro Shop.

![Ansicht im Dashboard](/help-img/eigene-domain-de.jpg)

## So geht es

1. Öffne **Shop** → **Domains**, gib deine Adresse ein und wähle **Domain verbinden**.
2. Sellycat zeigt dir die DNS-Einträge, mit einer Anleitung für GoDaddy, Infomaniak, Hostpoint, Cloudflare und andere.
3. Trage die Einträge bei deinem Domain-Anbieter ein. Gibt es schon einen mit demselben Namen, ändere ihn, statt einen zweiten anzulegen.
4. Sellycat prüft automatisch und zeigt den Fortschritt: DNS-Einträge, Sicherheitszertifikat, Live. Meist dauert das wenige Minuten, selten bis zu 24 Stunden.
5. Wähle **Als Hauptadresse verwenden**. Sie steht dann in Mails, PDFs und QR-Codes, alle anderen Adressen leiten dorthin weiter.

Das Zertifikat für https richtet Sellycat automatisch ein.

> Hinweis: Nimm am besten eine Subdomain wie deals.deinefirma.ch. Verbindest du die ganze Hauptdomain, ist eine bestehende Website darauf nicht mehr erreichbar.

## Cloudflare

Stelle **Proxy status** auf **DNS only** (graue Wolke), sonst kann das Zertifikat nicht erstellt werden.

## Eigener Mail-Absender

Auch Gutschein-Mails können von deiner Domain kommen. Siehe [Mails von der eigenen Domain senden](/help/technical/absender-domain).$md$);

select pg_temp.help_put('eigene-domain', 'technical', 10, 'en', $md$Connect your own domain$md$, $md$Instead of your-address.sellycat.com, your shop can run at your own address, for example **deals.yourcompany.com**. This is included in the Pro and Business plans, with up to 3 domains per shop.

![View in the dashboard](/help-img/eigene-domain-en.jpg)

## How it works

1. Open **Shop** → **Domains**, enter your address and choose **Connect domain**.
2. Sellycat shows the DNS records, with a guide for GoDaddy, Infomaniak, Hostpoint, Cloudflare and others.
3. Add the records at your domain provider. If there already is one with the same name, change it instead of adding a second one.
4. Sellycat checks automatically and shows the progress: DNS records, security certificate, live. This usually takes a few minutes, rarely up to 24 hours.
5. Choose **Use as main address**. It is then used in emails, PDFs and QR codes, and all other addresses redirect to it.

Sellycat sets up the certificate for https automatically.

> Note: ideally use a subdomain like deals.yourcompany.com. If you connect the whole main domain, an existing website on it is no longer reachable.

## Cloudflare

Set **Proxy status** to **DNS only** (grey cloud), otherwise the certificate cannot be created.

## Your own mail sender

Voucher emails can come from your domain, too. See [Send emails from your own domain](/help/technical/absender-domain).$md$);

select pg_temp.help_put('auswertungen', 'technical', 20, 'de', $md$Auswertungen lesen$md$, $md$Unter **Auswertungen** siehst du, wie dein Shop läuft, für 7, 30 oder 90 Tage oder 12 Monate.

![Ansicht im Dashboard](/help-img/auswertungen-de.jpg)

## Kennzahlen

- **Umsatz**: nach Rückerstattungen, gezählt am Tag der Zahlung.
- **Bestellungen**, **verkaufte Gutscheine** und die **durchschnittliche Bestellung**.
- **Deal-Aufrufe** und **Conversion**: wie viele Aufrufe zu einer Bestellung führen.
- **Einlösungen** und die **Sellycat-Gebühr**.

Jede Zahl wird mit dem gleich langen Zeitraum davor verglichen.

## Verlauf und Deals

Das Diagramm zeigt den Verlauf pro Tag, Woche oder 30 Tage. Darunter siehst du den Weg vom Shop-Besuch bis zur Zahlung und eine Liste deiner Deals mit Aufrufen, Verkäufen und Umsatz. Shop-Aufrufe zählen nur Startseite und Kategorien: Viele Käufer kommen direkt über einen Deal-Link.

## Datenschutz

Aufrufe zählt Sellycat ohne Cookies und ohne persönliche Daten, als eine Zahl pro Tag. Möchtest du zusätzlich Google Analytics oder das Meta-Pixel nutzen, trägst du die IDs unter **Einstellungen** ein. Diese laufen nur mit Einwilligung der Besucher, die sie unter «Cookie-Einstellungen» im Fuss des Shops jederzeit ändern können.$md$);

select pg_temp.help_put('auswertungen', 'technical', 20, 'en', $md$Reading analytics$md$, $md$Under **Analytics** you see how your shop is doing, for 7, 30 or 90 days or 12 months.

![View in the dashboard](/help-img/auswertungen-en.jpg)

## Key figures

- **Revenue**: after refunds, counted on the day of payment.
- **Orders**, **vouchers sold** and the **average order**.
- **Deal views** and **conversion**: how many views lead to an order.
- **Redemptions** and the **Sellycat fee**.

Every figure is compared with the same period before.

## Trend and deals

The chart shows the trend per day, week or 30 days. Below you see the path from shop visit to payment and a list of your deals with views, sales and revenue. Shop views only count the start page and categories: many buyers arrive directly through a deal link.

## Privacy

Sellycat counts views without cookies or personal data, as one number per day. If you also want to use Google Analytics or the Meta Pixel, enter the IDs under **Settings**. They only run with the visitors' consent, which they can change at any time under “Cookie settings” in the shop's footer.$md$);

select pg_temp.help_put('shop-publizieren', 'getting-started', 30, 'de', $md$Shop publizieren und offline nehmen$md$, $md$Ein neuer Shop ist zuerst nicht öffentlich. Besucher sehen «Hier entsteht ein neuer Shop», bis du ihn publizierst.

![Ansicht im Dashboard](/help-img/shop-publizieren-de.jpg)

## Zum ersten Mal online stellen

1. Öffne die **Übersicht** und dort **Erste Schritte**.
2. Gestalte den Shop, hinterlege die Rechtstexte, erstelle einen Deal und verbinde Stripe.
3. Wähle **Shop publizieren**.

Nur Inhaber und Admins können den Shop publizieren. Ohne Impressum, AGB und Datenschutz zeigt er statt der Deals «Dieser Shop öffnet bald». Siehe [Impressum, AGB und Datenschutz](/help/getting-started/rechtstexte).

## Vorübergehend offline nehmen

1. Öffne **Einstellungen** → **Allgemein** und dort **Online-Status**.
2. Wähle **Offline nehmen** und bestätige.
3. Passe bei Bedarf Titel und Text des Hinweises an. Leere Felder zeigen den Standardtext.

Solange der Shop offline ist, sehen Besucher deinen Hinweis mit deinem Logo und deinen Farben. Mit **Wieder online stellen** ist alles wie vorher.

> Hinweis: Auch wenn der Shop offline ist, bleiben gekaufte Gutscheine gültig und lassen sich einlösen. Nur neue Käufe sind gesperrt.$md$);

select pg_temp.help_put('shop-publizieren', 'getting-started', 30, 'en', $md$Publish your shop and take it offline$md$, $md$A new shop is not public at first. Visitors see “A new shop is coming” until you publish it.

![View in the dashboard](/help-img/shop-publizieren-en.jpg)

## Go online for the first time

1. Open **Overview** and find **Getting started**.
2. Style the shop, add the legal texts, create a deal and connect Stripe.
3. Choose **Publish shop**.

Only owners and admins can publish the shop. Without imprint, terms and privacy policy it shows “This shop opens soon” instead of your deals. See [Imprint, terms and privacy](/help/getting-started/rechtstexte).

## Take it offline for a while

1. Open **Settings** → **General** and find **Online status**.
2. Choose **Take offline** and confirm.
3. Adjust the title and text of the note if you like. Empty fields show the default text.

While the shop is offline, visitors see your note with your logo and colours. **Put back online** restores everything.

> Note: even while the shop is offline, vouchers already bought stay valid and redeemable. Only new purchases are blocked.$md$);

select pg_temp.help_put('ki-uebernahme', 'deals', 12, 'de', $md$Deal mit KI aus einem Link erstellen$md$, $md$Steht dein Angebot schon auf einer Website, schreibt die KI daraus Titel, Beschreibung und Bedingungen und übernimmt passende Bilder.

![Ansicht im Dashboard](/help-img/ki-uebernahme-de.jpg)

## So geht es

1. Öffne den Deal. Unter **Inhalt** findest du **Mit KI aus Link übernehmen**.
2. Füge den Link der einzelnen Produkt- oder Angebotsseite ein.
3. Bestimme mit **FAQ von der KI erstellen lassen**, ob auch Fragen und Antworten entstehen. Ist die Option an, ersetzen sie die Fragen dieses Deals. Ist sie aus, bleiben deine Fragen unverändert.
4. Wähle **Übernehmen**. Das dauert meist 20 bis 60 Sekunden.
5. Prüfe das Ergebnis und speichere den Deal.

Bestehende Texte werden ersetzt, Bilder hinten angefügt. Gespeichert wird erst, wenn du speicherst.

## Wenn die Seite gesperrt ist

Manche Websites lassen keine automatischen Abrufe zu. Dann öffnest du die Seite im Browser, kopierst den ganzen Text und wählst **Aus eingefügtem Text erstellen**. Die Bilder lädst du selbst hoch.

> Hinweis: Prüfe Preise, Fristen und Bedingungen immer selbst, und verwende nur Texte und Bilder, für die du die Rechte hast.$md$);

select pg_temp.help_put('ki-uebernahme', 'deals', 12, 'en', $md$Create a deal from a link with AI$md$, $md$If your offer is already on a website, the AI writes title, description and conditions from it and takes over fitting images.

![View in the dashboard](/help-img/ki-uebernahme-en.jpg)

## How it works

1. Open the deal. Under **Content** you find **Take over from a link with AI**.
2. Paste the link of the single product or offer page.
3. Use **Let the AI write the FAQ** to decide whether questions and answers are written too. If it is on, they replace the questions of this deal. If it is off, your questions stay as they are.
4. Choose **Take over**. This usually takes 20 to 60 seconds.
5. Check the result and save the deal.

Existing texts are replaced, images are added at the end. Nothing is saved until you save.

## If the page is blocked

Some websites do not allow automatic access. In that case open the page in your browser, copy all of its text and choose **Create from pasted text**. You upload the images yourself.

> Note: always check prices, dates and conditions yourself, and only use texts and images you have the rights to.$md$);

select pg_temp.help_put('faq-bibliothek', 'deals', 15, 'de', $md$FAQ-Bibliothek$md$, $md$In der FAQ-Bibliothek sammelst du Fragen und Antworten, die bei vielen Deals vorkommen, zum Beispiel zur Einlösung oder Gültigkeit. Im Deal wählst du sie mit einem Klick aus.

![Ansicht im Dashboard](/help-img/faq-bibliothek-de.jpg)

## Fragen anlegen

1. Öffne **Verkauf** → **FAQ-Bibliothek**.
2. Wähle **Frage hinzufügen** und fülle Frage und Antwort aus.

Die Bibliothek fasst bis zu 200 Fragen. Editoren, Admins und Inhaber können sie bearbeiten.

## Im Deal verwenden

Beim **FAQ** im Deal findest du zwei Wege:

- **Schnellwahl aus der Bibliothek**: ein Klick fügt die Frage hinzu.
- **FAQ-Bibliothek**: durchsucht deine Bibliothek und die Fragen aus früheren Deals.

Hast du im Deal eine gute Frage geschrieben, setze **In FAQ-Bibliothek speichern**. Beim Speichern des Deals kommt sie in die Bibliothek.

> Hinweis: Der Deal speichert immer eine Kopie. Änderst oder löschst du eine Frage in der Bibliothek, bleiben bestehende Deals unverändert.$md$);

select pg_temp.help_put('faq-bibliothek', 'deals', 15, 'en', $md$FAQ library$md$, $md$The FAQ library holds questions and answers that come up with many deals, for example about redemption or validity. In the deal you pick them with one click.

![View in the dashboard](/help-img/faq-bibliothek-en.jpg)

## Add questions

1. Open **Sales** → **FAQ library**.
2. Choose **Add question** and fill in question and answer.

The library holds up to 200 questions. Editors, admins and owners can edit it.

## Use them in a deal

Under **FAQ** in the deal there are two ways:

- **Quick pick from the library**: one click adds the question.
- **FAQ library**: searches your library and the questions from earlier deals.

If you wrote a good question in a deal, tick **Save in the FAQ library**. It is added to the library when you save the deal.

> Note: the deal always stores a copy. If you change or delete a question in the library, existing deals stay as they are.$md$);

select pg_temp.help_put('deal-alarm', 'deals', 25, 'de', $md$Deal-Alarm: neue Deals per E-Mail$md$, $md$Mit dem Deal-Alarm abonnieren Besucher deine neuen Deals per E-Mail. Er ist in den Abos Pro und Business enthalten.

![Ansicht im Dashboard](/help-img/deal-alarm-de.jpg)

## Einschalten

1. Öffne **Shop** → **Deal-Alarm**. Inhaber und Admins sehen diese Seite.
2. Wähle **Einschalten**. Im Shop erscheint oben rechts der Knopf.

Deals, die beim Einschalten schon live sind, gehen nicht automatisch raus. Solange Stripe keine Zahlungen annimmt, verschickt der Deal-Alarm nichts.

## So melden sich Besucher an

Wer seine E-Mail einträgt, bekommt zuerst eine Mail und bestätigt die Adresse mit einem Klick. Erst dann zählt sie als aktiv. Jede Mail enthält einen Link zum Abbestellen. Unbestätigte Adressen werden nach 7 Tagen gelöscht, Abmeldungen sofort.

## Automatischer Versand

Du wählst eine von drei Arten:

- **Sofort, jeder Deal einzeln**: eine Mail pro Deal, kurz nachdem er live ist. Auf Wunsch nur zu bestimmten Uhrzeiten. Was ausserhalb live geht, wird zu Beginn der nächsten Zeitspanne verschickt.
- **Gesammelt zu festen Zeiten**: eine Mail mit allen neuen Deals, an den gewählten Wochentagen und zur gewählten Uhrzeit, höchstens 10 Deals pro Mail. Gibt es nichts Neues, geht keine Mail raus.
- **Nur von Hand**: nichts geht automatisch raus.

Die Uhrzeiten gelten in Schweizer Zeit. Jeder Deal geht automatisch höchstens einmal raus. Stellst du von «Nur von Hand» wieder auf automatisch um, werden Deals, die dann schon live sind, nicht nachträglich verschickt.

## Von Hand versenden

1. Wähle unter **Deals von Hand versenden** einen bis zehn Deals. Sie erscheinen in der gewählten Reihenfolge.
2. Ergänze auf Wunsch einen eigenen Betreff und eine Nachricht.
3. Prüfe die **Vorschau** und sende dir mit **Testmail an mich** eine Probe.
4. Sende die Mail an alle aktiven Abonnenten. Das lässt sich nicht rückgängig machen.

Zwischen zwei Sendungen von Hand liegen mindestens 10 Minuten. Ein von Hand verschickter Deal geht danach nicht nochmals automatisch raus.

## Einen Deal ausnehmen

Im Deal unter **Deal-Alarm** wählst du **Nicht verschicken**. Der automatische Versand lässt ihn dann aus. Von Hand kannst du ihn trotzdem senden.

## Abonnenten und Verlauf

Die Seite zeigt deine Abonnenten, mit **CSV exportieren** lädst du die Liste herunter. Unter **Verschickte Deals** siehst du, was wann an wie viele Adressen ging.

> Hinweis: Schaltest du den Deal-Alarm aus, verschwindet der Knopf aus dem Shop. Die Abonnenten bleiben gespeichert.$md$);

select pg_temp.help_put('deal-alarm', 'deals', 25, 'en', $md$Deal alert: new deals by email$md$, $md$With the deal alert, visitors subscribe to your new deals by email. It is included in the Pro and Business plans.

![View in the dashboard](/help-img/deal-alarm-en.jpg)

## Turn it on

1. Open **Shop** → **Deal alert**. Owners and admins see this page.
2. Choose **Turn on**. The button appears at the top right of your shop.

Deals that are already live at that moment are not sent automatically. As long as Stripe takes no payments, the deal alert sends nothing.

## How visitors sign up

Whoever enters an email address first receives an email and confirms the address with one click. Only then does it count as active. Every email contains an unsubscribe link. Unconfirmed addresses are deleted after 7 days, unsubscribed ones at once.

## Automatic sending

You choose one of three ways:

- **At once, each deal on its own**: one email per deal, shortly after it goes live. If you like, only at certain times of day. Deals that go live outside these hours are sent at the start of the next period.
- **Collected at fixed times**: one email with all new deals, on the weekdays and at the time you choose, at most 10 deals per email. Nothing new, no email.
- **Only by hand**: nothing goes out automatically.

Times are Swiss time. Each deal goes out automatically at most once. When you switch from “Only by hand” back to automatic, deals that are live by then are not sent afterwards.

## Send by hand

1. Under **Send deals by hand**, pick one to ten deals. They appear in the order you pick them.
2. Add your own subject and a message if you like.
3. Check the **Preview** and send yourself a sample with **Test email to me**.
4. Send the email to all active subscribers. This cannot be undone.

There are at least 10 minutes between two emails sent by hand. A deal sent by hand does not go out automatically afterwards.

## Leave a deal out

In the deal under **Deal alert**, choose **Do not send**. The automatic alert then leaves it out. You can still send it by hand.

## Subscribers and history

The page lists your subscribers, and **Export CSV** downloads the list. **Sent deals** shows what went out when and to how many addresses.

> Note: if you turn the deal alert off, the button disappears from the shop. The subscribers stay stored.$md$);

select pg_temp.help_put('kaeufer-geschenke', 'vouchers', 15, 'de', $md$So bekommen Käufer ihre Gutscheine$md$, $md$Nach der Zahlung gehen die Gutscheine sofort per E-Mail raus, mit PDF zum Ausdrucken und auf Wunsch fürs Wallet. Ein Konto brauchen Käufer nicht.

## Als Geschenk

An der Kasse wählen Käufer **Als Geschenk versenden**. Sie geben Name und E-Mail der beschenkten Person an, dazu eine persönliche Nachricht. Der Versand erfolgt sofort oder am Morgen eines gewählten Tags, höchstens ein Jahr im Voraus.

In der Bestellung siehst du den Stand. Mit **Geschenk-Mail jetzt senden** schickst du sie früher oder nochmals.

## Meine Gutscheine

In deinem Shop finden Käufer alle ihre Gutscheine unter **Meine Gutscheine**. Sie geben ihre E-Mail ein und bekommen einen Link, der 24 Stunden gilt. Das klappt auch für Beschenkte.

## Wenn jemand den QR-Code scannt

Der QR-Code öffnet die Gutschein-Seite. Dort gibt es zwei Wege:

- **Gutschein scannen**: für Personal und Partner. Sie melden sich an und lösen ein. Siehe [Gutscheine einlösen](/help/vouchers/gutscheine-einloesen).
- **Gutschein anzeigen**: für die Besitzerin oder den Besitzer. Sellycat sendet einen Code an die hinterlegte E-Mail, so bleibt der Gutschein geschützt. Das Gerät bleibt danach 30 Tage freigeschaltet.

## Erinnerung vor Ablauf

Etwa eine Woche bevor ein Gutschein abläuft, erinnert Sellycat die Käufer oder Beschenkten einmal per Mail.$md$);

select pg_temp.help_put('kaeufer-geschenke', 'vouchers', 15, 'en', $md$How buyers get their vouchers$md$, $md$After payment the vouchers go out by email right away, with a PDF to print and, if they like, for their wallet. Buyers do not need an account.

## As a gift

At checkout buyers choose **Send as a gift**. They enter the recipient's name and email, plus a personal message. Delivery is immediate or on the morning of a chosen day, at most one year ahead.

The order shows the status. **Send gift email now** sends it earlier or once more.

## My vouchers

In your shop, buyers find all their vouchers under **My vouchers**. They enter their email and receive a link valid for 24 hours. This works for gift recipients too.

## When someone scans the QR code

The QR code opens the voucher page. There are two ways from there:

- **Scan voucher**: for staff and partners. They sign in and redeem. See [Redeem vouchers](/help/vouchers/gutscheine-einloesen).
- **Show voucher**: for the owner. Sellycat sends a code to the email on file, so the voucher stays protected. The device then stays unlocked for 30 days.

## Reminder before expiry

About a week before a voucher expires, Sellycat reminds the buyer or gift recipient once by email.$md$);

select pg_temp.help_put('gemeinsamer-code', 'vouchers', 30, 'de', $md$Ein gemeinsamer Code für alle Käufer$md$, $md$Gibt dir ein Partner einen einzigen Aktionscode, zum Beispiel SOMMER25 für einen Online-Shop, bekommen alle Käufer denselben Code.

![Ansicht im Dashboard](/help-img/gemeinsamer-code-de.jpg)

## Einrichten

1. Öffne den Deal und dort **Gutschein-Format**.
2. Wähle **Ein gemeinsamer Code für alle** und gib den Code ein.
3. Lege unter **Limitierungen** eine Gesamtstückzahl fest. Ohne sie wird der Deal unbegrenzt verkauft.

Der Code steht auf jedem Gutschein, in der Mail, im PDF und im Wallet. Vor dem Kauf ist er nirgends sichtbar. Ohne Code lässt sich der Deal nicht veröffentlichen.

## Einlösen

- **Mit QR-Code**: Jeder Gutschein behält zusätzlich seinen eigenen QR-Code. Scannen und Einlösen mit Sellycat funktionieren wie gewohnt.
- **Als Zahlencode oder Barcode**: Die Gutscheine lassen sich nicht unterscheiden. Eingelöst wird im System des Partners, nicht in Sellycat.

Möchtest du mit dem Partner **Nach Einlösung** abrechnen, braucht der Deal das QR-Format.

## Code ändern

Ein neuer Code gilt nur für neue Verkäufe. Bereits verkaufte Gutscheine behalten den bisherigen.

> Hinweis: Käufer können einen gemeinsamen Code weitergeben. Sollen alle einen eigenen bekommen, nutze den [Code-Pool](/help/vouchers/code-pools).$md$);

select pg_temp.help_put('gemeinsamer-code', 'vouchers', 30, 'en', $md$One shared code for all buyers$md$, $md$If a partner gives you a single promotion code, for example SUMMER25 for an online shop, all buyers get the same code.

![View in the dashboard](/help-img/gemeinsamer-code-en.jpg)

## Set it up

1. Open the deal and find **Voucher format**.
2. Choose **One shared code for everyone** and enter the code.
3. Set a total quantity under **Limits**. Without one the deal sells without limit.

The code is on every voucher, in the email, the PDF and the wallet. It is not visible anywhere before the purchase. Without a code the deal cannot be published.

## Redeeming

- **With a QR code**: every voucher also keeps its own QR code. Scanning and redeeming with Sellycat work as usual.
- **As a number code or barcode**: the vouchers cannot be told apart. They are redeemed in the partner's system, not in Sellycat.

To settle with the partner **After redemption**, the deal needs the QR format.

## Change the code

A new code only applies to new sales. Vouchers already sold keep the previous one.

> Note: buyers can pass a shared code on. If everyone should get their own, use the [code pool](/help/vouchers/code-pools).$md$);

select pg_temp.help_put('werbung-gutschein', 'design', 30, 'de', $md$Werbung auf dem Gutschein$md$, $md$Die untere Hälfte des Gutschein-PDFs kann ein Werbevisual zeigen, zum Beispiel von dir oder einem Sponsor.

![Ansicht im Dashboard](/help-img/werbung-gutschein-de.jpg)

## Allgemeine Werbung

1. Öffne **Design** → **Gutschein-PDF**.
2. Setze unter **Werbung** das Häkchen **Untere Seitenhälfte für Werbung nutzen**.
3. Lade dein **Werbevisual** hoch und speichere.

Sie gilt für alle Deals. Der Gutschein steht kompakt in der oberen Hälfte. Passen lange Bedingungen nicht hinein, geht es auf einer zweiten Seite weiter.

## Format

- Querformat im Verhältnis 1.41 : 1, als JPG, PNG oder WebP, bis 10 MB. Die ideale Grösse steht beim Upload.
- Andere Seitenverhältnisse werden mittig zugeschnitten.
- Wichtige Texte und Logos mindestens 8 mm vom Rand entfernt, denn viele Drucker drucken nicht bis an den Rand.

## Pro Deal bestimmen

Im Deal unter **Werbung auf dem PDF-Gutschein** wählst du:

- **Allgemeine Werbung**: wie oben eingestellt.
- **Eigene Werbung**: ein eigenes Visual, nur für diesen Deal.
- **Werbefrei**: dieser Gutschein zeigt nie Werbung.

Mit **PDF-Vorschau öffnen** siehst du das Ergebnis.$md$);

select pg_temp.help_put('werbung-gutschein', 'design', 30, 'en', $md$Advertising on the voucher$md$, $md$The lower half of the voucher PDF can show an advertising visual, for example yours or a sponsor's.

![View in the dashboard](/help-img/werbung-gutschein-en.jpg)

## General advertising

1. Open **Design** → **Voucher PDF**.
2. Under **Advertising**, tick **Use the lower half of the page for advertising**.
3. Upload your **advertising visual** and save.

It applies to all deals. The voucher is set compactly in the upper half. If long conditions do not fit, they continue on a second page.

## Format

- Landscape with a ratio of 1.41 : 1, as JPG, PNG or WebP, up to 10 MB. The ideal size is shown next to the upload.
- Other ratios are cropped around the centre.
- Keep important text and logos at least 8 mm away from the edge, as many printers do not print right up to it.

## Decide per deal

In the deal under **Advertising on the PDF voucher** you choose:

- **General advertising**: as set above.
- **Own advertising**: an own visual, only for this deal.
- **No advertising**: this voucher never shows advertising.

**Open PDF preview** shows the result.$md$);

select pg_temp.help_put('profil-konto', 'team-account', 20, 'de', $md$Profil und Konto$md$, $md$Unter **Profil & Konto** verwaltest du deinen Namen, deine Sprache und deine Anmeldung. Du findest die Seite im Menü unten links bei deinem Namen.

![Ansicht im Dashboard](/help-img/profil-konto-de.jpg)

## Sprache und Darstellung

Die Sprache gilt für das Dashboard und die Mails von Sellycat an dich. Die Sprache deines Shops stellst du separat unter **Einstellungen** ein. Dazu wählst du, ob das Dashboard hell oder dunkel ist.

## Anmeldung

- **Passwort**: mindestens 10 Zeichen. Hast du dich mit Google registriert, kannst du hier eines festlegen.
- **Google**: verbinde dein Google-Konto für die Anmeldung oder trenne es wieder. Vor dem Trennen brauchst du ein Passwort.

Deine E-Mail-Adresse ist deine Anmeldung. Möchtest du sie ändern, schreib unserem Support.

## Konto löschen

Mit **Konto endgültig löschen** entfernst du dein Konto und deine Zugänge. Das lässt sich nicht rückgängig machen. Inhaber können ihr Konto nicht selbst löschen: Übergib den Shop zuerst an eine andere Person im Team oder schreib dem Support.$md$);

select pg_temp.help_put('profil-konto', 'team-account', 20, 'en', $md$Profile and account$md$, $md$Under **Profile & account** you manage your name, language and sign-in. You find the page in the menu at the bottom left, next to your name.

![View in the dashboard](/help-img/profil-konto-en.jpg)

## Language and appearance

The language applies to the dashboard and to emails from Sellycat to you. Your shop's language is set separately under **Settings**. You also choose whether the dashboard is light or dark.

## Sign-in

- **Password**: at least 10 characters. If you signed up with Google, you can set one here.
- **Google**: connect your Google account for signing in, or disconnect it. You need a password before disconnecting.

Your email address is your sign-in. To change it, write to our support.

## Delete your account

**Delete account permanently** removes your account and your access. This cannot be undone. Owners cannot delete their account themselves: hand the shop over to someone else on the team first, or write to support.$md$);

select pg_temp.help_put('mehrere-shops', 'billing', 20, 'de', $md$Mehrere Shops verwalten$md$, $md$Mit einem Konto kannst du mehrere Shops führen, jeder mit eigenem Design, eigenen Deals und eigenem Team.

![Ansicht im Dashboard](/help-img/mehrere-shops-de.jpg)

## Neuen Shop erstellen

1. Öffne oben in der Seitenleiste den Shop-Wechsel.
2. Wähle **+ Neuen Shop erstellen**.
3. Gib Name und Adresse ein. Danach ist der neue Shop direkt ausgewählt.

Je nach Stand der Registrierung brauchst du einen Einladungscode. Zwischen deinen Shops wechselst du jederzeit an derselben Stelle.

## Im Business-Abo inbegriffen

Das Business-Abo umfasst bis zu 5 Shops. Die zusätzlichen Shops folgen automatisch dem Plan des Hauptshops, ein Einladungscode ist dafür nicht nötig. Plan und Rechnungen verwaltest du im Hauptshop.

Wechselt der Hauptshop auf einen Plan mit nur einem Shop, laufen die zusätzlichen Shops auf Free weiter. In allen anderen Abos hat jeder Shop seinen eigenen Plan.

> Hinweis: Jeder Shop verbindet sein eigenes Stripe-Konto unter **Zahlungen**.$md$);

select pg_temp.help_put('mehrere-shops', 'billing', 20, 'en', $md$Manage several shops$md$, $md$With one account you can run several shops, each with its own design, deals and team.

![View in the dashboard](/help-img/mehrere-shops-en.jpg)

## Create a new shop

1. Open the shop switcher at the top of the sidebar.
2. Choose **+ Create a new shop**.
3. Enter name and address. The new shop is then selected right away.

Depending on the current sign-up rules you may need an invitation code. You switch between your shops in the same place at any time.

## Included in Business

The Business plan covers up to 5 shops. The additional shops automatically follow the main shop's plan, with no invitation code needed. You manage plan and invoices in the main shop.

If the main shop moves to a plan with only one shop, the additional shops continue on Free. In all other plans every shop has its own plan.

> Note: every shop connects its own Stripe account under **Payments**.$md$);

select pg_temp.help_put('gebuehrenuebersicht', 'billing', 30, 'de', $md$Gebührenübersicht für die Buchhaltung$md$, $md$Stripe behält die Sellycat-Gebühr bei jeder Zahlung direkt ein. Für deine Buchhaltung bekommst du sie pro Monat zusammengestellt.

![Ansicht im Dashboard](/help-img/gebuehrenuebersicht-de.jpg)

## So findest du sie

1. Öffne **Einstellungen** → **Abo**. Die Übersicht sehen Inhaber und Admins.
2. Unter **Gebührenübersicht** steht pro Monat, wie viele Bestellungen es gab, dazu Umsatz, Erstattungen und Gebühren.
3. Lade den Monat als PDF oder CSV herunter.

## Was die Zahlen bedeuten

- **Gebühr**: was Sellycat auf die Verkäufe erhoben hat.
- **Netto-Gebühr**: die Gebühr nach Abzug des Anteils, der bei Rückerstattungen zurückging.

> Hinweis: Das ist eine Übersicht, keine Rechnung. Die Rechnungen für dein Abo findest du unter **Rechnungen & Zahlungsmittel**. Die Kartengebühren von Stripe stehen in deinem Stripe-Konto.$md$);

select pg_temp.help_put('gebuehrenuebersicht', 'billing', 30, 'en', $md$Fee overview for your accounting$md$, $md$Stripe keeps the Sellycat fee with every payment. For your accounting you get the fees summarised per month.

![View in the dashboard](/help-img/gebuehrenuebersicht-en.jpg)

## Where to find it

1. Open **Settings** → **Subscription**. Owners and admins see the overview.
2. **Fee overview** shows the number of orders per month, plus revenue, refunds and fees.
3. Download the month as PDF or CSV.

## What the figures mean

- **Fee**: what Sellycat charged on the sales.
- **Net fee**: the fee minus the share returned with refunds.

> Note: this is an overview, not an invoice. Invoices for your plan are under **Invoices & payment methods**. Stripe's card fees are shown in your Stripe account.$md$);

select pg_temp.help_put('absender-domain', 'technical', 12, 'de', $md$Mails von der eigenen Domain senden$md$, $md$Gutschein-Mails gehen standardmässig über Sellycat raus, mit deinem Shopnamen als Absender. Mit einer eigenen Absender-Domain kommen sie von deiner Adresse. Das ist in den Abos Pro und Business enthalten.

![Ansicht im Dashboard](/help-img/absender-domain-de.jpg)

## Einrichten

1. Öffne **Shop** → **Domains** und dort **E-Mail-Absender**.
2. Gib die Domain ein, am besten eine Subdomain wie **mail.deinefirma.ch**. So bleibt dein normales Postfach unberührt.
3. Wähle **Domain einrichten** und trage die gezeigten DNS-Einträge bei deinem Domain-Anbieter ein.
4. Wähle **Jetzt prüfen**. Meist ist alles nach wenigen Minuten grün, selten dauert es einige Stunden.

Bis alles grün ist, gehen deine Mails weiter über Sellycat raus. Es geht also keine Mail verloren.

## Namen und Werte richtig eintragen

Manche Anbieter hängen deine Domain selbst an. Dann trägst du beim Namen nur den Teil davor ein. Der vollständige Name steht zum Vergleich darunter.

## MX-Einträge sind Pflicht

Ohne MX-Einträge lehnen Anbieter wie iCloud deine Mails ab. Hat die Domain schon ein Postfach, lass dessen MX-Einträge unverändert, sie zählen auch.

Sellycat prüft die Einträge täglich. Fehlen sie plötzlich, gehen die Mails wieder über Sellycat raus, bis alles stimmt.

## Absendername und Antworten

Unter **Einstellungen** legst du **Absendername für E-Mails** und **Antwortadresse (Reply-To)** fest. Das geht in jedem Abo, auch ohne eigene Domain.$md$);

select pg_temp.help_put('absender-domain', 'technical', 12, 'en', $md$Send emails from your own domain$md$, $md$Voucher emails go out via Sellycat by default, with your shop name as the sender. With your own sender domain they come from your address. This is included in the Pro and Business plans.

![View in the dashboard](/help-img/absender-domain-en.jpg)

## Set it up

1. Open **Shop** → **Domains** and find **Email sender**.
2. Enter the domain, ideally a subdomain like **mail.yourcompany.com**. Your normal mailbox then stays untouched.
3. Choose **Set up domain** and add the records shown at your domain provider.
4. Choose **Check now**. Usually everything is green within minutes, rarely it takes a few hours.

Until everything is green, your emails keep going out via Sellycat. No email gets lost.

## Enter names and values correctly

Some providers append your domain themselves. In that case enter only the part before it as the name. The full name is shown below for comparison.

## MX records are required

Without MX records, providers like iCloud reject your emails. If the domain already has a mailbox, leave its MX records unchanged, they count too.

Sellycat checks the records daily. If they go missing, emails go out via Sellycat again until everything is right.

## Sender name and replies

Under **Settings** you set the **Sender name for emails** and the **Reply-to address**. This works in every plan, even without your own domain.$md$);

select pg_temp.help_put('google-ki-suche', 'technical', 15, 'de', $md$Google und KI-Suche$md$, $md$Damit Suchmaschinen, KI-Assistenten und Messenger deine Deals gut zeigen, erstellt Sellycat Titel, Beschreibung und Vorschaubild automatisch. Du musst nichts einrichten.

![Ansicht im Dashboard](/help-img/google-ki-suche-de.jpg)

## Pro Deal anpassen

Im Deal unter **Google & KI-Suche** siehst du die Vorschau in der Suche. Nur wenn du es selbst bestimmen willst, füllst du aus:

- **Titel für Suchmaschinen** und **Beschreibung für Suchmaschinen**
- **Bildbeschreibungen (Alt-Text)** für Bildersuche und Screenreader
- **Diesen Deal nicht in Suchmaschinen anzeigen**

Leere Felder bleiben automatisch und ändern sich mit dem Deal mit. Teaser zeigen nie einen Preis.

## Für den ganzen Shop

Unter **Einstellungen** kannst du Titel und Kurzbeschreibung der Startseite selbst setzen. Ideal sind bis 60 Zeichen für den Titel und bis 155 für die Beschreibung. Das Bild für geteilte Links wählst du unter **Design**.

## Google Search Console

1. Füge deinen Shop in der Search Console hinzu und wähle als Bestätigung das HTML-Tag.
2. Kopiere das Tag oder den Code in **Google Search Console: Bestätigungscode** unter **Einstellungen** und speichere.
3. Bestätige in der Search Console und reiche dort die Sitemap `sitemap.xml` ein.

Die Dateien `sitemap.xml`, `robots.txt` und `llms.txt` erstellt Sellycat laufend für deinen Shop.

> Hinweis: Bis Google neue Seiten aufnimmt, können einige Tage vergehen. Eine Platzierung kann niemand garantieren.$md$);

select pg_temp.help_put('google-ki-suche', 'technical', 15, 'en', $md$Google and AI search$md$, $md$So that search engines, AI assistants and messengers show your deals well, Sellycat creates title, description and preview image automatically. You do not need to set anything up.

![View in the dashboard](/help-img/google-ki-suche-en.jpg)

## Adjust a deal

In the deal under **Google & AI search** you see the preview in search. Only if you want to decide yourself, fill in:

- **Title for search engines** and **Description for search engines**
- **Image descriptions (alt text)** for image search and screen readers
- **Do not show this deal in search engines**

Empty fields stay automatic and change with the deal. Teasers never show a price.

## For the whole shop

Under **Settings** you can set the title and short description of the start page yourself. Ideal are up to 60 characters for the title and up to 155 for the description. You choose the image for shared links under **Design**.

## Google Search Console

1. Add your shop in Search Console and choose the HTML tag for verification.
2. Copy the tag or code into **Google Search Console: verification code** under **Settings** and save.
3. Verify in Search Console and submit the sitemap `sitemap.xml` there.

Sellycat keeps the files `sitemap.xml`, `robots.txt` and `llms.txt` up to date for your shop.

> Note: it can take a few days until Google picks up new pages. Nobody can guarantee a ranking.$md$);
