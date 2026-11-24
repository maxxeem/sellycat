import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "*.supabase.co";

// Crawlers that read the plain HTML get the page's head tags in the first response instead of
// streamed later: Next's own list, plus Google and the AI crawlers (most run no JavaScript).
const NEXT_BOTS = String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;
const MORE_BOTS = "Googlebot|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Bytespider|Amazonbot|meta-externalagent|meta-externalfetcher|MistralAI-User|cohere-ai|DuckAssistBot|YouBot|TelegramBot|Pinterestbot|Qwantify|Bravebot|PetalBot|SeznamBot";

const nextConfig: NextConfig = {
  // Cache Components (Next 16 default): the shop pages are cached per tenant with `use cache` +
  // `cacheTag`, everything that reads the session streams in behind <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
  htmlLimitedBots: new RegExp(`${NEXT_BOTS}|${MORE_BOTS}`),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // A second `next dev` in the same folder (e2e on another port) needs its own build directory.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
    // Uploads get a fresh file name on every change, so optimized copies can be kept for long.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
