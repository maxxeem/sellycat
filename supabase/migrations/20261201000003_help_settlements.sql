-- Help center: article on partner settlements.
with a as (
  insert into public.help_articles (slug, category, sort_order) values ('partner-abrechnung', 'payments', 30)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$Partner-Abrechnungen$md$, $md$Verkaufst du Gutscheine für Partner, schuldest du ihnen ihren Anteil. Sellycat rechnet das für dich aus und erstellt die Abrechnung als PDF. Überweisen tust du selbst.

## 1. Pro Deal einschalten

Im Deal unter **Partner-Abrechnung** wählst du:

- **Keine Abrechnung**: der Deal erscheint nicht in Abrechnungen.
- **Nach Verkauf**: jeder verkaufte Gutschein wird abgerechnet.
- **Nach Einlösung**: abgerechnet wird, was beim Partner eingelöst wurde, Teilbeträge anteilig.

Dazu den Anteil des Partners:

- **Provision in %**: du behältst diesen Anteil vom bezahlten Preis, der Partner bekommt den Rest.
- **Fixbetrag pro Gutschein**: der Partner bekommt einen festen Betrag pro Gutschein.

## 2. Bankverbindung des Partners

Beim Partner unter **Abrechnungsangaben** trägst du Firmenname, Adresse und IBAN ein. Sie erscheinen auf der Abrechnung.

## 3. Abrechnungen erstellen

1. Öffne **Verkauf** → **Abrechnungen**.
2. Wähle das Datum, bis zu dem abgerechnet wird. Standard ist das Ende des letzten Monats.
3. Wähle **Abrechnungen erstellen**. Pro Partner entsteht ein Entwurf.
4. Prüfe den Entwurf und wähle **Abschliessen**. Erst dann bekommt die Abrechnung eine Nummer und ändert sich nicht mehr.
5. Lade das PDF herunter oder sende es dem Partner per Mail. Nach der Überweisung markierst du sie als **bezahlt**.

> Hinweis: Wird ein bereits abgerechneter Gutschein zurückerstattet oder eine Einlösung rückgängig gemacht, erscheint auf der nächsten Abrechnung automatisch eine Korrektur.$md$, now() from a
union all
select id, 'en', $md$Partner settlements$md$, $md$If you sell vouchers for partners, you owe them their share. Sellycat works it out for you and creates the statement as a PDF. You make the transfer yourself.

## 1. Switch it on per deal

In the deal under **Partner settlement** you choose:

- **No settlement**: the deal does not appear in statements.
- **After sale**: every sold voucher is settled.
- **After redemption**: what was redeemed at the partner is settled, partial amounts pro rata.

And the partner's share:

- **Commission in %**: you keep this share of the price paid, the partner gets the rest.
- **Fixed amount per voucher**: the partner gets a fixed amount per voucher.

## 2. The partner's bank details

At the partner under **Billing details** you enter company name, address and IBAN. They appear on the statement.

## 3. Create statements

1. Open **Sales** → **Settlements**.
2. Choose the date up to which you settle. The default is the end of last month.
3. Choose **Create statements**. A draft is created per partner.
4. Check the draft and choose **Finalise**. Only then does it get a number and stop changing.
5. Download the PDF or email it to the partner. After the transfer, mark it as **paid**.

> Note: if a voucher that was already settled is refunded or a redemption is undone, a correction appears automatically on the next statement.$md$, now() from a;
