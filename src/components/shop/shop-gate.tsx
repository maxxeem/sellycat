import Image from "next/image";
import logoOnDark from "../../../public/brand/sellycat-on-dark-1024.png";
import catIcon from "../../../public/brand/sellycat-icon-coral-256.png";
import { shopImage } from "@/lib/shop/image";
import type { ShopTheme } from "@/lib/shop/theme";

/**
 * What a shop shows instead of its deals while it is not online. Pure (also used for the previews
 * in the dashboard). The page hides the shop header around it (`.shop-gate` in SHOP_CSS).
 */
export function ShopGate({ state, name, theme, title, text, preview = false }: { state: "building" | "closed"; name: string; theme: ShopTheme; title: string; text: string; preview?: boolean }) {
  return state === "building" ? <Building name={name} title={title} text={text} preview={preview} /> : <Closed name={name} theme={theme} title={title} text={text} preview={preview} />;
}

/** «A new shop is coming»: in Sellycat's look (Ink, Coral), not the shop's theme yet. */
function Building({ name, title, text, preview }: { name: string; title: string; text: string; preview: boolean }) {
  return (
    <section
      className={`shop-gate shop-gate-building relative isolate flex flex-col items-center justify-center overflow-hidden bg-[#111111] px-6 text-center text-white ${preview ? "min-h-[26rem] py-14" : "min-h-dvh py-20"}`}
      data-testid="shop-building"
    >
      {/* Coral glow and a fine dot grid behind the content. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_38%,rgba(255,75,35,0.38),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_60%_at_50%_45%,black,transparent)]" />
      <div className="relative">
        <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-[2rem] bg-[#ff4b23]/25 [animation-duration:2.6s]" />
        <span className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white shadow-[0_20px_60px_-15px_rgba(255,75,35,0.7)] sm:h-28 sm:w-28">
          <Image src={catIcon} alt="" width={72} height={72} className="h-16 w-16 sm:h-20 sm:w-20" priority={!preview} />
        </span>
      </div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff4b23]">{name}</p>
      <h1 className="mt-3 max-w-2xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-balance text-lg text-white/75">{text}</p>
      {/* Building-site stripes in Coral and Ink. */}
      <div aria-hidden className="mt-10 h-2 w-40 rounded-full [background:repeating-linear-gradient(135deg,#ff4b23_0_10px,#111111_10px_20px)] ring-1 ring-[#ff4b23]/60" />
      <a href="https://sellycat.com" target="_blank" rel="noopener" className="mt-12 inline-flex items-center gap-2 text-xs text-white/55 transition hover:text-white" tabIndex={preview ? -1 : undefined}>
        <span>Powered by</span>
        <Image src={logoOnDark} alt="Sellycat" width={96} height={Math.round((96 * logoOnDark.height) / logoOnDark.width)} className="h-auto w-24" />
      </a>
    </section>
  );
}

/** Taken offline: the shop's logo on its own background with the note. */
function Closed({ name, theme, title, text, preview }: { name: string; theme: ShopTheme; title: string; text: string; preview: boolean }) {
  const logo = theme.mode === "dark" ? theme.logoDark || theme.logoLight : theme.logoLight || theme.logoDark;
  return (
    <section className={`shop-gate shop-gate-closed flex flex-col items-center justify-center px-6 text-center ${preview ? "min-h-[26rem] py-14" : "min-h-[75dvh] py-20"}`} data-testid="shop-closed">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...shopImage(logo, "320px")} alt={name} className="h-auto max-h-28 w-auto max-w-[min(18rem,80%)] object-contain" />
      ) : (
        <p className="shop-heading text-3xl font-bold">{name}</p>
      )}
      <h1 className="shop-heading mt-10 max-w-2xl text-balance text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-xl text-balance text-lg text-[var(--shop-muted)]">{text}</p>
    </section>
  );
}
