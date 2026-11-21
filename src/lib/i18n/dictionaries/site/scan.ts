import type { Widen } from "../../widen";

/** Landing page copy: scan block (English). */
export const en = {
  eyebrow: "Redemption",
  title: "Scan to redeem. No app.",
  text: "Your partner scans the voucher with their phone's camera and the check page shows right away whether it's valid. One swipe redeems it, and the buyer's wallet pass follows along.",
  points: [
    { title: "Right in the browser", text: "Open the camera, scan, done." },
    { title: "Partial redemption", text: "The balance stays on the voucher." },
    { title: "Rights per partner", text: "Each sees only their own deals." },
    { title: "Full audit log", text: "Who redeemed what, and when." },
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
  eyebrow: "Einlöseprozess",
  title: "Einlösen mit der Handykamera. Ohne App.",
  text: "Dein Partner scannt den Gutschein mit der Kamera seines Handys, die Prüfseite zeigt sofort, ob er gültig ist. Ein Wisch, und er ist eingelöst, auch im Wallet des Käufers.",
  points: [
    { title: "Direkt im Browser", text: "Kamera öffnen, scannen, fertig." },
    { title: "Teileinlösung", text: "Das Restguthaben bleibt erhalten." },
    { title: "Rechte pro Partner", text: "Jeder sieht nur seine Deals." },
    { title: "Lückenloses Protokoll", text: "Wer wann was eingelöst hat." },
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
