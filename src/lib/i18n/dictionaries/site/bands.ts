import type { Widen } from "../../widen";

/** Landing page copy: bands block (English). */
export const en = {
  /** Section heading (sr-only, rendered by the page). */
  title: "From deal to voucher",
  summary:
    "Example deals from fictional shops drift past, and a phone shows a purchase: tap a deal, pay with one tap, get the voucher right away as a PDF and in the wallet. The stock counts down by itself.",
  badges: {
    left: "{n} left",
    off: "−{n} %",
  },
  /** One per scene of the phone demo (shop, checkout, processing, paid, voucher, back to the shop). */
  captions: [
    "Spot a deal, only 7 left",
    "Checkout in one tap",
    "Money goes straight to the shop",
    "Paid and confirmed",
    "Voucher as PDF and in the wallet",
    "Stock counts down by itself",
  ],
  ui: {
    categories: ["All", "Food", "Outdoor", "Wellness"],
    onlyLeft: "Only {n} left",
    endsIn: "Ends in",
    units: ["d", "h", "m", "s"],
    buy: "Buy now",
    checkout: "Checkout",
    quantity: "Quantity",
    total: "Total",
    email: "Voucher goes to",
    emailValue: "mia@example.com",
    pay: "Pay",
    card: "Or pay by card",
    direct: "Paid directly to {shop}",
    processing: "Processing payment",
    paid: "Paid",
    paidText: "Your voucher is on its way.",
    mailSubject: "Your voucher is here (PDF attached)",
    now: "now",
    voucher: "Voucher",
    value: "Value",
    validUntil: "Valid until",
    validDate: "12/31/2027",
    addToWallet: "Add to Wallet",
    added: "Added",
    sold: "Sold: 1 more",
    more: "More deals",
  },
};

/** Landing page copy: bands block (Deutsch, Schweizer Schreibweise). */
export const de: Widen<typeof en> = {
  title: "Vom Deal zum Gutschein",
  summary:
    "Beispiel-Deals fiktiver Shops ziehen vorbei, ein Handy zeigt einen Kauf: Deal antippen, mit einem Tipp bezahlen, Gutschein sofort als PDF und im Wallet erhalten. Der Bestand zählt von selbst herunter.",
  badges: {
    left: "Noch {n}",
    off: "−{n} %",
  },
  captions: [
    "Deal entdecken, nur noch 7 da",
    "Bezahlen mit einem Tipp",
    "Das Geld geht direkt an den Shop",
    "Bezahlt und bestätigt",
    "Gutschein als PDF und im Wallet",
    "Der Bestand zählt automatisch mit",
  ],
  ui: {
    categories: ["Alle", "Essen", "Draussen", "Wellness"],
    onlyLeft: "Nur noch {n} verfügbar",
    endsIn: "Endet in",
    units: ["T", "Std", "Min", "Sek"],
    buy: "Kaufen",
    checkout: "Bestellung",
    quantity: "Anzahl",
    total: "Total",
    email: "Gutschein geht an",
    emailValue: "mia@beispiel.ch",
    pay: "Pay",
    card: "Oder mit Karte bezahlen",
    direct: "Direkt an {shop} bezahlt",
    processing: "Zahlung läuft",
    paid: "Bezahlt",
    paidText: "Dein Gutschein ist unterwegs.",
    mailSubject: "Dein Gutschein ist da (PDF im Anhang)",
    now: "jetzt",
    voucher: "Gutschein",
    value: "Wert",
    validUntil: "Gültig bis",
    validDate: "31.12.2027",
    addToWallet: "Zu Wallet hinzufügen",
    added: "Hinzugefügt",
    sold: "Wieder einer verkauft",
    more: "Weitere Deals",
  },
};
