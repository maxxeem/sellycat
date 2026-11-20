import type { Dictionary } from "@/lib/i18n";
import { AudiencesTrack } from "./audiences-track";

/**
 * «Who it's for» (ported from the reference inspiration row): one wide row of 9:16 tiles, one per audience,
 * each a mini shop of a fictional customer drawn in code. With a mouse a tile plays a short loop after a
 * brief rest (audiences-track.tsx). Tiles are not links.
 */
export function Audiences({ labels, locale }: { labels: Dictionary["site"]["audiences"]; locale: "de" | "en" }) {
  return (
    // Phones skip this row (like the reference inspiration row): it shows from tablets up.
    <section id="fuer-wen" className="site-section mx-auto hidden max-w-6xl px-5 sm:px-8 md:block" data-testid="audiences">
      <AudiencesTrack labels={labels} locale={locale} />
    </section>
  );
}
