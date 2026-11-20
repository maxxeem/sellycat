import type { Widen } from "../../widen";

/** Landing page copy: features block (English). `slide` and `goTo` take {n} and {total}. */
export const en = {
  title: "Everything in the box",
  subtitle: "From your own brand to the settlement with your partners: everything a deal shop needs, in one place.",
  prev: "Previous feature",
  next: "Next feature",
  slide: "{n} of {total}",
  goTo: "Show feature {n} of {total}",
  items: {
    brand: { title: "Your own brand", text: "Logo, colours and font: your shop looks like you, not like us." },
    domain: { title: "Your own domain", text: "Your shop runs on your own address. We check the DNS records and take care of SSL automatically." },
    money: { title: "Money straight to you", text: "Buyers pay through Stripe directly into your account. Sellycat only keeps a fee per sale, no detour via us." },
    pdf: { title: "PDF voucher", text: "Right after payment the voucher lands in the inbox as a PDF, with a QR code, barcode or number code." },
    wallet: { title: "Apple & Google Wallet", text: "One tap and the voucher sits in the wallet. Once it is redeemed, the pass updates itself." },
    scan: { title: "Redeem with the camera", text: "Your partners scan vouchers with their phone camera, right in the browser, no app needed. Partial redemptions included." },
    stock: { title: "Quantity & timeframe", text: "Set the stock, the sales window and a limit per order. The countdown and “Only X left” do the rest." },
    partners: { title: "Partners & settlement", text: "Every deal belongs to a partner. Sellycat works out who gets what, per sale or per redemption, and drafts the settlement." },
    analytics: { title: "Analytics", text: "Revenue, vouchers sold and redeemed, and views at a glance. So you can see what is working." },
    team: { title: "Team, API & webhooks", text: "Bring your team on board with the right roles. Plug in your own systems through the API and webhooks." },
  },
};

/** Landing page copy: features block (Deutsch, Schweizer Schreibweise). */
export const de: Widen<typeof en> = {
  title: "Alles drin",
  subtitle: "Von der eigenen Marke bis zur Abrechnung mit deinen Partnern: alles, was ein Deal-Shop braucht, an einem Ort.",
  prev: "Vorherige Funktion",
  next: "Nächste Funktion",
  slide: "{n} von {total}",
  goTo: "Funktion {n} von {total} anzeigen",
  items: {
    brand: { title: "Eigene Marke", text: "Logo, Farben und Schrift: Dein Shop sieht aus wie du, nicht wie wir." },
    domain: { title: "Eigene Domain", text: "Dein Shop läuft unter deiner eigenen Adresse. Wir prüfen die DNS-Einträge und kümmern uns automatisch um SSL." },
    money: { title: "Geld direkt an dich", text: "Käufer bezahlen über Stripe direkt auf dein Konto. Sellycat behält nur eine Gebühr pro Verkauf, ohne Umweg über uns." },
    pdf: { title: "PDF-Gutschein", text: "Gleich nach der Zahlung liegt der Gutschein als PDF im Postfach, mit QR-Code, Barcode oder Zahlencode." },
    wallet: { title: "Apple & Google Wallet", text: "Ein Tipp, und der Gutschein steckt im Wallet. Wird er eingelöst, aktualisiert sich der Pass von selbst." },
    scan: { title: "Einlösen per Kamera", text: "Deine Partner scannen Gutscheine mit der Handykamera, direkt im Browser und ohne App. Teileinlösung inklusive." },
    stock: { title: "Stückzahl & Zeitraum", text: "Lege Stückzahl, Verkaufszeitraum und ein Maximum pro Bestellung fest. Countdown und «Noch X verfügbar» erledigen den Rest." },
    partners: { title: "Partner & Abrechnung", text: "Jeder Deal gehört zu einem Partner. Sellycat rechnet aus, was wem zusteht, pro Verkauf oder pro Einlösung, und erstellt die Abrechnung." },
    analytics: { title: "Auswertungen", text: "Umsatz, verkaufte und eingelöste Gutscheine und Aufrufe auf einen Blick. Damit du siehst, was läuft." },
    team: { title: "Team, API & Webhooks", text: "Hol dein Team mit den passenden Rollen dazu. Über API und Webhooks hängst du deine eigenen Systeme an." },
  },
};
