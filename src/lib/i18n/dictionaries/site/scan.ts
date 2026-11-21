import type { Widen } from "../../widen";

/** Landing page copy: scan block (English). */
export const en = {
  eyebrow: "Redeem on velvet paws",
  title: "Scan to redeem. No app.",
  text: "Your partner scans the voucher with their phone's camera and the check page shows right away whether it's valid. One swipe redeems it, and the buyer's wallet pass follows along.",
  points: [
    { title: "No download, right in the browser" },
    { title: "Partial redemption for value vouchers" },
    { title: "Permissions per partner" },
    { title: "A complete log" },
  ],
  browser: "Runs in any browser",
  phoneLabel: "Animation: a partner scans a voucher with the phone camera, the check page shows «Valid», one swipe redeems it and the wallet pass switches to «Redeemed».",
  screen: {
    scanTitle: "Scan voucher",
    hint: "Hold the code inside the frame",
    found: "Code found",
    voucher: "Voucher",
    checkTitle: "Check voucher",
    code: "Code",
    value: "Value",
    shop: "Shop",
    valid: "Valid",
    swipe: "Swipe to redeem",
    redeemed: "Redeemed",
    time: "Today, 11:42",
    wallet: "Wallet",
    updated: "Voucher updated: redeemed",
    status: "Status",
  },
};

/** Landing page copy: scan block (Deutsch, Schweizer Schreibweise). */
export const de: Widen<typeof en> = {
  eyebrow: "Samtpfotig einlösen",
  title: "Einlösen mit der Handykamera. Ohne App.",
  text: "Dein Partner scannt den Gutschein mit der Kamera seines Handys, die Prüfseite zeigt sofort, ob er gültig ist. Ein Wisch, und er ist eingelöst – auch im Wallet des Käufers.",
  points: [
    { title: "Ohne Download, direkt im Browser" },
    { title: "Teileinlösung bei Wertgutscheinen" },
    { title: "Rechte pro Partner" },
    { title: "Lückenloses Protokoll" },
  ],
  browser: "Läuft in jedem Browser",
  phoneLabel: "Animation: Ein Partner scannt einen Gutschein mit der Handykamera, die Prüfseite zeigt «Gültig», ein Wisch löst ihn ein und der Wallet-Pass wechselt auf «Eingelöst».",
  screen: {
    scanTitle: "Gutschein scannen",
    hint: "Code in den Rahmen halten",
    found: "Code erkannt",
    voucher: "Gutschein",
    checkTitle: "Gutschein prüfen",
    code: "Code",
    value: "Wert",
    shop: "Shop",
    valid: "Gültig",
    swipe: "Zum Einlösen wischen",
    redeemed: "Eingelöst",
    time: "Heute, 11:42",
    wallet: "Wallet",
    updated: "Gutschein aktualisiert: eingelöst",
    status: "Status",
  },
};
