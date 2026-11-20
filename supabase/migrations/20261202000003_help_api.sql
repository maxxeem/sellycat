-- Help center: article on the API and webhooks.
with a as (
  insert into public.help_articles (slug, category, sort_order) values ('api-webhooks', 'technical', 40)
  on conflict (slug) do nothing returning id
)
insert into public.help_article_versions (article_id, locale, title, body, published_at)
select id, 'de', $md$API und Webhooks$md$, $md$Mit der API verbindest du deinen Shop mit eigenen Systemen, zum Beispiel einer Kasse, einer Buchhaltung oder einem CRM. Webhooks melden Verkäufe und Einlösungen sofort an deine Adresse. Beides ist in den Abos Pro und Business enthalten.

## 1. Schlüssel erstellen

1. Öffne **Einstellungen** → **API & Webhooks**. Inhaber und Admins sehen diese Seite.
2. Gib dem Schlüssel einen Namen, zum Beispiel «Kasse».
3. Soll das System Gutscheine einlösen dürfen, setze das Häkchen **Darf Gutscheine einlösen**.
4. Kopiere den Schlüssel sofort. Er wird nur einmal angezeigt.

Ein Schlüssel gilt nur für einen Shop. Brauchst du ihn nicht mehr, widerrufe ihn.

## 2. Anfragen senden

Die API liegt unter `https://sellycat.com/api/v1`. Den Schlüssel schickst du im Header `Authorization` mit:

```
curl https://sellycat.com/api/v1 \
  -H "Authorization: Bearer sc_live_…"
```

Erlaubt sind 120 Anfragen pro Minute und Schlüssel. Beträge sind immer in Rappen bzw. Cent (`2500` = 25.00).

- `GET /api/v1`: Shop und Rechte des Schlüssels (Verbindungstest)
- `GET /api/v1/deals`: alle Deals mit Status und Restbestand (`?archived=true` mit Archiv)
- `GET /api/v1/orders`: Bestellungen, neueste zuerst, mit Positionen und Gutscheinen. Filter: `status`, `since`, `limit` (bis 100); weitere Seiten mit `before=<next>`
- `GET /api/v1/orders/<id oder Nummer>`: eine Bestellung
- `GET /api/v1/vouchers/<code>`: ein Gutschein mit seinen Einlösungen
- `POST /api/v1/vouchers/<code>/redeem`: Gutschein einlösen (Recht «Einlösen»)
- `GET /api/v1/redemptions`: Einlösungen, neueste zuerst
- `GET /api/v1/partners`: Partner mit Einlöseorten

## 3. Gutscheine einlösen

Ohne Inhalt wird der Gutschein ganz eingelöst. Bei Wertgutscheinen mit Teileinlösung gibst du den Betrag an:

```
curl -X POST https://sellycat.com/api/v1/vouchers/ABCD-1234/redeem \
  -H "Authorization: Bearer sc_live_…" \
  -H "Content-Type: application/json" \
  -d '{"amount_cents": 1500, "note": "Kasse 2"}'
```

Optional ist `location_id` (ein Einlöseort des Partners). Ist der Gutschein schon eingelöst, abgelaufen oder ausserhalb der Einlösezeiten, antwortet die API mit Status 409 und einem Fehlercode, zum Beispiel `redeemed`.

## 4. Webhooks einrichten

1. Trage unter **Webhooks** deine Adresse ein. Sie muss mit `https://` beginnen.
2. Wähle die Ereignisse: `order.paid`, `order.refunded`, `voucher.redeemed`, `voucher.redemption_undone`, `voucher.voided`.
3. Wähle **Testereignis senden**. Unter **Letzte Zustellungen** siehst du, was deine Adresse geantwortet hat.

Sellycat sendet einen POST mit diesem Inhalt:

```
{
  "id": "…",
  "type": "voucher.redeemed",
  "created_at": "2026-12-02T10:15:00Z",
  "data": { … }
}
```

Antworte mit einem Status von 200 bis 299. Andernfalls versucht es Sellycat bis zu acht Mal über drei Tage erneut. Mit `id` erkennst du doppelte Zustellungen.

