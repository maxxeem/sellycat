import { DiscordLogo, FacebookLogo, Globe, InstagramLogo, LinkedinLogo, PinterestLogo, SnapchatLogo, SpotifyLogo, TelegramLogo, ThreadsLogo, TiktokLogo, TwitchLogo, WhatsappLogo, XLogo, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { SOCIAL_LABEL, socialUrl, type SocialNetwork } from "@/lib/shop/social";

type IconProps = { className?: string; weight?: "regular" | "fill" | "bold"; "aria-hidden"?: boolean };
export const SOCIAL_ICON: Record<SocialNetwork, ComponentType<IconProps>> = {
  website: Globe,
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  x: XLogo,
  linkedin: LinkedinLogo,
  threads: ThreadsLogo,
  pinterest: PinterestLogo,
  whatsapp: WhatsappLogo,
  telegram: TelegramLogo,
  snapchat: SnapchatLogo,
  spotify: SpotifyLogo,
  discord: DiscordLogo,
  twitch: TwitchLogo,
};

/** Round icon links of the shop's website and social media profiles (only entries that make a valid link). */
export function SocialIcons({ links, inert = false }: { links: Array<{ network: SocialNetwork; url: string }>; inert?: boolean }) {
  const items = links.map((l) => ({ ...l, href: socialUrl(l.network, l.url) })).filter((l) => l.href);
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" data-testid="shop-social">
      {items.map((l) => {
        const Icon = SOCIAL_ICON[l.network];
        return (
          <li key={l.network}>
            <a
              href={inert ? "#" : l.href!}
              tabIndex={inert ? -1 : undefined}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={SOCIAL_LABEL[l.network]}
              title={SOCIAL_LABEL[l.network]}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--shop-line)] text-[var(--shop-text)] transition hover:border-[var(--shop-primary)] hover:bg-[var(--shop-primary)] hover:text-[var(--shop-on-primary)]"
            >
              <Icon className="h-5 w-5" weight="regular" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
