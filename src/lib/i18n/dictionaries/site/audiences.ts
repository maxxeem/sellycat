import type { Widen } from "../../widen";

/** Landing page copy: audiences block (English). Tile order matches the shop looks in audiences-track.tsx. */
export const en = {
  title: "Who it's for",
  subtitle: "One platform, many senders: every shop wears the brand of whoever is selling.",
  prev: "Previous",
  next: "Next",
  tiles: [
    { name: "Media & radio", text: "Listener deals in your look, promoted on air." },
    { name: "Clubs & associations", text: "Member benefits from partners, with settlement." },
    { name: "City & tourism", text: "Experience vouchers for guests and locals." },
    { name: "Retail & hospitality", text: "Your own vouchers, paid straight to your account." },
    { name: "Agencies", text: "Shops for several clients, each in its own look." },
  ],
};

/** Landing page copy: audiences block (Deutsch, Schweizer Schreibweise). */
export const de: Widen<typeof en> = {
  title: "Für wen",
  subtitle: "Eine Software, viele Absender: Jeder Shop trägt die Marke dessen, der verkauft.",
  prev: "Zurück",
  next: "Weiter",
  tiles: [
    { name: "Medien & Radio", text: "Hörer-Deals im eigenen Look, beworben im Programm." },
    { name: "Verbände & Vereine", text: "Mitgliedervorteile von Partnern, mit Abrechnung." },
    { name: "Stadt & Tourismus", text: "Erlebnisgutscheine für Gäste und Einheimische." },
    { name: "Handel & Gastronomie", text: "Eigene Gutscheine, bezahlt direkt aufs Konto." },
    { name: "Agenturen", text: "Shops für mehrere Kunden, jeder im eigenen Look." },
  ],
};