## 5. Signatur prüfen

Jede Zustellung trägt den Header `Sellycat-Signature: t=<Zeit>,v1=<Signatur>`. Die Signatur ist ein HMAC-SHA256 über `<t>.<Inhalt>` mit dem Signatur-Geheimnis des Webhooks. Beispiel in Node.js:

```
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(header, body, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = createHmac("sha256", secret).update(`${parts.t}.${body}`).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
  return fresh && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

Prüfe den unveränderten Inhalt, so wie er ankommt, nicht ein neu erzeugtes JSON.

> Hinweis: Behandle Schlüssel und Signatur-Geheimnis wie Passwörter. Gelangt eines davon in falsche Hände, widerrufe den Schlüssel oder erstelle ein neues Geheimnis.$md$, now() from a
union all
select id, 'en', $md$API and webhooks$md$, $md$The API connects your shop with your own systems, for example a till, accounting software or a CRM. Webhooks report sales and redemptions to your address the moment they happen. Both are included in the Pro and Business plans.

## 1. Create a key

1. Open **Settings** → **API & webhooks**. Owners and admins see this page.
2. Give the key a name, for example “Till”.
3. If the system should redeem vouchers, tick **May redeem vouchers**.
4. Copy the key right away. It is shown only once.

A key works for one shop only. Revoke it when you no longer need it.

## 2. Send requests

The API lives at `https://sellycat.com/api/v1`. Send the key in the `Authorization` header:

```
curl https://sellycat.com/api/v1 \
  -H "Authorization: Bearer sc_live_…"
```

Each key may send 120 requests per minute. Amounts are always in cents (`2500` = 25.00).

- `GET /api/v1`: the shop and the key's permissions (connection test)
- `GET /api/v1/deals`: all deals with status and remaining stock (`?archived=true` includes the archive)
- `GET /api/v1/orders`: orders, newest first, with items and vouchers. Filters: `status`, `since`, `limit` (up to 100); further pages with `before=<next>`
- `GET /api/v1/orders/<id or number>`: one order
- `GET /api/v1/vouchers/<code>`: one voucher with its redemptions
- `POST /api/v1/vouchers/<code>/redeem`: redeem a voucher (“Redeem” permission)
- `GET /api/v1/redemptions`: redemptions, newest first
- `GET /api/v1/partners`: partners with their redemption locations

## 3. Redeem vouchers

Without a body the voucher is redeemed in full. For value vouchers with partial redemption, send the amount:

```
curl -X POST https://sellycat.com/api/v1/vouchers/ABCD-1234/redeem \
  -H "Authorization: Bearer sc_live_…" \
  -H "Content-Type: application/json" \
  -d '{"amount_cents": 1500, "note": "Till 2"}'
```

`location_id` (one of the partner's locations) is optional. If the voucher is already redeemed, expired or outside its redemption times, the API answers with status 409 and an error code such as `redeemed`.

## 4. Set up webhooks

1. Under **Webhooks**, enter your address. It must start with `https://`.
2. Choose the events: `order.paid`, `order.refunded`, `voucher.redeemed`, `voucher.redemption_undone`, `voucher.voided`.
3. Choose **Send test event**. **Recent deliveries** shows what your address answered.

Sellycat sends a POST with this body:

```
{
  "id": "…",
  "type": "voucher.redeemed",
  "created_at": "2026-12-02T10:15:00Z",
  "data": { … }
}
```

Answer with a status from 200 to 299. Otherwise Sellycat retries up to eight times over three days. Use `id` to recognise duplicate deliveries.

## 5. Verify the signature

Each delivery carries the header `Sellycat-Signature: t=<time>,v1=<signature>`. The signature is an HMAC-SHA256 of `<t>.<body>` with the webhook's signing secret. Example in Node.js:

```
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(header, body, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = createHmac("sha256", secret).update(`${parts.t}.${body}`).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
  return fresh && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

Verify the raw body exactly as received, not re-serialised JSON.

> Note: Treat keys and signing secrets like passwords. If one gets into the wrong hands, revoke the key or create a new secret.$md$, now() from a;
