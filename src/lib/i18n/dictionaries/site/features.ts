import type { Widen } from "../../widen";

/** Landing page copy: features block (English). `slide` and `goTo` take {n} and {total}. */
export const en = {
  title: "Everything in the box.",
  subtitle: "Everything a deal shop needs. In one place.",
  prev: "Previous feature",
  next: "Next feature",
  slide: "{n} of {total}",
  goTo: "Show feature {n} of {total}",
  items: {
    brand: { title: "Your own brand", text: "Logo, colours, font: your shop looks like you." },
    domain: { title: "Your own domain", text: "Your address, SSL included. We check the DNS record." },
    money: { title: "Money straight to you", text: "Buyers pay through Stripe straight into your account." },
    pdf: { title: "PDF voucher", text: "In the inbox seconds after purchase, with QR, barcode or number code." },
    wallet: { title: "Apple & Google Wallet", text: "One tap and it’s in the wallet. Redeemed? The pass knows." },
    scan: { title: "Scan to redeem", text: "A phone camera instead of a till system. Partial redemption included." },
    stock: { title: "Quantity & timeframe", text: "Countdown and «Only X left» keep things moving." },
    partners: { title: "Partners & settlement", text: "Sellycat works out who gets what. Per sale or per redemption." },
    analytics: { title: "Analytics", text: "Revenue, sales, redemptions and views at a glance." },
    team: { title: "API & webhooks", text: "Deals, orders and vouchers via API, every event as a webhook." },
  },
};

/** Landing page copy: features block (Deutsch, Schweizer Schreibweise). */
export const de: Widen<typeof en> = {
  title: "Alles drin.",
  subtitle: "Alles, was ein Deal-Shop braucht. An einem Ort.",
  prev: "Vorherige Funktion",
  next: "Nächste Funktion",
  slide: "{n} von {total}",
  goTo: "Funktion {n} von {total} anzeigen",
  items: {
    brand: { title: "Eigene Marke", text: "Logo, Farben, Schrift: Dein Shop sieht aus wie du." },
    domain: { title: "Eigene Domain", text: "Deine Adresse, SSL inklusive. Den DNS-Eintrag prüfen wir." },
    money: { title: "Geld direkt an dich", text: "Käufer zahlen über Stripe direkt auf dein Konto." },
    pdf: { title: "PDF-Gutschein", text: "Sekunden nach dem Kauf im Postfach, mit QR-, Bar- oder Zahlencode." },
    wallet: { title: "Apple & Google Wallet", text: "Ein Tipp, und er steckt im Wallet. Eingelöst? Der Pass weiss es." },
    scan: { title: "Einlösen per Kamera", text: "Handykamera statt Kassensystem. Teileinlösung inklusive." },
    stock: { title: "Stückzahl & Zeitraum", text: "Countdown und «Noch X verfügbar» machen Tempo." },
    partners: { title: "Partner & Abrechnung", text: "Wer was bekommt, rechnet Sellycat aus. Pro Verkauf oder pro Einlösung." },
    analytics: { title: "Auswertungen", text: "Umsatz, Verkäufe, Einlösungen und Aufrufe auf einen Blick." },
    team: { title: "API & Webhooks", text: "Deals, Bestellungen und Gutscheine per API, jedes Ereignis als Webhook." },
  },
};
