import type { Dictionary } from "@/lib/i18n";
import { AudiencesTrack } from "./audiences-track";

/**
 * «Who it's for» (ported from the reference inspiration row): one wide row of 9:16 tiles, one per audience,
 * each a deal photo with the audience in large type (audiences-track.tsx). Tiles are not links.
 */
export function Audiences({ labels }: { labels: Dictionary["site"]["audiences"] }) {
  return (
    // A full-width coral band right after the dark redeeming band; pricing below is white again. Text on coral is Ink.
    <section id="fuer-wen" className="relative z-[23] bg-coral text-on-coral" data-testid="audiences">
      <div className="site-section mx-auto max-w-6xl px-5 sm:px-8">
        <AudiencesTrack labels={labels} />
      </div>
    </section>
  );
}
