import type { Dictionary } from "@/lib/i18n";
import { AudiencesTrack } from "./audiences-track";

/**
 * «Who it's for» (ported from the reference inspiration row): one wide row of 9:16 tiles, one per audience,
 * each a deal photo with the audience in large type (audiences-track.tsx). Tiles are not links.
 */
export function Audiences({ labels }: { labels: Dictionary["site"]["audiences"] }) {
  return (
    // Phones skip this row (like the reference inspiration row): it shows from tablets up.
    <section id="fuer-wen" className="site-section mx-auto hidden max-w-6xl px-5 sm:px-8 md:block" data-testid="audiences">
      <AudiencesTrack labels={labels} />
    </section>
  );
}
