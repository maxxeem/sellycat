import type { Widen } from "../../widen";

/** Landing page copy: audiences block (English). Tile order matches the shop looks in audiences-track.tsx. */
export const en = {
  title: "For everyone with something to offer.",
  subtitle: "Every shop wears the brand of whoever is selling.",
  prev: "Previous",
  next: "Next",
  tiles: [
    { name: "Media & radio", text: "Exclusive deals for your listeners, readers and viewers." },
    { name: "Clubs & associations", text: "Member benefits that bring in new revenue." },
    { name: "City & tourism", text: "Sell the best of your region as a voucher." },
    { name: "Retail & hospitality", text: "Sell vouchers, even while your doors are closed." },
    { name: "Agencies", text: "Run deal shops for your clients, each in their brand." },
  ],
};

/** Landing page copy: audiences block (Deutsch, Schweizer Schreibweise). */
export const de: Widen<typeof en> = {
  title: "Für alle, die etwas zu bieten haben.",
  subtitle: "Jeder Shop trägt die Marke dessen, der verkauft.",
  prev: "Zurück",
  next: "Weiter",
  tiles: [
    { name: "Medien & Radio", text: "Exklusive Deals für deine Hörer, Leser und Zuschauer." },
    { name: "Verbände & Vereine", text: "Mitgliedervorteile, die neue Einnahmen bringen." },
    { name: "Stadt & Tourismus", text: "Das Beste deiner Region als Gutschein verkaufen." },
    { name: "Handel & Gastronomie", text: "Gutscheine verkaufen, auch wenn der Laden zu ist." },
    { name: "Agenturen", text: "Deal-Shops für deine Kunden, jeder in seiner Marke." },
  ],
};
