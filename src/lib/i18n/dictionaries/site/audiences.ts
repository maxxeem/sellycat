import type { Widen } from "../../widen";

/** Landing page copy: audiences block (English). Tile order matches the shop looks in audiences-track.tsx. */
export const en = {
  title: "Who it's for",
  subtitle: "One platform, many senders: every shop wears the brand of whoever is selling.",
  prev: "Previous",
  next: "Next",
  tiles: [
    { name: "Media houses & radio stations", text: "Listener deals in the station's look, promoted on your own channels." },
    { name: "Associations & clubs", text: "Member benefits from partner businesses, settlement included." },
    { name: "City & tourism marketing", text: "Experience vouchers for guests and locals alike." },
    { name: "Retail & hospitality", text: "Your own vouchers and promotions, paid straight into your account." },
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
    { name: "Medienhäuser & Radiosender", text: "Hörer-Deals im Look des Senders, beworben im eigenen Programm." },
    { name: "Verbände & Vereine", text: "Mitgliedervorteile von Partnerbetrieben, mit Abrechnung." },
    { name: "Stadt- & Tourismusmarketing", text: "Erlebnisgutscheine für Gäste und Einheimische." },
    { name: "Händler & Gastronomie", text: "Eigene Gutscheine und Aktionen, bezahlt direkt aufs eigene Konto." },
    { name: "Agenturen", text: "Shops für mehrere Kunden, jeder im eigenen Look." },
  ],
};
